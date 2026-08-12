"""
Endpoints under test (backend/app/api/v1/controller/feedback.py):
  GET    /feedback/types            (public, active only)
  GET    /feedback/types/all        (admin, incl. inactive)
  POST   /feedback/types            (admin)
  PATCH  /feedback/types/{id}       (admin)
  DELETE /feedback/types/{id}       (admin)
  GET    /feedback/public
  GET    /feedback/listing/{listing_id}
  GET    /feedback/user/{user_id}
  GET    /feedback/me/eligibility/{listing_id}
  GET    /feedback/me/submitted
  POST   /feedback/

Note on scope: a real ItemFeedback submission requires the reviewee to have
actually bid on the listing (seller-role) or the reviewer to have (buyer-role)
-- see feedback_service.py's submit(). Bids are placed through the separate
bidding-engine microservice (websocket-driven), which this HTTP-only suite
does not cover (same limitation documented in test_admin_listings_bids.py),
so no case here exercises a real POST /feedback/ 201 end-to-end. Every
feedback type this file creates is hard-deleted in its `finally` block --
none end up referenced by a real ItemFeedback row, so no permanent footprint.
"""
import sys
import uuid
from datetime import datetime, timedelta, timezone

from framework import Suite
from client import ApiClient
import auth_helpers as auth
from qa_ids import unique_tag

suite = Suite("Feedback")


def _unique_name():
    return f"QA Feedback Type {unique_tag()}"


@suite.case("list_feedback_types (public) only returns active types")
def _():
    resp = ApiClient().get("/feedback/types")
    assert resp.status_code == 200, resp.text
    assert all(t["is_active"] for t in resp.json())


@suite.case("list_all_feedback_types requires admin (403 for a regular user)")
def _():
    assert ApiClient().get("/feedback/types/all").status_code == 401
    user_client, _, _ = auth.register_new_user()
    assert user_client.get("/feedback/types/all").status_code == 403


@suite.case("create/update/delete a feedback type with zero usage round-trips cleanly")
def _():
    admin = auth.admin_client()
    name = _unique_name()
    created = admin.post("/feedback/types", json={"name": name, "reviewer_role": "buyer"})
    assert created.status_code == 201, created.text
    ft = created.json()

    dup = admin.post("/feedback/types", json={"name": name, "reviewer_role": "seller"})
    assert dup.status_code == 409, dup.text

    updated = admin.patch(f"/feedback/types/{ft['id']}", json={"is_active": False})
    assert updated.status_code == 200, updated.text
    assert updated.json()["is_active"] is False

    deleted = admin.delete(f"/feedback/types/{ft['id']}")
    assert deleted.status_code == 204, deleted.text


@suite.case("create_feedback_type rejects an invalid reviewer_role with 422")
def _():
    admin = auth.admin_client()
    resp = admin.post("/feedback/types", json={"name": _unique_name(), "reviewer_role": "moderator"})
    assert resp.status_code == 422, resp.text


@suite.case("get_public_feedback and get_listing_feedback / get_user_feedback are all public")
def _():
    assert ApiClient().get("/feedback/public").status_code == 200
    assert ApiClient().get(f"/feedback/listing/{uuid.uuid4()}").status_code == 200
    assert ApiClient().get(f"/feedback/user/{uuid.uuid4()}").status_code == 200


@suite.case("check_eligibility for an unknown listing returns 404")
def _():
    client, _, _ = auth.register_new_user()
    resp = client.get(f"/feedback/me/eligibility/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("check_eligibility / submitted / submit all require auth (401 without a token)")
def _():
    assert ApiClient().get(f"/feedback/me/eligibility/{uuid.uuid4()}").status_code == 401
    assert ApiClient().get("/feedback/me/submitted").status_code == 401
    assert ApiClient().post("/feedback/", json={
        "listing_id": str(uuid.uuid4()), "reviewee_id": str(uuid.uuid4()),
        "feedback_type_id": str(uuid.uuid4()), "rating": 5,
    }).status_code == 401


@suite.case("submit_feedback with an unknown feedback_type_id returns 404")
def _():
    client, _, _ = auth.register_new_user()
    resp = client.post("/feedback/", json={
        "listing_id": str(uuid.uuid4()),
        "reviewee_id": str(uuid.uuid4()),
        "feedback_type_id": str(uuid.uuid4()),
        "rating": 5,
    })
    assert resp.status_code == 404, resp.text


@suite.case("a seller-role feedback type: seller is eligible, but submitting about a user who never bid is rejected")
def _():
    admin = auth.admin_client()
    ft = admin.post("/feedback/types", json={"name": _unique_name(), "reviewer_role": "seller"}).json()

    seller, seller_user, _ = auth.register_new_user()
    stranger, stranger_user, _ = auth.register_new_user()

    now = datetime.now(timezone.utc)
    listing = seller.post("/auctions/create_listing", json={
        # Avoids the word "listing" — see TEST_PLAN.md Finding F6.
        "title": f"QA feedback item {unique_tag()}",
        "condition": "new",
        "bidding_type": "price_up",
        "starting_price": 20.0,
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(hours=1)).isoformat(),
        "status": "active",
    }).json()

    try:
        eligibility = seller.get(f"/feedback/me/eligibility/{listing['id']}")
        assert eligibility.status_code == 200, eligibility.text
        assert ft["id"] in eligibility.json()["eligible_type_ids"]
        assert eligibility.json()["seller_id"] == seller_user["id"]

        # Eligibility only checks that the reviewer IS the seller -- it says nothing
        # about the reviewee. `stranger` never bid on this listing (bids are placed
        # through the websocket-only bidding-engine, out of scope here -- see the
        # module docstring), so submission must still be rejected rather than letting
        # the seller rate an uninvolved user.
        rejected = seller.post("/feedback/", json={
            "listing_id": listing["id"],
            "reviewee_id": stranger_user["id"],
            "feedback_type_id": ft["id"],
            "rating": 5,
            "comment": "Submitted by the automated backend QA suite.",
        })
        assert rejected.status_code == 400, rejected.text
    finally:
        seller.delete(f"/auctions/{listing['id']}")
        admin.delete(f"/feedback/types/{ft['id']}")


@suite.case("submit_feedback for a buyer-role type without ever bidding is rejected with 403")
def _():
    admin = auth.admin_client()
    ft = admin.post("/feedback/types", json={"name": _unique_name(), "reviewer_role": "buyer"}).json()

    seller, seller_user, _ = auth.register_new_user()
    stranger, _, _ = auth.register_new_user()

    now = datetime.now(timezone.utc)
    listing = seller.post("/auctions/create_listing", json={
        "title": f"QA feedback ineligible {unique_tag()}",
        "condition": "new",
        "bidding_type": "price_up",
        "starting_price": 20.0,
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(hours=1)).isoformat(),
        "status": "active",
    }).json()
    try:
        resp = stranger.post("/feedback/", json={
            "listing_id": listing["id"],
            "reviewee_id": seller_user["id"],
            "feedback_type_id": ft["id"],
            "rating": 1,
        })
        assert resp.status_code == 403, resp.text

        eligibility = stranger.get(f"/feedback/me/eligibility/{listing['id']}")
        assert ft["id"] not in eligibility.json()["eligible_type_ids"]
    finally:
        seller.delete(f"/auctions/{listing['id']}")
        admin.delete(f"/feedback/types/{ft['id']}")


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
