"""Endpoints under test: GET /health, GET /docs, GET /openapi.json (no controller — app.main)."""
import sys

from framework import Suite
from client import ApiClient
import config

suite = Suite("Health & App Bootstrap")


@suite.case("GET /health returns ok + configured API version")
def _():
    client = ApiClient()
    resp = client.get("/health")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body.get("status") == "ok", body
    assert "version" in body, body


@suite.case("GET /docs (Swagger UI) is served")
def _():
    client = ApiClient()
    resp = client.get("/docs")
    assert resp.status_code == 200, resp.status_code
    assert "swagger" in resp.text.lower() or "openapi" in resp.text.lower()


@suite.case("GET /openapi.json is valid and lists known routes")
def _():
    client = ApiClient()
    resp = client.get("/openapi.json")
    assert resp.status_code == 200, resp.status_code
    spec = resp.json()
    assert "paths" in spec
    assert any(p.endswith("/auctions/") for p in spec["paths"]), "auctions route missing from OpenAPI spec"
    assert any(p.endswith("/admin/users") for p in spec["paths"]), "admin/users route missing from OpenAPI spec"


@suite.case("unknown route returns 404, not a 500")
def _():
    client = ApiClient()
    resp = client.get("/this-route-does-not-exist")
    assert resp.status_code == 404, resp.status_code


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
