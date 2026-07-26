"""
Endpoints under test (backend/app/api/v1/controller/issue_types.py):
  GET    /issue-types/       (public)
  POST   /issue-types/       (admin)
  PATCH  /issue-types/{id}   (admin)
  DELETE /issue-types/{id}   (admin)
"""
import sys
import uuid

from framework import Suite
from client import ApiClient
import auth_helpers as auth
from qa_ids import unique_tag

suite = Suite("Issue types")


def _unique_name():
    return f"QA Issue Type {unique_tag()}"


@suite.case("get_issue_types is public and returns a list")
def _():
    resp = ApiClient().get("/issue-types/")
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


@suite.case("create_issue_type requires admin (401 with no token, 403 for a regular user)")
def _():
    assert ApiClient().post("/issue-types/", json={"name": _unique_name()}).status_code == 401
    user_client, _, _ = auth.register_new_user()
    assert user_client.post("/issue-types/", json={"name": _unique_name()}).status_code == 403


@suite.case("create_issue_type happy path, then visible via the public list")
def _():
    admin = auth.admin_client()
    name = _unique_name()
    resp = admin.post("/issue-types/", json={"name": name})
    assert resp.status_code == 201, resp.text
    issue_type = resp.json()
    try:
        listed = ApiClient().get("/issue-types/")
        assert any(i["id"] == issue_type["id"] for i in listed.json())
    finally:
        admin.delete(f"/issue-types/{issue_type['id']}")


@suite.case("create_issue_type rejects a duplicate name with 409")
def _():
    admin = auth.admin_client()
    name = _unique_name()
    first = admin.post("/issue-types/", json={"name": name}).json()
    try:
        second = admin.post("/issue-types/", json={"name": name})
        assert second.status_code == 409, second.text
    finally:
        admin.delete(f"/issue-types/{first['id']}")


@suite.case("update_issue_type renames it and rejects a clash with another type's name (409)")
def _():
    admin = auth.admin_client()
    name_a, name_b = _unique_name(), _unique_name()
    a = admin.post("/issue-types/", json={"name": name_a}).json()
    b = admin.post("/issue-types/", json={"name": name_b}).json()
    try:
        renamed = admin.patch(f"/issue-types/{a['id']}", json={"name": name_a + " Renamed"})
        assert renamed.status_code == 200, renamed.text
        assert renamed.json()["name"] == name_a + " Renamed"

        clash = admin.patch(f"/issue-types/{b['id']}", json={"name": name_a + " Renamed"})
        assert clash.status_code == 409, clash.text
    finally:
        admin.delete(f"/issue-types/{a['id']}")
        admin.delete(f"/issue-types/{b['id']}")


@suite.case("update_issue_type for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.patch(f"/issue-types/{uuid.uuid4()}", json={"name": "Nope"})
    assert resp.status_code == 404, resp.text


@suite.case("delete_issue_type happy path removes it from the public list")
def _():
    admin = auth.admin_client()
    issue_type = admin.post("/issue-types/", json={"name": _unique_name()}).json()
    resp = admin.delete(f"/issue-types/{issue_type['id']}")
    assert resp.status_code == 204, resp.text
    listed = ApiClient().get("/issue-types/")
    assert all(i["id"] != issue_type["id"] for i in listed.json())


@suite.case("delete_issue_type for an unknown id returns 404")
def _():
    admin = auth.admin_client()
    resp = admin.delete(f"/issue-types/{uuid.uuid4()}")
    assert resp.status_code == 404, resp.text


@suite.case("delete_issue_type requires admin (403 for a regular user)")
def _():
    admin = auth.admin_client()
    issue_type = admin.post("/issue-types/", json={"name": _unique_name()}).json()
    user_client, _, _ = auth.register_new_user()
    try:
        resp = user_client.delete(f"/issue-types/{issue_type['id']}")
        assert resp.status_code == 403, resp.text
    finally:
        admin.delete(f"/issue-types/{issue_type['id']}")


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
