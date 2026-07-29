"""Integration tests: concurrent-bid serialization, escrow conservation, model↔DB drift.

Real Postgres + real Redis lock. See integration/conftest.py.
"""
import asyncio
import datetime
import json
import uuid

import pytest
from sqlalchemy import select, func

from app.models.auction import (
    User, Listing, Bid, WalletTransaction, UserInteraction, AuctionResult,
    ItemConditions, BiddingType, ListingStatus, SubscriptionTier, UserStatus,
    TransactionType,
)
from app.services.bidding_service import BiddingService

UTC = datetime.timezone.utc


async def _user(session, balance):
    u = User(
        username=f"u_{uuid.uuid4().hex[:10]}", email=f"{uuid.uuid4().hex[:10]}@x.com",
        password_hash="x", balance=balance, subscription_tier=SubscriptionTier.premium,
        status=UserStatus.active,
    )
    session.add(u)
    await session.flush()
    return u


async def _listing(session, seller_id, current_price=100.0):
    lst = Listing(
        seller_id=seller_id, title="Rare Coin", condition=ItemConditions.used,
        bidding_type=BiddingType.public, starting_price=100.0, current_price=current_price,
        min_increment=1.0, status=ListingStatus.active,
        end_time=datetime.datetime.now(UTC) + datetime.timedelta(hours=1),
    )
    session.add(lst)
    await session.flush()
    return lst


def _bid_msg(amount):
    return json.dumps({"type": "place_bid", "amount": amount})


# --- Concurrency: the Redis lock must serialize simultaneous bids ---

async def test_concurrent_equal_bids_only_one_wins(sessions):
    """Two bidders fire the same amount at the same instant. With the lock, they serialize:
    the first sets the price, the second is now below the minimum and is rejected. Without
    serialization both would 'succeed', double-holding funds and corrupting the price."""
    async with sessions() as setup:
        seller = await _user(setup, 0.0)
        a = await _user(setup, 1000.0)
        b = await _user(setup, 1000.0)
        listing = await _listing(setup, seller.id, current_price=100.0)
        await setup.commit()
        lid, aid, bid_ = str(listing.id), str(a.id), str(b.id)

    async def place(user_id):
        async with sessions() as s:
            return await BiddingService.process_bid_message(s, lid, user_id, _bid_msg(150.0))

    r1, r2 = await asyncio.gather(place(aid), place(bid_))

    successes = [r for r in (r1, r2) if r["success"]]
    failures = [r for r in (r1, r2) if not r["success"]]
    assert len(successes) == 1                       # exactly one bid accepted
    assert "at least 151.00" in failures[0]["error"]  # the loser saw the updated price

    async with sessions() as check:
        bid_count = await check.scalar(select(func.count()).select_from(Bid))
        price = await check.scalar(select(Listing.current_price).where(Listing.id == listing.id))
    assert bid_count == 1 and price == 150.0


# --- Escrow: money is conserved across an outbid refund + new hold ---

async def test_outbid_refund_conserves_money(sessions):
    async with sessions() as setup:
        seller = await _user(setup, 0.0)
        a = await _user(setup, 1000.0)
        b = await _user(setup, 1000.0)
        listing = await _listing(setup, seller.id, current_price=100.0)
        await setup.commit()
        lid, aid, bid_ = str(listing.id), str(a.id), str(b.id)
        a_id, b_id = a.id, b.id
    initial_total = 0.0 + 1000.0 + 1000.0

    async with sessions() as s:
        r = await BiddingService.process_bid_message(s, lid, aid, _bid_msg(150.0))
        assert r["success"]
    async with sessions() as s:
        r = await BiddingService.process_bid_message(s, lid, bid_, _bid_msg(200.0))
        assert r["success"]

    async with sessions() as check:
        bal_a = await check.scalar(select(User.balance).where(User.id == a_id))
        bal_b = await check.scalar(select(User.balance).where(User.id == b_id))
        holds = await check.scalar(
            select(func.coalesce(func.sum(WalletTransaction.amount), 0))
            .where(WalletTransaction.type == TransactionType.bid_hold)
        )
        releases = await check.scalar(
            select(func.coalesce(func.sum(WalletTransaction.amount), 0))
            .where(WalletTransaction.type == TransactionType.bid_release)
        )

    assert bal_a == 1000.0        # A fully refunded after being outbid
    assert bal_b == 800.0         # B holds 200
    outstanding_escrow = float(holds) - float(releases)
    assert outstanding_escrow == 200.0                         # exactly B's live hold
    # Nothing created or destroyed: wallets + escrow == what we started with.
    assert bal_a + bal_b + 0.0 + outstanding_escrow == initial_total


# --- Model ↔ DB drift: each mapped model must match the real schema ---

@pytest.mark.parametrize("model", [User, Listing, Bid, WalletTransaction, UserInteraction, AuctionResult])
async def test_model_matches_db_schema(session, model):
    # Executes real SQL over every mapped column; a column the DB lacks raises here.
    await session.execute(select(model).limit(0))
