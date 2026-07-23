"""Tiny AsyncSession fake for the mocked-boundary phase (stdlib mock only).

Queue per-call return values via `.execute.side_effect = [exec_result(...), ...]`
and `.scalar.side_effect = [...]`.
"""
from unittest.mock import AsyncMock, MagicMock


def make_db():
    db = MagicMock()
    db.execute = AsyncMock()
    db.scalar = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    db.flush = AsyncMock()
    db.rollback = AsyncMock()
    db.add = MagicMock()
    return db


def exec_result(first=None, all_=None, rows=None):
    """A fake db.execute(...) result. `first`/`all_` feed .scalars().first()/.all()."""
    r = MagicMock()
    r.scalars.return_value.first.return_value = first
    r.scalars.return_value.all.return_value = [] if all_ is None else all_
    r.all.return_value = [] if rows is None else rows
    return r
