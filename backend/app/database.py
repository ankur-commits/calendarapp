from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os

# Check if running in production (Render sets DATABASE_URL)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# If not in production (or DATABASE_URL not set), fallback to SQLite
if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./family_calendar.db"
elif SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    # Fix for Render's Postgres URL which uses postgres:// but SQLAlchemy needs postgresql://
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    # Only use check_same_thread for SQLite
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
