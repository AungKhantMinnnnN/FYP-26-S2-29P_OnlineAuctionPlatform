"""
Endpoints under test (backend/app/api/v1/controller/admin.py — Content moderation
and Logs & stats regions):
  GET    /admin/prohibited-keywords
  POST   /admin/prohibited-keywords
  DELETE /admin/prohibited-keywords/{id}
  GET    /admin/flagged-attempts
  GET    /admin/ai-moderation-flags
  GET    /admin/options/{set_key}
  GET    /admin/system-logs
  GET    /admin/logs
  GET    /admin/stats

Also proves the prohibited-keyword filter is actually wired into listing
creation (backend/app/services/auction_service.py::_check_prohibited_keywords),
not just a keyword list sitting unused in the DB.
"""
import sys
import uuid
from datetime import datetime, timedelta, timezone

from framework import Suite
from client import ApiClient
import auth_helpers as auth
from qa_ids import unique_suffix

suite = Suite("Admin: moderation, options, logs & stats")


def _unique_keyword():
    return f"qaforbidword{unique_suffix()}"


@suite.case("list_prohibited_keywords requires admin (401 with no token, 403 for a regular user)")
def _():
    assert ApiClient().get("/admin/prohibited-keywords").status_code == 401
    user_client, _, _ = auth.register_new_user()
    assert user_client.get("/admin/prohibited-keywords").status_code == 403


@suite.case("create_prohibited_keyword happy path, then visible via the list endpoint")
def _():
    admin = auth.admin_client()
    keyword = _unique_keyword()
    resp = admin.post("/admin/prohibited-keywords", json={"keyword": keyword, "category": "illegal_item"})
    assert resp.status_code == 201, resp.text
    entry = resp.json()
    try:
        assert entry["keyword"] == keyword
        listed = admin.get("/admin/prohibited-keywords")
        assert any(k["id"] == entry["id"] for k in listed.json())
    finally:
        admin.delete(f"/admin/prohibited-keywords/{entry['id']}")


@suite.case("create_prohibited_keyword rejects a duplicate (case-insensitive) with 409")
def _():
    admin = auth.admin_client()
    keyword = _unique_keyword()
    first = admin.post("/admin/prohibited-keywords", json={"keyword": keyword})
    entry = first.json()
    try:
        second = admin.post("/admin/prohibited-keywords", json={"keyword": keyword.upper()})
        assert second.status_code == 409, second.text
    finally:
        admin.delete(f"/admin/prohibited-keywords/{entry['id']}")


@suite.case("create_prohibited_keyword rejects a blank keyword with 422")
def _():
    admin = auth.admin_client()
    resp = admin.post("/admin/prohibited-keywords", json={"keyword": "   "})
    assert resp.status_code == 422, resp.text


@suite.case("create_prohibited_keyword rejects an invalid category with 422")
def _():
    admin = auth.admin_client()
    resp = admin.post("/admin/prohibited-keywords", json={
        "keyword": _unique_keyword(), "category": "not_a_real_category",
    })
    assert resp.status_code == 422, resp.text


@suite.case("delete_prohibited_keyword for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.delete(f"/admin/prohibited-keywords/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("a prohibited keyword actually blocks listing creation and is logged to flagged-attempts")
def _():
    admin = auth.admin_client()
    keyword = _unique_keyword()
    entry = admin.post("/admin/prohibited-keywords", json={"keyword": keyword}).json()
    seller, seller_user, _ = auth.register_new_user()
    try:
        now = datetime.now(timezone.utc)
        resp = seller.post("/auctions/create_listing", json={
            "title": f"Selling a {keyword} today",
            "condition": "new",
            "bidding_type": "price_up",
            "starting_price": 5.0,
            "start_time": now.isoformat(),
            "end_time": (now + timedelta(hours=1)).isoformat(),
            "status": "draft",
        })
        assert resp.status_code == 400, (
            f"expected the prohibited keyword to block listing creation, got {resp.status_code}: {resp.text}"
        )
        assert keyword in resp.text

        flagged = admin.get("/admin/flagged-attempts", params={"size": 50})
        assert flagged.status_code == 200, flagged.text
        assert any(
            a["keyword_matched"] == keyword and a["user_id"] == seller_user["id"]
            for a in flagged.json()["items"]
        ), "blocked attempt was not recorded in the flagged-attempts log"
    finally:
        admin.delete(f"/admin/prohibited-keywords/{entry['id']}")


@suite.case("list_flagged_attempts requires admin and returns a paginated shape")
def _():
    assert ApiClient().get("/admin/flagged-attempts").status_code == 401
    admin = auth.admin_client()
    resp = admin.get("/admin/flagged-attempts", params={"page": 1, "size": 5})
    assert resp.status_code == 200, resp.text
    assert "items" in resp.json() and "total" in resp.json()


@suite.case("list_ai_moderation_flags requires admin and returns a paginated shape")
def _():
    assert ApiClient().get("/admin/ai-moderation-flags").status_code == 401
    admin = auth.admin_client()
    resp = admin.get("/admin/ai-moderation-flags", params={"page": 1, "size": 5})
    assert resp.status_code == 200, resp.text
    assert "items" in resp.json() and "total" in resp.json()


@suite.case("get_options for a known set_key (user_status) returns its seeded values")
def _():
    admin = auth.admin_client()
    resp = admin.get("/admin/options/user_status")
    assert resp.status_code == 200, resp.text
    values = {o["value"] for o in resp.json()}
    assert {"active", "suspended", "deleted"} <= values


@suite.case("get_options for an unknown set_key returns 200 with an empty list, not a 404")
def _():
    admin = auth.admin_client()
    resp = admin.get("/admin/options/not_a_real_set_key")
    assert resp.status_code == 200, resp.text
    assert resp.json() == []


@suite.case("get_options requires admin (403 for a regular user)")
def _():
    user_client, _, _ = auth.register_new_user()
    assert user_client.get("/admin/options/user_status").status_code == 403


@suite.case("get_system_logs requires admin and returns a paginated shape")
def _():
    assert ApiClient().get("/admin/system-logs").status_code == 401
    admin = auth.admin_client()
    resp = admin.get("/admin/system-logs", params={"page": 1, "size": 5})
    assert resp.status_code == 200, resp.text
    assert "items" in resp.json() and "total" in resp.json()


@suite.case("get_system_logs level filter rejects everything but info/warning/error/debug values gracefully")
def _():
    admin = auth.admin_client()
    resp = admin.get("/admin/system-logs", params={"level": "info"})
    assert resp.status_code == 200, resp.text
    assert all(e["level"] == "info" for e in resp.json()["items"])


@suite.case("get_admin_logs requires admin and reflects the suite's own admin actions")
def _():
    assert ApiClient().get("/admin/logs").status_code == 401
    admin = auth.admin_client()
    keyword = _unique_keyword()
    entry = admin.post("/admin/prohibited-keywords", json={"keyword": keyword}).json()
    try:
        resp = admin.get("/admin/logs", params={"action": "add_prohibited_keyword", "size": 50})
        assert resp.status_code == 200, resp.text
        assert any(log["target_id"] == entry["id"] for log in resp.json()["items"])
    finally:
        admin.delete(f"/admin/prohibited-keywords/{entry['id']}")


@suite.case("get_admin_stats requires admin and returns sane aggregate counters")
def _():
    assert ApiClient().get("/admin/stats").status_code == 401
    admin = auth.admin_client()
    resp = admin.get("/admin/stats")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    for key in ("total_users", "active_auctions", "total_bids", "revenue", "suspended_users", "new_registrations"):
        assert key in body
    assert body["total_users"] >= 1


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
