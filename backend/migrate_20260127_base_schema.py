"""
Migration: create all base tables from models (non-destructive).
"""
from sqlalchemy import text

from database import Base, engine, check_connection

MIGRATION_ID = "20260127_base_schema"


def migrate():
    if not check_connection():
        raise SystemExit("DB connection failed")

    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tg_sessions (
                tg_user_id BIGINT PRIMARY KEY,
                state VARCHAR(100),
                payload TEXT,
                updated_at TIMESTAMPTZ DEFAULT now()
            )
        """))
    print("base schema migration applied")
