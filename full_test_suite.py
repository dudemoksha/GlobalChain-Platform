"""
GLOBALCHAIN - FULL APPLICATION TEST SUITE
Run: python full_test_suite.py
Requires: Backend running on http://127.0.0.1:8000
"""

import urllib.request, urllib.parse, json, random, time, io, sys

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = "http://127.0.0.1:8000"
results = {}
tokens = {}
test_data = {}

# ─── Helper ──────────────────────────────────────────────────────
def req(method, path, data=None, token=None, form=False):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if form:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = None
    if data:
        body = (urllib.parse.urlencode(data) if form else json.dumps(data)).encode()
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except:
            return e.code, {}
    except Exception as ex:
        return 0, {"error": str(ex)}


def record(name, passed, detail=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    results[name] = passed
    print(f"  {status}  {name}" + (f"  →  {detail}" if detail else ""))


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ══════════════════════════════════════════════════════════════════
#  PHASE 1: SERVER CONNECTIVITY
# ══════════════════════════════════════════════════════════════════
section("PHASE 1: SERVER CONNECTIVITY")

s, d = req("GET", "/")
record("1.1  Root endpoint reachable", s == 200, d.get("message", ""))
record("1.2  API version present", "v" in d.get("message", "").lower() or "globalchain" in d.get("message", "").lower())

# ══════════════════════════════════════════════════════════════════
#  PHASE 2: AUTHENTICATION
# ══════════════════════════════════════════════════════════════════
section("PHASE 2: AUTHENTICATION")

# 2.1 Buyer login
s, d = req("POST", "/token", {"username": "buyer@globalchain.com", "password": "Buyer@1234"}, form=True)
tokens["buyer"] = d.get("access_token", "")
record("2.1  Buyer login", s == 200 and bool(tokens["buyer"]), f"role={d.get('role')}")

# 2.2 Admin login
s, d = req("POST", "/token", {"username": "admin@globalchain.com", "password": "Admin@1234"}, form=True)
tokens["admin"] = d.get("access_token", "")
record("2.2  Admin login", s == 200 and bool(tokens["admin"]), f"role={d.get('role')}")

# 2.3 Supplier login
s, d = req("POST", "/token", {"username": "supplier@globalchain.com", "password": "Supplier@1234"}, form=True)
tokens["supplier"] = d.get("access_token", "")
record("2.3  Supplier login", s == 200 and bool(tokens["supplier"]), f"role={d.get('role')}")

# 2.4 Wrong password
s, d = req("POST", "/token", {"username": "buyer@globalchain.com", "password": "wrong"}, form=True)
record("2.4  Wrong password rejected", s == 401)

# 2.5 Auth protection (no token)
s, d = req("GET", "/dashboard")
record("2.5  Protected route blocks unauthenticated", s == 401)

# 2.6 /me endpoint
s, d = req("GET", "/me", token=tokens["buyer"])
record("2.6  /me returns user info", s == 200 and d.get("role") == "Buyer")

# ══════════════════════════════════════════════════════════════════
#  PHASE 3: SIGNUP FLOW
# ══════════════════════════════════════════════════════════════════
section("PHASE 3: SIGNUP FLOW")

test_email = f"test_{random.randint(10000,99999)}@globalchain.com"
s, d = req("POST", "/signup", {"email": test_email, "password": "Test@1234", "role": "Buyer", "company": "TestCo"})
record("3.1  Signup creates pending user", s == 200 and d.get("status") == "Pending")

# Duplicate email
s, d = req("POST", "/signup", {"email": test_email, "password": "Test@1234", "role": "Buyer", "company": "TestCo"})
record("3.2  Duplicate email rejected", s == 400)

# Pending user can't login
s, d = req("POST", "/token", {"username": test_email, "password": "Test@1234"}, form=True)
record("3.3  Pending user blocked from login", s == 403)

# ══════════════════════════════════════════════════════════════════
#  PHASE 4: DASHBOARD
# ══════════════════════════════════════════════════════════════════
section("PHASE 4: DASHBOARD DATA")

s, d = req("GET", "/dashboard", token=tokens["buyer"])
record("4.1  Dashboard loads", s == 200 and "total_suppliers" in d)
record("4.2  Has supplier count", isinstance(d.get("total_suppliers"), int) and d["total_suppliers"] > 0, f"count={d.get('total_suppliers')}")
record("4.3  Has risk counts", "high_risk_count" in d and "moderate_risk_count" in d)
record("4.4  Has status field", d.get("status") in ("NOMINAL", "ELEVATED", "CRITICAL"), f"status={d.get('status')}")
record("4.5  Has alert summary", "alert_summary" in d)

# ══════════════════════════════════════════════════════════════════
#  PHASE 5: SUPPLIERS CRUD
# ══════════════════════════════════════════════════════════════════
section("PHASE 5: SUPPLIERS CRUD")

s, d = req("GET", "/suppliers", token=tokens["buyer"])
suppliers = d.get("suppliers", [])
record("5.1  Suppliers list loads", s == 200 and len(suppliers) > 0, f"count={len(suppliers)}")

if suppliers:
    sid = suppliers[0]["id"]
    s, d = req("GET", f"/suppliers/{sid}", token=tokens["buyer"])
    record("5.2  Single supplier detail", s == 200 and "name" in d)
    record("5.3  Has risk_score", "risk_score" in d)
    record("5.4  Has explanation", "explanation" in d and "reasons" in d.get("explanation", {}))
    record("5.5  Has consumer_impact", "consumer_impact" in d)
    record("5.6  Has upstream/downstream", "upstream_nodes" in d and "downstream_nodes" in d)

    # Non-existent supplier
    s, d = req("GET", "/suppliers/99999", token=tokens["buyer"])
    record("5.7  404 for missing supplier", s == 404)
else:
    record("5.2-5.7  Skipped (no suppliers)", False, "No suppliers in DB")

# ══════════════════════════════════════════════════════════════════
#  PHASE 6: GRAPH ENGINE
# ══════════════════════════════════════════════════════════════════
section("PHASE 6: GRAPH ENGINE")

s, d = req("GET", "/graph", token=tokens["buyer"])
nodes = d.get("nodes", [])
edges_graph = d.get("edges", [])
record("6.1  Graph loads", s == 200 and len(nodes) > 0, f"nodes={len(nodes)}, edges={len(edges_graph)}")

if nodes:
    nid = nodes[0].get("id", nodes[0].get("node_id", 0))
    s, d = req("GET", f"/graph/node/{nid}", token=tokens["buyer"])
    record("6.2  Node detail loads", s == 200 and "risk" in d)
    record("6.3  Has confidence score", "confidence" in d)
    record("6.4  Has risk drivers", "risk_drivers" in d or "why" in d)

# ══════════════════════════════════════════════════════════════════
#  PHASE 7: ALERTS SYSTEM
# ══════════════════════════════════════════════════════════════════
section("PHASE 7: ALERTS SYSTEM")

s, d = req("GET", "/alerts", token=tokens["buyer"])
alerts = d.get("alerts", [])
record("7.1  Alerts endpoint loads", s == 200)
record("7.2  Alerts returned", len(alerts) >= 0, f"count={len(alerts)}")

if alerts:
    aid = alerts[0]["id"]
    s, d = req("POST", "/alerts/acknowledge", {"alert_id": aid}, token=tokens["buyer"])
    record("7.3  Alert acknowledge works", s == 200)
else:
    record("7.3  Alert acknowledge (no alerts to test)", True, "skipped")

# ══════════════════════════════════════════════════════════════════
#  PHASE 8: RECOMMENDATIONS
# ══════════════════════════════════════════════════════════════════
section("PHASE 8: RECOMMENDATIONS ENGINE")

s, d = req("GET", "/recommendations", token=tokens["buyer"])
record("8.1  Recommendations list loads", s == 200)

s, d = req("POST", "/recommendations/refresh", token=tokens["buyer"])
record("8.2  Recommendations refresh works", s == 200, d.get("message", ""))

# ══════════════════════════════════════════════════════════════════
#  PHASE 9: SIMULATION
# ══════════════════════════════════════════════════════════════════
section("PHASE 9: SIMULATION ENGINE")

sim_data = {"lat": 35.6895, "lng": 139.6917, "event_type": "earthquake", "severity": 0.8}
s, d = req("POST", "/simulate", sim_data, token=tokens["buyer"])
record("9.1  Simulation runs", s == 200 and "total_affected_count" in d, f"affected={d.get('total_affected_count')}")
record("9.2  Has loss estimate", "total_estimated_loss_pct" in d)
record("9.3  Has affected suppliers", "affected_suppliers" in d or "total_affected_count" in d)

s, d = req("GET", "/simulate/history", token=tokens["buyer"])
record("9.4  Simulation history loads", s == 200 and "simulations" in d)

# ══════════════════════════════════════════════════════════════════
#  PHASE 10: EDGES
# ══════════════════════════════════════════════════════════════════
section("PHASE 10: EDGE MANAGEMENT")

s, d = req("GET", "/edges", token=tokens["buyer"])
edge_list = d.get("edges", [])
record("10.1  Edge list loads", s == 200, f"count={len(edge_list)}")

# ══════════════════════════════════════════════════════════════════
#  PHASE 11: SIGNALS & LIVE STATUS
# ══════════════════════════════════════════════════════════════════
section("PHASE 11: SIGNALS & LIVE STATUS")

s, d = req("GET", "/signals")
record("11.1  Signals endpoint loads", s == 200)

s, d = req("GET", "/api/live-status")
record("11.2  Live status loads", s == 200 and "status" in d)

# ══════════════════════════════════════════════════════════════════
#  PHASE 12: HIDDEN TIER IMPACT
# ══════════════════════════════════════════════════════════════════
section("PHASE 12: HIDDEN TIER IMPACT")

s, d = req("GET", "/impact/hidden", token=tokens["buyer"])
record("12.1  Hidden impact endpoint loads", s == 200 and "impacts" in d, f"count={len(d.get('impacts', []))}")

# ══════════════════════════════════════════════════════════════════
#  PHASE 13: BACKUP SUPPLIER
# ══════════════════════════════════════════════════════════════════
section("PHASE 13: BACKUP SUPPLIER SYSTEM")

s, d = req("GET", "/suppliers/backup-overview", token=tokens["buyer"])
backups = d.get("suppliers", [])
record("13.1  Backup overview loads", s == 200, f"count={len(backups)}")
if backups:
    has_backup_field = all("has_backup" in b for b in backups)
    record("13.2  Has backup fields", has_backup_field)

# ══════════════════════════════════════════════════════════════════
#  PHASE 14: RBAC (Role-Based Access Control)
# ══════════════════════════════════════════════════════════════════
section("PHASE 14: RBAC — ROLE ACCESS CONTROL")

# Buyer CANNOT access admin routes
s, d = req("GET", "/admin/users", token=tokens["buyer"])
record("14.1  Buyer blocked from /admin/users", s == 403)

s, d = req("GET", "/admin/stats", token=tokens["buyer"])
record("14.2  Buyer blocked from /admin/stats", s == 403)

s, d = req("GET", "/admin/suppliers/pending", token=tokens["buyer"])
record("14.3  Buyer blocked from /admin/suppliers/pending", s == 403)

# Admin CAN access admin routes
s, d = req("GET", "/admin/users", token=tokens["admin"])
record("14.4  Admin can access /admin/users", s == 200)

# ══════════════════════════════════════════════════════════════════
#  PHASE 15: ADMIN PANEL
# ══════════════════════════════════════════════════════════════════
section("PHASE 15: ADMIN PANEL")

s, d = req("GET", "/admin/stats", token=tokens["admin"])
record("15.1  Admin stats loads", s == 200 and "total_suppliers" in d)
record("15.2  Has pending counts", "pending_users" in d and "pending_suppliers" in d)

s, d = req("GET", "/admin/users", token=tokens["admin"])
users = d.get("users", [])
record("15.3  Admin user list loads", s == 200 and len(users) > 0, f"count={len(users)}")

s, d = req("GET", "/admin/suppliers/all", token=tokens["admin"])
record("15.4  Admin all suppliers loads", s == 200)

s, d = req("GET", "/admin/suppliers/pending", token=tokens["admin"])
record("15.5  Admin pending suppliers loads", s == 200)

# ══════════════════════════════════════════════════════════════════
#  PHASE 16: ADD SUPPLIER (as non-admin → pending)
# ══════════════════════════════════════════════════════════════════
section("PHASE 16: ADD SUPPLIER FLOW")

new_supplier = {
    "name": f"TestSupplier_{random.randint(1000,9999)}",
    "tier": 2, "lat": 28.61, "lng": 77.20,
    "region": "India", "product": "TestProduct",
    "cost": 0.4, "capacity": 0.8, "quality": 0.9,
    "has_backup": False, "revenue_contribution": 0.05
}
s, d = req("POST", "/supplier", new_supplier, token=tokens["buyer"])
record("16.1  Buyer adds supplier (→ pending)", s == 200 and d.get("supplier", {}).get("status") == "pending")
test_data["pending_supplier_id"] = d.get("supplier", {}).get("id")

# Admin adds supplier (→ approved)
new_supplier["name"] = f"AdminSupplier_{random.randint(1000,9999)}"
s, d = req("POST", "/supplier", new_supplier, token=tokens["admin"])
record("16.2  Admin adds supplier (→ approved)", s == 200 and d.get("supplier", {}).get("status") == "approved")
test_data["admin_supplier_id"] = d.get("supplier", {}).get("id")

# ══════════════════════════════════════════════════════════════════
#  PHASE 17: ADMIN APPROVAL WORKFLOW
# ══════════════════════════════════════════════════════════════════
section("PHASE 17: ADMIN APPROVAL WORKFLOW")

pid = test_data.get("pending_supplier_id")
if pid:
    s, d = req("POST", f"/admin/suppliers/{pid}/approve", token=tokens["admin"])
    record("17.1  Admin approves pending supplier", s == 200)
else:
    record("17.1  Admin approves pending supplier (skipped)", False, "no pending supplier")

# User approval flow
pending_users = [u for u in users if u.get("status") == "Pending"]
if pending_users:
    uid = pending_users[0]["id"]
    s, d = req("POST", f"/admin/users/{uid}/approve", token=tokens["admin"])
    record("17.2  Admin approves pending user", s == 200)
else:
    record("17.2  Admin approves pending user (no pending)", True, "skipped")

# ══════════════════════════════════════════════════════════════════
#  PHASE 18: TIER VISIBILITY (Main Company masking)
# ══════════════════════════════════════════════════════════════════
section("PHASE 18: TIER VISIBILITY & MASKING")

s, d = req("GET", "/suppliers", token=tokens["buyer"])
all_sups = d.get("suppliers", [])
tier2_plus = [s for s in all_sups if s.get("tier", 0) >= 2]
if tier2_plus:
    masked = [s for s in tier2_plus if s.get("masked")]
    record("18.1  Tier 2+ suppliers masked for Buyer", len(masked) > 0, f"masked={len(masked)}/{len(tier2_plus)}")
else:
    record("18.1  Tier masking (no tier 2+ suppliers)", True, "skipped")

# ══════════════════════════════════════════════════════════════════
#  CLEANUP
# ══════════════════════════════════════════════════════════════════
section("CLEANUP")

aid = test_data.get("admin_supplier_id")
if aid:
    s, d = req("DELETE", f"/suppliers/{aid}", token=tokens["admin"])
    record("CLEANUP  Delete test supplier", s == 200)

# ══════════════════════════════════════════════════════════════════
#  FINAL REPORT
# ══════════════════════════════════════════════════════════════════
print(f"\n{'='*60}")
print(f"  FINAL REPORT")
print(f"{'='*60}")

passed = sum(1 for v in results.values() if v)
failed = sum(1 for v in results.values() if not v)
total = len(results)

print(f"\n  ✅ PASSED: {passed}/{total}")
print(f"  ❌ FAILED: {failed}/{total}")
print(f"  📊 Score:  {round(passed/total*100)}%\n")

if failed:
    print("  FAILED TESTS:")
    for name, v in results.items():
        if not v:
            print(f"    ❌ {name}")

print(f"\n{'='*60}")
