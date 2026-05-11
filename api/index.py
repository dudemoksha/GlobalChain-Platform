import sys
import os

# Debugging Vercel environment
print(f"DEBUG: CWD is {os.getcwd()}")
print(f"DEBUG: Files in CWD: {os.listdir(os.getcwd())}")
if os.path.exists("globalchain-backend"):
    print(f"DEBUG: Files in backend: {os.listdir('globalchain-backend')}")

# Add globalchain-backend to sys.path
backend_path = os.path.join(os.getcwd(), "globalchain-backend")
sys.path.insert(0, backend_path)

try:
    from main import app
    print("DEBUG: Successfully imported app")
except Exception as e:
    print(f"DEBUG: Error importing app: {e}")
    # Try alternative
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "globalchain-backend"))
        from main import app
        print("DEBUG: Successfully imported app via fallback")
    except Exception as e2:
        print(f"DEBUG: Error in fallback import: {e2}")
        raise e2

# Vercel needs 'app' or 'handler'
handler = app
app = app 
