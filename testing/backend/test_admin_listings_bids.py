"""
Endpoints under test (backend/app/api/v1/controller/admin.py — Listings & Bids regions):
  GET    /admin/listings
  GET    /admin/listings/{id}
  PATCH  /admin/listings/{id}/approve
  PATCH  /admin/listings/{id}/remove
  POST   /admin/listings/{id}/restart
  DELETE /admin/bids/{id}

Note on scope: bids themselves are placed through the separate bidding-engine
microservice (websocket-driven), which this gateway's test suite does not
cover. That means the happy paths for restart_auction (requires a listing
already in status=ended, which nothing in this API can produce directly) and
cancel_bid (requires a real accepted Bid row) cannot be exercised end-to-end
from here — only their not-found / precondition-failure branches are testable
through this API alone. See TEST_PLAN.md for the full explanation.
"""
import sys
import uuid
from datetime import datetime, timedelta, timezone

from framework import Suite
from client import ApiClient
import auth_helpers as auth
from qa_ids import unique_tag

suite = Suite("Admin: listings & bids")


def _create_listing(seller_client, status="draft"):
    # Title deliberately avoids the word "listing", and uses a letters-only random
    # suffix (not hex) — see TEST_PLAN.md Finding F6. Both a plain word match
    # ("listing" -> "fisting") and a leetspeak-normalized hex collision ("b0b0" ->
    # "bobo") were hit by earlier drafts of this exact helper.
    now = datetime.now(timezone.utc)
    payload = {
        "title": f"QA Admin Item {unique_tag()}",
        "condition": "new",
        "bidding_type": "price_up",
        "starting_price": 15.0,
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(hours=2)).isoformat(),
        "status": status,
    }
    resp = seller_client.post("/auctions/create_listing", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


@suite.case("list_listings requires admin (401 with no token, 403 for a regular user)")
def _():
    assert ApiClient().get("/admin/listings").status_code == 401
    user_client, _, _ = auth.register_new_user()
    assert user_client.get("/admin/listings").status_code == 403


@suite.case("list_listings (admin) returns paginated items with a sell_through_pct field present")
def _():
    admin = auth.admin_client()
    resp = admin.get("/admin/listings", params={"page": 1, "size": 5})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "items" in body
    assert "sell_through_pct" in body


@suite.case("list_listings status filter only returns listings in that status")
def _():
    admin = auth.admin_client()
    resp = admin.get("/admin/listings", params={"status": "active", "size": 50})
    assert resp.status_code == 200, resp.text
    assert all(item["status"] == "active" for item in resp.json()["items"])


@suite.case("get_listing_detail (admin) includes seller and images, and winner fields default to null")
def _():
    admin = auth.admin_client()
    seller, _, _ = auth.register_new_user()
    listing = _create_listing(seller)
    try:
        resp = admin.get(f"/admin/listings/{listing['id']}")
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["id"] == listing["id"]
        assert body["winner_username"] is None
        assert body["winning_amount"] is None
    finally:
        seller.delete(f"/auctions/{listing['id']}")


@suite.case("get_listing_detail for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.get(f"/admin/listings/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("approve_listing promotes a draft listing to active")
def _():
    admin = auth.admin_client()
    seller, _, _ = auth.register_new_user()
    listing = _create_listing(seller, status="draft")
    try:
        resp = admin.patch(f"/admin/listings/{listing['id']}/approve")
        assert resp.status_code == 200, resp.text
        assert resp.json()["status"] == "active"
    finally:
        seller.delete(f"/auctions/{listing['id']}")


@suite.case("approve_listing on an already-active listing returns 400")
def _():
    admin = auth.admin_client()
    seller, _, _ = auth.register_new_user()
    listing = _create_listing(seller, status="active")
    try:
        resp = admin.patch(f"/admin/listings/{listing['id']}/approve")
        assert resp.status_code == 400, resp.text
    finally:
        seller.delete(f"/auctions/{listing['id']}")


@suite.case("approve_listing for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.patch(f"/admin/listings/{uuid.uuid4()}/approve")
    assert resp.status_code == 404, resp.text


@suite.case("remove_listing (admin override) works even though the admin isn't the owner")
def _():
    admin = auth.admin_client()
    seller, _, _ = auth.register_new_user()
    listing = _create_listing(seller, status="active")
    resp = admin.patch(f"/admin/listings/{listing['id']}/remove")
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "removed"


@suite.case("remove_listing on an already-removed listing returns 400")
def _():
    admin = auth.admin_client()
    seller, _, _ = auth.register_new_user()
    listing = _create_listing(seller, status="active")
    admin.patch(f"/admin/listings/{listing['id']}/remove")
    resp = admin.patch(f"/admin/listings/{listing['id']}/remove")
    assert resp.status_code == 400, resp.text


@suite.case("remove_listing for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.patch(f"/admin/listings/{uuid.uuid4()}/remove")
    assert resp.status_code == 404, resp.text


@suite.case("restart_auction on a non-ended listing returns 400 (only ended auctions can restart)")
def _():
    admin = auth.admin_client()
    seller, _, _ = auth.register_new_user()
    listing = _create_listing(seller, status="active")
    try:
        future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        resp = admin.post(f"/admin/listings/{listing['id']}/restart", json={"end_time": future})
        assert resp.status_code == 400, resp.text
    finally:
        seller.delete(f"/auctions/{listing['id']}")


@suite.case("restart_auction for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    resp = admin.post(f"/admin/listings/{uuid.uuid4()}/restart", json={"end_time": future})
    assert resp.status_code == 404, resp.text


@suite.case("restart_auction / approve / remove all require admin (403 for a regular user)")
def _():
    user_client, _, _ = auth.register_new_user()
    fake_id = uuid.uuid4()
    future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    assert user_client.patch(f"/admin/listings/{fake_id}/approve").status_code == 403
    assert user_client.patch(f"/admin/listings/{fake_id}/remove").status_code == 403
    assert user_client.post(f"/admin/listings/{fake_id}/restart", json={"end_time": future}).status_code == 403


@suite.case("cancel_bid for an unknown bid id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.delete(f"/admin/bids/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("cancel_bid requires admin (401 with no token, 403 for a regular user)")
def _():
    fake_id = uuid.uuid4()
    assert ApiClient().delete(f"/admin/bids/{fake_id}").status_code == 401
    user_client, _, _ = auth.register_new_user()
    assert user_client.delete(f"/admin/bids/{fake_id}").status_code == 403


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
