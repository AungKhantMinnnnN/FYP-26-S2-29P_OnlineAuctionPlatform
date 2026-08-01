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

Note on test data footprint: there is no delete endpoint for an individual
ItemFeedback row anywhere in this API, so the one case that actually submits
feedback (to prove the eligibility + submission flow works end-to-end)
permanently leaves one feedback row (and its now-in-use FeedbackType, which
gets deactivated rather than deleted) in the target database. This is
inherent to the API surface, not a gap in the test — see TEST_PLAN.md.
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


@suite.case("a seller-role feedback type: eligible for the seller, submit succeeds, duplicate is rejected")
def _():
    admin = auth.admin_client()
    ft = admin.post("/feedback/types", json={"name": _unique_name(), "reviewer_role": "seller"}).json()

    seller, seller_user, _ = auth.register_new_user()
    buyer, buyer_user, _ = auth.register_new_user()

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

        submitted = seller.post("/feedback/", json={
            "listing_id": listing["id"],
            "reviewee_id": buyer_user["id"],
            "feedback_type_id": ft["id"],
            "rating": 5,
            "comment": "Submitted by the automated backend QA suite.",
        })
        assert submitted.status_code == 201, submitted.text
        feedback = submitted.json()

        dup = seller.post("/feedback/", json={
            "listing_id": listing["id"], "reviewee_id": buyer_user["id"],
            "feedback_type_id": ft["id"], "rating": 4,
        })
        assert dup.status_code == 409, dup.text

        mine = seller.get("/feedback/me/submitted")
        assert any(f["id"] == feedback["id"] for f in mine.json())
    finally:
        seller.delete(f"/auctions/{listing['id']}")
        # A real ItemFeedback row now references this type, so hard-delete would 409
        # (no delete endpoint for ItemFeedback, per TESTING.md) -- deactivate instead so
        # it at least drops out of the public/active feedback-types list.
        admin.patch(f"/feedback/types/{ft['id']}", json={"is_active": False})


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
