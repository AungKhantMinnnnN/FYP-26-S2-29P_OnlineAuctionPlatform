"""Unit tests for app.core.security — password hashing and JWT creation.

Pins the deliberate SHA-256 pre-hash flow that bypasses bcrypt's 72-byte limit
(see CLAUDE.md — DO NOT alter this flow).
"""
import datetime

import jwt

from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.config import settings


def test_password_hash_roundtrip():
    h = get_password_hash("s3cret-pw")
    assert verify_password("s3cret-pw", h) is True
    assert verify_password("wrong-pw", h) is False


def test_password_hash_is_salted_unique():
    # bcrypt salts each hash, so the same password hashes differently every time.
    assert get_password_hash("same") != get_password_hash("same")


def test_long_password_over_72_bytes_roundtrips():
    pw = "A" * 100  # >72 bytes; the SHA-256 pre-hash is what makes this verifiable
    assert verify_password(pw, get_password_hash(pw)) is True


def test_distinct_long_passwords_do_not_cross_verify():
    # Share the first 72 bytes but differ after — SHA-256 of the full password differs,
    # so they must not verify against each other (the pre-hash defeats naive truncation).
    a, b = "A" * 80 + "-one", "A" * 80 + "-two"
    assert verify_password(b, get_password_hash(a)) is False


def test_create_access_token_encodes_subject_and_exp():
    token = create_access_token("user-123")
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "user-123"
    assert "exp" in payload


def test_create_access_token_custom_expiry():
    before = datetime.datetime.now(datetime.timezone.utc)
    token = create_access_token("x", datetime.timedelta(minutes=5))
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
    exp = datetime.datetime.fromtimestamp(payload["exp"], datetime.timezone.utc)
    assert 250 < (exp - before).total_seconds() < 320  # ~5 minutes
