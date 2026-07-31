"""Phase 3 mocked-Redis tests for cache_service.

redis_client is mocked (stdlib AsyncMock — no fakeredis). Covers the enable/disable
toggle, empty-skip, hit/miss, round-trip, and the "Redis down = cache miss" contract:
every failure must be swallowed and surface as None so the pipeline falls back to the DB.
"""
import json
from io import StringIO
from unittest.mock import AsyncMock

import numpy as np
import pandas as pd

from app.services import cache_service as mod


def _df():
    return pd.DataFrame({"id": [1, 2], "score": [0.5, 0.9]})


# --- set_df ---

async def test_set_df_skipped_when_disabled(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", False)
    monkeypatch.setattr(mod.redis_client, "set", AsyncMock())
    await mod.set_df("k", _df(), ttl=60)
    mod.redis_client.set.assert_not_awaited()


async def test_set_df_skipped_when_empty(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", True)
    monkeypatch.setattr(mod.redis_client, "set", AsyncMock())
    await mod.set_df("k", pd.DataFrame(), ttl=60)
    mod.redis_client.set.assert_not_awaited()


async def test_set_df_writes_with_ttl(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", True)
    set_mock = AsyncMock()
    monkeypatch.setattr(mod.redis_client, "set", set_mock)
    await mod.set_df("k", _df(), ttl=90)
    set_mock.assert_awaited_once()
    assert set_mock.await_args.args[0] == "k"
    assert set_mock.await_args.kwargs["ex"] == 90


async def test_set_df_swallows_redis_error(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", True)
    monkeypatch.setattr(mod.redis_client, "set", AsyncMock(side_effect=RuntimeError("down")))
    await mod.set_df("k", _df(), ttl=60)  # must not raise


# --- get_df ---

async def test_get_df_none_when_disabled(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", False)
    assert await mod.get_df("k") is None


async def test_get_df_none_on_miss(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", True)
    monkeypatch.setattr(mod.redis_client, "get", AsyncMock(return_value=None))
    assert await mod.get_df("k") is None


async def test_get_df_round_trips_hit(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", True)
    payload = _df().to_json(orient="split", date_format="iso", default_handler=str)
    monkeypatch.setattr(mod.redis_client, "get", AsyncMock(return_value=payload))
    out = await mod.get_df("k")
    assert list(out.columns) == ["id", "score"]
    assert out["score"].tolist() == [0.5, 0.9]


async def test_get_df_swallows_redis_error(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", True)
    monkeypatch.setattr(mod.redis_client, "get", AsyncMock(side_effect=RuntimeError("down")))
    assert await mod.get_df("k") is None  # error treated as a miss


# --- set_json / get_json ---

async def test_set_json_serialises_numpy_scalars(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", True)
    set_mock = AsyncMock()
    monkeypatch.setattr(mod.redis_client, "set", set_mock)
    await mod.set_json("k", {"score": np.float64(1.5)}, ttl=30)
    stored = set_mock.await_args.args[1]           # numpy.float64 would crash plain json.dumps
    assert json.loads(stored) == {"score": 1.5}


async def test_get_json_none_when_disabled(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", False)
    assert await mod.get_json("k") is None


async def test_get_json_returns_parsed_hit(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", True)
    monkeypatch.setattr(mod.redis_client, "get", AsyncMock(return_value='{"a": 1}'))
    assert await mod.get_json("k") == {"a": 1}


async def test_get_json_swallows_redis_error(monkeypatch):
    monkeypatch.setattr(mod.settings, "RECS_CACHE_ENABLED", True)
    monkeypatch.setattr(mod.redis_client, "get", AsyncMock(side_effect=RuntimeError("down")))
    assert await mod.get_json("k") is None
