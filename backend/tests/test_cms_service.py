"""Mocked-boundary tests for CmsService — default-content fallback, draft selection, rollback guard."""
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.cms_service import CmsService, DEFAULT_CONTENT
from tests.fakedb import make_db


async def test_get_published_default_when_no_row():
    db = make_db()
    db.scalar.side_effect = [None]
    out = await CmsService.get_published(db, "home")
    assert out["content"] == DEFAULT_CONTENT and out["updated_at"] is None


async def test_get_draft_prefers_draft_content():
    db = make_db()
    row = SimpleNamespace(slug="home", content={"c": 1}, draft_content={"d": 2}, updated_at=None)
    db.scalar.side_effect = [row]
    out = await CmsService.get_draft(db, "home")
    assert out["content"] == {"d": 2}


async def test_get_draft_falls_back_to_published_when_no_draft():
    db = make_db()
    row = SimpleNamespace(slug="home", content={"c": 1}, draft_content=None, updated_at=None)
    db.scalar.side_effect = [row]
    out = await CmsService.get_draft(db, "home")
    assert out["content"] == {"c": 1}


async def test_get_version_404_when_missing():
    db = make_db()
    db.scalar.side_effect = [None]
    with pytest.raises(HTTPException) as e:
        await CmsService.get_version(db, uuid.uuid4())
    assert e.value.status_code == 404


async def test_rollback_rejects_slug_mismatch():
    db = make_db()
    version = SimpleNamespace(slug="other", content={}, created_at=None)
    db.scalar.side_effect = [version]  # get_version's lookup
    with pytest.raises(HTTPException) as e:
        await CmsService.rollback(db, "home", uuid.uuid4(), uuid.uuid4())
    assert e.value.status_code == 400
