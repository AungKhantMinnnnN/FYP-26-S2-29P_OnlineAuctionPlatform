"""
Endpoints under test (backend/app/api/v1/controller/testimonials.py):
  GET    /testimonials/          (public: featured only)
  GET    /testimonials/admin     (admin: all)
  GET    /testimonials/me        (user: own)
  POST   /testimonials/{id}/approve (admin)
  DELETE /testimonials/{id}         (admin)
  POST   /testimonials/          (user: create)
"""
import sys
import uuid

from framework import Suite
from client import ApiClient
import auth_helpers as auth

suite = Suite("Testimonials")


@suite.case("get_featured_testimonials is public and returns a list")
def _():
    resp = ApiClient().get("/testimonials/")
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


@suite.case("get_all_testimonials requires admin (401 with no token, 403 for a regular user)")
def _():
    assert ApiClient().get("/testimonials/admin").status_code == 401
    user_client, _, _ = auth.register_new_user()
    assert user_client.get("/testimonials/admin").status_code == 403


@suite.case("get_my_testimonials requires auth (401 without a token)")
def _():
    assert ApiClient().get("/testimonials/me").status_code == 401


@suite.case("create_testimonial requires auth (401 without a token)")
def _():
    resp = ApiClient().post("/testimonials/", json={"content": "Great platform!", "rating": 5})
    assert resp.status_code == 401, resp.text


@suite.case("create_testimonial rejects an out-of-range rating with 422")
def _():
    client, user, _ = auth.register_new_user()
    resp = client.post("/testimonials/", json={"content": "QA test", "rating": 6})
    assert resp.status_code == 422, resp.text


@suite.case("create_testimonial happy path starts unfeatured and is not publicly visible yet")
def _():
    admin = auth.admin_client()
    client, user, _ = auth.register_new_user()
    resp = client.post("/testimonials/", json={"content": "QA suite testimonial", "rating": 5})
    assert resp.status_code == 201, resp.text
    testimonial = resp.json()
    try:
        assert testimonial["is_featured"] is False

        own = client.get("/testimonials/me")
        assert any(t["id"] == testimonial["id"] for t in own.json())

        public = ApiClient().get("/testimonials/")
        assert all(t["id"] != testimonial["id"] for t in public.json()), (
            "unapproved testimonial leaked into the public/featured list"
        )

        admin_view = admin.get("/testimonials/admin")
        assert any(t["id"] == testimonial["id"] for t in admin_view.json())
    finally:
        admin.delete(f"/testimonials/{testimonial['id']}")


@suite.case("approve_testimonial requires admin (403 for a regular user)")
def _():
    client, user, _ = auth.register_new_user()
    testimonial = client.post("/testimonials/", json={"content": "QA test", "rating": 4}).json()
    admin = auth.admin_client()
    try:
        resp = client.post(f"/testimonials/{testimonial['id']}/approve")
        assert resp.status_code == 403, resp.text
    finally:
        admin.delete(f"/testimonials/{testimonial['id']}")


@suite.case("approve_testimonial happy path makes it publicly visible")
def _():
    admin = auth.admin_client()
    client, user, _ = auth.register_new_user()
    testimonial = client.post("/testimonials/", json={"content": "QA test approved", "rating": 5}).json()
    try:
        resp = admin.post(f"/testimonials/{testimonial['id']}/approve")
        assert resp.status_code == 200, resp.text
        assert resp.json()["is_featured"] is True

        public = ApiClient().get("/testimonials/")
        assert any(t["id"] == testimonial["id"] for t in public.json())
    finally:
        admin.delete(f"/testimonials/{testimonial['id']}")


@suite.case("approve_testimonial for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.post(f"/testimonials/{uuid.uuid4()}/approve")
    assert resp.status_code == 404, resp.text


@suite.case("delete_testimonial requires admin (403 for a regular user)")
def _():
    client, user, _ = auth.register_new_user()
    testimonial = client.post("/testimonials/", json={"content": "QA test", "rating": 3}).json()
    admin = auth.admin_client()
    try:
        resp = client.delete(f"/testimonials/{testimonial['id']}")
        assert resp.status_code == 403, resp.text
    finally:
        admin.delete(f"/testimonials/{testimonial['id']}")


@suite.case("delete_testimonial happy path removes it (even after approval)")
def _():
    admin = auth.admin_client()
    client, user, _ = auth.register_new_user()
    testimonial = client.post("/testimonials/", json={"content": "QA test delete-me", "rating": 5}).json()
    admin.post(f"/testimonials/{testimonial['id']}/approve")

    resp = admin.delete(f"/testimonials/{testimonial['id']}")
    assert resp.status_code == 204, resp.text
    public = ApiClient().get("/testimonials/")
    assert all(t["id"] != testimonial["id"] for t in public.json())


@suite.case("delete_testimonial for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.delete(f"/testimonials/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
