import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./globalchain.db"
)

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
