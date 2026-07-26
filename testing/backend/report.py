"""Generates a Markdown report for a completed run_all.py run."""
import datetime
from pathlib import Path

REPORTS_DIR = Path(__file__).resolve().parent / "reports"

_STATUS_ICON = {"PASS": "✅", "FAIL": "❌", "ERROR": "❌", "SKIP": "⏭️"}


def _escape_pipes(text):
    return text.replace("|", "\\|").replace("\n", " ")


def write_report(*, target, live_affecting, per_module, overall, elapsed, module_names):
    """Writes reports/backend_test.<timestamp>.md and returns its path."""
    REPORTS_DIR.mkdir(exist_ok=True)

    now = datetime.datetime.now(datetime.timezone.utc)
    stamp = now.strftime("%Y%m%d_%H%M%S")
    path = REPORTS_DIR / f"backend_test.{stamp}.md"

    overall_icon = "✅" if overall.failed == 0 else "❌"
    overall_verdict = "ALL PASSED" if overall.failed == 0 else f"{overall.failed} FAILURE(S)"

    lines = []
    lines.append("# Backend QA Suite — Run Report")
    lines.append("")
    lines.append("| | |")
    lines.append("|---|---|")
    lines.append(f"| **Generated** | {now.strftime('%Y-%m-%d %H:%M:%S UTC')} |")
    lines.append(f"| **Target** | `{target}` |")
    lines.append(f"| **Modules run** | {len(module_names)} |")
    lines.append(f"| **Live-affecting tests** | {'enabled' if live_affecting else 'disabled (default)'} |")
    lines.append(f"| **Duration** | {elapsed:.1f}s |")
    lines.append(f"| **Result** | {overall_icon} {overall_verdict} "
                 f"(pass={overall.passed}, fail={overall.failed}, skip={overall.skipped}) |")
    lines.append("")

    lines.append("## Summary")
    lines.append("")
    lines.append("| Module | Pass | Fail | Skip | Status |")
    lines.append("|---|---:|---:|---:|:---:|")
    for r in per_module:
        icon = "✅" if r.failed == 0 else "❌"
        lines.append(f"| {r.name} | {r.passed} | {r.failed} | {r.skipped} | {icon} |")
    lines.append(f"| **TOTAL** | **{overall.passed}** | **{overall.failed}** | **{overall.skipped}** | {overall_icon} |")
    lines.append("")

    if overall.failures:
        lines.append("## Failures")
        lines.append("")
        for label, message in overall.failures:
            lines.append(f"### {_escape_pipes(label)}")
            lines.append("")
            lines.append("```")
            lines.append(message)
            lines.append("```")
            lines.append("")

    lines.append("## Full results")
    lines.append("")
    for r in per_module:
        lines.append(f"### {r.name}")
        lines.append("")
        lines.append("| Case | Status | Time (ms) | Notes |")
        lines.append("|---|:---:|---:|---|")
        for c in r.cases:
            icon = _STATUS_ICON.get(c["status"], c["status"])
            note = _escape_pipes(c["message"]) if c["message"] else ""
            lines.append(
                f"| {_escape_pipes(c['description'])} | {icon} | {c['elapsed_ms']:.0f} | {note} |"
            )
        lines.append("")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path
