"""
Endpoints under test (backend/app/api/v1/controller/users.py):
  GET    /users/me/watchlist
  POST   /users/me/watchlist
  DELETE /users/me/watchlist/{listing_id}
  GET    /users/me/bids
  GET    /users/me/purchases

Also exercises auctions/create_listing (as seller) to have a real listing to
watch, since watchlist add validates the listing exists.
"""
import sys
import uuid
from datetime import datetime, timedelta, timezone

from framework import Suite
from client import ApiClient
import auth_helpers as auth
from qa_ids import unique_tag

suite = Suite("Users: watchlist, bid history, purchases")


def _create_listing(client):
    now = datetime.now(timezone.utc)
    payload = {
        "title": f"QA Watchlist Target {unique_tag()}",
        "condition": "new",
        "bidding_type": "price_up",
        "starting_price": 25.0,
        "min_increment": 1.0,
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(hours=2)).isoformat(),
        "status": "active",
    }
    resp = client.post("/auctions/create_listing", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


@suite.case("get_my_watchlist on a brand-new account is empty")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.get("/users/me/watchlist")
    assert resp.status_code == 200, resp.text
    assert resp.json()["items"] == []
    assert resp.json()["listing_ids"] == []


@suite.case("add_to_watchlist for a non-existent listing returns 404")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/users/me/watchlist", json={"listing_id": str(uuid.uuid4())})
    assert resp.status_code == 404, resp.text


@suite.case("add_to_watchlist happy path, then it appears in get_my_watchlist")
def _():
    seller_client, seller, _ = auth.register_new_user()
    listing = _create_listing(seller_client)
    watcher_client, watcher, _ = auth.register_new_user()
    try:
        resp = watcher_client.post("/users/me/watchlist", json={"listing_id": listing["id"]})
        assert resp.status_code == 200, resp.text
        assert resp.json()["listing_id"] == listing["id"]

        reread = watcher_client.get("/users/me/watchlist")
        assert listing["id"] in reread.json()["listing_ids"]
    finally:
        seller_client.delete(f"/auctions/{listing['id']}")


@suite.case("add_to_watchlist is idempotent (adding twice does not duplicate)")
def _():
    seller_client, seller, _ = auth.register_new_user()
    listing = _create_listing(seller_client)
    watcher_client, watcher, _ = auth.register_new_user()
    try:
        watcher_client.post("/users/me/watchlist", json={"listing_id": listing["id"]})
        watcher_client.post("/users/me/watchlist", json={"listing_id": listing["id"]})
        reread = watcher_client.get("/users/me/watchlist")
        assert reread.json()["listing_ids"].count(listing["id"]) == 1
    finally:
        seller_client.delete(f"/auctions/{listing['id']}")


@suite.case("remove_from_watchlist happy path removes the entry")
def _():
    seller_client, seller, _ = auth.register_new_user()
    listing = _create_listing(seller_client)
    watcher_client, watcher, _ = auth.register_new_user()
    try:
        watcher_client.post("/users/me/watchlist", json={"listing_id": listing["id"]})
        resp = watcher_client.delete(f"/users/me/watchlist/{listing['id']}")
        assert resp.status_code == 204, resp.text
        reread = watcher_client.get("/users/me/watchlist")
        assert listing["id"] not in reread.json()["listing_ids"]
    finally:
        seller_client.delete(f"/auctions/{listing['id']}")


@suite.case("remove_from_watchlist for a listing never watched returns 404")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.delete(f"/users/me/watchlist/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("watchlist endpoints require auth (401 without a token)")
def _():
    assert ApiClient().get("/users/me/watchlist").status_code == 401
    assert ApiClient().post("/users/me/watchlist", json={"listing_id": str(uuid.uuid4())}).status_code == 401
    assert ApiClient().delete(f"/users/me/watchlist/{uuid.uuid4()}").status_code == 401


@suite.case("get_my_bids on a brand-new account returns an empty, well-formed page")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.get("/users/me/bids")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0


@suite.case("get_my_bids rejects an invalid result filter with 422")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.get("/users/me/bids", params={"result": "not-a-real-filter"})
    assert resp.status_code == 422, resp.text


@suite.case("get_my_purchases on a brand-new account returns an empty, well-formed page")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.get("/users/me/purchases")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0


@suite.case("get_my_bids / get_my_purchases require auth (401 without a token)")
def _():
    assert ApiClient().get("/users/me/bids").status_code == 401
    assert ApiClient().get("/users/me/purchases").status_code == 401


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
