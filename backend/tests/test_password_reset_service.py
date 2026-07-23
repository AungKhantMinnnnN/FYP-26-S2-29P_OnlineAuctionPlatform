"""Mocked-boundary tests for PasswordResetService (DB + outbound email faked)."""
import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.services import password_reset_service as mod
from app.services.password_reset_service import PasswordResetService
from tests.fakedb import make_db, exec_result

UTC = datetime.timezone.utc


def _now():
    return datetime.datetime.now(UTC)


async def test_request_reset_noop_for_unknown_email(monkeypatch):
    db = make_db()
    send = AsyncMock()
    monkeypatch.setattr(mod.EmailService, "send_password_reset", send)
    db.execute.side_effect = [exec_result(first=None)]  # no such user
    await PasswordResetService.request_reset(db, "ghost@x.com")
    db.commit.assert_not_awaited()
    send.assert_not_awaited()  # must not leak account existence


async def test_request_reset_happy(monkeypatch):
    db = make_db()
    send = AsyncMock()
    monkeypatch.setattr(mod.EmailService, "send_password_reset", send)
    user = SimpleNamespace(id="u1", email="a@x.com", profile=None)
    db.execute.side_effect = [exec_result(first=user)]
    await PasswordResetService.request_reset(db, "a@x.com")
    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    send.assert_awaited_once()


async def test_confirm_400_when_token_missing():
    db = make_db()
    db.execute.side_effect = [exec_result(first=None)]
    with pytest.raises(HTTPException) as e:
        await PasswordResetService.confirm_reset(db, "tok", "new")
    assert e.value.status_code == 400


async def test_confirm_400_when_already_used():
    db = make_db()
    row = SimpleNamespace(used_at=_now(), expires_at=_now() + datetime.timedelta(hours=1), user_id="u1")
    db.execute.side_effect = [exec_result(first=row)]
    with pytest.raises(HTTPException) as e:
        await PasswordResetService.confirm_reset(db, "tok", "new")
    assert e.value.status_code == 400


async def test_confirm_400_when_expired():
    db = make_db()
    row = SimpleNamespace(used_at=None, expires_at=_now() - datetime.timedelta(hours=1), user_id="u1")
    db.execute.side_effect = [exec_result(first=row)]
    with pytest.raises(HTTPException) as e:
        await PasswordResetService.confirm_reset(db, "tok", "new")
    assert e.value.status_code == 400


async def test_confirm_happy_sets_new_hash():
    db = make_db()
    row = SimpleNamespace(used_at=None, expires_at=_now() + datetime.timedelta(hours=1), user_id="u1")
    user = SimpleNamespace(password_hash="old", updated_at=None)
    db.execute.side_effect = [exec_result(first=row), exec_result(first=user)]
    await PasswordResetService.confirm_reset(db, "tok", "new-pw")
    assert user.password_hash != "old" and row.used_at is not None
    db.commit.assert_awaited_once()
