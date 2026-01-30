"""
Simple migration runner.
"""
from sqlalchemy import text
import argparse
import os
import subprocess
import shutil
from urllib.parse import urlparse

from config import settings
from database import engine, check_connection
from migrate_20260127_base_schema import MIGRATION_ID as BASE_SCHEMA_ID, migrate as migrate_base_schema
from migrate_20260127_temporary_pass import MIGRATION_ID as TEMP_PASS_ID, migrate as migrate_temp_pass
from migrate_20260127_temp_pass_events import MIGRATION_ID as TEMP_EVENTS_ID, migrate as migrate_temp_events
from migrate_20260127_temp_pass_template import MIGRATION_ID as TEMP_TEMPLATE_ID, migrate as migrate_temp_template
from migrate_20260127_temp_pass_report_template import MIGRATION_ID as TEMP_REPORT_TEMPLATE_ID, migrate as migrate_temp_report_template
from migrate_20260128_free_mesto_limit import MIGRATION_ID as FREE_MESTO_LIMIT_ID, migrate as migrate_free_mesto_limit
from migrate_20260128_temp_pass_entered_by import MIGRATION_ID as TEMP_PASS_ENTERED_BY_ID, migrate as migrate_temp_pass_entered_by
from migrate_20260128_temp_pass_exited_by import MIGRATION_ID as TEMP_PASS_EXITED_BY_ID, migrate as migrate_temp_pass_exited_by


MIGRATIONS = [
    (BASE_SCHEMA_ID, migrate_base_schema),
    (TEMP_PASS_ID, migrate_temp_pass),
    (TEMP_EVENTS_ID, migrate_temp_events),
    (TEMP_TEMPLATE_ID, migrate_temp_template),
    (TEMP_REPORT_TEMPLATE_ID, migrate_temp_report_template),
    (TEMP_PASS_ENTERED_BY_ID, migrate_temp_pass_entered_by),
    (TEMP_PASS_EXITED_BY_ID, migrate_temp_pass_exited_by),
    (FREE_MESTO_LIMIT_ID, migrate_free_mesto_limit),
]


def ensure_migrations_table():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id VARCHAR(200) PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """))


def get_applied():
    with engine.begin() as conn:
        rows = conn.execute(text("SELECT id FROM schema_migrations")).fetchall()
    return {row[0] for row in rows}


def mark_applied(migration_id: str):
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO schema_migrations (id) VALUES (:id)"),
            {"id": migration_id},
        )


def run_migrations():
    if not check_connection():
        raise SystemExit("DB connection failed")
    ensure_migrations_table()
    applied = get_applied()
    for migration_id, handler in MIGRATIONS:
        if migration_id in applied:
            continue
        handler()
        mark_applied(migration_id)
        print(f"Applied {migration_id}")


def _get_conn_params():
    url = settings.DATABASE_URL
    if url:
        parsed = urlparse(url)
        # Support postgres+psycopg://user:pass@host:port/dbname
        username = parsed.username or ""
        password = parsed.password or ""
        host = parsed.hostname or "localhost"
        port = str(parsed.port or 5432)
        dbname = (parsed.path or "").lstrip("/")
        return {
            "host": host,
            "port": port,
            "user": username,
            "password": password,
            "dbname": dbname,
        }
    return {
        "host": settings.POSTGRES_HOST or "localhost",
        "port": str(settings.POSTGRES_PORT or 5432),
        "user": settings.POSTGRES_USER or "",
        "password": settings.POSTGRES_PASSWORD or "",
        "dbname": settings.POSTGRES_DB or "",
    }


def _build_env(password: str):
    env = os.environ.copy()
    if password:
        env["PGPASSWORD"] = password
    return env


def backup_db(output_path: str):
    if not shutil.which("pg_dump"):
        raise SystemExit("pg_dump not found in PATH")
    params = _get_conn_params()
    if not params["dbname"]:
        raise SystemExit("DB name is not set")
    cmd = [
        "pg_dump",
        "-Fc",
        "-h",
        params["host"],
        "-p",
        params["port"],
        "-U",
        params["user"],
        "-d",
        params["dbname"],
        "-f",
        output_path,
    ]
    subprocess.run(cmd, check=True, env=_build_env(params["password"]))
    print(f"Backup saved to {output_path}")


def restore_db(input_path: str, clean: bool = False):
    if not shutil.which("pg_restore"):
        raise SystemExit("pg_restore not found in PATH")
    params = _get_conn_params()
    if not params["dbname"]:
        raise SystemExit("DB name is not set")
    cmd = [
        "pg_restore",
        "-h",
        params["host"],
        "-p",
        params["port"],
        "-U",
        params["user"],
        "-d",
        params["dbname"],
    ]
    if clean:
        cmd.extend(["--clean", "--if-exists"])
    cmd.append(input_path)
    subprocess.run(cmd, check=True, env=_build_env(params["password"]))
    print(f"Restore completed from {input_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migration and DB utilities")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("migrate", help="Run migrations")

    backup_parser = subparsers.add_parser("backup", help="Create DB backup")
    backup_parser.add_argument("path", help="Output file path")

    restore_parser = subparsers.add_parser("restore", help="Restore DB backup")
    restore_parser.add_argument("path", help="Input file path")
    restore_parser.add_argument("--clean", action="store_true", help="Drop objects before restore")

    args = parser.parse_args()
    if args.command == "backup":
        backup_db(args.path)
    elif args.command == "restore":
        restore_db(args.path, clean=args.clean)
    else:
        run_migrations()
