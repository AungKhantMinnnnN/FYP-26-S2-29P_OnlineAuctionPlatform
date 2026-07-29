"""Unit test for the pure URL builder in notification_service."""
from app.core.config import settings
from app.services.notification_service import _listing_url


def test_listing_url_uses_frontend_base():
    assert _listing_url("abc-123") == f"{settings.FRONTEND_URL}/auction/abc-123"
