"""
Endpoints under test (backend/app/api/v1/controller/internal.py):
  POST /internal/notifications/outbid
  POST /internal/notifications/auction-ended

nginx blocks the public path (docker/nginx/default.conf has
`location /v1.0.0/internal/ { return 404; }`), so calling them through the
normal BASE_URL (port 80) correctly 404s. The backend container's port 8000 is
not published on the VM host at all -- nginx already proxies every legitimate
request, so there's no reason for it to be directly reachable (see
docker-compose.yml's backend service comment and TEST_PLAN.md Finding F1).
These routes also require a shared X-Internal-Api-Key header matching
INTERNAL_API_KEY (see backend/app/api/deps.py's require_internal_key) as
defence in depth, though that's moot while the port itself is unreachable.

The "via the direct port" cases below only exercise real request/response
behaviour when QA_INTERNAL_DIRECT_BASE_URL points somewhere that can actually
reach port 8000 (e.g. run from inside the Docker network, or against an
environment that still publishes it for local dev) -- they skip cleanly
otherwise rather than failing on an expected connection refusal.
"""
import sys
import uuid

import requests

from framework import Suite, Skip
from client import ApiClient
import auth_helpers as auth
import config

suite = Suite("Internal notification webhooks")

INTERNAL_HEADERS = {"X-Internal-Api-Key": config.INTERNAL_API_KEY} if config.INTERNAL_API_KEY else {}


def _direct_client():
    """An ApiClient for the direct-port base URL, or a Skip if it's unreachable --
    which is the expected, secure default now that port 8000 isn't published."""
    direct = ApiClient(base_url=config.INTERNAL_DIRECT_BASE_URL)
    try:
        requests.get(config.INTERNAL_DIRECT_BASE_URL, timeout=3)
    except requests.exceptions.ConnectionError:
        raise Skip(
            f"{config.INTERNAL_DIRECT_BASE_URL} is unreachable -- port 8000 is not published "
            "by design (see docker-compose.yml). Set QA_INTERNAL_DIRECT_BASE_URL to test this "
            "from somewhere that can actually reach it."
        )
    return direct


@suite.case("via the public URL (port 80/nginx): /internal/* is blocked with 404, as intended")
def _():
    resp = ApiClient().post("/internal/notifications/outbid", json={
        "outbid_user_id": "00000000-0000-0000-0000-000000000000",
        "listing_id": "00000000-0000-0000-0000-000000000000",
        "listing_title": "QA Suite Probe",
        "new_amount": 1.0,
    })
    assert resp.status_code == 404, (
        f"expected nginx's /v1.0.0/internal/ block to 404 this — got {resp.status_code}. "
        "If nginx config changed, re-verify docker/nginx/default.conf still blocks this path."
    )


@suite.case("via the direct port, with the internal key: outbid succeeds")
def _():
    _, user, _ = auth.register_new_user()
    direct = _direct_client()
    resp = direct.post("/internal/notifications/outbid", json={
        "outbid_user_id": user["id"],
        "listing_id": "00000000-0000-0000-0000-000000000000",
        "listing_title": "QA Suite Probe",
        "new_amount": 42.0,
    }, headers=INTERNAL_HEADERS)
    assert resp.status_code == 200, resp.text
    assert resp.json().get("ok") is True


@suite.case("via the direct port, with the internal key: auction-ended succeeds")
def _():
    _, seller, _ = auth.register_new_user()
    direct = _direct_client()
    resp = direct.post("/internal/notifications/auction-ended", json={
        "listing_id": "00000000-0000-0000-0000-000000000000",
        "listing_title": "QA Suite Probe",
        "seller_id": seller["id"],
        "winner_id": None,
        "final_price": 0.0,
        "outcome": "no_bids",
    }, headers=INTERNAL_HEADERS)
    assert resp.status_code == 200, resp.text
    assert resp.json().get("ok") is True


@suite.case("via the direct port, without the internal key: rejected with 401 (only runs if QA_INTERNAL_API_KEY is set)")
def _():
    if not config.INTERNAL_API_KEY:
        return  # the target hasn't rolled out INTERNAL_API_KEY yet -- nothing to prove here
    direct = _direct_client()
    resp = direct.post("/internal/notifications/outbid", json={
        "outbid_user_id": "00000000-0000-0000-0000-000000000000",
        "listing_id": "00000000-0000-0000-0000-000000000000",
        "listing_title": "QA Suite Probe",
        "new_amount": 1.0,
    })
    assert resp.status_code == 401, resp.text


@suite.case("via the direct port: missing required fields still returns a clean 422")
def _():
    direct = _direct_client()
    resp = direct.post("/internal/notifications/outbid", json={"outbid_user_id": "irrelevant"}, headers=INTERNAL_HEADERS)
    assert resp.status_code == 422, resp.text


@suite.case("via the direct port: a non-UUID outbid_user_id returns a clean 422")
def _():
    # outbid_user_id is a uuid.UUID field, so pydantic rejects a non-UUID string with a
    # clean 422 before the handler (and notification_service) ever runs.
    direct = _direct_client()
    resp = direct.post("/internal/notifications/outbid", json={
        "outbid_user_id": "this-is-not-a-uuid",
        "listing_id": "00000000-0000-0000-0000-000000000000",
        "listing_title": "QA Suite Probe",
        "new_amount": 1.0,
    }, headers=INTERNAL_HEADERS)
    assert resp.status_code == 422, resp.text


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
