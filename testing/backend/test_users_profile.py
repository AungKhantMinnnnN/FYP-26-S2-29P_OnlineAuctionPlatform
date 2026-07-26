"""
Endpoints under test (backend/app/api/v1/controller/users.py):
  POST /users/me/profile
  GET  /users/me/interests
  POST /users/me/interests
  GET  /users/me/stats

Uses a fresh ephemeral user throughout.
"""
import sys

from framework import Suite
from client import ApiClient
import auth_helpers as auth

suite = Suite("Users: profile, interests, stats")


def _get_category_ids(client, n=2):
    resp = client.get("/auctions/form_metadata")
    assert resp.status_code == 200, resp.text
    categories = resp.json()["categories"]
    assert len(categories) >= n, "not enough seeded categories to run this test"
    return [c["id"] for c in categories[:n]]


@suite.case("update_profile requires auth (401 without a token)")
def _():
    resp = ApiClient().post("/users/me/profile", json={"full_name": "Nope"})
    assert resp.status_code == 401, resp.text


@suite.case("update_profile happy path: fields round-trip correctly")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/users/me/profile", json={
        "full_name": "Updated QA Name",
        "phone": "+65 9999 0000",
        "city": "Testville",
        "country": "Testland",
        "bio": "Updated by the QA suite.",
        "email_alerts_enabled": False,
    })
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["full_name"] == "Updated QA Name"
    assert body["city"] == "Testville"
    assert body["email_alerts_enabled"] is False


@suite.case("update_profile with an invalid dob format returns 400")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/users/me/profile", json={"dob": "31/12/2000"})
    assert resp.status_code == 400, resp.text


@suite.case("update_profile with a valid ISO dob succeeds")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/users/me/profile", json={"dob": "2000-12-31"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["dob"] == "2000-12-31"


@suite.case("get_my_interests on a brand-new account returns an empty list")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.get("/users/me/interests")
    assert resp.status_code == 200, resp.text
    assert resp.json()["items"] == []


@suite.case("update_my_interests requires at least one category (400 on empty list)")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/users/me/interests", json={"category_ids": []})
    assert resp.status_code == 400, resp.text


@suite.case("update_my_interests rejects an unknown category id with 404")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/users/me/interests", json={
        "category_ids": ["00000000-0000-0000-0000-000000000000"],
    })
    assert resp.status_code == 404, resp.text


@suite.case("update_my_interests happy path persists and is readable back")
def _():
    client, user, payload = auth.register_new_user()
    category_ids = _get_category_ids(client, n=2)

    resp = client.post("/users/me/interests", json={"category_ids": category_ids})
    assert resp.status_code == 200, resp.text
    returned_ids = {c["id"] for c in resp.json()["items"]}
    assert returned_ids == set(category_ids)

    reread = client.get("/users/me/interests")
    assert {c["id"] for c in reread.json()["items"]} == set(category_ids)


@suite.case("update_my_interests replaces (not merges with) the previous set")
def _():
    client, user, payload = auth.register_new_user()
    category_ids = _get_category_ids(client, n=2)

    client.post("/users/me/interests", json={"category_ids": [category_ids[0]]})
    second = client.post("/users/me/interests", json={"category_ids": [category_ids[1]]})
    assert second.status_code == 200, second.text
    returned_ids = {c["id"] for c in second.json()["items"]}
    assert returned_ids == {category_ids[1]}, "second save should fully replace the first, not merge"


@suite.case("get_my_stats requires auth (401 without a token)")
def _():
    resp = ApiClient().get("/users/me/stats")
    assert resp.status_code == 401, resp.text


@suite.case("get_my_stats on a brand-new account returns all-zero counters")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.get("/users/me/stats")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total_views"] == 0
    assert body["total_watchlists"] == 0
    assert body["total_sales"] == 0
    assert body["total_revenue"] == 0


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
