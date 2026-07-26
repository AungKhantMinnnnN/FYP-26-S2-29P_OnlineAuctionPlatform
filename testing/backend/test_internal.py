"""
Endpoints under test (backend/app/api/v1/controller/internal.py):
  POST /internal/notifications/outbid
  POST /internal/notifications/auction-ended

SECURITY FINDING (see TEST_PLAN.md Finding F1): these routes have no auth
dependency at all — no get_current_user, no shared-secret header, nothing —
even though they're clearly meant to be called only by the bidding-engine
microservice.

nginx *does* block the public path (docker/nginx/default.conf has
`location /v1.0.0/internal/ { return 404; }`), so calling them through the
normal BASE_URL (port 80) correctly 404s — that part of the defense works.
But the backend container's port 8000 is ALSO published directly on the VM
host (`docker ps` shows `0.0.0.0:8000->8000/tcp`) and is reachable from
outside the VM over the Tailscale network, bypassing nginx entirely. Hit
that way, both routes accept an unauthenticated, arbitrary request and
happily act on it. This suite proves both halves: the nginx block works,
and it's the only thing in the way.
"""
import sys

from framework import Suite
from client import ApiClient
import auth_helpers as auth
import config

suite = Suite("Internal notification webhooks")


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


@suite.case("via the backend's directly-published port (bypassing nginx): outbid succeeds with NO auth (finding)")
def _():
    _, user, _ = auth.register_new_user()
    direct = ApiClient(base_url=config.INTERNAL_DIRECT_BASE_URL)
    resp = direct.post("/internal/notifications/outbid", json={
        "outbid_user_id": user["id"],
        "listing_id": "00000000-0000-0000-0000-000000000000",
        "listing_title": "QA Suite Probe",
        "new_amount": 42.0,
    })
    assert resp.status_code == 200, resp.text
    assert resp.json().get("ok") is True


@suite.case("via the backend's directly-published port: auction-ended succeeds with NO auth (finding)")
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
    })
    assert resp.status_code == 200, resp.text
    assert resp.json().get("ok") is True


@suite.case("via the direct port: missing required fields still returns a clean 422")
def _():
    direct = ApiClient(base_url=config.INTERNAL_DIRECT_BASE_URL)
    resp = direct.post("/internal/notifications/outbid", json={"outbid_user_id": "irrelevant"})
    assert resp.status_code == 422, resp.text


@suite.case("via the direct port: a non-UUID outbid_user_id crashes with an unhandled 500 (finding)")
def _():
    # OutbidPayload.outbid_user_id is typed `str`, not a UUID field, so pydantic lets a
    # non-UUID string through; notification_service._get_user() then calls uuid.UUID(...)
    # with no try/except, which raises ValueError with no handler registered -> a bare 500.
    # This assertion documents the CURRENT (undesirable) behaviour rather than endorsing it.
    direct = ApiClient(base_url=config.INTERNAL_DIRECT_BASE_URL)
    resp = direct.post("/internal/notifications/outbid", json={
        "outbid_user_id": "this-is-not-a-uuid",
        "listing_id": "00000000-0000-0000-0000-000000000000",
        "listing_title": "QA Suite Probe",
        "new_amount": 1.0,
    })
    assert resp.status_code == 500, (
        f"expected the documented 500 (unhandled ValueError) — got {resp.status_code}. "
        "If this now returns 4xx, the underlying bug has been fixed; update this "
        "assertion (and TEST_PLAN.md) to match the corrected behaviour."
    )


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
