"""
Migration: add exited_by to temporary_pass.
"""
from sqlalchemy import text

from database import engine, check_connection

MIGRATION_ID = "20260128_temp_pass_exited_by"


def migrate():
    if not check_connection():
        raise SystemExit("DB connection failed")

    ddl = """
    ALTER TABLE temporary_pass
        ADD COLUMN IF NOT EXISTS exited_by INTEGER;
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'temporary_pass_exited_by_fkey'
        ) THEN
            ALTER TABLE temporary_pass
                ADD CONSTRAINT temporary_pass_exited_by_fkey
                FOREIGN KEY (exited_by) REFERENCES users(id);
        END IF;
    END $$;
    """
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print("temporary_pass exited_by migration applied")
