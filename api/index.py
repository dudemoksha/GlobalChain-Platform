import sys
import os

# Add the project root and globalchain-backend to the path
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
backend = os.path.abspath(os.path.join(os.path.dirname(__file__), '../globalchain-backend'))

sys.path.insert(0, root)
sys.path.insert(0, backend)

from main import app

# Vercel needs the app object
handler = app
