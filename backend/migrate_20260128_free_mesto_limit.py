"""
Migration: add free_mesto_limit to organiz.
"""
from sqlalchemy import text

from database import engine, check_connection

MIGRATION_ID = "20260128_free_mesto_limit"


def migrate():
    if not check_connection():
        raise SystemExit("DB connection failed")

    ddl = """
    ALTER TABLE organiz
        ADD COLUMN IF NOT EXISTS free_mesto_limit INTEGER;
    ALTER TABLE organiz
        ALTER COLUMN free_mesto_limit SET DEFAULT 0;
    UPDATE organiz
        SET free_mesto_limit = COALESCE(free_mesto, 0)
        WHERE free_mesto_limit IS NULL;
    """
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print("organiz free_mesto_limit migration applied")
