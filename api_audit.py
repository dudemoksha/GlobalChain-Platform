import urllib.request, urllib.parse, json, sys, random

BASE = 'http://127.0.0.1:8000'
results = {}

def req(method, path, data=None, token=None, form=False):
    url = BASE + path
    headers = {'Content-Type': 'application/json'}
    if form: headers['Content-Type'] = 'application/x-www-form-urlencoded'
    if token: headers['Authorization'] = f'Bearer {token}'
    body = None
    if data:
        if form:
            body = urllib.parse.urlencode(data).encode()
        else:
            body = json.dumps(data).encode()
    
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        content = e.read().decode()
        try:
            return e.code, json.loads(content)
        except:
            return e.code, content
    except Exception as ex:
        return 0, str(ex)

print('=== GLOBALCHAIN API AUDIT ===')

# 1. Root
s, d = req('GET', '/')
results['Root Endpoint'] = (s == 200)

# 2. Login - Buyer
s, d = req('POST', '/token', {'username': 'buyer@globalchain.com', 'password': 'Buyer@1234'}, form=True)
buyer_token = d.get('access_token', '') if isinstance(d, dict) else ''
results['Login (Buyer)'] = (s == 200 and bool(buyer_token))

# 3. Login - Admin
s, d = req('POST', '/token', {'username': 'admin@globalchain.com', 'password': 'Admin@1234'}, form=True)
admin_token = d.get('access_token', '') if isinstance(d, dict) else ''
results['Login (Admin)'] = (s == 200 and bool(admin_token))

# 4. Auth Protection
s, d = req('GET', '/dashboard')
results['Auth Protection (401)'] = (s == 401)

# 5. User Roles (/me)
s, d = req('GET', '/me', token=buyer_token)
results['Role Identification'] = (s == 200 and d.get('role') == 'Buyer')

# 6. Dashboard Stats
s, d = req('GET', '/dashboard', token=buyer_token)
results['Dashboard Data'] = (s == 200 and 'total_suppliers' in d)

# 7. Suppliers CRUD (Read)
s, d = req('GET', '/suppliers', token=buyer_token)
suppliers = d.get('suppliers', [])
results['Suppliers List (Count >= 30)'] = (s == 200 and len(suppliers) >= 30)

# 8. Graph System
s, d = req('GET', '/graph', token=buyer_token)
results['Graph Construction'] = (s == 200 and len(d.get('nodes', [])) > 0)

# 9. Explainability & Impact
if suppliers:
    sid = suppliers[0]['id']
    s, d = req('GET', f'/suppliers/{sid}', token=buyer_token)
    has_expl = 'explanation' in d and 'reasons' in d['explanation']
    has_cons = 'consumer_impact' in d
    results['Explainability & Impact Data'] = (s == 200 and has_expl and has_cons)

# 10. Alerts System
s, d = req('GET', '/alerts', token=buyer_token)
results['Alert Generation'] = (s == 200 and len(d.get('alerts', [])) > 0)

# 11. Recommendations Engine
s, d = req('GET', '/recommendations', token=buyer_token)
results['Recommendations Engine'] = (s == 200)

# 12. Admin Role Blocking
s, d = req('GET', '/admin/users', token=buyer_token)
results['RBAC (Buyer blocked from Admin)'] = (s == 403)

# 13. Simulation Engine (Isolation)
sim_data = {'lat': 35.6895, 'lng': 139.6917, 'event_type': 'quake', 'severity': 0.8}
s, d = req('POST', '/simulate', sim_data, token=buyer_token)
results['Simulation Engine'] = (s == 200 and 'total_affected_count' in d)

# 14. Signup Flow
test_email = f"audit_{random.randint(1000,9999)}@globalchain.com"
s, d = req('POST', '/signup', {'email': test_email, 'password': 'TestPassword123', 'role': 'Buyer', 'company': 'AuditCo'})
results['Signup Flow (Pending)'] = (s == 200 and d.get('status') == 'Pending')

print('\nSummary of Results:')
for test, passed in results.items():
    status = 'PASS' if passed else 'FAIL'
    print(f'[{status}] {test}')

total_passed = sum(results.values())
print(f'\nTotal: {total_passed}/{len(results)} PASSED')
