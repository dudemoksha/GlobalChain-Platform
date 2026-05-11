"""
GlobalChain — Alert Engine
----------------------------
Scans all supplier nodes for risk/damage above thresholds.
Creates, categorizes, and persists alerts to the database.
"""

from typing import List, Dict, Any
import networkx as nx
from graph_engine import get_impact

RISK_THRESHOLD_CRITICAL  = 0.8
RISK_THRESHOLD_MODERATE  = 0.5
DAMAGE_THRESHOLD_CRITICAL = 0.6
DAMAGE_THRESHOLD_MODERATE = 0.3


def categorize_severity(risk: float, damage: float) -> str:
    """Determine alert severity from risk and damage scores."""
    if risk >= RISK_THRESHOLD_CRITICAL or damage >= DAMAGE_THRESHOLD_CRITICAL:
        return "Critical"
    if risk >= RISK_THRESHOLD_MODERATE or damage >= DAMAGE_THRESHOLD_MODERATE:
        return "Moderate"
    return "Low"


def build_alert_message(node_data: Dict, impact: Dict, severity: str) -> str:
    """Generate human-readable alert message."""
    name = node_data.get("name", "Unknown Supplier")
    risk = impact.get("risk_score", 0)
    damage = impact.get("damage", 0)
    time_days = impact.get("time_days", 0)
    region = node_data.get("region", "Unknown Region")

    prefix = {
        "Critical": "🚨 CRITICAL ALERT",
        "Moderate": "⚠️ MODERATE ALERT",
        "Low":      "ℹ️ LOW ALERT",
    }.get(severity, "ALERT")

    return (
        f"{prefix}: {name} ({region}) — "
        f"Risk {round(risk * 100)}%, Damage Score {round(damage, 2)}, "
        f"Estimated delay {time_days} days."
    )


def scan_and_generate_alerts(
    G: nx.DiGraph,
    db_suppliers: List[Any],
    db,  # SQLAlchemy session
) -> List[Dict[str, Any]]:
    """
    Scan all nodes in graph, check thresholds, generate + persist alerts.
    Returns list of newly created alert dicts.
    """
    import models

    new_alerts = []

    for supplier in db_suppliers:
        if supplier.id not in G:
            continue

        node_data = G.nodes[supplier.id]
        risk = node_data.get("risk_score", 0.0)
        impact = get_impact(G, supplier.id)
        damage = impact.get("damage", 0.0)

        # Only alert if above lowest threshold
        if risk < RISK_THRESHOLD_MODERATE and damage < DAMAGE_THRESHOLD_MODERATE:
            continue

        severity = categorize_severity(risk, damage)
        message = build_alert_message(node_data, impact, severity)

        # Check for existing unacknowledged alert for this supplier + severity
        existing = db.query(models.Alert).filter(
            models.Alert.supplier_id == supplier.id,
            models.Alert.severity == severity,
            models.Alert.acknowledged == False,
        ).first()

        if existing:
            # Update risk value but don't create duplicate
            existing.risk_value = round(risk, 3)
            existing.message = message
            db.commit()
            continue

        alert = models.Alert(
            supplier_id=supplier.id,
            severity=severity,
            message=message,
            risk_value=round(risk, 3),
            acknowledged=False,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        new_alerts.append({
            "id": alert.id,
            "supplier_id": supplier.id,
            "supplier_name": supplier.name,
            "severity": severity,
            "message": message,
            "risk_value": alert.risk_value,
        })

    return new_alerts


def get_alert_summary(db_alerts: List[Any]) -> Dict[str, Any]:
    """Summarize alerts by severity for dashboard widget."""
    summary = {"Critical": 0, "Moderate": 0, "Low": 0, "total": 0}
    for a in db_alerts:
        if not a.acknowledged:
            summary[a.severity] = summary.get(a.severity, 0) + 1
            summary["total"] += 1
    return summary
