"""Integration harness for recommendation-engine — read-only session against the LIVE dev DB.

Every test is a `SELECT ... LIMIT 0`; nothing is written. Lives outside `tests/` so the
unit job skips it.
"""
import os
import pathlib

import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

REPO = pathlib.Path(__file__).resolve().parents[2]


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


DEV_URL = _dotenv().get("DATABASE_URL") or os.environ["DATABASE_URL"]
os.environ["DATABASE_URL"] = DEV_URL


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine(DEV_URL)
    maker = async_sessionmaker(bind=engine, class_=AsyncSession)
    async with maker() as s:
        yield s
    await engine.dispose()
