"""Unit tests for the pure model->schema mappers in board_service.

All take ORM-like objects and return Pydantic response models with no I/O.
"""
import datetime
import uuid
from types import SimpleNamespace

from app.services.board_service import (
    _listing_snapshot, _make_item, _make_summary, _make_board,
)

NOW = datetime.datetime(2026, 1, 1, 12, 0, 0)


def _img(url, is_primary):
    return SimpleNamespace(image_url=url, is_primary=is_primary)


def _listing(images):
    return SimpleNamespace(id=uuid.uuid4(), title="Rare Coin", images=images)


def _result(listing, final_price=42.5, ended_at=NOW):
    return SimpleNamespace(listing=listing, final_price=final_price, ended_at=ended_at)


def _item(result, sort_order=0):
    return SimpleNamespace(
        id=uuid.uuid4(), board_id=uuid.uuid4(), auction_result_id=uuid.uuid4(),
        note="note", sort_order=sort_order, added_at=NOW, result=result,
    )


# --- _listing_snapshot: two None guards + primary-or-first image fallback ---

def test_listing_snapshot_none_when_no_result():
    assert _listing_snapshot(SimpleNamespace(result=None)) is None


def test_listing_snapshot_none_when_no_listing():
    assert _listing_snapshot(SimpleNamespace(result=_result(None))) is None


def test_listing_snapshot_picks_primary_image():
    snap = _listing_snapshot(_item(_result(_listing([_img("a", False), _img("b", True)]))))
    assert snap.image_url == "b"
    assert snap.title == "Rare Coin"
    assert snap.final_price == 42.5
    assert snap.ended_at == NOW


def test_listing_snapshot_falls_back_to_first_image():
    snap = _listing_snapshot(_item(_result(_listing([_img("a", False)]))))
    assert snap.image_url == "a"


def test_listing_snapshot_no_images_gives_none_url():
    snap = _listing_snapshot(_item(_result(_listing([]))))
    assert snap.image_url is None


# --- passthrough mappers ---

def test_make_item_maps_fields_and_nests_snapshot():
    item = _item(_result(_listing([_img("a", True)])), sort_order=3)
    out = _make_item(item)
    assert out.id == item.id
    assert out.board_id == item.board_id
    assert out.auction_result_id == item.auction_result_id
    assert out.note == "note"
    assert out.sort_order == 3
    assert out.listing.image_url == "a"


def test_make_item_no_result_gives_none_listing():
    out = _make_item(_item(None))
    assert out.listing is None


def _board(items):
    return SimpleNamespace(
        id=uuid.uuid4(), user_id=uuid.uuid4(), name="My Board",
        description="desc", is_public=True, items=items,
        created_at=NOW, updated_at=NOW,
    )


def test_make_summary_counts_items():
    board = _board([_item(None), _item(None)])
    out = _make_summary(board)
    assert out.item_count == 2
    assert out.name == "My Board"
    assert out.is_public is True


def test_make_board_sorts_items_by_sort_order():
    items = [_item(None, sort_order=2), _item(None, sort_order=0), _item(None, sort_order=1)]
    out = _make_board(_board(items))
    assert [i.sort_order for i in out.items] == [0, 1, 2]
