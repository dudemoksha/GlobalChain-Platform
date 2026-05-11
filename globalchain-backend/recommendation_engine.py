"""
GlobalChain — Recommendation Engine
--------------------------------------
Scores candidate suppliers using normalized attributes, filters by product
and risk region, compares against current supplier, and recommends switch
only when new_score > current_score * threshold.
"""

import math
from typing import List, Dict, Any, Optional
import networkx as nx


SCORE_THRESHOLD = 1.10  # Recommend only if 10% better


def normalize_values(suppliers: List[Any]) -> Dict[int, Dict]:
    """
    Min-max normalize cost, capacity, quality across all suppliers.
    Returns normalized dict keyed by supplier.id.
    """
    if not suppliers:
        return {}

    costs = [s.cost for s in suppliers if s.cost is not None]
    caps = [s.capacity for s in suppliers if s.capacity is not None]
    quals = [s.quality for s in suppliers if s.quality is not None]

    def norm(val, min_v, max_v):
        if max_v == min_v:
            return 0.5
        return (val - min_v) / (max_v - min_v)

    min_c, max_c = min(costs, default=0), max(costs, default=1)
    min_cap, max_cap = min(caps, default=0), max(caps, default=1)
    min_q, max_q = min(quals, default=0), max(quals, default=1)

    result = {}
    for s in suppliers:
        result[s.id] = {
            "norm_cost": norm(s.cost, min_c, max_c),
            "norm_capacity": norm(s.capacity, min_cap, max_cap),
            "norm_quality": norm(s.quality, min_q, max_q),
        }
    return result


def score_supplier(supplier: Any, norm: Dict) -> float:
    """
    score = (1 - risk)*0.35 + (1 - norm_cost)*0.25 + norm_capacity*0.2 + norm_quality*0.2
    
    All inputs are normalized 0–1. Higher score = better supplier.
    """
    n = norm.get(supplier.id, {})
    risk = supplier.risk_score or 0.0
    norm_cost = n.get("norm_cost", 0.5)
    norm_cap = n.get("norm_capacity", 0.5)
    norm_qual = n.get("norm_quality", 0.5)

    return round(
        (1 - risk) * 0.35
        + (1 - norm_cost) * 0.25
        + norm_cap * 0.2
        + norm_qual * 0.2,
        4
    )


def find_alternatives(
    target_supplier: Any,
    all_suppliers: List[Any],
    norm_map: Dict,
    exclude_same_risk_region: bool = True,
) -> List[Dict]:
    """
    Find alternative suppliers:
    1. Same product category
    2. Different from target
    3. Optionally exclude same high-risk region (risk > 0.6)
    4. Ranked by score descending
    """
    candidates = []
    target_score = score_supplier(target_supplier, norm_map)

    for s in all_suppliers:
        if s.id == target_supplier.id:
            continue
        if s.product.lower() != target_supplier.product.lower():
            continue

        # Exclude same risk region if both are high-risk
        if exclude_same_risk_region:
            if s.risk_score > 0.6 and target_supplier.risk_score > 0.6:
                if s.region == target_supplier.region:
                    continue

        candidate_score = score_supplier(s, norm_map)
        candidates.append({
            "supplier": s,
            "score": candidate_score,
            "target_score": target_score,
        })

    # Sort by score descending
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates


def generate_recommendation(
    current: Any,
    alternative: Any,
    norm_map: Dict,
) -> Optional[Dict[str, Any]]:
    """
    Generate a recommendation comparing current vs alternative supplier.
    Returns None if alternative is not meaningfully better.
    """
    current_score = score_supplier(current, norm_map)
    alt_score = score_supplier(alternative, norm_map)

    if alt_score <= current_score * SCORE_THRESHOLD:
        return None  # Not worth recommending

    # Calculate improvement metrics
    cost_saving_pct = round(((current.cost - alternative.cost) / max(current.cost, 0.001)) * 100, 1)
    risk_reduction_pct = round((current.risk_score - alternative.risk_score) * 100, 1)
    quality_improvement = round((alternative.quality - current.quality) * 100, 1)

    # Estimated profit gain: cost_saving * revenue_contribution * 100
    profit_gain_pct = round(
        ((cost_saving_pct / 100) * current.revenue_contribution +
         (risk_reduction_pct / 100) * current.revenue_contribution * 0.5) * 100,
        1
    )

    return {
        "supplier_id": current.id,
        "supplier_name": current.name,
        "alternative_id": alternative.id,
        "alternative_name": alternative.name,
        "current_score": current_score,
        "alternative_score": alt_score,
        "score_improvement_pct": round((alt_score / current_score - 1) * 100, 1),
        "cost_saving_pct": cost_saving_pct,
        "risk_reduction_pct": risk_reduction_pct,
        "quality_improvement": quality_improvement,
        "profit_gain_pct": profit_gain_pct,
        "confidence": round(min(1.0, alt_score), 3),
        "product": current.product,
        "region_safe": alternative.region,
    }


def run_full_recommendation_pass(
    db_suppliers: List[Any],
    G: Optional[nx.DiGraph] = None,
) -> List[Dict[str, Any]]:
    """
    Run recommendation engine for ALL suppliers in DB.
    Returns list of all viable recommendations.
    """
    norm_map = normalize_values(db_suppliers)
    recommendations = []

    # Focus on high-risk suppliers (risk > 0.4)
    high_risk = [s for s in db_suppliers if s.risk_score > 0.4]

    for supplier in high_risk:
        candidates = find_alternatives(supplier, db_suppliers, norm_map)
        for candidate in candidates[:3]:  # Top 3 candidates per supplier
            rec = generate_recommendation(supplier, candidate["supplier"], norm_map)
            if rec:
                recommendations.append(rec)

    return recommendations


def auto_evaluate_new_supplier(
    new_supplier: Any,
    all_suppliers: List[Any],
) -> List[Dict[str, Any]]:
    """
    Triggered when a new supplier is added.
    Evaluates if new supplier is better than any existing high-risk supplier.
    """
    norm_map = normalize_values(all_suppliers + [new_supplier])
    new_score = score_supplier(new_supplier, norm_map)

    triggered_recs = []
    for existing in all_suppliers:
        if existing.product.lower() != new_supplier.product.lower():
            continue
        if existing.id == new_supplier.id:
            continue

        existing_score = score_supplier(existing, norm_map)
        if new_score > existing_score * SCORE_THRESHOLD:
            rec = generate_recommendation(existing, new_supplier, norm_map)
            if rec:
                triggered_recs.append(rec)

    return triggered_recs
