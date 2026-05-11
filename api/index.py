import sys
import os

# Add globalchain-backend to sys.path
# Vercel runs from the project root
backend_path = os.path.join(os.getcwd(), "globalchain-backend")
sys.path.insert(0, backend_path)

try:
    from main import app
    handler = app
except ImportError as e:
    # Fallback for different Vercel directory structures
    fallback_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "globalchain-backend"))
    sys.path.insert(0, fallback_path)
    from main import app
    handler = app

# Ensure Vercel finds the app
app = handler
