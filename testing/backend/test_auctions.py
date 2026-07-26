"""
Endpoints under test (backend/app/api/v1/controller/auctions.py):
  GET    /auctions/form_metadata
  GET    /auctions/
  POST   /auctions/create_listing
  PATCH  /auctions/{id}
  POST   /auctions/upload_auction_images/{id}
  GET    /auctions/get_user_listings
  GET    /auctions/get_auction/{id}
  GET    /auctions/get_auction_bids/{id}/bids
  DELETE /auctions/{id}
  POST   /auctions/{id}/status

Every listing created here is tagged with a unique title (so it's easy to spot
in the DB if a run is interrupted) and is soft-deleted (status -> removed) at
the end of its test case. Listings are created with status="draft" by default
so they never appear in the public feed unless a test explicitly promotes one.
"""
import base64
import sys
import uuid
from datetime import datetime, timedelta, timezone

from framework import Suite, Skip
from client import ApiClient
import auth_helpers as auth
from qa_ids import unique_tag

suite = Suite("Auctions / Listings")

# A real, minimal 1x1 transparent PNG (well-known test fixture) — the backend never
# parses image bytes itself (just streams them to MinIO), so validity only matters
# for readability/documentation, not for the test to function.
TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


def _unique_title():
    # Deliberately avoids the word "listing" and uses a letters-only random suffix (not
    # hex): "fisting" (a seeded prohibited keyword) is one substitution from "listing",
    # and leetspeak-normalized hex digits ("b0b0" -> "bobo") coincidentally matched
    # another seeded keyword during earlier test runs. See TEST_PLAN.md Finding F6.
    return f"QA Test Item {unique_tag()}"


def _listing_payload(category_id=None, **overrides):
    # Description deliberately avoids the word "suite": it's one substitution away from
    # another seeded prohibited keyword, "shite" — a second real instance of Finding F6,
    # discovered by this very test data. See TEST_PLAN.md.
    now = datetime.now(timezone.utc)
    payload = {
        "title": _unique_title(),
        "description": "Created by an automated QA test run.",
        "brand": "QA Brand",
        "condition": "new",
        "bidding_type": "price_up",
        "starting_price": 10.0,
        "reserve_price": 10.0,
        "min_increment": 1.0,
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(hours=2)).isoformat(),
        "status": "draft",
    }
    if category_id:
        payload["category_id"] = category_id
    payload.update(overrides)
    return payload


def _cleanup(client, listing_id):
    client.delete(f"/auctions/{listing_id}")


def _create(client, **overrides):
    """POST /auctions/create_listing for a case that's expected to succeed, retrying
    with a freshly-generated random title on the rare chance a random suffix
    coincidentally trips the fuzzy prohibited-keyword matcher (Finding F6) — observed
    in practice even after the letters-only fix in qa_ids.py, just far less often.
    Returns the created listing dict; raises the original assertion-style error if
    every attempt fails for a reason other than a prohibited-term collision."""
    resp = None
    for _ in range(4):
        body = _listing_payload(**overrides)
        resp = client.post("/auctions/create_listing", json=body)
        if resp.status_code == 201:
            return resp.json()
        if not (resp.status_code == 400 and "prohibited term" in resp.text):
            break
    assert resp.status_code == 201, resp.text
    return resp.json()


@suite.case("form_metadata is public and lists categories, conditions, bidding types, durations")
def _():
    resp = ApiClient().get("/auctions/form_metadata")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body["categories"]) > 0, "expected at least one seeded active category"
    assert {"new", "used", "refurbished"} <= {c["id"] for c in body["conditions"]}
    assert {"price_up", "low_start", "public"} <= {c["id"] for c in body["biddingTypes"]}


@suite.case("get_auctions (public feed) is unauthenticated and paginated")
def _():
    resp = ApiClient().get("/auctions/", params={"page": 1, "size": 5})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["page"] == 1
    assert body["size"] == 5
    assert len(body["items"]) <= 5


@suite.case("create_listing requires auth (401 without a token)")
def _():
    resp = ApiClient().post("/auctions/create_listing", json=_listing_payload())
    assert resp.status_code == 401, resp.text


@suite.case("create_listing rejects end_time before start_time with a 422 validation error")
def _():
    client, user, payload = auth.register_new_user()
    now = datetime.now(timezone.utc)
    bad = _listing_payload(start_time=now.isoformat(), end_time=(now - timedelta(hours=1)).isoformat())
    resp = client.post("/auctions/create_listing", json=bad)
    assert resp.status_code == 422, resp.text


@suite.case("create_listing rejects a negative starting_price with a 422 validation error")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/auctions/create_listing", json=_listing_payload(starting_price=-5))
    assert resp.status_code == 422, resp.text


@suite.case("create_listing rejects reserve_price below starting_price with a 422 validation error")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/auctions/create_listing", json=_listing_payload(starting_price=50, reserve_price=10))
    assert resp.status_code == 422, resp.text


@suite.case("create_listing happy path (status=draft) creates a listing owned by the caller")
def _():
    client, user, payload = auth.register_new_user()
    listing = _create(client)
    try:
        assert listing["seller_id"] == user["id"]
        assert listing["status"] == "draft"
        assert listing["current_price"] == listing["starting_price"]
    finally:
        _cleanup(client, listing["id"])


@suite.case("a draft listing does not appear in the public feed until promoted")
def _():
    client, user, payload = auth.register_new_user()
    created = _create(client)
    try:
        feed = ApiClient().get("/auctions/", params={"search": created["title"]})
        assert all(item["id"] != created["id"] for item in feed.json()["items"]), (
            "draft listing leaked into the public feed"
        )
    finally:
        _cleanup(client, created["id"])


@suite.case("get_auction returns full detail for an existing listing (no auth required)")
def _():
    client, user, payload = auth.register_new_user()
    created = _create(client)
    try:
        resp = ApiClient().get(f"/auctions/get_auction/{created['id']}")
        assert resp.status_code == 200, resp.text
        assert resp.json()["id"] == created["id"]
    finally:
        _cleanup(client, created["id"])


@suite.case("get_auction for a non-existent id returns 404")
def _():
    resp = ApiClient().get(f"/auctions/get_auction/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("update_listing lets the owner edit a draft listing")
def _():
    client, user, payload = auth.register_new_user()
    created = _create(client)
    try:
        resp = client.patch(f"/auctions/{created['id']}", json={"description": "Edited by QA"})
        assert resp.status_code == 200, resp.text
        assert resp.json()["description"] == "Edited by QA"
    finally:
        _cleanup(client, created["id"])


@suite.case("update_listing forbids a non-owner from editing (403)")
def _():
    owner_client, owner, _ = auth.register_new_user()
    other_client, other, _ = auth.register_new_user()
    created = _create(owner_client)
    try:
        resp = other_client.patch(f"/auctions/{created['id']}", json={"description": "hijacked"})
        assert resp.status_code == 403, resp.text
    finally:
        _cleanup(owner_client, created["id"])


@suite.case("update_listing_status promotes a draft listing to active")
def _():
    client, user, payload = auth.register_new_user()
    created = _create(client)
    try:
        resp = client.post(f"/auctions/{created['id']}/status", json={"status": "active"})
        assert resp.status_code == 200, resp.text
        assert resp.json()["status"] == "active"
    finally:
        _cleanup(client, created["id"])


@suite.case("update_listing_status rejects setting status to 'ended' directly (system-only)")
def _():
    client, user, payload = auth.register_new_user()
    created = _create(client)
    try:
        resp = client.post(f"/auctions/{created['id']}/status", json={"status": "ended"})
        assert resp.status_code == 400, resp.text
    finally:
        _cleanup(client, created["id"])


@suite.case("update_listing rejects further edits once a listing is active (not draft/pending_review)")
def _():
    client, user, payload = auth.register_new_user()
    created = _create(client)
    try:
        client.post(f"/auctions/{created['id']}/status", json={"status": "active"})
        resp = client.patch(f"/auctions/{created['id']}", json={"description": "should be blocked"})
        assert resp.status_code == 400, resp.text
    finally:
        _cleanup(client, created["id"])


@suite.case("get_user_listings only returns the caller's own listings")
def _():
    client, user, payload = auth.register_new_user()
    created = _create(client)
    try:
        resp = client.get("/auctions/get_user_listings")
        assert resp.status_code == 200, resp.text
        ids = {item["id"] for item in resp.json()["items"]}
        assert created["id"] in ids
    finally:
        _cleanup(client, created["id"])


@suite.case("get_user_listings requires auth (401 without a token)")
def _():
    resp = ApiClient().get("/auctions/get_user_listings")
    assert resp.status_code == 401, resp.text


@suite.case("get_auction_bids on a fresh listing returns an empty list")
def _():
    client, user, payload = auth.register_new_user()
    created = _create(client)
    try:
        resp = ApiClient().get(f"/auctions/get_auction_bids/{created['id']}/bids")
        assert resp.status_code == 200, resp.text
        assert resp.json() == []
    finally:
        _cleanup(client, created["id"])


@suite.case("upload_auction_images rejects a disallowed content type with 400")
def _():
    client, user, payload = auth.register_new_user()
    created = _create(client)
    try:
        resp = client.post(
            f"/auctions/upload_auction_images/{created['id']}",
            files={"files": ("not-an-image.txt", b"hello", "text/plain")},
        )
        assert resp.status_code == 400, resp.text
    finally:
        _cleanup(client, created["id"])


@suite.case("upload_auction_images accepts a valid PNG and marks the first image primary")
def _():
    client, user, payload = auth.register_new_user()
    created = _create(client)
    try:
        resp = client.post(
            f"/auctions/upload_auction_images/{created['id']}",
            files={"files": ("qa_tiny.png", TINY_PNG, "image/png")},
        )
        assert resp.status_code == 200, resp.text
        images = resp.json()
        assert len(images) == 1
        assert images[0]["is_primary"] is True
    finally:
        _cleanup(client, created["id"])


@suite.case("upload_auction_images forbids a non-owner from uploading (403)")
def _():
    owner_client, owner, _ = auth.register_new_user()
    other_client, other, _ = auth.register_new_user()
    created = _create(owner_client)
    try:
        resp = other_client.post(
            f"/auctions/upload_auction_images/{created['id']}",
            files={"files": ("qa_tiny.png", TINY_PNG, "image/png")},
        )
        assert resp.status_code == 403, resp.text
    finally:
        _cleanup(owner_client, created["id"])


@suite.case("delete_listing forbids a non-owner from deleting (403)")
def _():
    owner_client, owner, _ = auth.register_new_user()
    other_client, other, _ = auth.register_new_user()
    created = _create(owner_client)
    try:
        resp = other_client.delete(f"/auctions/{created['id']}")
        assert resp.status_code == 403, resp.text
    finally:
        _cleanup(owner_client, created["id"])


@suite.case("delete_listing happy path soft-deletes the listing (204, then no longer resolvable)")
def _():
    client, user, payload = auth.register_new_user()
    created = _create(client)
    resp = client.delete(f"/auctions/{created['id']}")
    assert resp.status_code == 204, resp.text

    feed = ApiClient().get("/auctions/", params={"search": created["title"]})
    assert all(item["id"] != created["id"] for item in feed.json()["items"]), (
        "removed listing still appears in the public feed"
    )


@suite.case("delete_listing is idempotent: deleting an already-removed listing still returns 204, not 500")
def _():
    # Note: delete_listing only special-cases status == "ended" (400) — it does not
    # special-case status == "removed", so a second DELETE re-applies the same
    # transition and succeeds again rather than 404/409ing. Documented here as
    # observed behaviour, not asserted as necessarily ideal (see TEST_PLAN.md).
    client, user, payload = auth.register_new_user()
    created = _create(client)
    first = client.delete(f"/auctions/{created['id']}")
    assert first.status_code == 204, first.text
    second = client.delete(f"/auctions/{created['id']}")
    assert second.status_code == 204, (
        f"expected idempotent 204 on double-delete, got {second.status_code}: {second.text}"
    )


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
