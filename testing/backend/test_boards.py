"""
Endpoints under test (backend/app/api/v1/controller/boards.py):
  GET    /boards/me
  GET    /boards/user/{user_id}
  GET    /boards/{id}
  POST   /boards/
  POST   /boards/{id}
  DELETE /boards/{id}
  POST   /boards/{id}/items
  POST   /boards/{id}/items/reorder
  POST   /boards/{id}/items/{item_id}
  DELETE /boards/{id}/items/{item_id}

Board *items* wrap a won AuctionResult, which nothing in this API can produce
directly (auctions are settled by logic outside this gateway's tested surface
— see TEST_PLAN.md). Item-mutation happy paths therefore aren't reachable
here; only their not-found / ownership branches are exercised.
"""
import sys
import uuid

from framework import Suite, Skip
from client import ApiClient
import auth_helpers as auth
from qa_ids import unique_tag

suite = Suite("Collector boards (premium)")


def _make_premium(client):
    tiers = ApiClient().get("/subscription-tiers").json()["items"]
    premium = next((t for t in tiers if t["tier"] == "premium"), None)
    if premium is None:
        raise Skip("no active premium subscription tier configured")
    client.post("/users/me/wallet/topup", json={"amount": premium["price"]})
    resp = client.post("/users/me/subscription", json={"action": "renew"})
    assert resp.status_code == 200, resp.text
    return client


def _unique_name():
    return f"QA Board {unique_tag()}"


@suite.case("get_my_boards requires premium (403 for a free-tier user)")
def _():
    client, _, _ = auth.register_new_user()
    resp = client.get("/boards/me")
    assert resp.status_code == 403, resp.text


@suite.case("get_my_boards for a fresh premium user is empty")
def _():
    client, _, _ = auth.register_new_user()
    _make_premium(client)
    resp = client.get("/boards/me")
    assert resp.status_code == 200, resp.text
    assert resp.json() == []


@suite.case("create_board requires premium (403 for a free-tier user)")
def _():
    client, _, _ = auth.register_new_user()
    resp = client.post("/boards/", json={"name": _unique_name()})
    assert resp.status_code == 403, resp.text


@suite.case("create_board happy path defaults to private and item_count=0")
def _():
    client, _, _ = auth.register_new_user()
    _make_premium(client)
    resp = client.post("/boards/", json={"name": _unique_name(), "description": "QA suite board"})
    assert resp.status_code == 201, resp.text
    board = resp.json()
    assert board["is_public"] is False
    assert board["item_count"] == 0


@suite.case("get_board on a private board is 404 to a stranger, 200 to the owner")
def _():
    client, user, _ = auth.register_new_user()
    _make_premium(client)
    board = client.post("/boards/", json={"name": _unique_name(), "is_public": False}).json()

    stranger = ApiClient()
    resp_stranger = stranger.get(f"/boards/{board['id']}")
    assert resp_stranger.status_code == 404, "private board must not leak existence to non-owners"

    resp_owner = client.get(f"/boards/{board['id']}")
    assert resp_owner.status_code == 200, resp_owner.text


@suite.case("get_board on a public board is visible to anyone, listed via get_public_boards_by_user")
def _():
    client, user, _ = auth.register_new_user()
    _make_premium(client)
    board = client.post("/boards/", json={"name": _unique_name(), "is_public": True}).json()

    resp = ApiClient().get(f"/boards/{board['id']}")
    assert resp.status_code == 200, resp.text

    public_list = ApiClient().get(f"/boards/user/{user['id']}")
    assert resp.status_code == 200
    assert any(b["id"] == board["id"] for b in public_list.json())


@suite.case("get_board for an unknown id returns 404")
def _():
    resp = ApiClient().get(f"/boards/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("update_board renames and can flip visibility")
def _():
    client, _, _ = auth.register_new_user()
    _make_premium(client)
    board = client.post("/boards/", json={"name": _unique_name(), "is_public": False}).json()
    resp = client.post(f"/boards/{board['id']}", json={"name": "Renamed by QA", "is_public": True})
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "Renamed by QA"
    assert resp.json()["is_public"] is True


@suite.case("update_board on a board owned by someone else returns 404 (ownership scoped, not leaked as 403)")
def _():
    owner, _, _ = auth.register_new_user()
    _make_premium(owner)
    board = owner.post("/boards/", json={"name": _unique_name()}).json()

    other, _, _ = auth.register_new_user()
    _make_premium(other)
    resp = other.post(f"/boards/{board['id']}", json={"name": "hijacked"})
    assert resp.status_code == 404, resp.text


@suite.case("add_item with a fake auction_result_id returns 404 (not won by caller)")
def _():
    client, _, _ = auth.register_new_user()
    _make_premium(client)
    board = client.post("/boards/", json={"name": _unique_name()}).json()
    resp = client.post(f"/boards/{board['id']}/items", json={"auction_result_id": str(uuid.uuid4())})
    assert resp.status_code == 404, resp.text


@suite.case("reorder_items with an empty batch on an owned board succeeds (204)")
def _():
    client, _, _ = auth.register_new_user()
    _make_premium(client)
    board = client.post("/boards/", json={"name": _unique_name()}).json()
    resp = client.post(f"/boards/{board['id']}/items/reorder", json={"items": []})
    assert resp.status_code == 204, resp.text


@suite.case("reorder_items on an unowned board returns 404")
def _():
    resp = ApiClient().post(f"/boards/{uuid.uuid4()}/items/reorder", json={"items": []})
    assert resp.status_code in (401, 404), resp.text


@suite.case("update_item on a non-existent item returns 404")
def _():
    client, _, _ = auth.register_new_user()
    _make_premium(client)
    board = client.post("/boards/", json={"name": _unique_name()}).json()
    resp = client.post(f"/boards/{board['id']}/items/{uuid.uuid4()}", json={"note": "hello"})
    assert resp.status_code == 404, resp.text


@suite.case("remove_item on a non-existent item returns 404")
def _():
    client, _, _ = auth.register_new_user()
    _make_premium(client)
    board = client.post("/boards/", json={"name": _unique_name()}).json()
    resp = client.delete(f"/boards/{board['id']}/items/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("delete_board happy path removes it (subsequent get_board is 404)")
def _():
    client, _, _ = auth.register_new_user()
    _make_premium(client)
    board = client.post("/boards/", json={"name": _unique_name()}).json()
    resp = client.delete(f"/boards/{board['id']}")
    assert resp.status_code == 204, resp.text
    assert client.get(f"/boards/{board['id']}").status_code == 404


@suite.case("delete_board on an unknown id returns 404")
def _():
    client, _, _ = auth.register_new_user()
    _make_premium(client)
    resp = client.delete(f"/boards/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
