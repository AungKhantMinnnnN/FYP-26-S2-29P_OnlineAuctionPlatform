"""
Endpoints under test (backend/app/api/v1/controller/internal.py):
  POST /internal/notifications/outbid
  POST /internal/notifications/auction-ended

nginx blocks the public path (docker/nginx/default.conf has
`location /v1.0.0/internal/ { return 404; }`), so calling them through the
normal BASE_URL (port 80) correctly 404s. The backend container's port 8000 is
also published directly on the VM host and reachable over Tailscale, bypassing
nginx -- these routes now additionally require a shared X-Internal-Api-Key
header matching INTERNAL_API_KEY (see backend/app/api/deps.py's
require_internal_key), so that direct-port path is no longer unauthenticated.
The check is a deliberate no-op when INTERNAL_API_KEY isn't configured on the
target environment yet (rollout safety, see the setting's own docstring) --
QA_INTERNAL_API_KEY lets this suite match whatever the target has configured.
"""
import sys
import uuid

from framework import Suite
from client import ApiClient
import auth_helpers as auth
import config

suite = Suite("Internal notification webhooks")

INTERNAL_HEADERS = {"X-Internal-Api-Key": config.INTERNAL_API_KEY} if config.INTERNAL_API_KEY else {}


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
    direct = ApiClient(base_url=config.INTERNAL_DIRECT_BASE_URL)
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
    direct = ApiClient(base_url=config.INTERNAL_DIRECT_BASE_URL)
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
    direct = ApiClient(base_url=config.INTERNAL_DIRECT_BASE_URL)
    resp = direct.post("/internal/notifications/outbid", json={
        "outbid_user_id": "00000000-0000-0000-0000-000000000000",
        "listing_id": "00000000-0000-0000-0000-000000000000",
        "listing_title": "QA Suite Probe",
        "new_amount": 1.0,
    })
    assert resp.status_code == 401, resp.text


@suite.case("via the direct port: missing required fields still returns a clean 422")
def _():
    direct = ApiClient(base_url=config.INTERNAL_DIRECT_BASE_URL)
    resp = direct.post("/internal/notifications/outbid", json={"outbid_user_id": "irrelevant"}, headers=INTERNAL_HEADERS)
    assert resp.status_code == 422, resp.text


@suite.case("via the direct port: a non-UUID outbid_user_id returns a clean 422")
def _():
    # OutbidPayload.outbid_user_id is a uuid.UUID field, so pydantic rejects a non-UUID
    # string before the handler ever runs (this used to reach notification_service and
    # crash with an unhandled 500 -- see git history for the old version of this test).
    direct = ApiClient(base_url=config.INTERNAL_DIRECT_BASE_URL)
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
