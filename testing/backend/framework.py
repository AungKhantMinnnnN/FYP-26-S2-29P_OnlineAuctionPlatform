"""
A minimal, dependency-free (stdlib-only) test runner for the backend QA suite.

We deliberately don't use pytest here: the only external dependency this suite
needs is `requests`, so it stays runnable on any machine (or CI image, or the
target VM itself) with a bare Python 3.9+ interpreter and one pip install.

Usage in a test_*.py module:

    from framework import Suite

    suite = Suite("Auth")

    @suite.case("register + login happy path")
    def _():
        ...
        assert resp.status_code == 201, resp.text

    if __name__ == "__main__":
        import sys
        sys.exit(0 if suite.run().failed == 0 else 1)

run_all.py discovers every test_*.py module, runs its `suite`, and prints an
aggregate report.
"""
import time
import traceback


class Skip(Exception):
    """Raise inside a test case to mark it skipped (not failed) with a reason."""


class SuiteResult:
    def __init__(self, name):
        self.name = name
        self.passed = 0
        self.failed = 0
        self.skipped = 0
        self.failures = []  # list of (description, message)
        self.cases = []  # list of dicts: description, status, elapsed_ms, message

    @property
    def total(self):
        return self.passed + self.failed + self.skipped

    def merge(self, other):
        self.passed += other.passed
        self.failed += other.failed
        self.skipped += other.skipped
        self.failures.extend(other.failures)
        self.cases.extend(other.cases)


class Suite:
    def __init__(self, name):
        self.name = name
        self._cases = []

    def case(self, description):
        def decorator(func):
            self._cases.append((description, func))
            return func
        return decorator

    def run(self, verbose=True):
        result = SuiteResult(self.name)
        if verbose:
            print(f"\n=== {self.name} ({len(self._cases)} cases) ===")
        for description, func in self._cases:
            start = time.time()
            try:
                func()
                elapsed_ms = (time.time() - start) * 1000
                result.passed += 1
                result.cases.append({
                    "description": description, "status": "PASS",
                    "elapsed_ms": elapsed_ms, "message": None,
                })
                if verbose:
                    print(f"  [PASS] {description}  ({elapsed_ms:.0f}ms)")
            except Skip as exc:
                elapsed_ms = (time.time() - start) * 1000
                result.skipped += 1
                result.cases.append({
                    "description": description, "status": "SKIP",
                    "elapsed_ms": elapsed_ms, "message": str(exc),
                })
                if verbose:
                    print(f"  [SKIP] {description} — {exc}")
            except AssertionError as exc:
                elapsed_ms = (time.time() - start) * 1000
                result.failed += 1
                msg = str(exc) or "assertion failed"
                result.failures.append((description, msg))
                result.cases.append({
                    "description": description, "status": "FAIL",
                    "elapsed_ms": elapsed_ms, "message": msg,
                })
                if verbose:
                    print(f"  [FAIL] {description} — {msg}")
            except Exception as exc:  # noqa: BLE001 - QA runner must never crash mid-suite
                elapsed_ms = (time.time() - start) * 1000
                result.failed += 1
                msg = f"{type(exc).__name__}: {exc}"
                result.failures.append((description, msg))
                result.cases.append({
                    "description": description, "status": "ERROR",
                    "elapsed_ms": elapsed_ms, "message": msg,
                })
                if verbose:
                    print(f"  [ERROR] {description} — {msg}")
                    print("    " + traceback.format_exc().replace("\n", "\n    "))
        return result
