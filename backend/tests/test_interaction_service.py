"""Mocked-boundary tests for interaction_service (opens its own AsyncSessionLocal)."""
import uuid

from app.models.auction import InteractionAction
from app.services import interaction_service as mod
from tests.fakedb import make_db, ctx_session


async def test_log_interaction_writes_one_row(monkeypatch):
    db = make_db()
    monkeypatch.setattr(mod, "AsyncSessionLocal", lambda: ctx_session(db))
    await mod.log_interaction(uuid.uuid4(), uuid.uuid4(), InteractionAction.search)
    db.add.assert_called_once()
    db.commit.assert_awaited_once()


async def test_log_search_empty_is_noop(monkeypatch):
    db = make_db()
    monkeypatch.setattr(mod, "AsyncSessionLocal", lambda: ctx_session(db))
    await mod.log_search_interactions(uuid.uuid4(), [])
    db.add.assert_not_called()


async def test_log_search_bulk_inserts_per_listing(monkeypatch):
    db = make_db()
    monkeypatch.setattr(mod, "AsyncSessionLocal", lambda: ctx_session(db))
    ids = [uuid.uuid4(), uuid.uuid4(), uuid.uuid4()]
    await mod.log_search_interactions(uuid.uuid4(), ids)
    assert db.add.call_count == 3
    db.commit.assert_awaited_once()


async def test_log_interaction_swallows_errors(monkeypatch):
    # Failure must not propagate — it's called as a fire-and-forget BackgroundTask.
    def boom():
        raise RuntimeError("db down")
    monkeypatch.setattr(mod, "AsyncSessionLocal", boom)
    await mod.log_interaction(uuid.uuid4(), uuid.uuid4(), InteractionAction.search)  # no raise
