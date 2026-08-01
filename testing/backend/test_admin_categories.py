"""
Endpoints under test (backend/app/api/v1/controller/admin.py — Categories region):
  GET    /admin/categories
  POST   /admin/categories
  PATCH  /admin/categories/{id}
  DELETE /admin/categories/{id}

Every category created here uses a unique, timestamped slug and is cleaned up
(hard-deleted) at the end of its test case, so repeated runs never accumulate
junk categories in the shared "Manage Categories" admin screen.
"""
import sys
import uuid
from datetime import datetime, timedelta, timezone

from framework import Suite
from client import ApiClient
import auth_helpers as auth
from qa_ids import unique_tag

suite = Suite("Admin: categories")


def _unique_slug():
    return f"qa-test-cat-{unique_tag()}"


@suite.case("list_categories requires admin (401 with no token, 403 for a regular user)")
def _():
    assert ApiClient().get("/admin/categories").status_code == 401
    user_client, _, _ = auth.register_new_user()
    assert user_client.get("/admin/categories").status_code == 403


@suite.case("create_category rejects a malformed slug with 422")
def _():
    admin = auth.admin_client()
    resp = admin.post("/admin/categories", json={"name": "QA Cat", "slug": "Not A Valid Slug!"})
    assert resp.status_code == 422, resp.text


@suite.case("create_category happy path, then it's visible via list_categories")
def _():
    admin = auth.admin_client()
    slug = _unique_slug()
    resp = admin.post("/admin/categories", json={"name": "QA Test Category", "slug": slug})
    assert resp.status_code == 201, resp.text
    category = resp.json()
    try:
        assert category["slug"] == slug
        assert category["is_active"] is True
        listed = admin.get("/admin/categories")
        assert any(c["id"] == category["id"] for c in listed.json())
    finally:
        admin.delete(f"/admin/categories/{category['id']}")


@suite.case("create_category rejects a duplicate slug with 409")
def _():
    admin = auth.admin_client()
    slug = _unique_slug()
    first = admin.post("/admin/categories", json={"name": "QA Cat A", "slug": slug})
    assert first.status_code == 201, first.text
    category = first.json()
    try:
        second = admin.post("/admin/categories", json={"name": "QA Cat B", "slug": slug})
        assert second.status_code == 409, second.text
    finally:
        admin.delete(f"/admin/categories/{category['id']}")


@suite.case("update_category can rename without touching the slug")
def _():
    admin = auth.admin_client()
    slug = _unique_slug()
    category = admin.post("/admin/categories", json={"name": "Before Rename", "slug": slug}).json()
    try:
        resp = admin.patch(f"/admin/categories/{category['id']}", json={"name": "After Rename"})
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["name"] == "After Rename"
        assert body["slug"] == slug
    finally:
        admin.delete(f"/admin/categories/{category['id']}")


@suite.case("update_category can deactivate a category via is_active")
def _():
    admin = auth.admin_client()
    slug = _unique_slug()
    category = admin.post("/admin/categories", json={"name": "QA Toggle", "slug": slug}).json()
    try:
        resp = admin.patch(f"/admin/categories/{category['id']}", json={"is_active": False})
        assert resp.status_code == 200, resp.text
        assert resp.json()["is_active"] is False
    finally:
        admin.delete(f"/admin/categories/{category['id']}")


@suite.case("update_category rejects changing the slug to one already in use by another category (409)")
def _():
    admin = auth.admin_client()
    slug_a, slug_b = _unique_slug(), _unique_slug()
    cat_a = admin.post("/admin/categories", json={"name": "QA Cat A", "slug": slug_a}).json()
    cat_b = admin.post("/admin/categories", json={"name": "QA Cat B", "slug": slug_b}).json()
    try:
        resp = admin.patch(f"/admin/categories/{cat_b['id']}", json={"slug": slug_a})
        assert resp.status_code == 409, resp.text
    finally:
        admin.delete(f"/admin/categories/{cat_a['id']}")
        admin.delete(f"/admin/categories/{cat_b['id']}")


@suite.case("update_category for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.patch(f"/admin/categories/{uuid.uuid4()}", json={"name": "Nope"})
    assert resp.status_code == 404, resp.text


@suite.case("delete_category with no references hard-deletes (action='deleted')")
def _():
    admin = auth.admin_client()
    slug = _unique_slug()
    category = admin.post("/admin/categories", json={"name": "QA Delete Me", "slug": slug}).json()
    resp = admin.delete(f"/admin/categories/{category['id']}")
    assert resp.status_code == 200, resp.text
    assert resp.json()["action"] == "deleted"
    assert admin.get(f"/admin/categories").json()
    assert not any(c["id"] == category["id"] for c in admin.get("/admin/categories").json())


@suite.case("delete_category still referenced by a listing deactivates instead of deleting (action='deactivated'), then hard-deletes once that listing is soft-removed")
def _():
    admin = auth.admin_client()
    seller, _, _ = auth.register_new_user()
    slug = _unique_slug()
    category = admin.post("/admin/categories", json={"name": "QA In-Use Category", "slug": slug}).json()

    now = datetime.now(timezone.utc)
    listing = seller.post("/auctions/create_listing", json={
        # Avoids the word "listing" — see TEST_PLAN.md Finding F6.
        "title": f"QA category-in-use item {unique_tag()}",
        "condition": "new",
        "bidding_type": "price_up",
        "starting_price": 5.0,
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(hours=1)).isoformat(),
        "status": "draft",
        "category_id": category["id"],
    }).json()

    try:
        resp = admin.delete(f"/admin/categories/{category['id']}")
        assert resp.status_code == 200, resp.text
        assert resp.json()["action"] == "deactivated"

        still_listed = admin.get("/admin/categories")
        match = next((c for c in still_listed.json() if c["id"] == category["id"]), None)
        assert match is not None, "deactivated category should still exist, just inactive"
        assert match["is_active"] is False
    finally:
        seller.delete(f"/auctions/{listing['id']}")
        # Now unreferenced -- this completes cleanup by actually removing the row.
        final = admin.delete(f"/admin/categories/{category['id']}")

    # DELETE /auctions/{id} only soft-deletes (status='removed', row survives) --
    # a category must still become hard-deletable once its only reference is a
    # soft-removed listing, not stay permanently stuck deactivating forever.
    assert final.status_code == 200, final.text
    assert final.json()["action"] == "deleted", \
        "a soft-removed listing should no longer block a category's hard delete"


@suite.case("delete_category for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.delete(f"/admin/categories/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
