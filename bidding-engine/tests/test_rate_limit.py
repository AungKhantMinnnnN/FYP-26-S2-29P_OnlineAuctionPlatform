"""Unit tests for ConnectionManager.allow_message's Redis-backed sliding window.

allow_message is async and reads the current window count from a Redis sorted set
(see app.core.connection_manager). These tests mock the Redis pipeline response
(results[1] is the zcard count) so the throttling logic is exercised without a live
Redis, following the mocked-boundary convention used across this suite.
"""
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core import connection_manager as cm


def _manager_with_count(count: int) -> cm.ConnectionManager:
    mgr = cm.ConnectionManager()
    pipe = MagicMock()
    pipe.execute = AsyncMock(return_value=[0, count, 1, 1])
    mgr._redis = MagicMock()
    mgr._redis.pipeline.return_value = pipe
    return mgr


async def test_allow_message_when_under_limit():
    mgr = _manager_with_count(cm.RATE_LIMIT_MAX_MESSAGES - 1)
    assert await mgr.allow_message("user-1") is True


async def test_allow_message_throttled_at_limit():
    mgr = _manager_with_count(cm.RATE_LIMIT_MAX_MESSAGES)
    assert await mgr.allow_message("user-1") is False


async def test_allow_message_uses_user_scoped_key():
    mgr = _manager_with_count(0)
    await mgr.allow_message("1234-5678")
    key = mgr._redis.pipeline.return_value.zadd.call_args.args[0]
    assert key == "ratelimit:ws:1234-5678"


async def test_allow_message_fails_open_when_redis_unavailable():
    mgr = cm.ConnectionManager()
    mgr._redis = MagicMock()
    mgr._redis.pipeline.side_effect = RuntimeError("redis down")
    assert await mgr.allow_message("user-1") is True


async def test_allow_message_disabled_when_rate_limit_off(monkeypatch):
    mgr = _manager_with_count(cm.RATE_LIMIT_MAX_MESSAGES)
    monkeypatch.setattr(cm.settings, "RATE_LIMIT_ENABLED", False)
    assert await mgr.allow_message("user-1") is True
    mgr._redis.pipeline.assert_not_called()
