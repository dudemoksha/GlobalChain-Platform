import sys
import os

# Add globalchain-backend to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'globalchain-backend'))
sys.path.insert(0, backend_path)

from main import app

# Vercel needs 'app' or 'handler'
handler = app
