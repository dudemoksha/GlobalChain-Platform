import sys
import os

print(f"Python path: {sys.path}")
print(f"CWD: {os.getcwd()}")

# Add the project root and globalchain-backend to the path
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
backend = os.path.abspath(os.path.join(os.path.dirname(__file__), '../globalchain-backend'))

print(f"Root: {root}")
print(f"Backend: {backend}")

sys.path.insert(0, root)
sys.path.insert(0, backend)

try:
    from main import app
    print("Successfully imported app from main")
except Exception as e:
    print(f"Failed to import app: {e}")
    raise e

# Vercel needs the app object
handler = app
