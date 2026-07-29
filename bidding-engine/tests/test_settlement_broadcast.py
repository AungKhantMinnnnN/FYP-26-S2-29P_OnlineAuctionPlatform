"""Unit tests for _build_broadcast — pure payload construction for auction-ended events."""
from app.services.settlement_service import _build_broadcast


class _Listing:
    def __init__(self, id):
        self.id = id


def test_build_broadcast_sold():
    p = _build_broadcast(_Listing("lid-1"), "winner-9", 42.5, "sold")
    assert p["type"] == "auction_ended"
    assert p["listing_id"] == "lid-1"      # id is stringified
    assert p["outcome"] == "sold"
    assert p["winner_id"] == "winner-9"
    assert p["final_price"] == 42.5
    assert "ended_at" in p


def test_build_broadcast_no_winner():
    p = _build_broadcast(_Listing("lid-2"), None, 0.0, "no_bids")
    assert p["winner_id"] is None
    assert p["outcome"] == "no_bids"
