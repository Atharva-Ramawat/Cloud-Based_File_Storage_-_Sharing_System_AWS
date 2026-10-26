from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL database URL (defaults to local SQLite if not configured or local testing)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./storage.db")

# SQLAlchemy 1.4+ / 2.0 compatibility for Heroku/Render/AWS "postgres://" URI
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite requires specific connect_args for multithreading in FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields an independent database session per request
    and ensures the session is closed when finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
