"""
GlobalChain — Graph Engine (NetworkX)
-------------------------------------
This is the CORE BRAIN of the system. All risk propagation, impact
calculations, and dependency analysis run through this module.

Graph is cached in memory after first build for performance.
"""

import networkx as nx
import math
from typing import List, Dict, Any, Optional, Tuple

# ─── In-memory graph cache ──────────────────────────────────────────────────
_graph_cache: Optional[nx.DiGraph] = None


def build_graph(suppliers: List[Any], edges: List[Any]) -> nx.DiGraph:
    """
    Build a directed NetworkX graph from Supplier nodes and SupplyEdge edges.
    Direction: from_supplier → to_supplier  (downstream → upstream)
    Caches in memory for fast access.
    """
    global _graph_cache
    G = nx.DiGraph()

    for s in suppliers:
        G.add_node(s.id, **{
            "name": s.name,
            "tier": s.tier,
            "lat": s.lat,
            "lng": s.lng,
            "region": s.region,
            "product": s.product,
            "cost": s.cost,
            "capacity": s.capacity,
            "quality": s.quality,
            "risk_score": s.risk_score,
            "dependency_score": s.dependency_score,
            "revenue_contribution": s.revenue_contribution,
            "has_backup": s.has_backup,
            "supplier_score": s.supplier_score,
        })

    for e in edges:
        G.add_edge(e.from_supplier_id, e.to_supplier_id,
                   dependency_weight=e.dependency_weight)

    _graph_cache = G
    return G


def get_cached_graph() -> Optional[nx.DiGraph]:
    return _graph_cache


def invalidate_cache():
    global _graph_cache
    _graph_cache = None


def bfs_propagate(G: nx.DiGraph, affected_node_id: int) -> Dict[int, float]:
    """
    Propagate risk upstream from affected node using BFS.
    
    Rule: parent_risk += child_risk * dependency_weight
    
    Returns: {node_id: new_risk_score}
    """
    if affected_node_id not in G:
        return {}

    updates: Dict[int, float] = {}
    visited = set()
    queue = [affected_node_id]

    while queue:
        node_id = queue.pop(0)
        if node_id in visited:
            continue
        visited.add(node_id)

        child_risk = G.nodes[node_id].get("risk_score", 0.0)

        # Traverse upstream (predecessors in directed graph)
        for parent_id in G.predecessors(node_id):
            edge_data = G.edges[parent_id, node_id]
            weight = edge_data.get("dependency_weight", 0.5)

            parent_risk = G.nodes[parent_id].get("risk_score", 0.0)
            new_risk = min(1.0, parent_risk + child_risk * weight)

            G.nodes[parent_id]["risk_score"] = new_risk
            updates[parent_id] = new_risk

            if parent_id not in visited:
                queue.append(parent_id)

    return updates


def calculate_dependency_scores(G: nx.DiGraph) -> Dict[int, float]:
    """
    dependency_score = incoming_edges / total_nodes
    Returns updated scores for all nodes.
    """
    total_nodes = G.number_of_nodes()
    if total_nodes == 0:
        return {}

    scores = {}
    for node_id in G.nodes():
        incoming = G.in_degree(node_id)
        score = incoming / total_nodes
        G.nodes[node_id]["dependency_score"] = score
        scores[node_id] = score

    return scores


def get_impact(G: nx.DiGraph, node_id: int, delay_factor: float = 2.5) -> Dict[str, Any]:
    """
    Calculate full impact metrics for a node.
    
    damage = dependency_score * risk_score
    time   = graph_hops_from_root * delay_factor  (days)
    loss   = damage * revenue_contribution
    """
    if node_id not in G:
        return {}

    node = G.nodes[node_id]
    risk = node.get("risk_score", 0.0)
    dep = node.get("dependency_score", 0.0)
    rev = node.get("revenue_contribution", 0.0)

    damage = dep * risk
    loss = damage * rev

    # Estimate time: BFS distance from highest-tier node
    hops = _estimate_hops(G, node_id)
    time_days = round(hops * delay_factor, 1)

    return {
        "node_id": node_id,
        "name": node.get("name", ""),
        "risk_score": round(risk, 3),
        "damage": round(damage, 3),
        "time_days": time_days,
        "loss_fraction": round(loss, 3),
        "dependency_score": round(dep, 3),
        "revenue_contribution": round(rev, 3),
    }


def _estimate_hops(G: nx.DiGraph, node_id: int) -> int:
    """BFS hop count from this node to the most-upstream ancestor."""
    if node_id not in G:
        return 0
    max_hops = 0
    visited = set()
    queue = [(node_id, 0)]
    while queue:
        nid, depth = queue.pop(0)
        if nid in visited:
            continue
        visited.add(nid)
        max_hops = max(max_hops, depth)
        for pred in G.predecessors(nid):
            if pred not in visited:
                queue.append((pred, depth + 1))
    return max_hops


def get_upstream_path(G: nx.DiGraph, node_id: int) -> List[int]:
    """Return all upstream ancestor node IDs (BFS order)."""
    if node_id not in G:
        return []
    ancestors = []
    visited = set()
    queue = [node_id]
    while queue:
        nid = queue.pop(0)
        if nid in visited:
            continue
        visited.add(nid)
        ancestors.append(nid)
        for pred in G.predecessors(nid):
            if pred not in visited:
                queue.append(pred)
    return ancestors


def get_downstream_path(G: nx.DiGraph, node_id: int) -> List[int]:
    """Return all downstream descendant node IDs."""
    if node_id not in G:
        return []
    descendants = []
    visited = set()
    queue = [node_id]
    while queue:
        nid = queue.pop(0)
        if nid in visited:
            continue
        visited.add(nid)
        descendants.append(nid)
        for succ in G.successors(nid):
            if succ not in visited:
                queue.append(succ)
    return descendants


def serialize_graph(G: nx.DiGraph) -> Dict[str, Any]:
    """Serialize graph for API responses and frontend visualization."""
    nodes = []
    for node_id, data in G.nodes(data=True):
        nodes.append({
            "id": node_id,
            **{k: v for k, v in data.items()}
        })

    edges = []
    for u, v, data in G.edges(data=True):
        edges.append({
            "from": u,
            "to": v,
            "weight": data.get("dependency_weight", 0.5),
        })

    return {"nodes": nodes, "edges": edges}


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in km between two geographic points."""
    R = 6371  # Earth radius km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def clone_graph(G: nx.DiGraph) -> nx.DiGraph:
    """Deep clone graph for simulation (must NOT modify real graph)."""
    return G.copy()
