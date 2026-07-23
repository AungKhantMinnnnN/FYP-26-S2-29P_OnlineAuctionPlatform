"""Mocked-boundary tests for EmailVerificationService (DB + outbound email both faked)."""
import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.services import email_verification_service as mod
from app.services.email_verification_service import EmailVerificationService
from tests.fakedb import make_db, exec_result

UTC = datetime.timezone.utc


def _now():
    return datetime.datetime.now(UTC)


async def test_send_verification_noop_when_verified():
    db = make_db()
    await EmailVerificationService.send_verification(db, SimpleNamespace(email_verified=True))
    db.commit.assert_not_awaited()


async def test_send_verification_happy(monkeypatch):
    db = make_db()
    send = AsyncMock()
    monkeypatch.setattr(mod.EmailService, "send_email_verification", send)
    user = SimpleNamespace(email_verified=False, id="u1", email="a@x.com", profile=None)
    await EmailVerificationService.send_verification(db, user)
    db.add.assert_called_once()
    db.commit.assert_awaited_once()
    send.assert_awaited_once()


async def test_confirm_400_when_token_missing():
    db = make_db()
    db.execute.side_effect = [exec_result(first=None)]
    with pytest.raises(HTTPException) as e:
        await EmailVerificationService.confirm_verification(db, "tok")
    assert e.value.status_code == 400


async def test_confirm_noop_when_already_verified():
    db = make_db()
    row = SimpleNamespace(verified_at=_now(), expires_at=_now() + datetime.timedelta(hours=1), user_id="u1")
    db.execute.side_effect = [exec_result(first=row)]
    await EmailVerificationService.confirm_verification(db, "tok")  # returns, no raise
    db.commit.assert_not_awaited()


async def test_confirm_400_when_expired():
    db = make_db()
    row = SimpleNamespace(verified_at=None, expires_at=_now() - datetime.timedelta(hours=1), user_id="u1")
    db.execute.side_effect = [exec_result(first=row)]
    with pytest.raises(HTTPException) as e:
        await EmailVerificationService.confirm_verification(db, "tok")
    assert e.value.status_code == 400


async def test_confirm_happy_marks_verified():
    db = make_db()
    row = SimpleNamespace(verified_at=None, expires_at=_now() + datetime.timedelta(hours=1), user_id="u1")
    user = SimpleNamespace(email_verified=False, updated_at=None)
    db.execute.side_effect = [exec_result(first=row), exec_result(first=user)]
    await EmailVerificationService.confirm_verification(db, "tok")
    assert user.email_verified is True and row.verified_at is not None
    db.commit.assert_awaited_once()
