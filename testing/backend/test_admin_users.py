"""
Endpoints under test (backend/app/api/v1/controller/admin.py — Users region):
  GET    /admin/users
  GET    /admin/users/{id}
  PATCH  /admin/users/{id}/suspend
  PATCH  /admin/users/{id}/unsuspend
  DELETE /admin/users/{id}

Uses the seeded admin account plus freshly-registered ephemeral users as
suspend/delete targets — the seeded normal_user_* / userN@example.com accounts
used by other QA flows are never touched.
"""
import sys
import uuid

from framework import Suite, Skip
from client import ApiClient
import auth_helpers as auth

suite = Suite("Admin: users")


@suite.case("list_users requires admin (401 with no token, 403 for a regular user)")
def _():
    assert ApiClient().get("/admin/users").status_code == 401
    user_client, _, _ = auth.register_new_user()
    resp = user_client.get("/admin/users")
    assert resp.status_code == 403, resp.text


@suite.case("list_users (admin) returns a paginated page with admin_count")
def _():
    admin = auth.admin_client()
    resp = admin.get("/admin/users", params={"page": 1, "size": 10})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "items" in body and "admin_count" in body
    assert body["admin_count"] >= 1


@suite.case("list_users search filter finds a freshly-registered user by username")
def _():
    admin = auth.admin_client()
    _, user, payload = auth.register_new_user()
    resp = admin.get("/admin/users", params={"search": payload["username"]})
    assert resp.status_code == 200, resp.text
    ids = {u["id"] for u in resp.json()["items"]}
    assert user["id"] in ids


@suite.case("list_users role filter returns only admins")
def _():
    admin = auth.admin_client()
    resp = admin.get("/admin/users", params={"role": "admin", "size": 100})
    assert resp.status_code == 200, resp.text
    assert all(u["role"] == "admin" for u in resp.json()["items"])


@suite.case("get_user (admin) returns full detail including profile")
def _():
    admin = auth.admin_client()
    _, user, payload = auth.register_new_user()
    resp = admin.get(f"/admin/users/{user['id']}")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == user["id"]
    assert body["profile"]["full_name"] == payload["full_name"]


@suite.case("get_user for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.get(f"/admin/users/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("suspend_user rejects a whitespace-only reason with 400 (passes schema min_length, fails service strip check)")
def _():
    admin = auth.admin_client()
    _, user, _ = auth.register_new_user()
    resp = admin.patch(f"/admin/users/{user['id']}/suspend", json={"reason": "   "})
    assert resp.status_code == 400, resp.text


@suite.case("suspend_user rejects a too-short reason with 422 (schema min_length=3)")
def _():
    admin = auth.admin_client()
    _, user, _ = auth.register_new_user()
    resp = admin.patch(f"/admin/users/{user['id']}/suspend", json={"reason": "ab"})
    assert resp.status_code == 422, resp.text


@suite.case("suspend_user happy path: status flips to suspended, reason recorded, login blocked")
def _():
    admin = auth.admin_client()
    _, user, payload = auth.register_new_user()
    resp = admin.patch(f"/admin/users/{user['id']}/suspend", json={"reason": "QA suite test suspension"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "suspended"
    assert body["suspension_reason"] == "QA suite test suspension"

    login_attempt = ApiClient().post("/auth/login", json={
        "username_or_email": payload["username"], "password": payload["password"],
    })
    assert login_attempt.status_code == 400, "a suspended user must not be able to log in"


@suite.case("suspend_user on an already-suspended user returns 400")
def _():
    admin = auth.admin_client()
    _, user, _ = auth.register_new_user()
    admin.patch(f"/admin/users/{user['id']}/suspend", json={"reason": "first suspension"})
    resp = admin.patch(f"/admin/users/{user['id']}/suspend", json={"reason": "second suspension"})
    assert resp.status_code == 400, resp.text


@suite.case("suspend_user cannot target the admin's own account (400)")
def _():
    admin = auth.admin_client()
    me = admin.get("/auth/get_current_user").json()
    resp = admin.patch(f"/admin/users/{me['id']}/suspend", json={"reason": "self-suspend attempt"})
    assert resp.status_code == 400, resp.text


@suite.case("suspend_user for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.patch(f"/admin/users/{uuid.uuid4()}/suspend", json={"reason": "does not matter"})
    assert resp.status_code == 404, resp.text


@suite.case("unsuspend_user on a user who isn't suspended returns 400")
def _():
    admin = auth.admin_client()
    _, user, _ = auth.register_new_user()
    resp = admin.patch(f"/admin/users/{user['id']}/unsuspend")
    assert resp.status_code == 400, resp.text


@suite.case("unsuspend_user happy path restores login access")
def _():
    admin = auth.admin_client()
    _, user, payload = auth.register_new_user()
    admin.patch(f"/admin/users/{user['id']}/suspend", json={"reason": "temporary"})

    resp = admin.patch(f"/admin/users/{user['id']}/unsuspend")
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "active"

    login_attempt = ApiClient().post("/auth/login", json={
        "username_or_email": payload["username"], "password": payload["password"],
    })
    assert login_attempt.status_code == 200, "user should be able to log in again after unsuspend"


@suite.case("delete_user cannot target the admin's own account (400)")
def _():
    admin = auth.admin_client()
    me = admin.get("/auth/get_current_user").json()
    resp = admin.delete(f"/admin/users/{me['id']}")
    assert resp.status_code == 400, resp.text


@suite.case("delete_user for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.delete(f"/admin/users/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("delete_user happy path soft-deletes and blocks future login")
def _():
    admin = auth.admin_client()
    _, user, payload = auth.register_new_user()
    resp = admin.delete(f"/admin/users/{user['id']}")
    assert resp.status_code == 204, resp.text

    login_attempt = ApiClient().post("/auth/login", json={
        "username_or_email": payload["username"], "password": payload["password"],
    })
    assert login_attempt.status_code == 400, "a deleted user must not be able to log in"


@suite.case("delete_user on an already-deleted user returns 400")
def _():
    admin = auth.admin_client()
    _, user, _ = auth.register_new_user()
    admin.delete(f"/admin/users/{user['id']}")
    resp = admin.delete(f"/admin/users/{user['id']}")
    assert resp.status_code == 400, resp.text


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
