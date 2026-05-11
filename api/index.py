import sys
import os

# Add globalchain-backend to sys.path
# Vercel's CWD is the project root
sys.path.append(os.path.join(os.getcwd(), "globalchain-backend"))

try:
    from main import app
except ImportError:
    # Fallback for different Vercel environments
    sys.path.append(os.path.join(os.path.dirname(__file__), "..", "globalchain-backend"))
    from main import app

# Vercel needs 'app' or 'handler'
handler = app
app = app # Just in case it looks for 'app'
