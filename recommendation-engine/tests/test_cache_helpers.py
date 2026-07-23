"""Unit tests for the pure JSON serialiser helper in cache_service."""
import json
import uuid

import numpy as np

from app.services.cache_service import _json_default


def test_json_default_numpy_float_to_native():
    out = _json_default(np.float64(1.5))
    assert out == 1.5 and isinstance(out, float)


def test_json_default_numpy_int_to_native():
    out = _json_default(np.int64(3))
    assert out == 3 and isinstance(out, int)


def test_json_default_fallback_to_str():
    u = uuid.uuid4()
    assert _json_default(u) == str(u)


def test_json_default_makes_payload_serialisable():
    payload = {"score": np.float64(0.5), "count": np.int64(2), "id": uuid.uuid4()}
    dumped = json.loads(json.dumps(payload, default=_json_default))
    assert dumped["score"] == 0.5 and dumped["count"] == 2
