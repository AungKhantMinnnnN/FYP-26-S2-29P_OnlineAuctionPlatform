"""Mocked-boundary tests for TestimonialService."""
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.testimonial_service import TestimonialService
from tests.fakedb import make_db, exec_result


async def test_get_featured_returns_scalars():
    db = make_db()
    rows = [object()]
    db.execute.side_effect = [exec_result(all_=rows)]
    assert await TestimonialService.get_featured(db) == rows


async def test_approve_sets_featured_true():
    db = make_db()
    t = SimpleNamespace(is_featured=False)
    db.execute.side_effect = [exec_result(first=t)]
    out = await TestimonialService.approve_testimonial(db, uuid.uuid4())
    assert out.is_featured is True
    db.commit.assert_awaited_once()


async def test_approve_404_when_missing():
    db = make_db()
    db.execute.side_effect = [exec_result(first=None)]
    with pytest.raises(HTTPException) as e:
        await TestimonialService.approve_testimonial(db, uuid.uuid4())
    assert e.value.status_code == 404


async def test_delete_404_when_missing():
    db = make_db()
    db.execute.side_effect = [exec_result(first=None)]
    with pytest.raises(HTTPException) as e:
        await TestimonialService.delete_testimonial(db, uuid.uuid4())
    assert e.value.status_code == 404


async def test_create_builds_row():
    db = make_db()
    out = await TestimonialService.create_testimonial(
        db, uuid.uuid4(), SimpleNamespace(content="great", rating=5)
    )
    assert out.content == "great" and out.rating == 5
    db.add.assert_called_once()
    db.commit.assert_awaited_once()
