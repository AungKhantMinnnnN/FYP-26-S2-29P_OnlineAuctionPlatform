"""Unit tests for the pure user->dict mappers in admin_service."""
import datetime
import uuid
from types import SimpleNamespace

from app.services.admin_service import _to_summary, _to_profile

NOW = datetime.datetime(2026, 1, 1, 12, 0, 0)


def test_to_summary_maps_enum_values():
    uid = uuid.uuid4()
    user = SimpleNamespace(
        id=uid, username="alice", email="a@x.com",
        role=SimpleNamespace(value="admin"), status=SimpleNamespace(value="active"),
        created_at=NOW,
    )
    assert _to_summary(user) == {
        "id": uid, "username": "alice", "email": "a@x.com",
        "role": "admin", "status": "active", "created_at": NOW,
    }


def test_to_profile_none_when_missing():
    assert _to_profile(SimpleNamespace(profile=None)) is None


def test_to_profile_formats_dob():
    profile = SimpleNamespace(
        full_name="Alice A", phone="123", address="1 St",
        dob=datetime.date(1990, 5, 4), bio="hi",
    )
    out = _to_profile(SimpleNamespace(profile=profile))
    assert out["dob"] == "1990-05-04"
    assert out["full_name"] == "Alice A"


def test_to_profile_none_dob_stays_none():
    profile = SimpleNamespace(full_name="A", phone=None, address=None, dob=None, bio=None)
    assert _to_profile(SimpleNamespace(profile=profile))["dob"] is None
