"""Mocked-boundary tests for FeedbackTypeService and FeedbackService guards."""
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.feedback_service import FeedbackTypeService, FeedbackService
from tests.fakedb import make_db, exec_result


# --- FeedbackTypeService ---

async def test_type_get_all_returns_scalars():
    db = make_db()
    rows = [object()]
    db.execute.side_effect = [exec_result(all_=rows)]
    assert await FeedbackTypeService.get_all(db) == rows


async def test_type_create_409_on_duplicate():
    db = make_db()
    db.scalar.side_effect = [object()]
    with pytest.raises(HTTPException) as e:
        await FeedbackTypeService.create(db, SimpleNamespace(name="dup", reviewer_role="buyer"))
    assert e.value.status_code == 409


async def test_type_update_404_when_missing():
    db = make_db()
    db.scalar.side_effect = [None]
    with pytest.raises(HTTPException) as e:
        await FeedbackTypeService.update(db, uuid.uuid4(), SimpleNamespace(name="x", is_active=None))
    assert e.value.status_code == 404


async def test_type_delete_404_when_missing():
    db = make_db()
    db.scalar.side_effect = [None]
    with pytest.raises(HTTPException) as e:
        await FeedbackTypeService.delete(db, uuid.uuid4())
    assert e.value.status_code == 404


async def test_type_delete_409_when_in_use():
    db = make_db()
    db.scalar.side_effect = [SimpleNamespace(), True]  # found, then in-use
    with pytest.raises(HTTPException) as e:
        await FeedbackTypeService.delete(db, uuid.uuid4())
    assert e.value.status_code == 409


# --- FeedbackService ---

async def test_check_eligibility_404_when_listing_missing():
    db = make_db()
    db.scalar.side_effect = [None]  # listing lookup
    with pytest.raises(HTTPException) as e:
        await FeedbackService._check_eligibility(
            db, uuid.uuid4(), uuid.uuid4(), SimpleNamespace(reviewer_role="buyer"),
        )
    assert e.value.status_code == 404


async def test_check_eligibility_403_buyer_without_bid():
    db = make_db()
    listing = SimpleNamespace(seller_id=uuid.uuid4())
    db.scalar.side_effect = [listing, None]  # listing found, no bid
    with pytest.raises(HTTPException) as e:
        await FeedbackService._check_eligibility(
            db, uuid.uuid4(), uuid.uuid4(), SimpleNamespace(reviewer_role="buyer"),
        )
    assert e.value.status_code == 403


async def test_check_eligibility_403_seller_when_not_owner():
    db = make_db()
    listing = SimpleNamespace(seller_id=uuid.uuid4())  # different from reviewer
    db.scalar.side_effect = [listing]
    with pytest.raises(HTTPException) as e:
        await FeedbackService._check_eligibility(
            db, uuid.uuid4(), uuid.uuid4(), SimpleNamespace(reviewer_role="seller"),
        )
    assert e.value.status_code == 403


async def test_get_eligibility_404_when_listing_missing():
    db = make_db()
    db.scalar.side_effect = [None]
    with pytest.raises(HTTPException) as e:
        await FeedbackService.get_eligibility(db, uuid.uuid4(), uuid.uuid4())
    assert e.value.status_code == 404


async def test_get_eligibility_marks_buyer_types_eligible():
    db = make_db()
    reviewer = uuid.uuid4()
    listing = SimpleNamespace(seller_id=uuid.uuid4())
    buyer_id, seller_id = uuid.uuid4(), uuid.uuid4()
    buyer_ft = SimpleNamespace(id=buyer_id, reviewer_role="buyer")
    seller_ft = SimpleNamespace(id=seller_id, reviewer_role="seller")
    db.scalar.side_effect = [listing, True]  # listing, has_bid=True
    db.execute.side_effect = [
        exec_result(all_=[buyer_ft, seller_ft]),  # get_all active types
        exec_result(rows=[]),                       # already-submitted rows
    ]
    out = await FeedbackService.get_eligibility(db, reviewer, uuid.uuid4())
    assert buyer_id in out.eligible_type_ids
    assert seller_id not in out.eligible_type_ids  # reviewer is not the seller


async def test_submit_404_when_type_inactive():
    db = make_db()
    db.scalar.side_effect = [SimpleNamespace(is_active=False, reviewer_role="buyer")]
    data = SimpleNamespace(feedback_type_id=uuid.uuid4(), listing_id=uuid.uuid4(),
                           reviewee_id=uuid.uuid4(), rating=5, comment="")
    with pytest.raises(HTTPException) as e:
        await FeedbackService.submit(db, uuid.uuid4(), data)
    assert e.value.status_code == 404
