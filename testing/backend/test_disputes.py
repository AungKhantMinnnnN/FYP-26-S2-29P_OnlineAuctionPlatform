"""
Endpoints under test (backend/app/api/v1/controller/disputes.py):
  GET  /disputes/          (admin: all)
  GET  /disputes/me        (user: own)
  POST /disputes/{id}/respond (admin)
  POST /disputes/          (user: create)
"""
import sys
import uuid

from framework import Suite, Skip
from client import ApiClient
import auth_helpers as auth

suite = Suite("Disputes")


def _first_issue_type_id():
    resp = ApiClient().get("/issue-types/")
    assert resp.status_code == 200, resp.text
    items = resp.json()
    if not items:
        raise Skip("no issue types are seeded — cannot exercise dispute creation")
    return items[0]["id"]


@suite.case("list_all_disputes requires admin (401 with no token, 403 for a regular user)")
def _():
    assert ApiClient().get("/disputes/").status_code == 401
    user_client, _, _ = auth.register_new_user()
    assert user_client.get("/disputes/").status_code == 403


@suite.case("get_my_disputes requires auth (401 without a token)")
def _():
    assert ApiClient().get("/disputes/me").status_code == 401


@suite.case("create_dispute requires auth (401 without a token)")
def _():
    issue_type_id = _first_issue_type_id()
    resp = ApiClient().post("/disputes/", json={
        "issue_type_id": issue_type_id, "subject": "x", "category": "other", "description": "x",
    })
    assert resp.status_code == 401, resp.text


@suite.case("create_dispute with a non-existent listing_id returns 404")
def _():
    issue_type_id = _first_issue_type_id()
    client, user, _ = auth.register_new_user()
    resp = client.post("/disputes/", json={
        "listing_id": str(uuid.uuid4()),
        "issue_type_id": issue_type_id,
        "subject": "Bad listing reference",
        "category": "other",
        "description": "QA suite negative test",
    })
    assert resp.status_code == 404, resp.text


@suite.case("create_dispute happy path, then it's visible via get_my_disputes but scoped to the reporter")
def _():
    issue_type_id = _first_issue_type_id()
    reporter, reporter_user, _ = auth.register_new_user()
    other, _, _ = auth.register_new_user()

    resp = reporter.post("/disputes/", json={
        "issue_type_id": issue_type_id,
        "subject": "QA suite dispute",
        "category": "other",
        "description": "Created by the automated backend QA suite.",
    })
    assert resp.status_code == 201, resp.text
    dispute = resp.json()
    assert dispute["reporter_id"] == reporter_user["id"]
    assert dispute["status"] == "open"

    own = reporter.get("/disputes/me")
    assert any(d["id"] == dispute["id"] for d in own.json())

    others = other.get("/disputes/me")
    assert all(d["id"] != dispute["id"] for d in others.json()), "dispute leaked to a different user"


@suite.case("respond_to_dispute requires admin (403 for a regular user)")
def _():
    user_client, _, _ = auth.register_new_user()
    resp = user_client.post(f"/disputes/{uuid.uuid4()}/respond", json={"status": "resolved"})
    assert resp.status_code == 403, resp.text


@suite.case("respond_to_dispute for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.post(f"/disputes/{uuid.uuid4()}/respond", json={"status": "resolved"})
    assert resp.status_code == 404, resp.text


@suite.case("respond_to_dispute happy path updates status and resolution note, visible to the reporter")
def _():
    issue_type_id = _first_issue_type_id()
    admin = auth.admin_client()
    reporter, _, _ = auth.register_new_user()
    dispute = reporter.post("/disputes/", json={
        "issue_type_id": issue_type_id,
        "subject": "QA suite dispute for resolution",
        "category": "other",
        "description": "Created by the automated backend QA suite.",
    }).json()

    resp = admin.post(f"/disputes/{dispute['id']}/respond", json={
        "status": "resolved", "resolution_note": "Resolved by the QA suite.",
    })
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "resolved"
    assert resp.json()["resolution_note"] == "Resolved by the QA suite."

    reread = reporter.get("/disputes/me")
    match = next(d for d in reread.json() if d["id"] == dispute["id"])
    assert match["status"] == "resolved"


@suite.case("list_all_disputes status filter only returns matching disputes")
def _():
    admin = auth.admin_client()
    resp = admin.get("/disputes/", params={"status": "open"})
    assert resp.status_code == 200, resp.text
    assert all(d["status"] == "open" for d in resp.json())


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
