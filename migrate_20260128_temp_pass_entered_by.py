"""
Migration: add entered_by to temporary_pass.
"""
from sqlalchemy import text

from database import engine, check_connection

MIGRATION_ID = "20260128_temp_pass_entered_by"


def migrate():
    if not check_connection():
        raise SystemExit("DB connection failed")

    ddl = """
    ALTER TABLE temporary_pass
        ADD COLUMN IF NOT EXISTS entered_by INTEGER;
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'temporary_pass_entered_by_fkey'
        ) THEN
            ALTER TABLE temporary_pass
                ADD CONSTRAINT temporary_pass_entered_by_fkey
                FOREIGN KEY (entered_by) REFERENCES users(id);
        END IF;
    END $$;
    """
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print("temporary_pass entered_by migration applied")
