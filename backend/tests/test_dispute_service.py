"""Mocked-boundary tests for DisputeService."""
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.dispute_service import DisputeService
from tests.fakedb import make_db, exec_result


async def test_get_disputes_returns_scalars():
    db = make_db()
    rows = [object()]
    db.execute.side_effect = [exec_result(all_=rows)]
    assert await DisputeService.get_disputes(db) == rows


async def test_resolve_404_when_missing():
    db = make_db()
    db.execute.side_effect = [exec_result(first=None)]
    with pytest.raises(HTTPException) as e:
        await DisputeService.resolve_dispute(
            db, uuid.uuid4(), uuid.uuid4(),
            SimpleNamespace(status="resolved", resolution_note="ok"),
        )
    assert e.value.status_code == 404


async def test_resolve_sets_fields():
    db = make_db()
    dispute = SimpleNamespace(status=None, resolution_note=None, resolved_by=None, resolved_at=None)
    db.execute.side_effect = [exec_result(first=dispute)]
    admin = uuid.uuid4()
    out = await DisputeService.resolve_dispute(
        db, uuid.uuid4(), admin,
        SimpleNamespace(status="resolved", resolution_note="done"),
    )
    assert out.status == "resolved" and out.resolution_note == "done"
    assert out.resolved_by == admin and out.resolved_at is not None


async def test_create_404_when_listing_missing():
    db = make_db()
    db.scalar.side_effect = [None]  # listing existence check fails
    data = SimpleNamespace(
        listing_id=uuid.uuid4(), issue_type_id=None, subject="s",
        category="c", description="d",
    )
    with pytest.raises(HTTPException) as e:
        await DisputeService.create_dispute(db, uuid.uuid4(), data)
    assert e.value.status_code == 404


async def test_create_happy_path_no_listing():
    db = make_db()
    data = SimpleNamespace(
        listing_id=None, issue_type_id=None, subject="s",
        category="c", description="d",
    )
    out = await DisputeService.create_dispute(db, uuid.uuid4(), data)
    assert out.subject == "s"
    db.add.assert_called_once()
    db.commit.assert_awaited_once()
