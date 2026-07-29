"""Unit tests for the pure no-op-guard logic in email_service._build_client.

Only the None branches are exercised — building a real FastMail client validates the
template folder and is an I/O concern for the mocked-boundary phase.
"""
from app.core.config import settings
from app.services.email_service import _build_client


def test_build_client_none_without_username(monkeypatch):
    monkeypatch.setattr(settings, "MAIL_USERNAME", "")
    monkeypatch.setattr(settings, "MAIL_PASSWORD", "pw")
    assert _build_client() is None


def test_build_client_none_without_password(monkeypatch):
    monkeypatch.setattr(settings, "MAIL_USERNAME", "user@x.com")
    monkeypatch.setattr(settings, "MAIL_PASSWORD", "")
    assert _build_client() is None
