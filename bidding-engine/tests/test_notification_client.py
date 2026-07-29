"""Tests for notification_client — payload construction and fire-and-forget error swallowing."""
from unittest.mock import AsyncMock

from app.services import notification_client as mod


async def test_notify_outbid_posts_expected_payload(monkeypatch):
    post = AsyncMock()
    monkeypatch.setattr(mod, "_post", post)
    await mod.notify_outbid("user-1", "listing-9", "Rare Coin", 42.5)
    url, payload = post.await_args.args
    assert url.endswith("/outbid")
    assert payload == {
        "outbid_user_id": "user-1", "listing_id": "listing-9",
        "listing_title": "Rare Coin", "new_amount": 42.5,
    }


async def test_notify_auction_ended_posts_expected_payload(monkeypatch):
    post = AsyncMock()
    monkeypatch.setattr(mod, "_post", post)
    await mod.notify_auction_ended("l-1", "Coin", "seller-1", None, 0.0, "no_bids")
    url, payload = post.await_args.args
    assert url.endswith("/auction-ended")
    assert payload["winner_id"] is None and payload["outcome"] == "no_bids"


async def test_post_swallows_errors(monkeypatch):
    # Fire-and-forget: a transport failure must never propagate to the caller.
    def boom(*a, **k):
        raise RuntimeError("connection refused")
    monkeypatch.setattr(mod.httpx, "AsyncClient", boom)
    await mod._post("http://x/outbid", {})  # must not raise
