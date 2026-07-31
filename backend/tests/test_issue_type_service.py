"""Mocked-boundary tests for IssueTypeService (async CRUD over a faked AsyncSession)."""
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.issue_type_service import IssueTypeService
from tests.fakedb import make_db, exec_result


async def test_get_all_returns_scalars():
    db = make_db()
    rows = [object(), object()]
    db.execute.side_effect = [exec_result(all_=rows)]
    assert await IssueTypeService.get_all(db) == rows


async def test_create_rejects_duplicate_name():
    db = make_db()
    db.scalar.side_effect = [object()]  # existing row found
    with pytest.raises(HTTPException) as e:
        await IssueTypeService.create(db, SimpleNamespace(name="dup"))
    assert e.value.status_code == 409
    db.commit.assert_not_awaited()


async def test_create_happy_path():
    db = make_db()
    db.scalar.side_effect = [None]  # no existing
    out = await IssueTypeService.create(db, SimpleNamespace(name="Shipping"))
    assert out.name == "Shipping"
    db.add.assert_called_once()
    db.commit.assert_awaited_once()


async def test_update_404_when_missing():
    db = make_db()
    db.execute.side_effect = [exec_result(first=None)]
    with pytest.raises(HTTPException) as e:
        await IssueTypeService.update(db, uuid.uuid4(), SimpleNamespace(name="x"))
    assert e.value.status_code == 404


async def test_update_409_on_name_clash():
    db = make_db()
    db.execute.side_effect = [exec_result(first=SimpleNamespace(name="old"))]
    db.scalar.side_effect = [object()]  # another row with same name
    with pytest.raises(HTTPException) as e:
        await IssueTypeService.update(db, uuid.uuid4(), SimpleNamespace(name="clash"))
    assert e.value.status_code == 409


async def test_delete_404_when_missing():
    db = make_db()
    db.execute.side_effect = [exec_result(first=None)]
    with pytest.raises(HTTPException) as e:
        await IssueTypeService.delete(db, uuid.uuid4())
    assert e.value.status_code == 404
