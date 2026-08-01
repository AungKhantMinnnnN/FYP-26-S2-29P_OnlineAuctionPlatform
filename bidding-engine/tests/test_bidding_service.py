"""Mocked-boundary tests for BiddingService — the financial-integrity guards + happy path.

_execute_bid never touches Redis (only process_bid_message does), so it runs against a
faked AsyncSession. process_bid_message's validation failures return before the lock, so
they're testable without fakeredis.
"""
import json
import uuid
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.auction import (
    ListingStatus, BiddingType, SubscriptionTier, UserStatus, Bid,
)
from app.services import bidding_service as mod
from app.services.bidding_service import BiddingService
from tests.fakedb import make_db, exec_result

SELLER = uuid.uuid4()
USER = uuid.uuid4()
LISTING = uuid.uuid4()


def _listing(**over):
    base = dict(
        id=LISTING, status=ListingStatus.active,
        end_time=datetime.now(timezone.utc) + timedelta(hours=1),
        seller_id=SELLER, bidding_type=BiddingType.public,
        current_price=100.0, starting_price=10.0, min_increment=5.0,
        title="Rare Coin", updated_at=None,
    )
    base.update(over)
    return SimpleNamespace(**base)


def _user(**over):
    base = dict(
        id=USER, status=UserStatus.active, balance=1000.0,
        subscription_tier=SubscriptionTier.premium, username="bob",
    )
    base.update(over)
    return SimpleNamespace(**base)


# --- process_bid_message: pre-lock validation (no Redis) ---

async def test_process_rejects_wrong_action_type():
    out = await BiddingService.process_bid_message(make_db(), str(LISTING), str(USER),
                                                   json.dumps({"type": "cancel"}))
    assert out == {"success": False, "error": "Invalid action type"}


async def test_process_rejects_non_positive_amount():
    out = await BiddingService.process_bid_message(make_db(), str(LISTING), str(USER),
                                                   json.dumps({"type": "place_bid", "amount": 0}))
    assert out["error"] == "Invalid bid amount"


async def test_process_rejects_malformed_json():
    out = await BiddingService.process_bid_message(make_db(), str(LISTING), str(USER), "{not json")
    assert out["error"] == "Invalid message format"


# --- process_bid_message: Redis lock path (Phase 3) ---

class _FakeLock:
    """Async-context-manager stand-in for redis_client.lock(...)."""
    def __init__(self):
        self.entered = False

    async def __aenter__(self):
        self.entered = True
        return self

    async def __aexit__(self, *exc):
        return False


async def test_process_locks_listing_then_delegates(monkeypatch):
    lock = _FakeLock()
    lock_factory = MagicMock(return_value=lock)
    monkeypatch.setattr(mod.redis_client, "lock", lock_factory)
    execute = AsyncMock(return_value={"success": True, "data": "ok"})
    monkeypatch.setattr(BiddingService, "_execute_bid", execute)

    out = await BiddingService.process_bid_message(
        make_db(), str(LISTING), str(USER),
        json.dumps({"type": "place_bid", "amount": 150.0}),
    )

    # Correct per-listing key + serialisation timeouts.
    lock_factory.assert_called_once_with(f"lock:bid:{LISTING}", timeout=5.0, blocking_timeout=3.0)
    assert lock.entered is True                        # bid ran inside the lock
    execute.assert_awaited_once()
    assert execute.await_args.args[3] == 150.0         # amount forwarded
    assert out == {"success": True, "data": "ok"}      # result passed straight through


# --- _execute_bid: guards ---

async def test_execute_invalid_ids():
    out = await BiddingService._execute_bid(make_db(), "not-a-uuid", str(USER), 50.0)
    assert out["error"] == "Invalid IDs"


async def test_execute_listing_not_found():
    db = make_db()
    db.execute.side_effect = [exec_result(first=None)]
    out = await BiddingService._execute_bid(db, str(LISTING), str(USER), 50.0)
    assert out["error"] == "Listing not found"


async def test_execute_listing_not_active():
    db = make_db()
    db.execute.side_effect = [exec_result(first=_listing(status=ListingStatus.ended))]
    out = await BiddingService._execute_bid(db, str(LISTING), str(USER), 50.0)
    assert out["error"] == "Listing is not active"


async def test_execute_auction_already_ended():
    db = make_db()
    past = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.execute.side_effect = [exec_result(first=_listing(end_time=past))]
    out = await BiddingService._execute_bid(db, str(LISTING), str(USER), 50.0)
    assert out["error"] == "Auction has ended"


async def test_execute_seller_cannot_bid_own():
    db = make_db()
    db.execute.side_effect = [exec_result(first=_listing(seller_id=USER))]
    out = await BiddingService._execute_bid(db, str(LISTING), str(USER), 500.0)
    assert out["error"] == "Seller cannot bid on their own listing"


async def test_execute_below_public_minimum():
    db = make_db()
    # public min = current_price + 1 = 101; bid 50 is too low
    db.execute.side_effect = [exec_result(first=_listing(current_price=100.0)),
                              exec_result(first=None)]
    out = await BiddingService._execute_bid(db, str(LISTING), str(USER), 50.0)
    assert "at least 101.00" in out["error"]


async def test_execute_user_not_found():
    db = make_db()
    db.execute.side_effect = [exec_result(first=_listing()), exec_result(first=None),
                              exec_result(first=None)]
    out = await BiddingService._execute_bid(db, str(LISTING), str(USER), 200.0)
    assert out["error"] == "User not found"


async def test_execute_suspended_user_blocked():
    db = make_db()
    db.execute.side_effect = [exec_result(first=_listing()), exec_result(first=None),
                              exec_result(first=_user(status=UserStatus.suspended))]
    out = await BiddingService._execute_bid(db, str(LISTING), str(USER), 200.0)
    assert "not active" in out["error"]


async def test_execute_insufficient_balance():
    db = make_db()
    db.execute.side_effect = [exec_result(first=_listing()), exec_result(first=None),
                              exec_result(first=_user(balance=10.0))]
    out = await BiddingService._execute_bid(db, str(LISTING), str(USER), 200.0)
    assert out["error"] == "Insufficient wallet balance"


async def test_execute_free_tier_hourly_limit(monkeypatch):
    db = make_db()
    db.execute.side_effect = [exec_result(first=_listing()), exec_result(first=None),
                              exec_result(first=_user(subscription_tier=SubscriptionTier.free))]
    # Cap is enforced via an atomic Redis counter (see M8 fix), not a DB row count --
    # simulate the counter already being one over the cap.
    monkeypatch.setattr(mod.redis_client, "incr", AsyncMock(return_value=mod.FREE_BID_HOURLY_LIMIT + 1))
    monkeypatch.setattr(mod.redis_client, "expire", AsyncMock())
    decr = AsyncMock()
    monkeypatch.setattr(mod.redis_client, "decr", decr)
    out = await BiddingService._execute_bid(db, str(LISTING), str(USER), 200.0)
    assert "Free tier limit" in out["error"]
    decr.assert_awaited_once()  # the rejected attempt gives its quota back


# --- _execute_bid: happy path (outbid a previous bidder, anti-snipe extension) ---

async def test_execute_happy_outbid_releases_and_extends(monkeypatch):
    db = make_db()
    prev_uuid = uuid.uuid4()
    prev_bid = SimpleNamespace(bidder_id=prev_uuid, amount=100.0, id=uuid.uuid4())
    prev_user = _user(id=prev_uuid, balance=0.0)
    current_user = _user(balance=1000.0)
    # end_time 30s out -> inside the 60s anti-snipe window
    listing = _listing(end_time=datetime.now(timezone.utc) + timedelta(seconds=30))

    db.execute.side_effect = [
        exec_result(first=listing),        # 1. listing
        exec_result(first=prev_bid),       # 2. previous highest bid
        exec_result(first=current_user),   # 3. current user
        exec_result(first=prev_user),      # 4. previous bidder (to refund)
    ]

    # placed_at is a Python default applied at flush; flush is faked, so set it here.
    def _flush():
        for call in db.add.call_args_list:
            obj = call.args[0]
            if isinstance(obj, Bid) and getattr(obj, "placed_at", None) is None:
                obj.placed_at = datetime.now(timezone.utc)
    db.flush.side_effect = _flush

    notify = AsyncMock()
    monkeypatch.setattr(mod.notification_client, "notify_outbid", notify)

    out = await BiddingService._execute_bid(db, str(LISTING), str(USER), 150.0)

    assert out["success"] is True
    assert out["data"]["current_price"] == 150.0
    assert out["data"]["time_extended"] is True       # anti-snipe fired
    assert prev_user.balance == 100.0                 # refunded the outbid hold
    assert current_user.balance == 850.0              # 1000 - 150 held
    db.commit.assert_awaited_once()
    notify.assert_awaited_once()                      # outbid notification, post-commit
