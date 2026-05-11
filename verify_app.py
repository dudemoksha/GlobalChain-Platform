import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_flow():
    print("--- STARTING E2E VERIFICATION ---")
    
    # 1. Signup
    print("1. Signing up as tester@test.com...")
    signup_data = {
        "email": "tester@test.com",
        "password": "Password123",
        "role": "Buyer",
        "company": "TesterCo"
    }
    r = requests.post(f"{BASE_URL}/signup", json=signup_data)
    if r.status_code == 400 and "already registered" in r.text:
        print("   [INFO] User already registered, skipping signup.")
    else:
        assert r.status_code == 200, f"Signup failed: {r.text}"
        print("   [OK] Signup successful (Pending).")

    # 2. Admin Login
    print("2. Logging in as Admin...")
    admin_login = {"username": "admin@globalchain.com", "password": "Admin@1234"}
    r = requests.post(f"{BASE_URL}/token", data=admin_login)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]
    print("   [OK] Admin logged in.")

    # 3. Approve User
    print("3. Approving user...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = requests.get(f"{BASE_URL}/admin/users", headers=headers)
    users = r.json()["users"]
    user_id = next(u["id"] for u in users if u["email"] == "tester@test.com")
    
    r = requests.post(f"{BASE_URL}/admin/users/{user_id}/approve", headers=headers)
    assert r.status_code == 200, "Approval failed"
    print("   [OK] User approved.")

    # 4. Tester Login
    print("4. Logging in as Tester...")
    tester_login = {"username": "tester@test.com", "password": "Password123"}
    r = requests.post(f"{BASE_URL}/token", data=tester_login)
    assert r.status_code == 200, f"Tester login failed: {r.text}"
    tester_token = r.json()["access_token"]
    print("   [OK] Tester logged in.")

    # 5. Check Dashboard Empty
    print("5. Verifying dashboard is empty...")
    headers = {"Authorization": f"Bearer {tester_token}"}
    r = requests.get(f"{BASE_URL}/suppliers", headers=headers)
    suppliers = r.json()["suppliers"]
    assert len(suppliers) == 0, f"Dashboard not empty! Found {len(suppliers)} suppliers."
    print("   [OK] Dashboard is empty for new user.")

    # 6. Add Supplier
    print("6. Adding a supplier...")
    new_supplier = {
        "name": "E2E Test Supplier",
        "tier": 1,
        "lat": 35.67,
        "lng": 139.65,
        "region": "Japan",
        "product": "Electronics",
        "cost": 0.5,
        "capacity": 0.8,
        "quality": 0.9,
        "has_backup": False,
        "revenue_contribution": 0.05
    }
    r = requests.post(f"{BASE_URL}/supplier", json=new_supplier, headers=headers)
    assert r.status_code == 200, f"Add supplier failed: {r.text}"
    print("   [OK] Supplier added (Pending status).")

    # 7. Verify Data Appears
    print("7. Verifying supplier appears for owner...")
    r = requests.get(f"{BASE_URL}/suppliers", headers=headers)
    suppliers = r.json()["suppliers"]
    assert len(suppliers) == 1, "Supplier did not appear on owner dashboard"
    assert suppliers[0]["name"] == "E2E Test Supplier", "Supplier name mismatch"
    print("   [OK] Supplier successfully visible to owner.")

    print("\n--- ALL TESTS PASSED! ---")

if __name__ == "__main__":
    try:
        test_flow()
    except Exception as e:
        print(f"\n[ERROR] {e}")
