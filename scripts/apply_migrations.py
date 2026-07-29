#!/usr/bin/env python3
"""Applies pending files from scripts/migrations/ to a Postgres database, tracking
progress in a schema_migrations table so each file runs at most once per DB.

Every file in scripts/migrations/ is already written to be safely re-runnable (see
each file's own header comment), so this script only needs the tracking table to
skip already-applied work — not to guarantee correctness on re-run. That's what
makes it safe to point at a DB that already has some/all migrations applied by
hand (e.g. a long-lived dev DB or an existing production DB): the first run just
records everything that's already true and applies the rest.

Usage:
    DATABASE_URL=postgresql://user:pass@host:port/db python scripts/apply_migrations.py
    python scripts/apply_migrations.py --database-url postgresql://... [--dry-run]
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse, urlunparse

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def _psql_dsn(database_url: str) -> str:
    # psql doesn't understand SQLAlchemy driver suffixes like +asyncpg/+psycopg2.
    parsed = urlparse(database_url)
    return urlunparse(parsed._replace(scheme=parsed.scheme.split("+")[0]))


def _psql(dsn: str, *args: str, capture: bool = False) -> str:
    result = subprocess.run(
        ["psql", dsn, "-v", "ON_ERROR_STOP=1", *args],
        check=True, capture_output=capture, text=True,
    )
    return result.stdout if capture else ""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    parser.add_argument("--dry-run", action="store_true", help="List pending migrations without applying them")
    args = parser.parse_args()

    if not args.database_url:
        sys.exit("DATABASE_URL not set (env var or --database-url)")

    dsn = _psql_dsn(args.database_url)

    _psql(dsn, "-c",
          "CREATE TABLE IF NOT EXISTS schema_migrations ("
          "filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())")

    applied = _psql(dsn, "-t", "-A", "-c", "SELECT filename FROM schema_migrations", capture=True)
    applied_set = {line.strip() for line in applied.splitlines() if line.strip()}

    pending = [f for f in sorted(MIGRATIONS_DIR.glob("*.sql")) if f.name not in applied_set]

    if not pending:
        print("No pending migrations.")
        return

    print(f"{len(pending)} pending migration(s):")
    for f in pending:
        print(f"  - {f.name}")
    if args.dry_run:
        return

    for f in pending:
        print(f"Applying {f.name} ...")
        _psql(dsn, "-f", str(f))
        _psql(dsn, "-c", f"INSERT INTO schema_migrations (filename) VALUES ('{f.name}')")
        print("  done.")

    print(f"Applied {len(pending)} migration(s).")


if __name__ == "__main__":
    main()
