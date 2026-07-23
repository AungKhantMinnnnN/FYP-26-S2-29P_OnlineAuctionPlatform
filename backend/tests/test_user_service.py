"""Unit tests for the pure image-selection helper in user_service."""
from types import SimpleNamespace

from app.services.user_service import _primary_image_url


def _img(url, is_primary):
    return SimpleNamespace(image_url=url, is_primary=is_primary)


def test_primary_image_url_picks_flagged_primary():
    listing = SimpleNamespace(images=[_img("a", False), _img("b", True)])
    assert _primary_image_url(listing) == "b"


def test_primary_image_url_falls_back_to_first():
    listing = SimpleNamespace(images=[_img("a", False), _img("b", False)])
    assert _primary_image_url(listing) == "a"


def test_primary_image_url_empty_is_none():
    assert _primary_image_url(SimpleNamespace(images=[])) is None
