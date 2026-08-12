"""Unit tests for UserService.get_quota — the free-tier dashboard meters.

Uses the fakedb AsyncSession fake plus an AsyncMock Redis so the countdown math
(bid TTL, oldest-listing + 1h) is exercised without a real database or Redis.
"""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.models.auction import SubscriptionTier
from app.services.user_service import UserService
from tests.fakedb import make_db


def make_user(tier):
    return SimpleNamespace(id="u1", subscription_tier=tier)


def make_redis(bid_count=None, ttl=None, error=False):
    r = AsyncMock()
    if error:
        r.get.side_effect = Exception("redis down")
    else:
        r.get.return_value = bid_count
        r.ttl.return_value = ttl
    return r


async def test_quota_premium_is_unlimited():
    out = await UserService.get_quota(make_db(), make_user(SubscriptionTier.premium))
    assert out == {"tier": "premium", "bids": None, "listings": None}


async def test_quota_free_with_no_usage():
    db = make_db()
    db.scalar.side_effect = [0, None]
    redis = make_redis(bid_count=None, ttl=-2)
    out = await UserService.get_quota(db, make_user(SubscriptionTier.free), redis=redis)

    assert out["tier"] == "free"
    assert out["bids"]["limit"] == 10
    assert out["bids"]["used"] == 0
    assert out["bids"]["remaining"] == 10
    assert out["bids"]["resets_at"] is None
    assert out["listings"]["limit"] == 5
    assert out["listings"]["used"] == 0
    assert out["listings"]["remaining"] == 5
    assert out["listings"]["resets_at"] is None


async def test_quota_free_with_usage_and_reset_times():
    oldest_listing = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    db = make_db()
    db.scalar.side_effect = [2, oldest_listing]
    redis = make_redis(bid_count="6", ttl=1200)
    out = await UserService.get_quota(db, make_user(SubscriptionTier.free), redis=redis)

    assert out["bids"]["used"] == 6
    assert out["bids"]["remaining"] == 4
    assert out["bids"]["resets_at"] is not None
    # resets_at is now + the Redis TTL (within a small tolerance)
    assert (out["bids"]["resets_at"] - datetime.now(timezone.utc)).total_seconds() > 1100

    assert out["listings"]["used"] == 2
    assert out["listings"]["remaining"] == 3
    assert out["listings"]["resets_at"] == oldest_listing + timedelta(hours=1)


async def test_quota_free_redis_down_still_reports_listings():
    db = make_db()
    db.scalar.side_effect = [1, datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)]
    redis = make_redis(error=True)
    out = await UserService.get_quota(db, make_user(SubscriptionTier.free), redis=redis)

    # Bids degrade to "no usage yet" rather than erroring; listings still computed.
    assert out["bids"]["used"] == 0
    assert out["bids"]["remaining"] == 10
    assert out["bids"]["resets_at"] is None
    assert out["listings"]["used"] == 1
    assert out["listings"]["remaining"] == 4
