"""
Migration: add entered_at/exited_at to temporary_pass.
"""
from sqlalchemy import text

from database import engine, check_connection

MIGRATION_ID = "20260127_temp_pass_events"


def migrate():
    if not check_connection():
        raise SystemExit("DB connection failed")

    ddl = """
    ALTER TABLE temporary_pass
        ADD COLUMN IF NOT EXISTS entered_at TIMESTAMPTZ;
    ALTER TABLE temporary_pass
        ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ;
    """
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print("temporary_pass events migration applied")
