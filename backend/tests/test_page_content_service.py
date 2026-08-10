"""Mocked-boundary tests for PageContentService (DB-driven policies pages).

Uses the fakedb AsyncSession fake (same approach as test_cms_service.py): each
call to db.scalar / db.execute is queued with a side_effect, so we exercise the
service's logic — its JSON mutation, ordering, filtering, and error paths —
without a real database.
"""
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.page_content_service import PageContentService
from tests.fakedb import make_db


def make_row(slug="privacy", sections=None, updated_at=None) -> SimpleNamespace:
    return SimpleNamespace(
        slug=slug,
        content={"sections": sections if sections is not None else []},
        updated_by=None,
        updated_at=updated_at,
    )


def section(**kw) -> dict:
    base = {
        "id": str(uuid.uuid4()),
        "title": "Title",
        "body": "Line one\nLine two",
        "sortOrder": 1,
        "isActive": True,
    }
    base.update(kw)
    return base


async def test_ensure_allowed_page_accepts_privacy_and_terms():
    assert PageContentService.ensure_allowed_page("privacy") == "privacy"
    assert PageContentService.ensure_allowed_page("terms") == "terms"


async def test_ensure_allowed_page_rejects_unknown():
    with pytest.raises(HTTPException) as e:
        PageContentService.ensure_allowed_page("landing")
    assert e.value.status_code == 400


async def test_get_public_empty_when_no_row():
    db = make_db()
    db.scalar.side_effect = [None]
    out = await PageContentService.get_public(db, "privacy")
    assert out == {
        "slug": "privacy",
        "header": {"kicker": "", "title": "", "subtitle": "", "last_updated_label": ""},
        "contact": {"title": "", "text": "", "email": ""},
        "sections": [],
    }


async def test_get_public_filters_inactive_and_sorts():
    db = make_db()
    row = make_row(sections=[
        section(id="11111111-1111-1111-1111-111111111111", title="Second", sortOrder=2),
        section(id="22222222-2222-2222-2222-222222222222", title="First", sortOrder=1),
        section(id="33333333-3333-3333-3333-333333333333", title="Hidden", sortOrder=0, isActive=False),
    ])
    db.scalar.side_effect = [row]
    out = await PageContentService.get_public(db, "privacy")
    assert [s["title"] for s in out["sections"]] == ["First", "Second"]


async def test_get_sections_admin_keeps_inactive():
    db = make_db()
    row = make_row(sections=[
        section(id="11111111-1111-1111-1111-111111111111", isActive=False),
    ])
    db.scalar.side_effect = [row]
    out = await PageContentService.get_sections(db, "privacy", active_only=False)
    assert len(out) == 1 and out[0]["is_active"] is False


async def test_create_section_appends_to_existing_row():
    db = make_db()
    existing = section(id="11111111-1111-1111-1111-111111111111", title="Existing", sortOrder=0)
    row = make_row(sections=[existing])
    db.scalar.side_effect = [row]  # _get_row
    sec = await PageContentService.create_section(db, "privacy", "New", "Body", uuid.uuid4())
    assert sec["title"] == "New"
    assert sec["sortOrder"] == 1  # appended after the one existing section
    # row.content mutated in memory
    assert row.content["sections"][-1]["title"] == "New"


async def test_create_section_when_no_row_creates_one():
    db = make_db()
    db.scalar.side_effect = [None]  # no existing row
    await PageContentService.create_section(db, "terms", "Acceptance", "Body", uuid.uuid4())
    added = [a for a in db.add.call_args_list]
    assert added, "expected a new SiteContent row to be added"
    new_row = added[0].args[0]
    assert new_row.slug == "terms"
    assert new_row.content["sections"][0]["title"] == "Acceptance"


async def test_update_section_changes_fields():
    db = make_db()
    row = make_row(sections=[
        section(id="11111111-1111-1111-1111-111111111111", title="Old", body="Old body", sortOrder=0),
    ])
    db.scalar.side_effect = [row]
    sec = await PageContentService.update_section(
        db, "privacy",
        uuid.UUID("11111111-1111-1111-1111-111111111111"),
        {"title": "New Title"}, uuid.uuid4(),
    )
    assert sec["title"] == "New Title"
    assert sec["body"] == "Old body"


async def test_update_section_404_when_page_missing():
    db = make_db()
    db.scalar.side_effect = [None]
    with pytest.raises(HTTPException) as e:
        await PageContentService.update_section(db, "privacy", uuid.uuid4(), {"title": "x"}, uuid.uuid4())
    assert e.value.status_code == 404


async def test_update_section_404_when_section_missing():
    db = make_db()
    row = make_row(sections=[section(id="11111111-1111-1111-1111-111111111111")])
    db.scalar.side_effect = [row]
    with pytest.raises(HTTPException) as e:
        await PageContentService.update_section(
            db, "privacy", uuid.UUID("99999999-9999-9999-9999-999999999999"),
            {"title": "x"}, uuid.uuid4(),
        )
    assert e.value.status_code == 404


async def test_delete_section_removes_from_array():
    db = make_db()
    target_id = "11111111-1111-1111-1111-1111111111aa"
    row = make_row(sections=[
        section(id=target_id, title="A"),
        section(id="22222222-2222-2222-2222-2222222222bb", title="B"),
    ])
    db.scalar.side_effect = [row]
    await PageContentService.delete_section(db, "privacy", uuid.UUID(target_id), uuid.uuid4())
    assert [s["title"] for s in row.content["sections"]] == ["B"]


async def test_delete_section_404_when_section_missing():
    db = make_db()
    row = make_row(sections=[section(id="11111111-1111-1111-1111-111111111111")])
    db.scalar.side_effect = [row]
    with pytest.raises(HTTPException) as e:
        await PageContentService.delete_section(
            db, "privacy", uuid.UUID("99999999-9999-9999-9999-999999999999"), uuid.uuid4(),
        )
    assert e.value.status_code == 404


async def test_reorder_sections_assigns_new_order():
    db = make_db()
    ids = {
        "a": "00000000-0000-0000-0000-000000000001",
        "b": "00000000-0000-0000-0000-000000000002",
    }
    row = make_row(sections=[
        section(id=ids["a"], title="A", sortOrder=0),
        section(id=ids["b"], title="B", sortOrder=1),
    ])
    db.scalar.side_effect = [row]
    await PageContentService.reorder_sections(
        db, "privacy", [uuid.UUID(ids["b"]), uuid.UUID(ids["a"])], uuid.uuid4(),
    )
    assert [s["sortOrder"] for s in row.content["sections"]] == [0, 1]
    assert [s["title"] for s in row.content["sections"]] == ["B", "A"]


async def test_reorder_sections_rejects_mismatched_ids():
    db = make_db()
    row = make_row(sections=[section(id="11111111-1111-1111-1111-111111111111")])
    db.scalar.side_effect = [row]
    with pytest.raises(HTTPException) as e:
        await PageContentService.reorder_sections(
            db, "privacy", [uuid.uuid4()], uuid.uuid4(),
        )
    assert e.value.status_code == 400
