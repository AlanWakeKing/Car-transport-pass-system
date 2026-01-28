"""
Migration: create temporary_pass table if it does not exist.
"""
from sqlalchemy import text

from database import engine, check_connection

MIGRATION_ID = "20260127_temporary_pass"

def migrate():
    if not check_connection():
        raise SystemExit("DB connection failed")

    ddl = """
    CREATE TABLE IF NOT EXISTS temporary_pass (
        id SERIAL PRIMARY KEY,
        gos_id VARCHAR(20) NOT NULL,
        id_org INTEGER NOT NULL REFERENCES organiz(id_org),
        phone VARCHAR(30),
        valid_from TIMESTAMPTZ NOT NULL,
        valid_until TIMESTAMPTZ NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT now(),
        revoked_at TIMESTAMPTZ,
        revoked_by INTEGER REFERENCES users(id),
        comment TEXT
    );
    CREATE INDEX IF NOT EXISTS ix_temporary_pass_gos_id ON temporary_pass (gos_id);
    CREATE INDEX IF NOT EXISTS ix_temporary_pass_id_org ON temporary_pass (id_org);
    """

    with engine.begin() as conn:
        conn.execute(text(ddl))

    print("temporary_pass migration applied")


if __name__ == "__main__":
    migrate()
