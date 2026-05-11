import requests
import time
import sqlite3
import os

BASE_URL = "http://localhost:8000"
DB_PATH = r"d:\PDD\globalchain\globalchain-backend\globalchain.db"

def login(email, password):
    r = requests.post(f"{BASE_URL}/token", data={"username": email, "password": password})
    if r.status_code != 200:
        raise Exception(f"Login failed for {email}: {r.text}")
    return r.json()["access_token"]

def main():
    print("Starting Full System Verification...")

    # 1. Login as Admin to get tokens
    admin_token = login("admin@globalchain.com", "Admin@1234")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    buyer_token = login("buyer@globalchain.com", "Buyer@1234")
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}

    # 2. Upload Tier 1 Supplier as Buyer
    print("\n[Step 1] Buyer uploading Tier 1 supplier...")
    t1_data = {
        "name": "Vertex Tier 1",
        "tier": 1,
        "lat": 34.05,
        "lng": -118.24,
        "region": "USA",
        "product": "Engines",
        "cost": 0.8,
        "capacity": 0.9,
        "quality": 0.95,
        "revenue_contribution": 0.4
    }
    r = requests.post(f"{BASE_URL}/supplier", headers=buyer_headers, json=t1_data)
    t1_id = r.json()["supplier"]["id"]
    print(f"  - Created T1 (ID: {t1_id}, Status: {r.json()['supplier']['status']})")

    # 3. Upload Tier 2 Supplier as Buyer (linked to T1)
    print("\n[Step 2] Buyer uploading Tier 2 supplier linked to T1...")
    t2_data = {
        "name": "Core Tier 2",
        "tier": 2,
        "lat": 35.67,
        "lng": 139.65,
        "region": "Japan",
        "product": "Cylinders",
        "cost": 0.4,
        "capacity": 0.8,
        "quality": 0.85,
        "parent_supplier_id": t1_id,
        "revenue_contribution": 0.2
    }
    r = requests.post(f"{BASE_URL}/supplier", headers=buyer_headers, json=t2_data)
    t2_id = r.json()["supplier"]["id"]
    print(f"  - Created T2 (ID: {t2_id}, Status: {r.json()['supplier']['status']})")

    # 4. Verify they are NOT in the graph yet (should be pending)
    print("\n[Step 3] Verifying visibility before approval...")
    r = requests.get(f"{BASE_URL}/graph", headers=buyer_headers)
    graph = r.json()
    node_ids = [n["id"] for n in graph["nodes"]]
    if t1_id in node_ids or t2_id in node_ids:
        print("  [ERROR] Pending suppliers visible in graph!")
    else:
        print("  [SUCCESS] Pending suppliers correctly hidden from graph.")

    # 5. Admin Approves both
    print("\n[Step 4] Admin approving suppliers...")
    requests.post(f"{BASE_URL}/admin/suppliers/{t1_id}/approve", headers=admin_headers)
    requests.post(f"{BASE_URL}/admin/suppliers/{t2_id}/approve", headers=admin_headers)
    print("  - Approved T1 and T2")

    # 6. Verify they ARE in the graph now
    print("\n[Step 5] Verifying visibility after approval...")
    r = requests.get(f"{BASE_URL}/graph", headers=buyer_headers)
    graph = r.json()
    node_ids = [n["id"] for n in graph["nodes"]]
    if t1_id in node_ids and t2_id in node_ids:
        print("  [SUCCESS] Approved suppliers visible in graph.")
    else:
        print("  [ERROR] Approved suppliers NOT visible in graph!")

    # 7. Inject Risk into Tier 2
    print("\n[Step 6] Injecting high risk into Tier 2 (simulating disruption)...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE suppliers SET risk_score = 0.95 WHERE id = ?", (t2_id,))
    conn.commit()
    conn.close()
    print("  - T2 risk set to 0.95 in database.")

    # 8. Force graph rebuild (via recommendations refresh)
    print("\n[Step 7] Triggering graph refresh...")
    requests.post(f"{BASE_URL}/recommendations/refresh", headers=admin_headers)
    
    # Give it a second to process
    time.sleep(1)

    # 9. Verify Risk Propagation
    print("\n[Step 8] Verifying risk propagation to Tier 1...")
    r = requests.get(f"{BASE_URL}/suppliers/{t1_id}", headers=buyer_headers)
    t1_updated = r.json()
    print(f"  - T1 updated risk score: {t1_updated['risk_score']}")
    if t1_updated['risk_score'] > 0.5: # Base risk was low, should now be higher
        print("  [SUCCESS] Risk propagated from T2 to T1.")
    else:
        print("  [ERROR] Risk DID NOT propagate to T1!")

    # 10. Verify Hidden Tier Impact
    print("\n[Step 9] Verifying Hidden Tier Impact reporting...")
    r = requests.get(f"{BASE_URL}/impact/hidden", headers=buyer_headers)
    impacts = r.json()["impacts"]
    print(f"  - Hidden impacts count: {len(impacts)}")
    found = False
    for imp in impacts:
        if imp["affected_tier1_id"] == t1_id and imp["hidden_id"] == t2_id:
            found = True
            print(f"  [SUCCESS] Hidden impact correctly reported: {imp['message']}")
            break
    if not found:
        print("  [ERROR] Hidden impact NOT reported for T2 -> T1!")

    print("\nVerification Complete.")

if __name__ == "__main__":
    main()
