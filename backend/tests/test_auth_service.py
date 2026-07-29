"""Mocked-boundary tests for AuthService — register/login/change-password guards."""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core.security import get_password_hash
from app.models.auction import UserStatus
from app.schemas.auth import Token
from app.services.auth_service import AuthService
from tests.fakedb import make_db, exec_result


def _register_req():
    return SimpleNamespace(
        username="alice", email="a@x.com", password="pw", full_name="Alice",
        phone=None, address=None, city=None, country=None, bio=None,
    )


async def test_register_rejects_existing_user():
    db = make_db()
    db.execute.side_effect = [exec_result(first=object())]  # existing user
    with pytest.raises(HTTPException) as e:
        await AuthService.register_user(db, _register_req())
    assert e.value.status_code == 400


async def test_register_happy_path():
    db = make_db()
    db.execute.side_effect = [exec_result(first=None)]
    user = await AuthService.register_user(db, _register_req())
    assert user.username == "alice"
    assert db.add.call_count == 2  # user + profile
    db.flush.assert_awaited_once()
    db.commit.assert_awaited_once()


async def test_authenticate_401_on_wrong_password():
    db = make_db()
    user = SimpleNamespace(id="u1", password_hash=get_password_hash("right"), status=UserStatus.active)
    db.execute.side_effect = [exec_result(first=user)]
    with pytest.raises(HTTPException) as e:
        await AuthService.authenticate_user(db, SimpleNamespace(username_or_email="alice", password="wrong"))
    assert e.value.status_code == 401


async def test_authenticate_400_when_suspended():
    db = make_db()
    user = SimpleNamespace(id="u1", password_hash=get_password_hash("pw"), status=UserStatus.suspended)
    db.execute.side_effect = [exec_result(first=user)]
    with pytest.raises(HTTPException) as e:
        await AuthService.authenticate_user(db, SimpleNamespace(username_or_email="alice", password="pw"))
    assert e.value.status_code == 400


async def test_authenticate_happy_returns_token():
    db = make_db()
    user = SimpleNamespace(id="u1", password_hash=get_password_hash("pw"), status=UserStatus.active)
    db.execute.side_effect = [exec_result(first=user)]
    token = await AuthService.authenticate_user(db, SimpleNamespace(username_or_email="alice", password="pw"))
    assert isinstance(token, Token) and token.access_token


async def test_change_password_400_on_wrong_current():
    db = make_db()
    user = SimpleNamespace(password_hash=get_password_hash("current"), updated_at=None)
    with pytest.raises(HTTPException) as e:
        await AuthService.change_password(
            db, user, SimpleNamespace(current_password="nope", new_password="new"),
        )
    assert e.value.status_code == 400


async def test_change_password_happy_updates_hash():
    db = make_db()
    user = SimpleNamespace(password_hash=get_password_hash("current"), updated_at=None)
    old = user.password_hash
    await AuthService.change_password(
        db, user, SimpleNamespace(current_password="current", new_password="new"),
    )
    assert user.password_hash != old
    db.commit.assert_awaited_once()
