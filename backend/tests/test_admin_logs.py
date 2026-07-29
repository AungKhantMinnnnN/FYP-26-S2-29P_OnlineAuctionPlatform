"""Unit tests for AdminService.get_system_logs — log parsing, filtering, pagination.

Filesystem-only (no DB): points ALL_LOGS_DIR at a tmp dir with a crafted log file
that matches the app.core.logger format.
"""
import datetime

from app.core.config import settings
from app.services.admin_service import AdminService

LINES = [
    "2026-01-02 10:00:00 | INFO | app.x | f | started ok",
    "2026-01-02 11:00:00 | ERROR | app.x | f | boom failed",
    "2026-01-01 09:00:00 | WARNING | app.x | f | old warning",
    "garbage line that should be ignored",
]


def _setup_logs(tmp_path, monkeypatch):
    svc_dir = tmp_path / "backend"
    svc_dir.mkdir()
    (svc_dir / "APIGateWay.log").write_text("\n".join(LINES) + "\n", encoding="utf-8")
    monkeypatch.setattr(settings, "ALL_LOGS_DIR", str(tmp_path))


def test_parses_valid_lines_and_skips_garbage(tmp_path, monkeypatch):
    _setup_logs(tmp_path, monkeypatch)
    out = AdminService.get_system_logs(page=1, size=10)
    assert out["total"] == 3  # garbage line dropped
    assert out["items"][0]["message"] == "boom failed"  # newest first
    assert out["items"][0]["service"] == "backend"
    assert out["items"][0]["timestamp"].tzinfo == datetime.timezone.utc  # UTC tagged


def test_level_filter(tmp_path, monkeypatch):
    _setup_logs(tmp_path, monkeypatch)
    out = AdminService.get_system_logs(page=1, size=10, level="error")
    assert out["total"] == 1 and out["items"][0]["level"] == "error"


def test_day_filter(tmp_path, monkeypatch):
    _setup_logs(tmp_path, monkeypatch)
    out = AdminService.get_system_logs(page=1, size=10, day=datetime.date(2026, 1, 1))
    assert out["total"] == 1 and out["items"][0]["message"] == "old warning"


def test_service_filter_excludes_others(tmp_path, monkeypatch):
    _setup_logs(tmp_path, monkeypatch)
    out = AdminService.get_system_logs(page=1, size=10, service="bidding-engine")
    assert out["total"] == 0  # only a backend file exists


def test_pagination_math(tmp_path, monkeypatch):
    _setup_logs(tmp_path, monkeypatch)
    out = AdminService.get_system_logs(page=2, size=2)
    assert out["total"] == 3 and out["pages"] == 2
    assert len(out["items"]) == 1  # last page has the remainder
