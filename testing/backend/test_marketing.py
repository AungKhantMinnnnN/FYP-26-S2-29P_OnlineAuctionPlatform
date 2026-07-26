"""
Endpoints under test (backend/app/api/v1/controller/marketing.py):
  GET    /marketing-video          (public)
  POST   /marketing-video          (admin, upload — LIVE-AFFECTING)
  GET    /marketing-videos         (admin, list)
  POST   /marketing-videos/{id}/activate (admin — LIVE-AFFECTING)
  DELETE /marketing-videos/{id}    (admin)

Uploading or activating a video changes what every real visitor sees as the
homepage hero video, so the round-trip tests here are gated behind
config.RUN_LIVE_AFFECTING_TESTS (off by default). When enabled, the suite
restores whatever was active beforehand and deletes its own test upload
afterwards, so a run leaves no net change — but the swap is still visible to
live traffic for the few seconds the test takes, hence opt-in rather than
always-on. The content-type validation case is always safe to run: it 400s
before any upload happens.
"""
import sys

from framework import Suite, Skip
from client import ApiClient
import auth_helpers as auth
import config

suite = Suite("Marketing hero video")

TINY_WEBM = bytes.fromhex(
    "1a45dfa3010000000000001f4286810142f7810142f2810142f3810142828441"
)  # not a fully valid webm, but a plausible byte stream for a content-type-accepted upload


@suite.case("get_marketing_video is public and responds 200 with a url or a clean 404")
def _():
    resp = ApiClient().get("/marketing-video")
    assert resp.status_code in (200, 404), resp.text
    if resp.status_code == 200:
        assert "url" in resp.json()


@suite.case("upload_marketing_video rejects a disallowed content type with 400 (safe: never reaches storage)")
def _():
    admin = auth.admin_client()
    resp = admin.post(
        "/marketing-video",
        files={"file": ("not-a-video.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 400, resp.text


@suite.case("upload_marketing_video requires admin (401 with no token, 403 for a regular user)")
def _():
    assert ApiClient().post(
        "/marketing-video", files={"file": ("x.mp4", b"x", "video/mp4")}
    ).status_code == 401
    user_client, _, _ = auth.register_new_user()
    assert user_client.post(
        "/marketing-video", files={"file": ("x.mp4", b"x", "video/mp4")}
    ).status_code == 403


@suite.case("list_marketing_videos requires admin and returns a shape with 'items'")
def _():
    assert ApiClient().get("/marketing-videos").status_code == 401
    admin = auth.admin_client()
    resp = admin.get("/marketing-videos")
    assert resp.status_code == 200, resp.text
    assert "items" in resp.json()


@suite.case("activate_marketing_video for an unknown id returns 404 (safe: fails before touching active state)")
def _():
    import uuid
    admin = auth.admin_client()
    resp = admin.post(f"/marketing-videos/{uuid.uuid4()}/activate")
    assert resp.status_code == 404, resp.text


@suite.case("delete_marketing_video refuses to delete the currently-active video (400)")
def _():
    admin = auth.admin_client()
    videos = admin.get("/marketing-videos").json()["items"]
    active = next((v for v in videos if v["is_active"]), None)
    if active is None:
        raise Skip("no active marketing video to test against")
    resp = admin.delete(f"/marketing-videos/{active['id']}")
    assert resp.status_code == 400, resp.text


@suite.case("upload + activate + cleanup round trip restores the original active video (opt-in, live-affecting)")
def _():
    if not config.RUN_LIVE_AFFECTING_TESTS:
        raise Skip("set QA_RUN_LIVE_AFFECTING_TESTS=1 to run this — it briefly swaps the live homepage video")

    admin = auth.admin_client()
    before = admin.get("/marketing-videos").json()["items"]
    previously_active = next((v for v in before if v["is_active"]), None)

    uploaded = None
    try:
        upload_resp = admin.post(
            "/marketing-video",
            files={"file": ("qa_suite_test.webm", TINY_WEBM, "video/webm")},
        )
        assert upload_resp.status_code == 204, upload_resp.text

        after = admin.get("/marketing-videos").json()["items"]
        uploaded = next((v for v in after if v["original_filename"] == "qa_suite_test.webm"), None)
        assert uploaded is not None, "uploaded video not found in the library listing"
        assert uploaded["is_active"] is True, "a freshly-uploaded video should become active immediately"

        current = ApiClient().get("/marketing-video")
        assert current.status_code == 200
        assert current.json()["url"] == uploaded["url"]
    finally:
        if previously_active is not None:
            restore = admin.post(f"/marketing-videos/{previously_active['id']}/activate")
            assert restore.status_code == 200, restore.text
        if uploaded is not None:
            cleanup = admin.delete(f"/marketing-videos/{uploaded['id']}")
            assert cleanup.status_code == 204, cleanup.text


if __name__ == "__main__":
    result = suite.run()
    sys.exit(0 if result.failed == 0 else 1)
