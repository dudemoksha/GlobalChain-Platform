"""GlobalChain — FastAPI Main Server with WebSocket + Background Scheduler"""

import asyncio
import csv
import io
import json
import logging
from contextlib import asynccontextmanager
from typing import List, Optional, Set

from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, BackgroundTasks, File, UploadFile
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import engine, get_db
from auth import verify_password, create_access_token, get_password_hash, decode_token
from graph_engine import build_graph, get_cached_graph, serialize_graph, get_impact, bfs_propagate, calculate_dependency_scores, invalidate_cache
from risk_engine import run_risk_update, get_current_signals, fetch_all_signals
from simulation_engine import create_synthetic_event, run_simulation
from recommendation_engine import run_full_recommendation_pass, auto_evaluate_new_supplier, normalize_values, score_supplier
from alert_engine import scan_and_generate_alerts, get_alert_summary
from explainability_engine import explain_risk, explain_consumer_impact

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("globalchain")

# ─── WebSocket Manager ───────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws)

    async def broadcast(self, event_type: str, data: dict):
        msg = json.dumps({"event": event_type, "data": data})
        dead = set()
        for ws in self.active:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.add(ws)
        self.active -= dead

manager = ConnectionManager()

# ─── Background scheduler ────────────────────────────────────────────────────
async def risk_update_loop():
    """Runs every 5 minutes: fetch signals → update graph → alert → broadcast."""
    await asyncio.sleep(15)  # Initial delay on startup
    while True:
        try:
            db = next(get_db())
            suppliers = db.query(models.Supplier).all()
            if suppliers:
                summary = await run_risk_update(suppliers)
                # Sync risk scores back to DB
                G = get_cached_graph()
                if G:
                    for s in suppliers:
                        if s.id in G:
                            new_risk = G.nodes[s.id].get("risk_score", s.risk_score)
                            s.risk_score = round(new_risk, 3)
                    db.commit()
                    # Scan alerts
                    new_alerts = scan_and_generate_alerts(G, suppliers, db)
                    if new_alerts:
                        await manager.broadcast("alert_triggered", {"alerts": new_alerts})
                    if summary["suppliers_updated"] > 0:
                        await manager.broadcast("risk_update", summary)
            db.close()
        except Exception as e:
            logger.error(f"Risk update loop error: {e}")
        await asyncio.sleep(300)  # 5 minutes


def _rebuild_graph(db: Session):
    """Load DB → rebuild NetworkX graph → recalculate dependency scores. Only APPROVED suppliers."""
    suppliers = db.query(models.Supplier).filter(models.Supplier.status == "approved").all()
    if not suppliers:
        invalidate_cache()
        return None
        
    approved_ids = {s.id for s in suppliers}
    edges = db.query(models.SupplyEdge).filter(
        models.SupplyEdge.from_supplier_id.in_(approved_ids),
        models.SupplyEdge.to_supplier_id.in_(approved_ids)
    ).all()
    
    G = build_graph(suppliers, edges)
    calculate_dependency_scores(G)
    
    # Sync dep scores back to DB using bulk update for performance
    update_data = []
    for s in suppliers:
        if s.id in G:
            new_score = round(G.nodes[s.id].get("dependency_score", 0.0), 4)
            if s.dependency_score != new_score:
                update_data.append({"id": s.id, "dependency_score": new_score})
    
    if update_data:
        db.bulk_update_mappings(models.Supplier, update_data)
        db.commit()
    
    return G


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: building graph in cloud can be slow, move to lazy or background
    print("Lifespan started - Cloud Mode")
    try:
        # We skip create_all here to speed up cold starts; tables were already created locally
        pass
    except Exception as e:
        print(f"Startup error: {e}")
    yield

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="GlobalChain API", version="2.0.0", lifespan=lifespan)

@app.get("/")
@app.get("/health")
def health():
    return {"status": "ok", "service": "GlobalChain API"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:5173",
        "http://localhost:3000",
        "capacitor://localhost",
        "https://globalchain-platform.vercel.app",
        "https://globalchain-frontend.vercel.app"
    ],
    allow_origin_regex=".*", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ─── Schemas ─────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    email: str
    password: str
    role: str = "Buyer"
    company: str = ""
    tier: int = 0

class SupplierCreate(BaseModel):
    name: str
    tier: int = 1
    lat: float
    lng: float
    region: str = ""
    product: str = ""
    cost: float = 0.5
    capacity: float = 0.7
    quality: float = 0.8
    has_backup: bool = False
    revenue_contribution: float = 0.05
    backup_supplier_id: Optional[int] = None
    parent_supplier_id: Optional[int] = None  # auto-creates edge

class EdgeCreate(BaseModel):
    from_supplier_id: int
    to_supplier_id: int
    dependency_weight: float = 0.8

class SimulateRequest(BaseModel):
    lat: float
    lng: float
    event_type: str = "earthquake"
    severity: float = 0.7
    label: Optional[str] = None

class AcknowledgeAlert(BaseModel):
    alert_id: int

class SupplierStatusUpdate(BaseModel):
    status: str  # "approved" or "rejected"

# ─── Auth helpers ─────────────────────────────────────────────────────────────
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(models.User).filter(models.User.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_admin(user: models.User = Depends(get_current_user)):
    if user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ─── WebSocket ───────────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        await ws.send_text(json.dumps({"event": "connected", "data": {"msg": "GlobalChain live feed active"}}))
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)

# ─── Auth ────────────────────────────────────────────────────────────────────
@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect credentials")
    if user.status != "Approved":
        raise HTTPException(status_code=403, detail="Account pending approval")
    token = create_access_token({"sub": user.email, "role": user.role, "tier": user.tier})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "tier": user.tier, "company": user.company}

@app.post("/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        email=req.email, hashed_password=get_password_hash(req.password),
        role=req.role, tier=req.tier, company=req.company, status="Pending"
    )
    db.add(user); db.commit()
    return {"message": "Signup submitted. Awaiting admin approval.", "status": "Pending"}

@app.get("/me")
def get_me(user: models.User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "role": user.role, "tier": user.tier, "company": user.company, "status": user.status}

# ─── Dashboard ───────────────────────────────────────────────────────────────
@app.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    # Filter by owner_id for private workspace, unless Admin
    query = db.query(models.Supplier)
    if user.role != "Admin":
        # Non-admins see their own data (any status)
        query = query.filter(models.Supplier.owner_id == user.id)
    
    suppliers = query.all()
    
    # Filter alerts by suppliers owned by user
    s_ids = [s.id for s in suppliers]
    alerts = db.query(models.Alert).filter(
        models.Alert.acknowledged == False,
        models.Alert.supplier_id.in_(s_ids) if s_ids else False
    ).all()
    
    recs = db.query(models.Recommendation).filter(
        models.Recommendation.supplier_id.in_(s_ids) if s_ids else False
    ).all()
    
    G = get_cached_graph()
    high_risk = [s for s in suppliers if s.risk_score >= 0.7]
    moderate_risk = [s for s in suppliers if 0.4 <= s.risk_score < 0.7]
    signals = get_current_signals()

    return {
        "total_suppliers": len(suppliers),
        "high_risk_count": len(high_risk),
        "moderate_risk_count": len(moderate_risk),
        "active_alerts": len(alerts),
        "recommendations_count": len(recs),
        "signal_count": signals.get("total", 0),
        "status": "CRITICAL" if len(high_risk) > 3 else "ELEVATED" if len(high_risk) > 0 else "NOMINAL",
        "alert_summary": get_alert_summary(alerts),
    }

# ─── Suppliers CRUD ───────────────────────────────────────────────────────────
@app.get("/suppliers")
def list_suppliers(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    # Filter by owner_id for private workspace, unless Admin
    if user.role == "Admin":
        suppliers = db.query(models.Supplier).all()
    else:
        # Non-admins see their own data (any status)
        suppliers = db.query(models.Supplier).filter(models.Supplier.owner_id == user.id).all()
    
    G = get_cached_graph()
    is_main = user.role in ("Admin", "Buyer") and user.tier == 0
    result = []
    for s in suppliers:
        impact = get_impact(G, s.id) if G else {}
        # Tier visibility: Main Company sees T2/T3 as masked
        if is_main and s.tier >= 2:
            result.append({
                "id": s.id, "name": f"Tier {s.tier} Supplier in {s.region}", "tier": s.tier,
                "lat": s.lat, "lng": s.lng, "region": s.region, "product": "Classified",
                "cost": 0, "capacity": 0, "quality": 0,
                "risk_score": s.risk_score, "dependency_score": s.dependency_score,
                "supplier_score": s.supplier_score, "has_backup": s.has_backup,
                "revenue_contribution": s.revenue_contribution, "status": s.status,
                "backup_supplier_id": s.backup_supplier_id, "masked": True,
                "damage": impact.get("damage", 0), "time_days": impact.get("time_days", 0),
            })
        else:
            result.append({
                "id": s.id, "name": s.name, "tier": s.tier,
                "lat": s.lat, "lng": s.lng, "region": s.region, "product": s.product,
                "cost": s.cost, "capacity": s.capacity, "quality": s.quality,
                "risk_score": s.risk_score, "dependency_score": s.dependency_score,
                "supplier_score": s.supplier_score, "has_backup": s.has_backup,
                "revenue_contribution": s.revenue_contribution, "status": s.status,
                "backup_supplier_id": s.backup_supplier_id, "masked": False,
                "damage": impact.get("damage", 0), "time_days": impact.get("time_days", 0),
            })
    return {"suppliers": result}

@app.get("/api/globe-data")
def get_globe_data(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Alias for list_suppliers to fix AdminDashboard 404s."""
    return list_suppliers(db, user)

@app.post("/supplier")
async def add_supplier(req: SupplierCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    data = req.dict()
    parent_id = data.pop("parent_supplier_id", None)
    # Admin and Buyer (Main Company) auto-approves; others go to pending
    is_trusted = user.role in ("Admin", "Buyer")
    supplier = models.Supplier(**data, owner_id=user.id, status="approved" if is_trusted else "pending")
    db.add(supplier); db.commit(); db.refresh(supplier)
    # Auto-create edge if parent specified
    if parent_id:
        edge = models.SupplyEdge(from_supplier_id=parent_id, to_supplier_id=supplier.id, dependency_weight=0.8)
        db.add(edge); db.commit()
    invalidate_cache()
    _rebuild_graph(db)
    await manager.broadcast("supplier_added", {"id": supplier.id, "name": supplier.name, "status": supplier.status})
    return {"supplier": {"id": supplier.id, "name": supplier.name, "status": supplier.status}}

@app.get("/suppliers/backup-overview")
def backup_overview(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    suppliers = db.query(models.Supplier).filter(models.Supplier.status == "approved").all()
    smap = {s.id: s for s in suppliers}
    result = []
    for s in suppliers:
        backup = smap.get(s.backup_supplier_id) if s.backup_supplier_id else None
        result.append({
            "id": s.id, "name": s.name, "tier": s.tier, "risk_score": s.risk_score,
            "has_backup": s.has_backup,
            "backup_id": s.backup_supplier_id,
            "backup_name": backup.name if backup else None,
            "backup_risk": backup.risk_score if backup else None,
            "needs_switch": s.risk_score >= 0.7 and backup is not None,
            "recommendation": f"Switch to {backup.name} (risk: {round(backup.risk_score*100)}%)" if (s.risk_score >= 0.7 and backup) else None,
        })
    return {"suppliers": result}

@app.get("/suppliers/{supplier_id}")
def get_supplier(supplier_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    s = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    G = get_cached_graph()
    signals = get_current_signals()
    # Find signals near this supplier
    signals_hit = []
    if G and s.id in G:
        from graph_engine import haversine_distance
        for sig in signals.get("signals", []):
            from risk_engine import SIGNAL_IMPACT_RADIUS_KM
            dist = haversine_distance(s.lat, s.lng, sig["lat"], sig["lng"])
            if dist <= SIGNAL_IMPACT_RADIUS_KM:
                signals_hit.append(sig)

    impact = get_impact(G, s.id) if G else {}
    explanation = explain_risk(s.id, G, signals_hit, s) if G else {"reasons": [], "confidence": 0}
    consumer = explain_consumer_impact(s.product, s.risk_score, impact.get("damage", 0), impact.get("time_days", 0))

    # Upstream / downstream
    from graph_engine import get_upstream_path, get_downstream_path
    upstream = get_upstream_path(G, s.id)[1:] if G else []
    downstream = get_downstream_path(G, s.id)[1:] if G else []

    is_main = user.role in ("Admin", "Buyer") and user.tier == 0
    if is_main and s.tier >= 2:
        return {
            "id": s.id, "name": f"Tier {s.tier} Supplier in {s.region}", "tier": s.tier,
            "lat": s.lat, "lng": s.lng, "region": s.region, "product": "Classified",
            "cost": 0, "capacity": 0, "quality": 0, "risk_score": s.risk_score,
            "dependency_score": s.dependency_score, "has_backup": s.has_backup,
            "backup_supplier_id": s.backup_supplier_id, "status": s.status,
            "revenue_contribution": s.revenue_contribution,
            "impact": impact, "explanation": explanation, "consumer_impact": consumer,
            "signals_affecting": signals_hit[:5], "masked": True,
            "upstream_nodes": upstream, "downstream_nodes": downstream,
            "confidence": explanation.get("confidence", 0.5),
        }

    return {
        "id": s.id, "name": s.name, "tier": s.tier, "lat": s.lat, "lng": s.lng,
        "region": s.region, "product": s.product, "cost": s.cost, "capacity": s.capacity,
        "quality": s.quality, "risk_score": s.risk_score, "dependency_score": s.dependency_score,
        "has_backup": s.has_backup, "backup_supplier_id": s.backup_supplier_id,
        "status": s.status, "revenue_contribution": s.revenue_contribution,
        "impact": impact, "explanation": explanation, "consumer_impact": consumer,
        "signals_affecting": signals_hit[:5], "masked": False,
        "upstream_nodes": upstream, "downstream_nodes": downstream,
        "confidence": explanation.get("confidence", 0.5),
    }

@app.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    s = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.query(models.SupplyEdge).filter(
        (models.SupplyEdge.from_supplier_id == supplier_id) |
        (models.SupplyEdge.to_supplier_id == supplier_id)
    ).delete()
    db.delete(s); db.commit()
    invalidate_cache(); _rebuild_graph(db)
    return {"message": "Supplier deleted"}

# ─── Edges ───────────────────────────────────────────────────────────────────
@app.post("/edges")
def create_edge(req: EdgeCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    edge = models.SupplyEdge(**req.dict())
    db.add(edge); db.commit()
    invalidate_cache(); _rebuild_graph(db)
    return {"message": "Edge created", "edge": req.dict()}

@app.delete("/edges/{edge_id}")
def delete_edge(edge_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    e = db.query(models.SupplyEdge).filter(models.SupplyEdge.id == edge_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Edge not found")
    db.delete(e); db.commit()
    invalidate_cache(); _rebuild_graph(db)
    return {"message": "Edge deleted"}

# ─── Graph ───────────────────────────────────────────────────────────────────
@app.get("/graph")
def get_graph(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    G = get_cached_graph()
    if not G:
        G = _rebuild_graph(db)
    
    data = serialize_graph(G)
    if user.role == "Admin":
        return data
        
    # Filter for private workspace: only show suppliers owned by the user
    user_suppliers = db.query(models.Supplier).filter(models.Supplier.owner_id == user.id).all()
    user_s_ids = {s.id for s in user_suppliers}
    
    filtered_nodes = [n for n in data["nodes"] if n["id"] in user_s_ids]
    filtered_edges = [e for e in data["edges"] if e["from"] in user_s_ids and e["to"] in user_s_ids]
    
    return {"nodes": filtered_nodes, "edges": filtered_edges}

@app.get("/graph/node/{node_id}")
def get_node_detail(node_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    G = get_cached_graph()
    if not G or node_id not in G:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Ownership check
    s = db.query(models.Supplier).filter(models.Supplier.id == node_id).first()
    if not s or (user.role != "Admin" and s.owner_id != user.id):
        raise HTTPException(status_code=403, detail="Access denied to this supplier")

    signals = get_current_signals()
    if s:
        from graph_engine import haversine_distance
        from risk_engine import SIGNAL_IMPACT_RADIUS_KM
        for sig in signals.get("signals", []):
            dist = haversine_distance(s.lat, s.lng, sig["lat"], sig["lng"])
            if dist <= SIGNAL_IMPACT_RADIUS_KM:
                signals_hit.append(sig)
    impact = get_impact(G, node_id)
    explanation = explain_risk(node_id, G, signals_hit)
    return {
        "risk": impact.get("risk_score", 0),
        "damage": impact.get("damage", 0),
        "time": f"{impact.get('time_days', 0)} days",
        "confidence": explanation.get("confidence", 0.5),
        "why": explanation.get("reasons", []),
        "risk_drivers": explanation.get("risk_drivers", {}),
        "impact": impact,
    }

# ─── Alerts ──────────────────────────────────────────────────────────────────
@app.get("/alerts")
def get_alerts(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    alerts = db.query(models.Alert).order_by(models.Alert.created_at.desc()).limit(100).all()
    return {"alerts": [
        {"id": a.id, "supplier_id": a.supplier_id,
         "supplier_name": a.supplier.name if a.supplier else "Unknown",
         "severity": a.severity, "message": a.message, "risk_value": a.risk_value,
         "acknowledged": a.acknowledged, "created_at": str(a.created_at)}
        for a in alerts
    ]}

@app.post("/alerts/acknowledge")
def acknowledge_alert(req: AcknowledgeAlert, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    alert = db.query(models.Alert).filter(models.Alert.id == req.alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True; db.commit()
    return {"message": "Alert acknowledged"}

# ─── Recommendations ─────────────────────────────────────────────────────────
@app.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    recs = db.query(models.Recommendation).order_by(models.Recommendation.created_at.desc()).all()
    return {"recommendations": [
        {"id": r.id, "supplier_id": r.supplier_id,
         "supplier_name": r.supplier.name if r.supplier else "",
         "alternative_id": r.alternative_id,
         "alternative_name": r.alternative.name if r.alternative else "",
         "cost_saving_pct": r.cost_saving_pct, "risk_reduction_pct": r.risk_reduction_pct,
         "quality_improvement": r.quality_improvement, "profit_gain_pct": r.profit_gain_pct,
         "confidence": r.confidence, "created_at": str(r.created_at)}
        for r in recs
    ]}

@app.post("/recommendations/refresh")
async def refresh_recommendations(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    suppliers = db.query(models.Supplier).all()
    G = get_cached_graph()
    new_recs = run_full_recommendation_pass(suppliers, G)
    count = 0
    for rec in new_recs:
        db_rec = models.Recommendation(
            supplier_id=rec["supplier_id"], alternative_id=rec["alternative_id"],
            cost_saving_pct=rec["cost_saving_pct"], risk_reduction_pct=rec["risk_reduction_pct"],
            quality_improvement=rec["quality_improvement"], profit_gain_pct=rec["profit_gain_pct"],
            confidence=rec["confidence"],
        )
        db.add(db_rec); count += 1
    db.commit()
    await manager.broadcast("recommendation_generated", {"count": count})
    return {"message": f"{count} recommendations generated"}

# ─── Simulate ────────────────────────────────────────────────────────────────
@app.post("/simulate")
async def simulate(req: SimulateRequest, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    G = get_cached_graph()
    if not G:
        G = _rebuild_graph(db)
    suppliers = db.query(models.Supplier).all()
    event = create_synthetic_event(req.lat, req.lng, req.event_type, req.severity, req.label)
    result = run_simulation(G, suppliers, event)
    # Persist
    sim = models.SimulationResult(
        event_type=req.event_type, event_location=f"{req.lat},{req.lng}",
        severity=req.severity, impacted_count=result["total_affected_count"],
        total_loss=result["total_estimated_loss_pct"], result_json=json.dumps(result),
    )
    db.add(sim); db.commit()
    await manager.broadcast("simulation_completed", {"id": sim.id, "impacted": result["total_affected_count"]})
    return result

@app.get("/simulate/history")
def get_simulation_history(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    sims = db.query(models.SimulationResult).order_by(models.SimulationResult.created_at.desc()).limit(20).all()
    return {"simulations": [
        {"id": s.id, "event_type": s.event_type, "severity": s.severity,
         "impacted_count": s.impacted_count, "total_loss": s.total_loss,
         "created_at": str(s.created_at)}
        for s in sims
    ]}

# ─── Signals ─────────────────────────────────────────────────────────────────
@app.get("/signals")
async def get_signals():
    data = await fetch_all_signals()
    return data

@app.get("/api/live-status")
async def get_live_status():
    data = await fetch_all_signals()
    return {
        "disasters": data.get("earthquake", []),
        "conflicts": data.get("geopolitical", []),
        "weather": data.get("weather", []),
        "traffic": [],
        "status": "ELEVATED RISK" if data.get("total", 0) > 10 else "NOMINAL",
    }

# ─── Admin ───────────────────────────────────────────────────────────────────
@app.get("/admin/users")
def admin_users(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    users = db.query(models.User).all()
    return {"users": [{"id": u.id, "email": u.email, "role": u.role, "tier": u.tier, "status": u.status, "company": u.company} for u in users]}

@app.post("/admin/users/{user_id}/approve")
def approve_user(user_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.status = "Approved"; db.commit()
    return {"message": f"User {u.email} approved"}

@app.post("/admin/users/{user_id}/reject")
def reject_user(user_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.status = "Rejected"; db.commit()
    return {"message": f"User {u.email} rejected"}

@app.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    return {
        "total_suppliers": db.query(models.Supplier).count(),
        "total_users": db.query(models.User).count(),
        "pending_users": db.query(models.User).filter(models.User.status == "Pending").count(),
        "active_alerts": db.query(models.Alert).filter(models.Alert.acknowledged == False).count(),
        "simulations_run": db.query(models.SimulationResult).count(),
        "recommendations": db.query(models.Recommendation).count(),
        "pending_suppliers": db.query(models.Supplier).filter(models.Supplier.status == "pending").count(),
        "approved_suppliers": db.query(models.Supplier).filter(models.Supplier.status == "approved").count(),
    }

# ─── Admin Supplier Approval ─────────────────────────────────────────────────
@app.get("/admin/suppliers/pending")
def admin_pending_suppliers(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    suppliers = db.query(models.Supplier).filter(models.Supplier.status == "pending").all()
    return {"suppliers": [
        {"id": s.id, "name": s.name, "tier": s.tier, "lat": s.lat, "lng": s.lng,
         "region": s.region, "product": s.product, "cost": s.cost, "capacity": s.capacity,
         "quality": s.quality, "has_backup": s.has_backup, "status": s.status,
         "owner_email": s.owner.email if s.owner else "System",
         "created_at": str(s.created_at)} for s in suppliers
    ]}

@app.get("/admin/suppliers/all")
def admin_all_suppliers(db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    suppliers = db.query(models.Supplier).all()
    return {"suppliers": [
        {"id": s.id, "name": s.name, "tier": s.tier, "region": s.region,
         "product": s.product, "risk_score": s.risk_score, "status": s.status,
         "has_backup": s.has_backup, "backup_supplier_id": s.backup_supplier_id,
         "owner_email": s.owner.email if s.owner else "System",
         "created_at": str(s.created_at)} for s in suppliers
    ]}

@app.post("/admin/suppliers/{supplier_id}/approve")
async def approve_supplier(supplier_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    s = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    s.status = "approved"; db.commit()
    invalidate_cache(); _rebuild_graph(db)
    await manager.broadcast("supplier_approved", {"id": s.id, "name": s.name})
    return {"message": f"Supplier {s.name} approved"}

@app.post("/admin/suppliers/{supplier_id}/reject")
async def reject_supplier(supplier_id: int, db: Session = Depends(get_db), user: models.User = Depends(require_admin)):
    s = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    s.status = "rejected"; db.commit()
    invalidate_cache(); _rebuild_graph(db)
    return {"message": f"Supplier {s.name} rejected"}

# ─── CSV Bulk Upload ─────────────────────────────────────────────────────────
@app.post("/suppliers/bulk-upload")
async def bulk_upload(file: UploadFile = File(...), db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
    created = []
    errors = []
    for i, row in enumerate(reader):
        try:
            backup_id = row.get("backup_supplier_id", "").strip()
            parent_id = row.get("parent_supplier_id", "").strip()
            
            supplier = models.Supplier(
                name=row.get("name", "").strip(),
                tier=int(row.get("tier", 1)),
                lat=float(row.get("lat", 0)),
                lng=float(row.get("lng", 0)),
                region=row.get("region", "").strip(),
                product=row.get("product", "").strip(),
                cost=float(row.get("cost", 0.5)),
                capacity=float(row.get("capacity", 0.7)),
                quality=float(row.get("quality", 0.8)),
                has_backup=row.get("has_backup", "false").lower() == "true",
                revenue_contribution=float(row.get("revenue_contribution", 0.05)),
                backup_supplier_id=int(backup_id) if backup_id else None,
                status="approved" if user.role in ("Admin", "Buyer") else "pending",
                owner_id=user.id,
            )
            db.add(supplier)
            db.flush() # flush to get supplier.id for the edge
            
            if parent_id:
                edge = models.SupplyEdge(from_supplier_id=int(parent_id), to_supplier_id=supplier.id, dependency_weight=0.8)
                db.add(edge)
                
            created.append(supplier.name)
        except Exception as e:
            errors.append({"row": i + 1, "error": str(e)})
    db.commit()
    if created:
        invalidate_cache(); _rebuild_graph(db)
    return {"created": len(created), "errors": errors, "names": created[:20]}

# ─── Edge Listing ─────────────────────────────────────────────────────────────
@app.get("/edges")
def list_edges(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    edges = db.query(models.SupplyEdge).all()
    result = []
    for e in edges:
        result.append({
            "id": e.id, "from_supplier_id": e.from_supplier_id, "to_supplier_id": e.to_supplier_id,
            "dependency_weight": e.dependency_weight,
            "from_name": e.from_node.name if e.from_node else "", "from_tier": e.from_node.tier if e.from_node else 0,
            "to_name": e.to_node.name if e.to_node else "", "to_tier": e.to_node.tier if e.to_node else 0,
        })
    return {"edges": result}

# ─── Hidden Tier Impact ──────────────────────────────────────────────────────
@app.get("/impact/hidden")
def hidden_tier_impact(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    G = get_cached_graph()
    if not G:
        return {"impacts": []}
    
    # Only show impact for user's owned suppliers (unless Admin)
    query = db.query(models.Supplier).filter(models.Supplier.status == "approved")
    if user.role != "Admin":
        query = query.filter(models.Supplier.owner_id == user.id)
    
    user_suppliers = query.all()
    user_s_ids = {s.id for s in user_suppliers}
    
    # We still need all approved suppliers to trace the graph correctly
    all_suppliers = db.query(models.Supplier).filter(models.Supplier.status == "approved").all()
    smap = {s.id: s for s in all_suppliers}
    
    impacts = []
    for s in all_suppliers:
        # If a hidden tier (T2/T3) has high risk...
        if s.tier >= 2 and s.risk_score >= 0.5 and s.id in G:
            # Trace upstream to find if it hits ANY of the user's Tier 1 suppliers
            from graph_engine import get_upstream_path
            path = get_upstream_path(G, s.id) # returns list of node IDs from leaf to root
            
            # Find the user's Tier 1 suppliers in this path
            for node_id in path:
                node = smap.get(node_id)
                if node and node.tier == 1 and node.id in user_s_ids:
                    impacts.append({
                        "hidden_tier": s.tier, 
                        "hidden_region": s.region,
                        "hidden_id": s.id,
                        "affected_tier1_id": node.id, 
                        "affected_tier1_name": node.name,
                        "risk_score": s.risk_score,
                        "message": f"A hidden Tier {s.tier} supplier disruption in {s.region} is impacting your Tier 1 supplier ({node.name}).",
                    })
                    break # Only report the first hit tier 1 per path for brevity
                    
    return {"impacts": impacts}

# ─── Backup Supplier ─────────────────────────────────────────────────────────
@app.post("/suppliers/{supplier_id}/set-backup/{backup_id}")
def set_backup(supplier_id: int, backup_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    s = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    b = db.query(models.Supplier).filter(models.Supplier.id == backup_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Backup supplier not found")
    s.backup_supplier_id = backup_id
    s.has_backup = True
    db.commit()
    return {"message": f"Backup set: {s.name} → {b.name}"}

@app.post("/api/purge")
async def purge_data(background_tasks: BackgroundTasks, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Wipes all data for the user's workspace. Admins wipe EVERYTHING."""
    try:
        if user.role == "Admin":
            # Direct SQL for maximum speed on large datasets
            db.execute(models.SupplyEdge.__table__.delete())
            db.execute(models.Alert.__table__.delete())
            db.execute(models.Recommendation.__table__.delete())
            db.execute(models.RiskHistory.__table__.delete())
            db.execute(models.SimulationResult.__table__.delete())
            db.execute(models.Supplier.__table__.delete())
            logger.info(f"Admin {user.email} purged ENTIRE system via bulk delete.")
        else:
            # Non-admins: only delete what they own
            user_suppliers = db.query(models.Supplier.id).filter(models.Supplier.owner_id == user.id).all()
            s_ids = [s[0] for s in user_suppliers]
            
            if s_ids:
                # 1. Nullify backup links first
                db.query(models.Supplier).filter(models.Supplier.owner_id == user.id).update({models.Supplier.backup_supplier_id: None}, synchronize_session=False)
                
                # 2. Bulk delete related records
                db.query(models.SupplyEdge).filter(
                    (models.SupplyEdge.from_supplier_id.in_(s_ids)) | 
                    (models.SupplyEdge.to_supplier_id.in_(s_ids))
                ).delete(synchronize_session=False)
                
                db.query(models.Alert).filter(models.Alert.supplier_id.in_(s_ids)).delete(synchronize_session=False)
                db.query(models.Recommendation).filter(
                    (models.Recommendation.supplier_id.in_(s_ids)) |
                    (models.Recommendation.alternative_id.in_(s_ids))
                ).delete(synchronize_session=False)
                db.query(models.RiskHistory).filter(models.RiskHistory.supplier_id.in_(s_ids)).delete(synchronize_session=False)
                
                # 3. Delete suppliers
                db.query(models.Supplier).filter(models.Supplier.owner_id == user.id).delete(synchronize_session=False)
                logger.info(f"User {user.email} purged their workspace ({len(s_ids)} suppliers).")
        
        db.commit()
        invalidate_cache()
        
        # Run graph rebuild in background to avoid blocking the response
        background_tasks.add_task(_background_rebuild)
        
        return {"message": "Workspace successfully purged."}
    except Exception as e:
        db.rollback()
        logger.error(f"Purge failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Purge failed: {str(e)}")

def _background_rebuild():
    """Wrapper to handle DB session in background task."""
    db = next(get_db())
    try:
        _rebuild_graph(db)
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "GlobalChain API v3.0", "status": "operational"}
