"""Endpoints under test (backend/app/api/v1/controller/subscriptions.py): GET /subscription-tiers"""
import sys

from framework import Suite
from client import ApiClient

suite = Suite("Subscription tiers (public)")


@suite.case("list_subscription_tiers is public and returns only active tiers")
def _():
    resp = ApiClient().get("/subscription-tiers")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "items" in body
    assert all(t["is_active"] for t in body["items"])


@suite.case("list_subscription_tiers items have the fields the frontend pricing page depends on")
def _():
    resp = ApiClient().get("/subscription-tiers")
    items = resp.json()["items"]
    if not items:
        return
    for item in items:
        for field in ("id", "tier", "price", "duration_days", "is_active"):
            assert field in item, f"missing '{field}' in subscription tier item"


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
