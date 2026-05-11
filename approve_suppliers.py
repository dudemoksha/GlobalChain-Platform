import requests

BASE_URL = "http://localhost:8000"

def approve_all():
    # Admin Login
    admin_login = {"username": "admin@globalchain.com", "password": "Admin@1234"}
    r = requests.post(f"{BASE_URL}/token", data=admin_login)
    admin_token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Get Pending Suppliers
    r = requests.get(f"{BASE_URL}/admin/suppliers/pending", headers=headers)
    pending = r.json()
    print(f"Found {len(pending)} pending suppliers.")

    for s in pending:
        sid = s["id"]
        print(f"Approving supplier {sid} ({s['name']})...")
        r_approve = requests.post(f"{BASE_URL}/admin/suppliers/{sid}/approve", headers=headers)
        if r_approve.status_code == 200:
            print(f"Approved {sid}")
        else:
            print(f"Failed to approve {sid}: {r_approve.text}")

if __name__ == "__main__":
    approve_all()
