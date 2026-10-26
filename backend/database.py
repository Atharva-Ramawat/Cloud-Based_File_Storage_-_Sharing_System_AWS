from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL database URL (defaults to local SQLite if not configured or unreachable)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./storage.db")

# SQLAlchemy 1.4+ / 2.0 compatibility for Heroku/Render/AWS "postgres://" URI
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


def _init_engine(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args)


try:
    engine = _init_engine(DATABASE_URL)
    # Quick connectivity probe
    with engine.connect() as probe_conn:
        pass
except Exception as exc:
    print(
        f"[Database Warning] Unable to connect to specified DATABASE_URL: {exc}\n"
        f"Falling back to local SQLite storage (sqlite:///./storage.db) for development."
    )
    DATABASE_URL = "sqlite:///./storage.db"
    engine = _init_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """
    FastAPI dependency yielding an independent database session per request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
