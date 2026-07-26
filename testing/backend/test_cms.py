"""
Endpoints under test (backend/app/api/v1/controller/cms.py):
  GET  /cms/{slug}
  GET  /cms/{slug}/draft
  PUT  /cms/{slug}/draft
  POST /cms/{slug}/publish
  GET  /cms/{slug}/versions
  GET  /cms/versions/{version_id}
  POST /cms/{slug}/rollback/{version_id}

CMS content is scoped per-slug with no cross-slug bleed (see
backend/app/services/cms_service.py — every read/write is a plain
`WHERE slug = :slug`), so every test here uses its own unique, timestamped
slug. None of this ever touches the real "landing" page a visitor sees.
There is no delete endpoint for a SiteContent row or its version history, so
each run leaves one small test page + a couple of versions behind — accepted
as an inherent footprint of the API surface, see TEST_PLAN.md.
"""
import sys
import uuid

from framework import Suite
from client import ApiClient
import auth_helpers as auth
from qa_ids import unique_tag

suite = Suite("CMS")


def _unique_slug():
    return f"qa-test-page-{unique_tag()}"


def _content(marker):
    return {"root": {"props": {"title": marker}}, "content": [], "zones": {}}


@suite.case("get_published for a never-touched slug returns default empty content, not a 404")
def _():
    resp = ApiClient().get(f"/cms/{_unique_slug()}")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["content"] == {"root": {"props": {}}, "content": [], "zones": {}}
    assert body["updated_at"] is None


@suite.case("get_draft / save_draft / publish all require admin (401 with no token, 403 for a regular user)")
def _():
    slug = _unique_slug()
    assert ApiClient().get(f"/cms/{slug}/draft").status_code == 401
    user_client, _, _ = auth.register_new_user()
    assert user_client.get(f"/cms/{slug}/draft").status_code == 403
    assert user_client.put(f"/cms/{slug}/draft", json={"content": _content("x")}).status_code == 403
    assert user_client.post(f"/cms/{slug}/publish", json={"content": _content("x")}).status_code == 403


@suite.case("save_draft does not affect the publicly published content")
def _():
    admin = auth.admin_client()
    slug = _unique_slug()
    resp = admin.put(f"/cms/{slug}/draft", json={"content": _content("draft-only")})
    assert resp.status_code == 200, resp.text
    assert resp.json()["content"]["root"]["props"]["title"] == "draft-only"

    draft = admin.get(f"/cms/{slug}/draft")
    assert draft.json()["content"]["root"]["props"]["title"] == "draft-only"

    public = ApiClient().get(f"/cms/{slug}")
    assert public.json()["content"] == {"root": {"props": {}}, "content": [], "zones": {}}, (
        "an unpublished draft leaked into the public page"
    )


@suite.case("publish makes content public, records a version, and clears the draft")
def _():
    admin = auth.admin_client()
    slug = _unique_slug()
    admin.put(f"/cms/{slug}/draft", json={"content": _content("still a draft")})

    resp = admin.post(f"/cms/{slug}/publish", json={"content": _content("published v1")})
    assert resp.status_code == 200, resp.text
    assert resp.json()["content"]["root"]["props"]["title"] == "published v1"

    public = ApiClient().get(f"/cms/{slug}")
    assert public.json()["content"]["root"]["props"]["title"] == "published v1"

    # get_draft falls back to the published content once the draft is cleared.
    draft_after = admin.get(f"/cms/{slug}/draft")
    assert draft_after.json()["content"]["root"]["props"]["title"] == "published v1"

    versions = admin.get(f"/cms/{slug}/versions")
    assert versions.status_code == 200, versions.text
    assert len(versions.json()) >= 1


@suite.case("save_draft/publish reject oversized content with 422")
def _():
    admin = auth.admin_client()
    slug = _unique_slug()
    huge_content = {"root": {"props": {"blob": "x" * 300_000}}, "content": [], "zones": {}}
    resp = admin.put(f"/cms/{slug}/draft", json={"content": huge_content})
    assert resp.status_code == 422, resp.text


@suite.case("get_version returns full content, rollback restores it and appends a new version")
def _():
    admin = auth.admin_client()
    slug = _unique_slug()
    admin.post(f"/cms/{slug}/publish", json={"content": _content("v1")})
    admin.post(f"/cms/{slug}/publish", json={"content": _content("v2")})

    versions = admin.get(f"/cms/{slug}/versions").json()
    assert len(versions) >= 2
    v1_version_id = versions[-1]["id"]  # oldest = "v1", since list is newest-first

    detail = admin.get(f"/cms/versions/{v1_version_id}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["content"]["root"]["props"]["title"] == "v1"

    rollback = admin.post(f"/cms/{slug}/rollback/{v1_version_id}")
    assert rollback.status_code == 200, rollback.text
    assert rollback.json()["content"]["root"]["props"]["title"] == "v1"

    public = ApiClient().get(f"/cms/{slug}")
    assert public.json()["content"]["root"]["props"]["title"] == "v1"

    after_versions = admin.get(f"/cms/{slug}/versions").json()
    assert len(after_versions) == len(versions) + 1, "rollback should append a new version, not mutate history"


@suite.case("get_version for an unknown version id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.get(f"/cms/versions/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("rollback rejects a version_id that belongs to a different slug (400)")
def _():
    admin = auth.admin_client()
    slug_a, slug_b = _unique_slug(), _unique_slug()
    admin.post(f"/cms/{slug_a}/publish", json={"content": _content("belongs to A")})
    versions_a = admin.get(f"/cms/{slug_a}/versions").json()
    version_id = versions_a[0]["id"]

    admin.post(f"/cms/{slug_b}/publish", json={"content": _content("belongs to B")})
    resp = admin.post(f"/cms/{slug_b}/rollback/{version_id}")
    assert resp.status_code == 400, resp.text


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
