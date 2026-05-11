"""
GlobalChain — Simulation Engine
----------------------------------
CRITICAL: Simulation NEVER modifies real data.
It clones the graph, injects a synthetic event, and runs the FULL pipeline
(risk → propagation → impact → alerts → recommendations) on the clone.
"""

import copy
import math
from typing import List, Dict, Any, Optional
import networkx as nx
from graph_engine import (
    clone_graph, bfs_propagate, calculate_dependency_scores,
    get_impact, serialize_graph, haversine_distance
)
from risk_engine import map_signals_to_suppliers

SIGNAL_RADIUS_KM = 500


def create_synthetic_event(
    lat: float,
    lng: float,
    event_type: str,
    severity: float,
    label: Optional[str] = None,
) -> Dict[str, Any]:
    """Build a synthetic signal object in the same format as real signals."""
    titles = {
        "earthquake":  f"Simulated M{round(severity * 9, 1)} Earthquake",
        "typhoon":     "Simulated Typhoon / Category Storm",
        "flood":       "Simulated River / Coastal Flooding",
        "port_strike": "Simulated Port Labour Strike",
        "war":         "Simulated Armed Conflict / Blockade",
        "fire":        "Simulated Industrial Fire / Explosion",
        "pandemic":    "Simulated Disease Outbreak / Quarantine",
    }
    return {
        "type": event_type,
        "lat": lat,
        "lng": lng,
        "severity": max(0.0, min(1.0, severity)),
        "title": label or titles.get(event_type, "Simulated Disruption Event"),
        "source": "simulation",
        "is_simulation": True,
    }


def run_simulation(
    G_real: nx.DiGraph,
    db_suppliers: List[Any],
    event: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Run full disruption simulation on a CLONED graph.
    
    Pipeline:
    1. Clone real graph
    2. Map event → affected supplier nodes (by geo-proximity)
    3. Update risk scores on clone
    4. BFS propagate upstream
    5. Calculate impact for each affected node
    6. Generate alert summary
    7. Generate recommendation hints
    8. Return structured result
    
    Real graph is NEVER modified.
    """

    # ── Step 1: Clone graph ──────────────────────────────────────────────────
    G_sim = clone_graph(G_real)

    # ── Step 2: Map event to nearby suppliers ────────────────────────────────
    directly_affected = []
    for s in db_suppliers:
        if s.lat is None or s.lng is None:
            continue
        dist = haversine_distance(s.lat, s.lng, event["lat"], event["lng"])
        if dist <= SIGNAL_RADIUS_KM:
            attenuation = 1.0 - (dist / SIGNAL_RADIUS_KM) * 0.4
            effective_sev = event["severity"] * attenuation
            directly_affected.append({
                "supplier_id": s.id,
                "name": s.name,
                "distance_km": round(dist, 1),
                "effective_severity": round(effective_sev, 3),
                "tier": s.tier,
            })

    # ── Step 3: Update risk on clone ─────────────────────────────────────────
    all_changed_nodes: Dict[int, float] = {}

    for affected in directly_affected:
        sid = affected["supplier_id"]
        if sid in G_sim:
            old_risk = G_sim.nodes[sid].get("risk_score", 0.0)
            new_risk = min(1.0, old_risk + affected["effective_severity"])
            G_sim.nodes[sid]["risk_score"] = new_risk
            all_changed_nodes[sid] = new_risk

    # ── Step 4: BFS propagate from each affected node ────────────────────────
    propagated_all: Dict[int, float] = {}
    for affected in directly_affected:
        sid = affected["supplier_id"]
        propagated = bfs_propagate(G_sim, sid)
        propagated_all.update(propagated)
        all_changed_nodes.update(propagated)

    # ── Step 5: Recalculate dependency scores on clone ───────────────────────
    calculate_dependency_scores(G_sim)

    # ── Step 6: Impact for all changed nodes ─────────────────────────────────
    impacts = []
    total_loss = 0.0
    critical_count = 0
    moderate_count = 0

    for node_id, risk in all_changed_nodes.items():
        impact = get_impact(G_sim, node_id)
        if impact:
            impacts.append(impact)
            total_loss += impact.get("loss_fraction", 0.0)
            if risk >= 0.8:
                critical_count += 1
            elif risk >= 0.5:
                moderate_count += 1

    # Sort by damage descending
    impacts.sort(key=lambda x: x.get("damage", 0), reverse=True)

    # ── Step 7: Alert summary ────────────────────────────────────────────────
    alerts_generated = []
    for imp in impacts:
        risk = imp["risk_score"]
        if risk >= 0.8:
            sev = "Critical"
        elif risk >= 0.5:
            sev = "Moderate"
        else:
            sev = "Low"
        alerts_generated.append({
            "node_id": imp["node_id"],
            "name": imp["name"],
            "severity": sev,
            "risk": imp["risk_score"],
        })

    # ── Step 8: Upstream path (for globe visualization) ──────────────────────
    upstream_chain = []
    for affected in directly_affected:
        sid = affected["supplier_id"]
        if sid in G_sim:
            path = _get_bfs_upstream_ids(G_sim, sid)
            upstream_chain.extend(path)
    upstream_chain = list(set(upstream_chain))

    # ── Confidence score ─────────────────────────────────────────────────────
    confidence = 0.75 if event.get("source") == "simulation" else 0.5

    return {
        "event": event,
        "directly_affected": directly_affected,
        "total_affected_count": len(all_changed_nodes),
        "critical_count": critical_count,
        "moderate_count": moderate_count,
        "total_estimated_loss_pct": round(total_loss * 100, 2),
        "impacts": impacts[:20],  # Top 20
        "alerts": alerts_generated,
        "upstream_chain": upstream_chain,
        "confidence": confidence,
        "graph_snapshot": {
            "affected_node_ids": list(all_changed_nodes.keys()),
            "risk_values": {str(k): round(v, 3) for k, v in all_changed_nodes.items()},
        }
    }


def _get_bfs_upstream_ids(G: nx.DiGraph, node_id: int) -> List[int]:
    """Get all upstream ancestors via BFS."""
    visited, queue = set(), [node_id]
    while queue:
        nid = queue.pop(0)
        if nid in visited:
            continue
        visited.add(nid)
        for pred in G.predecessors(nid):
            if pred not in visited:
                queue.append(pred)
    return list(visited)
