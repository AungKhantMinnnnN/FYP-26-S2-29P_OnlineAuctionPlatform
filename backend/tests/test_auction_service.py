"""Mocked-boundary tests for AuctionService guards (storage/AI already neutered in conftest)."""
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models.auction import ListingStatus
from app.services.auction_service import AuctionService
from tests.fakedb import make_db, exec_result


async def test_get_auction_404_when_missing():
    db = make_db()
    db.execute.side_effect = [exec_result(first=None)]
    with pytest.raises(HTTPException) as e:
        await AuctionService.get_auction(db, uuid.uuid4())
    assert e.value.status_code == 404


async def test_get_auction_returns_listing():
    db = make_db()
    listing = object()
    db.execute.side_effect = [exec_result(first=listing)]
    assert await AuctionService.get_auction(db, uuid.uuid4()) is listing


async def test_get_auction_bids_returns_scalars():
    db = make_db()
    bids = [object(), object()]
    db.execute.side_effect = [exec_result(all_=bids)]
    assert await AuctionService.get_auction_bids(db, uuid.uuid4()) == bids


async def test_check_prohibited_keywords_noop_when_none():
    db = make_db()
    db.execute.side_effect = [exec_result(all_=[])]  # no configured keywords
    # Must not raise even with obviously bad text when the list is empty.
    await AuctionService._check_prohibited_keywords(db, uuid.uuid4(), "gun", None, None)


async def test_check_prohibited_keywords_flags_and_raises():
    db = make_db()
    db.execute.side_effect = [exec_result(all_=["gun"])]
    with pytest.raises(HTTPException) as e:
        await AuctionService._check_prohibited_keywords(db, uuid.uuid4(), "selling a 9un", None, None)
    assert e.value.status_code == 400
    db.add.assert_called_once()   # FlaggedListingAttempt persisted
    db.commit.assert_awaited_once()


def _update_listing(seller_id, status):
    return SimpleNamespace(seller_id=seller_id, status=status)


async def test_update_listing_404_when_missing():
    db = make_db()
    db.execute.side_effect = [exec_result(first=None)]
    with pytest.raises(HTTPException) as e:
        await AuctionService.update_listing(db, uuid.uuid4(), uuid.uuid4(), SimpleNamespace())
    assert e.value.status_code == 404


async def test_update_listing_403_when_not_owner():
    db = make_db()
    listing = _update_listing(seller_id=uuid.uuid4(), status=ListingStatus.draft)
    db.execute.side_effect = [exec_result(first=listing)]
    with pytest.raises(HTTPException) as e:
        await AuctionService.update_listing(db, uuid.uuid4(), uuid.uuid4(), SimpleNamespace())
    assert e.value.status_code == 403


async def test_update_listing_400_when_not_editable():
    db = make_db()
    user = uuid.uuid4()
    listing = _update_listing(seller_id=user, status=ListingStatus.active)  # active != editable
    db.execute.side_effect = [exec_result(first=listing)]
    with pytest.raises(HTTPException) as e:
        await AuctionService.update_listing(db, uuid.uuid4(), user, SimpleNamespace())
    assert e.value.status_code == 400
