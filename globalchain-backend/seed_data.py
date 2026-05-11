"""
GlobalChain — Realistic 30-Node Supplier Seed Data
----------------------------------------------------
3-tier global supply chain:
  Main Company (Tier 0) → Tier 1 → Tier 2 → Tier 3

Run: python seed_data.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
import models
from sqlalchemy import text

models.Base.metadata.create_all(bind=engine)


# ─── Suppliers ───────────────────────────────────────────────────────────────
SUPPLIERS = [
    # ── Tier 1 (direct to main company) ──────────────────────────────────────
    dict(id=1, name="Tokyo Precision Mfg",   tier=1, lat=35.6762, lng=139.6503, region="Japan",       product="Electronics",    cost=0.6, capacity=0.85, quality=0.90, risk_score=0.18, has_backup=True,  revenue_contribution=0.22),
    dict(id=2, name="Shenzhen Pearl River",  tier=1, lat=22.5431, lng=114.0579, region="China",       product="Electronics",    cost=0.4, capacity=0.95, quality=0.75, risk_score=0.62, has_backup=False, revenue_contribution=0.30),
    dict(id=3, name="Seoul Semiconductor",   tier=1, lat=37.5665, lng=126.9780, region="South Korea", product="Semiconductors", cost=0.7, capacity=0.80, quality=0.92, risk_score=0.22, has_backup=True,  revenue_contribution=0.18),
    dict(id=4, name="Rotterdam EuroHub",     tier=1, lat=51.9244, lng=4.4777,   region="Netherlands", product="Logistics",      cost=0.5, capacity=0.90, quality=0.88, risk_score=0.15, has_backup=True,  revenue_contribution=0.12),
    dict(id=5, name="Singapore SeaLink",     tier=1, lat=1.3521,  lng=103.8198, region="Singapore",   product="Logistics",      cost=0.5, capacity=0.88, quality=0.87, risk_score=0.12, has_backup=True,  revenue_contribution=0.10),

    # ── Tier 2 ─────────────────────────────────────────────────────────────────
    dict(id=6, name="Mumbai Components",     tier=2, lat=19.0760, lng=72.8777,  region="India",       product="Electronics",    cost=0.3, capacity=0.70, quality=0.72, risk_score=0.38, has_backup=False, revenue_contribution=0.08),
    dict(id=7, name="Bangkok Electronics",   tier=2, lat=13.7563, lng=100.5018, region="Thailand",    product="Electronics",    cost=0.35,capacity=0.75, quality=0.76, risk_score=0.30, has_backup=True,  revenue_contribution=0.07),
    dict(id=8, name="Vietnam Assembly Co",   tier=2, lat=10.8231, lng=106.6297, region="Vietnam",     product="Manufacturing",  cost=0.25,capacity=0.72, quality=0.70, risk_score=0.33, has_backup=False, revenue_contribution=0.06),
    dict(id=9, name="Malaysia Semi Hub",     tier=2, lat=3.1390,  lng=101.6869, region="Malaysia",    product="Semiconductors", cost=0.45,capacity=0.78, quality=0.82, risk_score=0.20, has_backup=True,  revenue_contribution=0.09),
    dict(id=10,name="Istanbul Transit",      tier=2, lat=41.0082, lng=28.9784,  region="Turkey",      product="Logistics",      cost=0.4, capacity=0.65, quality=0.73, risk_score=0.45, has_backup=False, revenue_contribution=0.05),
    dict(id=11,name="Frankfurt Precision",   tier=2, lat=50.1109, lng=8.6821,   region="Germany",     product="Electronics",    cost=0.8, capacity=0.88, quality=0.95, risk_score=0.10, has_backup=True,  revenue_contribution=0.11),
    dict(id=12,name="Chennai Auto Parts",    tier=2, lat=13.0827, lng=80.2707,  region="India",       product="Manufacturing",  cost=0.28,capacity=0.68, quality=0.71, risk_score=0.35, has_backup=False, revenue_contribution=0.05),
    dict(id=13,name="Johannesburg Minerals", tier=2, lat=-26.2041,lng=28.0473,  region="South Africa",product="Raw Materials",  cost=0.35,capacity=0.60, quality=0.65, risk_score=0.40, has_backup=False, revenue_contribution=0.04),
    dict(id=14,name="Cairo Distribution",   tier=2, lat=30.0444, lng=31.2357,  region="Egypt",       product="Logistics",      cost=0.3, capacity=0.58, quality=0.68, risk_score=0.50, has_backup=False, revenue_contribution=0.03),
    dict(id=15,name="Milan Textile Group",   tier=2, lat=45.4654, lng=9.1859,   region="Italy",       product="Textiles",       cost=0.7, capacity=0.75, quality=0.93, risk_score=0.12, has_backup=True,  revenue_contribution=0.06),

    # ── Tier 3 ─────────────────────────────────────────────────────────────────
    dict(id=16,name="Dhaka Garments Co",     tier=3, lat=23.8103, lng=90.4125,  region="Bangladesh",  product="Textiles",       cost=0.15,capacity=0.85, quality=0.60, risk_score=0.55, has_backup=False, revenue_contribution=0.03),
    dict(id=17,name="Jakarta Raw Supply",    tier=3, lat=-6.2088, lng=106.8456, region="Indonesia",   product="Raw Materials",  cost=0.20,capacity=0.72, quality=0.62, risk_score=0.42, has_backup=False, revenue_contribution=0.02),
    dict(id=18,name="Colombo Port Auth",     tier=3, lat=6.9271,  lng=79.8612,  region="Sri Lanka",   product="Logistics",      cost=0.25,capacity=0.65, quality=0.70, risk_score=0.38, has_backup=False, revenue_contribution=0.02),
    dict(id=19,name="Nairobi Mining Corp",   tier=3, lat=-1.2921, lng=36.8219,  region="Kenya",       product="Raw Materials",  cost=0.18,capacity=0.55, quality=0.58, risk_score=0.48, has_backup=False, revenue_contribution=0.02),
    dict(id=20,name="Karachi Textiles",      tier=3, lat=24.8607, lng=67.0011,  region="Pakistan",    product="Textiles",       cost=0.18,capacity=0.70, quality=0.62, risk_score=0.60, has_backup=False, revenue_contribution=0.02),
    dict(id=21,name="Lima Copper Mine",      tier=3, lat=-12.0464,lng=-77.0428, region="Peru",        product="Raw Materials",  cost=0.22,capacity=0.65, quality=0.65, risk_score=0.35, has_backup=False, revenue_contribution=0.02),
    dict(id=22,name="Lagos Port Logistics",  tier=3, lat=6.5244,  lng=3.3792,   region="Nigeria",     product="Logistics",      cost=0.20,capacity=0.50, quality=0.58, risk_score=0.65, has_backup=False, revenue_contribution=0.02),
    dict(id=23,name="Hanoi Sub-Assembly",    tier=3, lat=21.0278, lng=105.8342, region="Vietnam",     product="Manufacturing",  cost=0.20,capacity=0.68, quality=0.64, risk_score=0.36, has_backup=False, revenue_contribution=0.02),
    dict(id=24,name="Guangzhou Subparts",    tier=3, lat=23.1291, lng=113.2644, region="China",       product="Electronics",    cost=0.22,capacity=0.80, quality=0.68, risk_score=0.58, has_backup=False, revenue_contribution=0.03),
    dict(id=25,name="Busan Port Logistics",  tier=3, lat=35.1796, lng=129.0756, region="South Korea", product="Logistics",      cost=0.30,capacity=0.75, quality=0.79, risk_score=0.18, has_backup=True,  revenue_contribution=0.02),
    dict(id=26,name="Santiago Minerals",     tier=3, lat=-33.4489,lng=-70.6693, region="Chile",       product="Raw Materials",  cost=0.25,capacity=0.60, quality=0.67, risk_score=0.28, has_backup=False, revenue_contribution=0.02),
    dict(id=27,name="Antwerp Trade Hub",     tier=3, lat=51.2194, lng=4.4025,   region="Belgium",     product="Logistics",      cost=0.55,capacity=0.85, quality=0.88, risk_score=0.10, has_backup=True,  revenue_contribution=0.03),
    dict(id=28,name="Osaka Materials",       tier=3, lat=34.6937, lng=135.5023, region="Japan",       product="Raw Materials",  cost=0.50,capacity=0.78, quality=0.86, risk_score=0.15, has_backup=True,  revenue_contribution=0.02),
    dict(id=29,name="Taipei Precision",      tier=3, lat=25.0330, lng=121.5654, region="Taiwan",      product="Semiconductors", cost=0.55,capacity=0.82, quality=0.90, risk_score=0.22, has_backup=True,  revenue_contribution=0.03),
    dict(id=30,name="Ho Chi Minh Textiles",  tier=3, lat=10.7769, lng=106.7009, region="Vietnam",     product="Textiles",       cost=0.18,capacity=0.73, quality=0.66, risk_score=0.38, has_backup=False, revenue_contribution=0.02),
]

# ─── Edges: from_id → to_id (downstream → upstream) ─────────────────────────
EDGES = [
    # Tier 1 → Tier 2 connections
    dict(from_id=1, to_id=6,  weight=0.7),   # Tokyo → Mumbai Components
    dict(from_id=1, to_id=7,  weight=0.8),   # Tokyo → Bangkok Electronics
    dict(from_id=1, to_id=11, weight=0.9),   # Tokyo → Frankfurt Precision
    dict(from_id=2, to_id=6,  weight=0.9),   # Shenzhen → Mumbai Components
    dict(from_id=2, to_id=8,  weight=0.85),  # Shenzhen → Vietnam Assembly
    dict(from_id=2, to_id=24, weight=0.8),   # Shenzhen → Guangzhou Subparts (T3 direct)
    dict(from_id=3, to_id=9,  weight=0.8),   # Seoul → Malaysia Semi
    dict(from_id=3, to_id=7,  weight=0.6),   # Seoul → Bangkok Electronics
    dict(from_id=4, to_id=10, weight=0.7),   # Rotterdam → Istanbul Transit
    dict(from_id=4, to_id=27, weight=0.9),   # Rotterdam → Antwerp Hub
    dict(from_id=5, to_id=18, weight=0.75),  # Singapore → Colombo Port
    dict(from_id=5, to_id=14, weight=0.65),  # Singapore → Cairo Distribution

    # Tier 2 → Tier 3 connections
    dict(from_id=6,  to_id=16, weight=0.8),  # Mumbai → Dhaka Garments
    dict(from_id=6,  to_id=17, weight=0.7),  # Mumbai → Jakarta Raw
    dict(from_id=7,  to_id=23, weight=0.85), # Bangkok → Hanoi Sub-Assembly
    dict(from_id=7,  to_id=30, weight=0.75), # Bangkok → Ho Chi Minh Textiles
    dict(from_id=8,  to_id=23, weight=0.8),  # Vietnam → Hanoi Sub-Assembly
    dict(from_id=9,  to_id=29, weight=0.9),  # Malaysia → Taipei Precision
    dict(from_id=9,  to_id=25, weight=0.7),  # Malaysia → Busan Port
    dict(from_id=10, to_id=22, weight=0.6),  # Istanbul → Lagos Port
    dict(from_id=10, to_id=19, weight=0.65), # Istanbul → Nairobi Mining
    dict(from_id=11, to_id=28, weight=0.8),  # Frankfurt → Osaka Materials
    dict(from_id=11, to_id=27, weight=0.85), # Frankfurt → Antwerp Hub
    dict(from_id=12, to_id=20, weight=0.75), # Chennai → Karachi Textiles
    dict(from_id=12, to_id=17, weight=0.7),  # Chennai → Jakarta Raw
    dict(from_id=13, to_id=21, weight=0.8),  # Johannesburg → Lima Copper
    dict(from_id=13, to_id=26, weight=0.7),  # Johannesburg → Santiago Minerals
    dict(from_id=14, to_id=22, weight=0.7),  # Cairo → Lagos Port
    dict(from_id=15, to_id=16, weight=0.85), # Milan → Dhaka Garments
    dict(from_id=15, to_id=20, weight=0.8),  # Milan → Karachi Textiles
]

# ─── Admin user ──────────────────────────────────────────────────────────────
ADMIN = dict(email="admin@globalchain.com", password="Admin@1234", role="Admin", tier=0, status="Approved", company="GlobalTech HQ")
DEMO_BUYER = dict(email="buyer@globalchain.com", password="Buyer@1234", role="Buyer", tier=0, status="Approved", company="GlobalTech HQ")
DEMO_SUPPLIER = dict(email="supplier@globalchain.com", password="Supplier@1234", role="Supplier", tier=1, status="Approved", company="Tokyo Precision Mfg")


def run_seed():
    from auth import get_password_hash
    db = SessionLocal()
    try:
        print("[SEED] Seeding GlobalChain database...")

        # Clear existing data
        db.query(models.RiskHistory).delete()
        db.query(models.SimulationResult).delete()
        db.query(models.Recommendation).delete()
        db.query(models.Alert).delete()
        db.query(models.SupplyEdge).delete()
        db.query(models.Supplier).delete()
        db.query(models.User).delete()
        db.commit()
        print("  [OK] Cleared existing data")

        # Seed users
        for u_data in [ADMIN, DEMO_BUYER, DEMO_SUPPLIER]:
            user = models.User(
                email=u_data["email"],
                hashed_password=get_password_hash(u_data["password"]),
                role=u_data["role"],
                tier=u_data["tier"],
                status=u_data["status"],
                company=u_data["company"],
            )
            db.add(user)
        db.commit()
        print(f"  [OK] Created {3} demo users")

        # Seed suppliers
        for s_data in SUPPLIERS:
            supplier = models.Supplier(
                id=s_data["id"],
                name=s_data["name"],
                tier=s_data["tier"],
                lat=s_data["lat"],
                lng=s_data["lng"],
                region=s_data["region"],
                product=s_data["product"],
                cost=s_data["cost"],
                capacity=s_data["capacity"],
                quality=s_data["quality"],
                risk_score=s_data["risk_score"],
                has_backup=s_data["has_backup"],
                revenue_contribution=s_data["revenue_contribution"],
                dependency_score=0.0,
                supplier_score=0.5,
                status="approved",
            )
            db.add(supplier)
        db.commit()
        print(f"  [OK] Created {len(SUPPLIERS)} suppliers (Tier 1-3)")

        # Seed edges
        for e_data in EDGES:
            edge = models.SupplyEdge(
                from_supplier_id=e_data["from_id"],
                to_supplier_id=e_data["to_id"],
                dependency_weight=e_data["weight"],
            )
            db.add(edge)
        db.commit()
        print(f"  [OK] Created {len(EDGES)} supply chain edges")

        # Reset PostgreSQL sequences to avoid PK conflicts
        if engine.url.drivername.startswith("postgresql"):
            print("  [INFO] Resetting PostgreSQL sequences...")
            tables = ["users", "suppliers", "supply_edges", "alerts", "recommendations", "simulation_results", "risk_history"]
            for table in tables:
                db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1), true) FROM {table};"))
            db.commit()
            print("  [OK] Sequences reset")

        print("\n[DONE] Seed complete!")
        print("   Admin:    admin@globalchain.com / Admin@1234")
        print("   Buyer:    buyer@globalchain.com / Buyer@1234")
        print("   Supplier: supplier@globalchain.com / Supplier@1234")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
