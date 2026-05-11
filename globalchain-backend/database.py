import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./globalchain.db"
).strip()

# Auto-fix: If the '@' before the host was accidentally encoded as '%40'
if "postgresql://" in SQLALCHEMY_DATABASE_URL and "%40aws" in SQLALCHEMY_DATABASE_URL:
    print("DEBUG: Auto-fixing malformed DATABASE_URL...")
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("%40aws", "@aws")

# Auto-fix: Switch direct DB host (IPv6 only) to session-mode pooler (IPv4)
# Vercel serverless cannot reach IPv6 addresses
if "db." in SQLALCHEMY_DATABASE_URL and ".supabase.co:5432" in SQLALCHEMY_DATABASE_URL:
    print("DEBUG: Switching from direct IPv6 host to IPv4 session pooler...")
    # Extract project ref from host like db.PROJECTREF.supabase.co
    import re
    match = re.search(r'db\.([^.]+)\.supabase\.co', SQLALCHEMY_DATABASE_URL)
    if match:
        project_ref = match.group(1)
        # Replace direct host with session-mode pooler host
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
            f"db.{project_ref}.supabase.co:5432",
            f"aws-0-us-east-1.pooler.supabase.com:5432"
        )
        # Also fix the username to include project ref (required for pooler)
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
            "postgresql://postgres:",
            f"postgresql://postgres.{project_ref}:"
        )
        print(f"DEBUG: Using session pooler for project: {project_ref}")

# Global engine variable
_engine = None

def get_engine():
    global _engine
    if _engine is None:
        # Debug: Log masked URL to check Vercel environment
        masked = SQLALCHEMY_DATABASE_URL.split('@')[-1] if '@' in SQLALCHEMY_DATABASE_URL else SQLALCHEMY_DATABASE_URL
        print(f"DEBUG_DB: {masked}")
        try:
            connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
            _engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
        except Exception as e:
            print(f"Lazy Engine Error: {e}")
            _engine = create_engine("sqlite:///./fallback.db", connect_args={"check_same_thread": False})
    return _engine

Base = declarative_base()

def get_db():
    engine = get_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
