"""
Endpoints under test (backend/app/api/v1/controller/auth.py):
  POST /auth/register
  POST /auth/login
  GET  /auth/get_current_user
  POST /auth/password-reset/request
  POST /auth/password-reset/confirm
  POST /auth/email-verification/send
  POST /auth/email-verification/confirm
  POST /auth/change-password

All cases use a freshly registered ephemeral user (see auth_helpers) — nothing
here touches the seeded accounts.
"""
import sys

from framework import Suite
from client import ApiClient
import auth_helpers as auth

suite = Suite("Auth")


@suite.case("register returns 201 with correct default shape (role=user, balance=0, unverified)")
def _():
    client = ApiClient()
    payload = auth.random_registration_payload()
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["username"] == payload["username"]
    assert body["email"] == payload["email"]
    assert body["role"] == "user"
    assert body["balance"] == 0
    assert body["email_verified"] is False
    assert body["subscription_tier"] == "free"


@suite.case("register with a role field in the payload is ignored server-side (cannot self-elevate)")
def _():
    client = ApiClient()
    payload = auth.random_registration_payload()
    payload["role"] = "admin"
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 201, resp.text
    assert resp.json()["role"] == "user", "RegisterRequest.role must never be honoured by the server"


@suite.case("register with a duplicate email is rejected with 400")
def _():
    client = ApiClient()
    payload = auth.random_registration_payload()
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201, first.text

    dup_payload = auth.random_registration_payload()
    dup_payload["email"] = payload["email"]
    second = client.post("/auth/register", json=dup_payload)
    assert second.status_code == 400, second.text


@suite.case("register with a duplicate username is rejected with 400")
def _():
    client = ApiClient()
    payload = auth.random_registration_payload()
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201, first.text

    dup_payload = auth.random_registration_payload()
    dup_payload["username"] = payload["username"]
    second = client.post("/auth/register", json=dup_payload)
    assert second.status_code == 400, second.text


@suite.case("register rejects a malformed email with a 422 validation error")
def _():
    client = ApiClient()
    payload = auth.random_registration_payload()
    payload["email"] = "not-an-email"
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 422, resp.text


@suite.case("login with correct username + password returns a bearer token")
def _():
    client, user, payload = auth.register_new_user()
    resp = ApiClient().post("/auth/login", json={
        "username_or_email": payload["username"],
        "password": payload["password"],
    })
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 20


@suite.case("login with email instead of username also succeeds")
def _():
    client, user, payload = auth.register_new_user()
    resp = ApiClient().post("/auth/login", json={
        "username_or_email": payload["email"],
        "password": payload["password"],
    })
    assert resp.status_code == 200, resp.text


@suite.case("login with wrong password returns 401")
def _():
    client, user, payload = auth.register_new_user()
    resp = ApiClient().post("/auth/login", json={
        "username_or_email": payload["username"],
        "password": "definitely-wrong-password",
    })
    assert resp.status_code == 401, resp.text


@suite.case("login with a non-existent user returns 401 (not 404 — avoids account enumeration)")
def _():
    resp = ApiClient().post("/auth/login", json={
        "username_or_email": "no_such_user_xyz",
        "password": "whatever123",
    })
    assert resp.status_code == 401, resp.text


@suite.case("get_current_user without a token returns 200 with a null body (not 401 — the frontend polls this on every page load to silently check auth state)")
def _():
    resp = ApiClient().get("/auth/get_current_user")
    assert resp.status_code == 200, resp.text
    assert resp.json() is None


@suite.case("get_current_user with an invalid token returns 200 with a null body, same as no token")
def _():
    resp = ApiClient(token="not-a-real-jwt").get("/auth/get_current_user")
    assert resp.status_code == 200, resp.text
    assert resp.json() is None


@suite.case("get_current_user with a valid token returns the matching account")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.get("/auth/get_current_user")
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == user["id"]


@suite.case("change-password rejects an incorrect current_password with 400")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/auth/change-password", json={
        "current_password": "wrong-current-password",
        "new_password": "NewPassword!123",
    })
    assert resp.status_code == 400, resp.text


@suite.case("change-password happy path: old password stops working, new one works")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/auth/change-password", json={
        "current_password": payload["password"],
        "new_password": "NewPassword!123",
    })
    assert resp.status_code == 200, resp.text

    old_login = ApiClient().post("/auth/login", json={
        "username_or_email": payload["username"], "password": payload["password"],
    })
    assert old_login.status_code == 401, "old password should no longer work"

    new_login = ApiClient().post("/auth/login", json={
        "username_or_email": payload["username"], "password": "NewPassword!123",
    })
    assert new_login.status_code == 200, new_login.text


@suite.case("change-password requires auth (401 without a token)")
def _():
    resp = ApiClient().post("/auth/change-password", json={
        "current_password": "x", "new_password": "y",
    })
    assert resp.status_code == 401, resp.text


@suite.case("password-reset/request always returns 200, even for an unknown email (anti-enumeration)")
def _():
    resp = ApiClient().post("/auth/password-reset/request", json={"email": "no-such-account@example.com"})
    assert resp.status_code == 200, resp.text
    assert "message" in resp.json()


@suite.case("password-reset/request returns 200 for a real, registered email too")
def _():
    client, user, payload = auth.register_new_user()
    resp = ApiClient().post("/auth/password-reset/request", json={"email": payload["email"]})
    assert resp.status_code == 200, resp.text


@suite.case("password-reset/confirm with a bogus token is rejected with 400")
def _():
    resp = ApiClient().post("/auth/password-reset/confirm", json={
        "token": "not-a-real-token", "new_password": "Whatever!123",
    })
    assert resp.status_code == 400, resp.text


@suite.case("email-verification/send for an already-logged-in unverified user returns 200")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/auth/email-verification/send")
    assert resp.status_code == 200, resp.text


@suite.case("email-verification/send requires auth (401 without a token)")
def _():
    resp = ApiClient().post("/auth/email-verification/send")
    assert resp.status_code == 401, resp.text


@suite.case("email-verification/confirm with a bogus token is rejected with 400")
def _():
    resp = ApiClient().post("/auth/email-verification/confirm", json={"token": "not-a-real-token"})
    assert resp.status_code == 400, resp.text


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
