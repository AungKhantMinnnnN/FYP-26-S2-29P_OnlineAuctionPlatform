"""Unit tests for ConnectionManager — disconnect (pure) plus the async connect/broadcast
paths, which touch the socket and so use AsyncMock WebSockets (Phase 3).

(allow_message is covered by test_rate_limit.py.)
"""
from unittest.mock import AsyncMock

from app.core.connection_manager import ConnectionManager


def test_disconnect_removes_socket():
    m = ConnectionManager()
    s1, s2 = object(), object()  # sockets are only used as identities/dict keys
    m.active_connections["L"] = [s1, s2]

    m.disconnect(s1, "L")
    assert m.active_connections["L"] == [s2]


def test_disconnect_last_socket_deletes_listing_key():
    m = ConnectionManager()
    s = object()
    m.active_connections["L"] = [s]
    m.disconnect(s, "L")
    assert "L" not in m.active_connections  # empty listing is cleaned up


def test_disconnect_unknown_listing_is_noop():
    m = ConnectionManager()
    m.disconnect(object(), "does-not-exist")  # must not raise


# --- async connect / broadcast (Phase 3) ---

async def test_connect_accepts_and_registers():
    m = ConnectionManager()
    ws = AsyncMock()
    await m.connect(ws, "L")
    ws.accept.assert_awaited_once()
    assert m.active_connections["L"] == [ws]


async def test_connect_appends_second_socket_to_same_listing():
    m = ConnectionManager()
    a, b = AsyncMock(), AsyncMock()
    await m.connect(a, "L")
    await m.connect(b, "L")
    assert m.active_connections["L"] == [a, b]


async def test_broadcast_sends_to_all_sockets():
    m = ConnectionManager()
    a, b = AsyncMock(), AsyncMock()
    m.active_connections["L"] = [a, b]
    await m.broadcast("hi", "L")
    a.send_text.assert_awaited_once_with("hi")
    b.send_text.assert_awaited_once_with("hi")


async def test_broadcast_unknown_listing_is_noop():
    m = ConnectionManager()
    await m.broadcast("hi", "nope")  # must not raise


async def test_broadcast_drops_failed_socket_and_still_delivers():
    m = ConnectionManager()
    good, bad = AsyncMock(), AsyncMock()
    bad.send_text.side_effect = RuntimeError("socket closed")
    m.active_connections["L"] = [bad, good]
    await m.broadcast("hi", "L")
    good.send_text.assert_awaited_once_with("hi")  # a broken peer doesn't block others
    assert m.active_connections.get("L") == [good]  # failed socket was disconnected
