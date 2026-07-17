"""Self-check for ConnectionManager.allow_message sliding window. Run: python -m tests.test_rate_limit"""
import time
from app.core import connection_manager as cm


def test_allow_message():
    mgr = cm.ConnectionManager()
    sock = object()  # allow_message only uses the socket as a dict key

    # First RATE_LIMIT_MAX_MESSAGES are allowed, the next is throttled.
    for _ in range(cm.RATE_LIMIT_MAX_MESSAGES):
        assert mgr.allow_message(sock) is True
    assert mgr.allow_message(sock) is False

    # Window slides: after it elapses, the socket is allowed again.
    mgr.message_log[sock].clear()  # simulate window expiry without sleeping the full window
    assert mgr.allow_message(sock) is True

    # Independent sockets have independent budgets.
    other = object()
    for _ in range(cm.RATE_LIMIT_MAX_MESSAGES):
        assert mgr.allow_message(other) is True
    assert mgr.allow_message(other) is False
    assert mgr.allow_message(sock) is True  # sock still has budget

    # Real expiry path with a tiny window.
    cm.RATE_LIMIT_WINDOW_SECONDS = 0.05
    fresh = object()
    assert all(mgr.allow_message(fresh) for _ in range(cm.RATE_LIMIT_MAX_MESSAGES))
    assert mgr.allow_message(fresh) is False
    time.sleep(0.06)
    assert mgr.allow_message(fresh) is True

    print("test_allow_message passed")


if __name__ == "__main__":
    test_allow_message()
