import os
import re
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

raw_url = os.getenv("DATABASE_URL", "sqlite:///./globalchain.db").strip()

def build_engine():
    """Build engine using programmatic URL construction to avoid encoding issues."""
    global raw_url
    
    if raw_url.startswith("sqlite"):
        print("DEBUG: Using SQLite (fallback)")
        return create_engine(raw_url, connect_args={"check_same_thread": False})
    
    # Parse the raw URL to extract components safely
    # Handles cases where password contains @ or %40
    try:
        # Pattern: postgresql://USER:PASSWORD@HOST:PORT/DB
        # The host always starts after the LAST '@' in the connection string
        # Username/password are between '://' and the last '@' before host
        
        # Strip scheme
        scheme = "postgresql+psycopg2"
        url_no_scheme = raw_url.replace("postgresql://", "").replace("postgres://", "")
        
        # Split off the path (database name) at the end
        if "/" in url_no_scheme:
            hostport_and_before, database = url_no_scheme.rsplit("/", 1)
            database = database.split("?")[0]  # strip query params
        else:
            hostport_and_before = url_no_scheme
            database = "postgres"
        
        # The host:port is after the LAST '@'
        last_at = hostport_and_before.rfind("@")
        hostport = hostport_and_before[last_at + 1:]
        userpass = hostport_and_before[:last_at]
        
        # Split host and port
        if ":" in hostport:
            host, port_str = hostport.rsplit(":", 1)
            port = int(port_str)
        else:
            host = hostport
            port = 5432
        
        # Split user and password (password is everything after first ':')
        colon_idx = userpass.index(":")
        username = userpass[:colon_idx]
        password = userpass[colon_idx + 1:]
        
        # URL-decode the password (%40 → @, %21 → !, etc.)
        from urllib.parse import unquote
        password = unquote(password)
        
        print(f"DEBUG: Connecting to {host}:{port}/{database} as {username}")
        
        # Use session mode pooler (port 5432) which is IPv4-friendly
        # If direct host (db.xxx.supabase.co), switch to session pooler
        if host.startswith("db.") and "supabase.co" in host:
            match = re.search(r'db\.([^.]+)\.supabase\.co', host)
            if match:
                project_ref = match.group(1)
                host = "aws-0-us-east-1.pooler.supabase.com"
                port = 5432
                # Pooler requires postgres.PROJECT_REF as username
                if "." not in username:
                    username = f"postgres.{project_ref}"
                print(f"DEBUG: Switched to session pooler → {host}:{port} as {username}")
        
        # Build URL programmatically — no encoding issues
        engine_url = URL.create(
            drivername=scheme,
            username=username,
            password=password,  # SQLAlchemy handles encoding internally
            host=host,
            port=port,
            database=database,
            query={"sslmode": "require"} if "supabase" in host else {}
        )
        
        return create_engine(
            engine_url,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={"connect_timeout": 10}
        )
        
    except Exception as e:
        print(f"CRITICAL: Failed to build engine: {e}")
        print(f"CRITICAL: Falling back to SQLite")
        return create_engine("sqlite:///./fallback.db", connect_args={"check_same_thread": False})


# Global engine
_engine = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = build_engine()
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
