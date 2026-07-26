"""
Helpers for getting authenticated ApiClient instances.

Tests that need to create/mutate/delete data always register a brand-new
ephemeral user via register_new_user() rather than touching the seeded
accounts from scripts/seed_data.py — this keeps the suite safe to run
repeatedly against a shared environment without accumulating damage to
data other people (or other QA passes) rely on.
"""
import random
import string
import time

import config
from client import ApiClient

EPHEMERAL_PASSWORD = "QaTest!2026"


def _unique_suffix():
    # time component keeps values sortable/greppable in the DB; random component
    # avoids collisions when tests run back-to-back within the same second.
    return f"{int(time.time())}{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"


def random_registration_payload(prefix="qa"):
    suffix = _unique_suffix()
    return {
        "full_name": "QA Test User",
        "username": f"{prefix}_{suffix}",
        "email": f"{prefix}_{suffix}@example.com",
        "password": EPHEMERAL_PASSWORD,
        "phone": "+65 8123 4567",
        "address": "1 Test Street",
        "city": "Singapore",
        "country": "Singapore",
        "bio": "Ephemeral account created by the automated backend QA suite. Safe to ignore/delete.",
    }


def login(username_or_email, password):
    client = ApiClient()
    resp = client.post("/auth/login", json={
        "username_or_email": username_or_email,
        "password": password,
    })
    assert resp.status_code == 200, (
        f"login failed for {username_or_email}: {resp.status_code} {resp.text}"
    )
    return resp.json()["access_token"]


def register_new_user(prefix="qa"):
    """Registers a brand-new ephemeral user and returns (client, user_body, payload)."""
    client = ApiClient()
    payload = random_registration_payload(prefix)
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 201, f"register failed: {resp.status_code} {resp.text}"
    user = resp.json()
    token = login(payload["username"], payload["password"])
    return ApiClient(token=token), user, payload


def admin_client():
    token = login(config.ADMIN_EMAIL, config.ADMIN_PASSWORD)
    return ApiClient(token=token)


def seeded_user_client():
    token = login(config.SEEDED_USER_EMAIL, config.SEEDED_USER_PASSWORD)
    return ApiClient(token=token)


def seeded_user_2_client():
    token = login(config.SEEDED_USER_2_EMAIL, config.SEEDED_USER_2_PASSWORD)
    return ApiClient(token=token)
