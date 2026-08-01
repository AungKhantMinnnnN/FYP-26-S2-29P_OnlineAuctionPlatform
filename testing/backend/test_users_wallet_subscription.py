"""
Endpoints under test (backend/app/api/v1/controller/users.py):
  GET  /users/me/wallet
  POST /users/me/wallet/topup
  POST /users/me/subscription

Uses fresh ephemeral users throughout — wallet mutations never touch seeded
accounts, so balances shown elsewhere (e.g. admin stats) aren't disturbed
beyond the ephemeral user's own (deleted-in-spirit, never-reused) balance.
"""
import sys

from framework import Suite
from client import ApiClient
import auth_helpers as auth

suite = Suite("Users: wallet & subscription")


@suite.case("get_my_wallet on a brand-new account shows zero balance and no transactions")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.get("/users/me/wallet")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["balance"] == 0
    assert body["transactions"]["items"] == []
    assert body["transactions"]["total"] == 0


@suite.case("topup_wallet rejects a zero amount with 422")
def _():
    # amount now carries a schema-level gt=0/le=10000 cap (see H2 in the security audit),
    # so an out-of-range value fails Pydantic validation (422) before the service's own
    # `amount <= 0` check (400) is ever reached.
    client, user, payload = auth.register_new_user()
    resp = client.post("/users/me/wallet/topup", json={"amount": 0})
    assert resp.status_code == 422, resp.text


@suite.case("topup_wallet rejects a negative amount with 422")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/users/me/wallet/topup", json={"amount": -50})
    assert resp.status_code == 422, resp.text


@suite.case("topup_wallet rejects an amount over the 10000 cap with 422")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/users/me/wallet/topup", json={"amount": 50000})
    assert resp.status_code == 422, resp.text


@suite.case("topup_wallet happy path increases balance and records a transaction")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/users/me/wallet/topup", json={"amount": 100})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["balance"] == 100
    assert body["transaction"]["amount"] == 100
    assert body["transaction"]["type"] == "topup"

    wallet = client.get("/users/me/wallet")
    assert wallet.json()["balance"] == 100
    assert wallet.json()["transactions"]["total"] == 1


@suite.case("topup_wallet requires auth (401 without a token)")
def _():
    resp = ApiClient().post("/users/me/wallet/topup", json={"amount": 10})
    assert resp.status_code == 401, resp.text


@suite.case("manage_subscription rejects an invalid action with 400")
def _():
    client, user, payload = auth.register_new_user()
    resp = client.post("/users/me/subscription", json={"action": "upgrade"})
    assert resp.status_code in (400, 422), resp.text


@suite.case("manage_subscription 'renew' with insufficient balance returns 400")
def _():
    client, user, payload = auth.register_new_user()
    # A brand-new account has $0 balance, well under any premium tier price.
    resp = client.post("/users/me/subscription", json={"action": "renew"})
    assert resp.status_code == 400, resp.text


@suite.case("manage_subscription 'renew' with sufficient balance upgrades to premium and deducts price")
def _():
    client, user, payload = auth.register_new_user()
    tiers = ApiClient().get("/subscription-tiers")
    assert tiers.status_code == 200, tiers.text
    premium = next((t for t in tiers.json()["items"] if t["tier"] == "premium"), None)
    if premium is None:
        raise AssertionError("no active premium subscription tier configured — cannot test renew")

    topup = client.post("/users/me/wallet/topup", json={"amount": premium["price"] + 50})
    assert topup.status_code == 200, topup.text

    resp = client.post("/users/me/subscription", json={"action": "renew"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["subscription_tier"] == "premium"
    assert body["subscription_expires_at"] is not None
    assert body["balance"] == round(premium["price"] + 50 - premium["price"], 2)


@suite.case("manage_subscription 'cancel' reverts an account to the free tier")
def _():
    client, user, payload = auth.register_new_user()
    tiers = ApiClient().get("/subscription-tiers").json()["items"]
    premium = next((t for t in tiers if t["tier"] == "premium"), None)
    if premium is None:
        raise AssertionError("no active premium subscription tier configured — cannot test cancel")

    client.post("/users/me/wallet/topup", json={"amount": premium["price"]})
    client.post("/users/me/subscription", json={"action": "renew"})

    resp = client.post("/users/me/subscription", json={"action": "cancel"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["subscription_tier"] == "free"
    assert body["subscription_expires_at"] is None


@suite.case("manage_subscription requires auth (401 without a token)")
def _():
    resp = ApiClient().post("/users/me/subscription", json={"action": "cancel"})
    assert resp.status_code == 401, resp.text


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
