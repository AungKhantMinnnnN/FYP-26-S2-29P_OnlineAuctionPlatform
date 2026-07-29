"""Mocked-boundary tests for MarketingService (storage URL calls faked)."""
from types import SimpleNamespace

from app.services import marketing_service as mod
from app.services.marketing_service import MarketingService, _to_item
from tests.fakedb import make_db


def test_to_item_maps_and_resolves_url(monkeypatch):
    monkeypatch.setattr(mod.storage_service, "get_video_url", lambda k: f"url/{k}")
    video = SimpleNamespace(
        id="v1", s3_key="marketing/x.mp4", original_filename="ad.mp4",
        is_active=True, created_at=None,
    )
    out = _to_item(video)
    assert out["url"] == "url/marketing/x.mp4"
    assert out["original_filename"] == "ad.mp4" and out["is_active"] is True


async def test_get_active_url_none_when_no_active(monkeypatch):
    db = make_db()
    db.scalar.side_effect = [None]
    assert await MarketingService.get_active_url(db) is None


async def test_get_active_url_resolves_active(monkeypatch):
    monkeypatch.setattr(mod.storage_service, "get_video_url", lambda k: f"url/{k}")
    db = make_db()
    db.scalar.side_effect = [SimpleNamespace(s3_key="marketing/a.mp4")]
    assert await MarketingService.get_active_url(db) == "url/marketing/a.mp4"
