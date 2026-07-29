"""Integration harness for bidding-engine — real Postgres + real Redis lock.

These tests exercise what mocked-boundary unit tests structurally can't: that concurrent
bids actually serialize through the Redis lock, and that escrow money is conserved across a
real commit. They need live infra and so live OUTSIDE `tests/` — the fast unit job runs
`pytest tests/` and never sees them; a separate job runs `pytest integration/`.

Writes go to an isolated `auction_integration_test` DB (cloned from the dev schema via
pg_dump), so the dev database is never touched. The Redis lock uses the real Redis — lock
keys are per-listing UUIDs that expire in seconds, so there's nothing to clobber.

Local runs self-provision the test DB via `docker exec`. CI sets INTEGRATION_DATABASE_URL
to a ready, isolated DB and skips provisioning.
"""
import os
import re
import pathlib
import subprocess

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

REPO = pathlib.Path(__file__).resolve().parents[2]
TEST_DB = "auction_integration_test"
PG_CONTAINER = os.environ.get("PG_CONTAINER", "AuctionHub_PostgreSQL_DB")


def _dotenv():
    vals = {}
    f = REPO / ".env"
    if f.exists():
        for line in f.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                vals[k] = v
    return vals


_ENV = _dotenv()


def _cfg(key):
    # .env wins over os.environ: the unit root conftest seeds os.environ with DUMMY creds
    # via setdefault, so locally we must read the real values from .env. In CI there is no
    # .env file, so this falls back to the job's real environment variables.
    return _ENV.get(key) or os.environ.get(key)


_m = re.match(r"postgresql(?:\+asyncpg)?://([^:]+):([^@]+)@([^:/]+):(\d+)/(.+)", _cfg("DATABASE_URL"))
USER, PW, HOST, PORT, DEVDB = _m.groups()
TEST_URL = f"postgresql+asyncpg://{USER}:{PW}@{HOST}:{PORT}/{TEST_DB}"

# Point the app's settings at the isolated test DB and the REAL Redis (the lock needs it),
# BEFORE any `app.*` import triggers Settings()/redis_client construction.
os.environ["DATABASE_URL"] = os.environ.get("INTEGRATION_DATABASE_URL", TEST_URL)
os.environ["REDIS_URL"] = _cfg("REDIS_URL")

_ACTIVE_URL = os.environ["DATABASE_URL"]

# Tables the bid flow touches — truncated between tests. CASCADE handles the FK web.
_TRUNCATE = (
    "TRUNCATE users, listings, bids, wallet_transactions, user_interactions, "
    "auction_results, notifications RESTART IDENTITY CASCADE"
)


def _docker_psql(db, sql):
    subprocess.run(
        ["docker", "exec", "-e", f"PGPASSWORD={PW}", PG_CONTAINER,
         "psql", "-U", USER, "-d", db, "-v", "ON_ERROR_STOP=1", "-c", sql],
        check=True, capture_output=True,
    )


@pytest.fixture(scope="session", autouse=True)
def _provision_test_db():
    if os.environ.get("INTEGRATION_DATABASE_URL"):
        yield  # CI supplied a ready, isolated DB — nothing to build.
        return
    _docker_psql("postgres", f"DROP DATABASE IF EXISTS {TEST_DB}")
    _docker_psql("postgres", f"CREATE DATABASE {TEST_DB}")
    # Clone just the schema (no data) from the live dev DB — guarantees the test DB matches
    # exactly what the app runs against, migrations included.
    subprocess.run(
        ["docker", "exec", "-e", f"PGPASSWORD={PW}", PG_CONTAINER, "sh", "-c",
         f"pg_dump -s -U {USER} {DEVDB} | psql -U {USER} -d {TEST_DB}"],
        check=True, capture_output=True,
    )
    yield


@pytest_asyncio.fixture
async def sessions(_provision_test_db):
    """A sessionmaker bound to a freshly-truncated test DB (each test starts clean)."""
    engine = create_async_engine(_ACTIVE_URL)
    async with engine.begin() as conn:
        await conn.execute(text(_TRUNCATE))
    maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    yield maker
    await engine.dispose()


@pytest_asyncio.fixture
async def session(sessions):
    async with sessions() as s:
        yield s


@pytest_asyncio.fixture(autouse=True)
async def _fresh_redis_loop():
    """Each test runs in its own event loop, but the module-global redis_client pins its
    connection pool to the loop of first use. Disconnect after each test so the next one
    reconnects on its own loop (otherwise: 'Event loop is closed')."""
    yield
    from app.core.redis import redis_client
    try:
        await redis_client.aclose()
    except AttributeError:  # older redis-py
        await redis_client.close()
