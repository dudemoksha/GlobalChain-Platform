import requests
import io

CSV_DATA = """name,tier,lat,lng,region,product,cost,capacity,quality,has_backup,backup_supplier_id,parent_supplier_id,revenue_contribution
Test Corp 1,2,35.67,139.65,Japan,Electronics,0.5,0.8,0.85,false,,,0.1
Test Corp 2,3,40.71,-74.00,USA,Software,0.4,0.9,0.95,false,,,0.2
"""

# Log in as Supplier to get token
r_login = requests.post("http://127.0.0.1:8000/token", data={"username": "supplier@globalchain.com", "password": "Supplier@1234"})
token = r_login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Upload CSV
files = {"file": ("test.csv", io.BytesIO(CSV_DATA.encode("utf-8")), "text/csv")}
r_upload = requests.post("http://127.0.0.1:8000/suppliers/bulk-upload", headers=headers, files=files)
print("Upload status:", r_upload.status_code)
print("Upload response:", r_upload.json())

# Log in as Admin to check pending
r_admin = requests.post("http://127.0.0.1:8000/token", data={"username": "admin@globalchain.com", "password": "Admin@1234"})
admin_token = r_admin.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}
r_pending = requests.get("http://127.0.0.1:8000/admin/suppliers/pending", headers=admin_headers)
print("Pending list:", r_pending.json())
