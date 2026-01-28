"""
Migration: create temporary_pass_report_template table.
"""
from sqlalchemy import text

from database import engine, check_connection

MIGRATION_ID = "20260127_temp_pass_report_template"


def migrate():
    if not check_connection():
        raise SystemExit("DB connection failed")

    ddl = """
    CREATE TABLE IF NOT EXISTS temporary_pass_report_template (
        id SERIAL PRIMARY KEY,
        version INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        created_by INTEGER NOT NULL REFERENCES users(id),
        is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
    """
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print("temporary_pass_report_template migration applied")
