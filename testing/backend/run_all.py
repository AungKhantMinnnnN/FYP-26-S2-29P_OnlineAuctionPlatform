#!/usr/bin/env python3
"""
Runs every test_*.py module in this directory and prints an aggregate report.

Usage:
    python run_all.py                    # run everything against config.BASE_URL
    python run_all.py test_auth.py        # run just one module
    QA_BASE_URL=http://localhost/v1.0.0 python run_all.py

Exit code is 0 iff every test case passed (skips don't count as failures).

Every run also writes a Markdown report to reports/backend_test.<timestamp>.md
(see report.py) — a full case-by-case record of that run, not just the
console output. These are generated artifacts, gitignored, and accumulate
locally; delete old ones freely.
"""
import importlib
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import config  # noqa: E402
from framework import SuiteResult  # noqa: E402
import report  # noqa: E402


def discover_modules(only=None):
    if only:
        return sorted(only)
    return sorted(p.stem for p in HERE.glob("test_*.py"))


def main():
    only = [Path(a).stem for a in sys.argv[1:]] or None
    module_names = discover_modules(only)

    print(f"Backend QA suite")
    print(f"  target : {config.BASE_URL}")
    print(f"  modules: {len(module_names)}")
    print(f"  live-affecting tests: {'ENABLED' if config.RUN_LIVE_AFFECTING_TESTS else 'disabled (default)'}")

    overall = SuiteResult("TOTAL")
    per_module = []
    start = time.time()

    for name in module_names:
        try:
            module = importlib.import_module(name)
        except Exception as exc:  # noqa: BLE001
            print(f"\n=== {name} ===")
            print(f"  [ERROR] failed to import module — {type(exc).__name__}: {exc}")
            overall.failed += 1
            overall.failures.append((f"{name} (import)", str(exc)))
            continue

        suite = getattr(module, "suite", None)
        if suite is None:
            continue

        result = suite.run()
        per_module.append(result)
        overall.merge(result)

    elapsed = time.time() - start

    print("\n" + "=" * 72)
    print("SUMMARY")
    print("=" * 72)
    width = max((len(r.name) for r in per_module), default=10)
    for r in per_module:
        flag = "OK" if r.failed == 0 else "FAILURES"
        print(f"  {r.name.ljust(width)}  pass={r.passed:<3} fail={r.failed:<3} skip={r.skipped:<3}  {flag}")

    print("-" * 72)
    print(f"  {'TOTAL'.ljust(width)}  pass={overall.passed:<3} fail={overall.failed:<3} skip={overall.skipped:<3}"
          f"  ({elapsed:.1f}s)")

    if overall.failures:
        print("\nFAILED CASES")
        for label, message in overall.failures:
            print(f"  - {label}\n      {message}")

    print()
    if overall.failed == 0:
        print(f"ALL PASSED ({overall.passed} passed, {overall.skipped} skipped)")
    else:
        print(f"{overall.failed} FAILURE(S) — see above")

    report_path = report.write_report(
        target=config.BASE_URL,
        live_affecting=config.RUN_LIVE_AFFECTING_TESTS,
        per_module=per_module,
        overall=overall,
        elapsed=elapsed,
        module_names=module_names,
    )
    print(f"\nReport written to {report_path}")

    return 0 if overall.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
