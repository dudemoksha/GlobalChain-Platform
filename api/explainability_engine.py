"""
GlobalChain — Explainability Engine
--------------------------------------
Generates structured, human-readable explanations for why a supplier has
a given risk score. Supports globe click panel and API responses.
"""

from typing import List, Dict, Any, Optional
import networkx as nx

# Thresholds for reason generation
HIGH_RISK_THRESHOLD = 0.7
MODERATE_RISK_THRESHOLD = 0.4
HIGH_DEP_THRESHOLD = 0.3
LOW_QUALITY_THRESHOLD = 0.5
HIGH_COST_THRESHOLD = 0.7
LOW_CAPACITY_THRESHOLD = 0.4

# High-risk regions (known from geopolitical / weather signals)
HIGH_RISK_REGIONS = {
    "China", "Ukraine", "Russia", "Gaza", "Yemen", "Sudan",
    "Myanmar", "Pakistan", "Bangladesh", "Haiti", "Libya",
}

TYPHOON_PRONE = {"Philippines", "Taiwan", "Japan", "Vietnam", "China"}
FLOOD_PRONE   = {"Bangladesh", "India", "Pakistan", "Nigeria", "Mozambique"}
SEISMIC_ZONES = {"Japan", "Chile", "Turkey", "Nepal", "Indonesia", "New Zealand"}
DROUGHT_ZONES = {"Ethiopia", "Somalia", "Kenya", "Morocco"}


def explain_risk(
    node_id: int,
    G: nx.DiGraph,
    signals_hit: Optional[List[Dict]] = None,
    db_supplier=None,
) -> Dict[str, Any]:
    """
    Generate structured explanation for a supplier's risk score.
    
    Returns:
    {
        "reasons": ["...", "..."],
        "confidence": 0.85,
        "risk_drivers": {"geopolitical": 0.4, "natural": 0.3, "structural": 0.2}
    }
    """
    if node_id not in G:
        return {"reasons": ["Node not found in graph."], "confidence": 0.0}

    node = G.nodes[node_id]
    reasons = []
    risk_drivers = {"geopolitical": 0.0, "natural": 0.0, "structural": 0.0}

    risk = node.get("risk_score", 0.0)
    dep = node.get("dependency_score", 0.0)
    quality = node.get("quality", 1.0)
    capacity = node.get("capacity", 1.0)
    has_backup = node.get("has_backup", True)
    region = node.get("region", "")
    tier = node.get("tier", 1)

    # ── Geopolitical reasons ──────────────────────────────────────────────────
    if region in HIGH_RISK_REGIONS:
        reasons.append(f"Located in geopolitically high-risk region ({region})")
        risk_drivers["geopolitical"] += 0.4

    if signals_hit:
        conflict_signals = [s for s in signals_hit if s.get("type") in ("conflict", "sanctions", "war")]
        if conflict_signals:
            reasons.append(f"Active geopolitical conflict detected nearby ({conflict_signals[0]['title']})")
            risk_drivers["geopolitical"] += 0.3

        port_signals = [s for s in signals_hit if s.get("type") == "port_strike"]
        if port_signals:
            reasons.append("Port labour strike or operational disruption reported in the area")
            risk_drivers["geopolitical"] += 0.2

    # ── Natural disaster reasons ──────────────────────────────────────────────
    if region in TYPHOON_PRONE:
        reasons.append(f"Region ({region}) is historically typhoon/cyclone prone")
        risk_drivers["natural"] += 0.2

    if region in FLOOD_PRONE:
        reasons.append(f"Region ({region}) has high flood risk")
        risk_drivers["natural"] += 0.2

    if region in SEISMIC_ZONES:
        reasons.append(f"Region ({region}) is in an active seismic zone")
        risk_drivers["natural"] += 0.2

    if signals_hit:
        quake_signals = [s for s in signals_hit if s.get("type") == "earthquake"]
        if quake_signals:
            mag = quake_signals[0].get("magnitude", 5.0)
            reasons.append(f"Seismic event (M{round(mag, 1)}) detected within impact radius")
            risk_drivers["natural"] += 0.3

        weather_signals = [s for s in signals_hit if s.get("type") in ("typhoon", "flood", "cyclone", "hurricane")]
        if weather_signals:
            reasons.append(f"Severe weather event ({weather_signals[0]['type'].title()}) active nearby")
            risk_drivers["natural"] += 0.3

    # ── Structural / supply chain reasons ────────────────────────────────────
    if dep >= HIGH_DEP_THRESHOLD:
        reasons.append(f"High dependency score ({round(dep, 2)}) — many upstream nodes rely on this supplier")
        risk_drivers["structural"] += 0.3

    if not has_backup:
        reasons.append("No backup supplier configured — single point of failure")
        risk_drivers["structural"] += 0.35

    if quality < LOW_QUALITY_THRESHOLD:
        reasons.append(f"Quality rating is below threshold ({round(quality * 100)}%) — reliability concern")
        risk_drivers["structural"] += 0.15

    if capacity < LOW_CAPACITY_THRESHOLD:
        reasons.append(f"Low production capacity ({round(capacity * 100)}%) — surge demand risk")
        risk_drivers["structural"] += 0.15

    if tier == 3:
        reasons.append("Tier 3 supplier — furthest from visibility, hardest to monitor and switch")
        risk_drivers["structural"] += 0.1

    # Check upstream propagation impact
    in_degree = G.in_degree(node_id) if node_id in G else 0
    if in_degree == 0 and tier > 1:
        reasons.append("This supplier has no registered upstream links — data coverage gap")
        risk_drivers["structural"] += 0.1

    # ── Downstream impact ─────────────────────────────────────────────────────
    downstream = list(G.successors(node_id)) if node_id in G else []
    if len(downstream) > 3:
        reasons.append(f"Disruption cascades to {len(downstream)} downstream suppliers across the chain")
        risk_drivers["structural"] += 0.2

    # ── Fallback if no reasons found ─────────────────────────────────────────
    if not reasons:
        if risk > 0.4:
            reasons.append("Risk score elevated by aggregated upstream disruption signals")
        else:
            reasons.append("No major disruptions currently detected in this region")

    # ── Confidence: how many signal types contributed ────────────────────────
    signals_count = len(signals_hit) if signals_hit else 0
    confidence = min(1.0, 0.4 + signals_count * 0.15)

    # Normalize risk drivers to 0–1
    total_driver = sum(risk_drivers.values()) or 1
    risk_drivers = {k: round(v / total_driver, 3) for k, v in risk_drivers.items()}

    return {
        "reasons": reasons[:5],  # Max 5 reasons
        "confidence": round(confidence, 3),
        "risk_drivers": risk_drivers,
    }


def explain_consumer_impact(
    product: str,
    risk: float,
    damage: float,
    time_days: float,
) -> Dict[str, Any]:
    """
    Map product + disruption metrics → consumer market impact.
    Returns shortage probability, price increase, delivery delay.
    """
    # Product sensitivity map
    HIGH_SENSITIVITY = {"Electronics", "Semiconductors", "Pharmaceuticals", "Automotive"}
    MEDIUM_SENSITIVITY = {"Textiles", "Manufacturing", "Chemicals", "Food"}

    base_shortage = damage * 0.8
    base_price_increase = risk * 25  # Up to 25% price increase
    delivery_delay = time_days

    if product in HIGH_SENSITIVITY:
        shortage_prob = min(0.99, base_shortage * 1.3)
        price_increase_pct = round(base_price_increase * 1.4, 1)
    elif product in MEDIUM_SENSITIVITY:
        shortage_prob = min(0.99, base_shortage * 1.0)
        price_increase_pct = round(base_price_increase * 1.0, 1)
    else:
        shortage_prob = min(0.99, base_shortage * 0.7)
        price_increase_pct = round(base_price_increase * 0.7, 1)

    return {
        "product": product,
        "shortage_probability": round(shortage_prob, 3),
        "price_increase_pct": price_increase_pct,
        "delivery_delay_days": round(delivery_delay, 1),
        "consumer_severity": (
            "High" if shortage_prob > 0.6
            else "Medium" if shortage_prob > 0.3
            else "Low"
        ),
    }
