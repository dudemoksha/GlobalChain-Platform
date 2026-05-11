"""
GlobalChain — Risk Engine
---------------------------
Fetches real-time external signals (USGS seismic, weather, news fallbacks),
maps them to supplier nodes by geographic proximity, and updates risk scores.

Runs on a 5-minute scheduler loop as a background asyncio task.
"""

import asyncio
import httpx
import math
import time
import logging
from typing import List, Dict, Any, Optional
from graph_engine import haversine_distance, bfs_propagate, get_cached_graph

logger = logging.getLogger("risk_engine")

# ─── Signal cache ─────────────────────────────────────────────────────────────
_signal_cache: Dict[str, Any] = {"data": None, "timestamp": 0}
CACHE_TTL = 300  # 5 minutes

# ─── Thresholds ───────────────────────────────────────────────────────────────
SIGNAL_IMPACT_RADIUS_KM = 500   # Signal affects suppliers within 500km
BASE_RISK_DECAY = 0.95          # Each cycle, risk decays slightly if no new signal


async def fetch_usgs_signals(client: httpx.AsyncClient) -> List[Dict]:
    """Fetch USGS earthquake events ≥ M4.5 in past 24h."""
    try:
        res = await client.get(
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
            timeout=10.0
        )
        res.raise_for_status()
        data = res.json()
        signals = []
        for feature in data.get("features", [])[:20]:
            coords = feature["geometry"]["coordinates"]
            mag = feature["properties"].get("mag", 4.5)
            signals.append({
                "type": "earthquake",
                "lat": coords[1],
                "lng": coords[0],
                "magnitude": mag,
                "title": feature["properties"]["title"],
                # Severity: M4.5=0.3, M6=0.6, M7+=0.9
                "severity": min(1.0, (mag - 4.0) / 5.0),
                "source": "USGS"
            })
        return signals
    except Exception as e:
        logger.warning(f"USGS fetch failed: {e}")
        return []


async def fetch_weather_signals(client: httpx.AsyncClient) -> List[Dict]:
    """
    Simulated severe weather events (realistic global hotspots).
    In production: replace with OpenWeatherMap API or NOAA alerts.
    """
    WEATHER_EVENTS = [
        {"type": "typhoon",    "lat": 20.0,  "lng": 120.0, "severity": 0.75, "title": "Typhoon near Philippines", "source": "weather_sim"},
        {"type": "hurricane",  "lat": 25.0,  "lng": -80.0, "severity": 0.65, "title": "Hurricane Gulf of Mexico", "source": "weather_sim"},
        {"type": "flood",      "lat": 23.5,  "lng": 90.0,  "severity": 0.55, "title": "Bangladesh River Flooding", "source": "weather_sim"},
        {"type": "cyclone",    "lat": -20.0, "lng": 57.0,  "severity": 0.50, "title": "Cyclone Indian Ocean",     "source": "weather_sim"},
        {"type": "blizzard",   "lat": 55.0,  "lng": 37.0,  "severity": 0.40, "title": "Blizzard Eastern Europe",  "source": "weather_sim"},
    ]
    # Add slight randomness to simulate live data
    import random
    active = [e for e in WEATHER_EVENTS if random.random() > 0.3]
    for e in active:
        e["severity"] = min(1.0, e["severity"] + random.uniform(-0.1, 0.1))
    return active


async def fetch_news_signals(client: httpx.AsyncClient) -> List[Dict]:
    """
    Known active geopolitical conflict zones + port disruption signals.
    In production: replace with NewsAPI / GDELT integration.
    """
    return [
        {"type": "conflict",   "lat": 48.38, "lng": 31.17, "severity": 0.80, "title": "Ukraine-Russia Conflict",    "source": "news_sim"},
        {"type": "conflict",   "lat": 31.05, "lng": 34.85, "severity": 0.85, "title": "Gaza Armed Conflict",        "source": "news_sim"},
        {"type": "port_strike","lat": 51.92, "lng": 4.48,  "severity": 0.45, "title": "Rotterdam Port Labour Dispute","source": "news_sim"},
        {"type": "conflict",   "lat": 15.55, "lng": 48.52, "severity": 0.70, "title": "Yemen Civil War",            "source": "news_sim"},
        {"type": "sanctions",  "lat": 55.75, "lng": 37.62, "severity": 0.60, "title": "Russia Trade Sanctions",     "source": "news_sim"},
    ]


async def fetch_all_signals() -> Dict[str, Any]:
    """Fetch all signal types concurrently. Cached for 5 min."""
    global _signal_cache

    if time.time() - _signal_cache["timestamp"] < CACHE_TTL and _signal_cache["data"]:
        return _signal_cache["data"]

    async with httpx.AsyncClient() as client:
        usgs, weather, news = await asyncio.gather(
            fetch_usgs_signals(client),
            fetch_weather_signals(client),
            fetch_news_signals(client),
        )

    all_signals = usgs + weather + news
    result = {
        "signals": all_signals,
        "earthquake": usgs,
        "weather": weather,
        "geopolitical": news,
        "total": len(all_signals),
        "timestamp": time.time(),
    }
    _signal_cache = {"data": result, "timestamp": time.time()}
    return result


def map_signals_to_suppliers(signals: List[Dict], suppliers: List[Any]) -> Dict[int, Dict]:
    """
    For each supplier, find all signals within SIGNAL_IMPACT_RADIUS_KM.
    Returns: {supplier_id: {risk_score, signals_hit, signal_count}}
    """
    supplier_risks: Dict[int, Dict] = {}

    for s in suppliers:
        if s.lat is None or s.lng is None:
            continue

        hit_signals = []
        for sig in signals:
            dist = haversine_distance(s.lat, s.lng, sig["lat"], sig["lng"])
            if dist <= SIGNAL_IMPACT_RADIUS_KM:
                # Attenuate severity by distance
                attenuation = 1.0 - (dist / SIGNAL_IMPACT_RADIUS_KM) * 0.5
                effective_severity = sig["severity"] * attenuation
                hit_signals.append({**sig, "distance_km": round(dist, 1), "effective_severity": round(effective_severity, 3)})

        if hit_signals:
            # Aggregate: max of all effective severities + 20% bonus per additional signal
            max_sev = max(h["effective_severity"] for h in hit_signals)
            bonus = 0.05 * (len(hit_signals) - 1)
            risk_score = min(1.0, max_sev + bonus)
        else:
            # Natural decay if no signals
            risk_score = max(0.05, s.risk_score * BASE_RISK_DECAY)

        supplier_risks[s.id] = {
            "risk_score": round(risk_score, 3),
            "signals_hit": hit_signals,
            "signal_count": len(hit_signals),
        }

    return supplier_risks


def calculate_confidence(signals_hit: int, total_signal_types: int = 3) -> float:
    """confidence = available_signal_types_hit / total_signal_types"""
    # Map signal count to signal types covered
    types_covered = min(total_signal_types, max(1, signals_hit))
    return round(types_covered / total_signal_types, 3)


async def run_risk_update(db_suppliers: List[Any]) -> Dict[str, Any]:
    """
    Full risk update cycle:
    1. Fetch signals
    2. Map to suppliers
    3. Update in-memory graph
    4. Trigger propagation

    Returns summary of changes for WebSocket broadcast.
    """
    signal_data = await fetch_all_signals()
    signals = signal_data["signals"]

    supplier_risks = map_signals_to_suppliers(signals, db_suppliers)

    # Update in-memory graph
    G = get_cached_graph()
    changed_nodes = []

    for supplier_id, risk_data in supplier_risks.items():
        new_risk = risk_data["risk_score"]
        if G and supplier_id in G:
            old_risk = G.nodes[supplier_id].get("risk_score", 0.0)
            if abs(new_risk - old_risk) > 0.01:  # Only propagate meaningful changes
                G.nodes[supplier_id]["risk_score"] = new_risk
                propagated = bfs_propagate(G, supplier_id)
                changed_nodes.append({
                    "supplier_id": supplier_id,
                    "old_risk": round(old_risk, 3),
                    "new_risk": round(new_risk, 3),
                    "propagated_to": list(propagated.keys()),
                })

    return {
        "signals_fetched": len(signals),
        "suppliers_updated": len(changed_nodes),
        "changed_nodes": changed_nodes,
        "signal_breakdown": {
            "earthquake": len(signal_data["earthquake"]),
            "weather": len(signal_data["weather"]),
            "geopolitical": len(signal_data["geopolitical"]),
        }
    }


def get_current_signals() -> Dict[str, Any]:
    """Return cached signal data (sync access)."""
    return _signal_cache.get("data") or {
        "signals": [], "earthquake": [], "weather": [], "geopolitical": [], "total": 0
    }
