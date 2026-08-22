---
title: Unit Test Strategy
type: technical-reference
tags:
  - fyp
  - auction-platform
  - testing
  - pytest
  - unit-tests
status: current
created: 2026-08-21
---

# Unit Test Strategy

> [!info] Document purpose
> Test strategy for the three Python services (`backend`, `bidding-engine`,
> `recommendation-engine`). The frontend has no test framework configured and is out of scope.

CI gates every PR on `ruff`, `mypy`, and `pytest` per service — see
[Running & CI](#running--ci).

## Philosophy

Tests are added in **phases**, cheapest and most valuable first. The ordering is deliberate:
a test that needs no live infrastructure never flakes on a missing container and runs in
milliseconds, so we exhaust that category before reaching for mocks.

| Phase | Scope | Infra needed | Deps |
|-------|-------|--------------|------|
| **1 — Pure functions** | Stateless logic: hashing, parsing, scoring, payload building, in-memory bookkeeping | None | `pytest`, `pytest-asyncio` |
| **2 — Mocked boundaries** | Service methods that talk to Postgres, MinIO, or send email | None (boundaries faked) | stdlib `unittest.mock` |
| **3 — Async boundaries** | Redis lock/cache paths, WebSocket connect/broadcast, cross-service HTTP | None (boundaries faked) | stdlib `unittest.mock` |

**No unit test requires a live Postgres, Redis, or MinIO** — that is the core constraint:
CI runs the whole suite with no service containers. Phase 3 was expected to need
`fakeredis`/`respx`, but it turned out mocking each boundary with stdlib `AsyncMock` proves
our code's contract (correct lock key, cache-miss-on-error, broadcast fan-out) — Redis's own
mutual-exclusion and httpx's transport are not ours to unit-test. **No new dependency was
added for any phase.**

## Shared scaffolding (all three services)

Each service carries an identical, self-contained test setup:

- **`pytest.ini`** — `testpaths=tests`, `asyncio_mode=auto` (async tests need no
  `@pytest.mark.asyncio`), `pythonpath=.`.
- **`conftest.py`** — sets dummy env vars via `os.environ.setdefault` **before** any
  `app.core.config` import, so `Settings` validates without a real `.env`. `setdefault`
  means a real CI/shell env var always wins.
- **`requirements-dev.txt`** — `pytest==8.3.4` + `pytest-asyncio==0.25.2`. Nothing else;
  Phase 2 uses only the standard library.

## backend

Two phases, **all 20 services covered**, 107 tests.

### Phase 1 — pure functions

| Module | What's pinned |
|--------|---------------|
| `core.security` | SHA-256→bcrypt pre-hash (bypasses bcrypt's 72-byte limit), JWT create/exp. Locks the "DO NOT alter" auth flow. |
| `core.text_matching` | normalize/tokenize/de-leet, Damerau-Levenshtein, fuzzy threshold, obfuscation matching |
| `services.user_service._primary_image_url` | primary / first-fallback / empty |
| `services.board_service` | `_listing_snapshot` guards + image fallback; `_make_item`/`_make_summary`/`_make_board` mappers (incl. sort-order) |
| `services.admin_service` | `_to_summary` (enum `.value`), `_to_profile` (None guard, dob format), `get_system_logs` (regex parse, level/day/service filters, pagination — filesystem via `tmp_path`) |
| `services.email_service._build_client` | no-op guard when SMTP creds are absent |
| `services.notification_service._listing_url` | URL builder |

### Phase 2 — mocked boundaries

Every remaining service method is `async def foo(db: AsyncSession, …)` — thin CRUD with no
pure surface. They are tested against a **faked `AsyncSession`**, focusing on guard branches
(404 / 403 / 409 / 400), idempotency, and existence-hiding no-ops — **not** query plumbing.

Covered: `auth`, `auction`, `cms`, `dispute`, `feedback`, `issue_type`, `testimonial`,
`email_verification`, `password_reset`, `interaction`, `subscription`, `marketing`.

Test helpers live in **`tests/fakedb.py`** (stdlib `unittest.mock` only — no `pytest-mock`):

```python
from tests.fakedb import make_db, exec_result, ctx_session

db = make_db()                                   # async execute/scalar/commit/refresh/…
db.execute.side_effect = [exec_result(first=row)]  # queue per-call results in order
db.scalar.side_effect  = [None]                    # e.g. "no existing row"
```

- `make_db()` — an `AsyncSession` fake (async `execute`/`scalar`/`commit`/`refresh`/`delete`/
  `flush`/`rollback`, sync `add`).
- `exec_result(first=…, all_=…, rows=…)` — a fake `execute()` result; `first`/`all_` feed
  `.scalars().first()/.all()`, `rows` feeds row-level `.all()`.
- `ctx_session(db)` — async-context-manager fake for services that open their own
  `AsyncSessionLocal()` (e.g. `interaction_service`).

Two boundary details worth knowing:

- **MinIO** — `app.core.storage` builds a `StorageService()` singleton at import time, which
  calls `bucket_exists`/`make_bucket`. `conftest.py` monkeypatches `minio.Minio` so importing
  storage-coupled services (`auction`, `marketing`) never hits the network during collection.
- **Outbound email** — mocked per-test with `monkeypatch.setattr(EmailService, "send_…", AsyncMock())`.

`tests/` is a package (`tests/__init__.py`) so `from tests.fakedb import …` resolves.

## bidding-engine

Three phases, 29 tests.

### Phase 1 — pure functions

| Target | What's pinned |
|--------|---------------|
| `ConnectionManager.disconnect` | in-memory bookkeeping, listing-key cleanup, unknown-listing no-op |
| `ConnectionManager.allow_message` | sliding-window rate limit (also runnable standalone via `__main__`) |
| `settlement_service._build_broadcast` | auction-ended payload shape (sold / no-bids) |

### Phase 2 — mocked boundaries

Uses the same `tests/fakedb.py` pattern as backend (`make_db`/`exec_result`).

| Target | What's pinned |
|--------|---------------|
| `BiddingService.process_bid_message` | pre-lock validation: wrong action type, non-positive amount, malformed JSON (all return before touching Redis) |
| `BiddingService._execute_bid` | the financial-integrity guards — invalid IDs, listing missing/inactive/ended, seller self-bid, below-minimum (public `+1`), user missing/suspended, insufficient balance, free-tier hourly cap; **plus the happy path**: outbid refund, new-bid hold, anti-snipe extension, post-commit outbid notification |
| `notification_client` | outbid / auction-ended payload construction and fire-and-forget error swallowing |

`_execute_bid` never touches Redis (only `process_bid_message` does), so it runs fully against
a faked `AsyncSession`. One wrinkle: `Bid.placed_at` is a Python `default=lambda` applied at
flush — since flush is faked, the happy-path test sets it in a `flush` side-effect so the
broadcast payload can serialise. Outbound HTTP (`httpx`) and `notification_client` are mocked.

### Phase 3 — async boundaries

| Target | What's pinned |
|--------|---------------|
| `ConnectionManager.connect` | `accept()` the socket, register under the listing, append multiple sockets — uses `AsyncMock` WebSockets |
| `ConnectionManager.broadcast` | fan-out to all sockets, unknown-listing no-op, and **a failed socket is dropped without blocking delivery to the rest** |
| `BiddingService.process_bid_message` (lock path) | acquires `redis_client.lock("lock:bid:{id}", timeout=5.0, blocking_timeout=3.0)`, runs the bid *inside* the lock, forwards the amount, returns the result — lock mocked as an async CM |

## recommendation-engine

Two phases, 50 tests.

### Phase 1 — pure functions

All targets are stateless (DataFrame in → Series/DataFrame out), so they run with no DB,
Redis, or network.

| Target | What's pinned |
|--------|---------------|
| `services.trending` | pure scoring functions (24 cases) |
| `services.location.parse_location` | address parsing, non-string/blank inputs |
| `services.recommendation_service` | `_cast_listings_df` / `_cast_interactions_df` UUID/None coercion |
| `services.cache_service._json_default` | numpy → native JSON coercion |

### Phase 3 — Redis cache boundary

`redis_client` mocked with `AsyncMock`. The contract under test is the fallback promise:
**Redis being down (or the cache disabled) is a cache miss, never a crash.**

| Target | What's pinned |
|--------|---------------|
| `cache_service.set_df` | skip when disabled / empty, write with TTL, swallow Redis errors |
| `cache_service.get_df` | None when disabled, None on miss, DataFrame round-trip on hit, None on error |
| `cache_service.set_json` | serialise numpy scalars via `_json_default`, respect the disable flag |
| `cache_service.get_json` | None when disabled, parsed value on hit, None on error |

## Integration tests (real Postgres + Redis)

Unit tests mock every boundary, which means they prove *branch logic given a fake DB* — they
cannot prove the query is correct, the schema matches, or that concurrent bids actually
serialize. A thin integration layer covers exactly those gaps, and nothing more. It lives in
each service's `integration/` directory (**outside `tests/`**, so the fast unit job never
runs it) and requires live infra.

| Test | Service | What it proves (that mocks can't) |
|------|---------|-----------------------------------|
| Concurrent equal bids → one winner | bidding-engine | The **Redis lock actually serializes** simultaneous bids: two identical bids fired together produce exactly one accepted bid and one "below minimum" rejection — never a double-hold |
| Outbid refund conserves money | bidding-engine | **Escrow integrity** across a real commit: after an outbid, wallets + outstanding holds equal the starting total — no money created or destroyed |
| Model ↔ DB schema drift | all three | `SELECT … LIMIT 0` over every mapped column against the **real schema** — catches the duplicated-model drift (CLAUDE.md) that faked sessions are blind to |

Design:

- **Isolation.** The bidding write-tests run against an isolated `auction_integration_test`
  database cloned from the dev schema via `pg_dump` (the dev DB is never mutated); tables are
  truncated between tests. The drift tests are read-only `SELECT … LIMIT 0`, so they point
  straight at the live dev DB. The Redis lock uses real Redis — keys are per-listing UUIDs
  that expire in seconds.
- **Local vs CI.** Locally the harness self-provisions the test DB via `docker exec` against
  the running Postgres container. In CI, `INTEGRATION_DATABASE_URL` points at the job's
  ephemeral database and provisioning is skipped. Credentials come from `.env` locally
  (the unit `conftest` seeds *dummy* env vars, so `.env` must win) and from job env vars in CI.
- **Loop hygiene.** Each test gets its own event loop; the module-global `redis_client` is
  disconnected after every test so it rebinds instead of raising "Event loop is closed".
- **No new dependencies** — `asyncpg` and `pytest-asyncio` are already present.

> The drift test earned its keep on first run: it found that the **local dev DB was ~4
> migrations behind** (missing `marketing_videos`, `prohibited_keywords`,
> `flagged_listing_attempts`, `ai_moderation_flags`, and the `site_content` versioning
> columns). That is a real, silent environment bug no mocked unit test could surface.

## Running & CI

Fast unit suite, per service (each has its own venv and deps):

```bash
cd <service>
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/ -v --tb=short          # unit only — never touches live infra
```

Integration suite (needs Postgres + Redis running; locally, `docker compose up postgres redis`):

```bash
cd <service> && pytest integration/ -v --tb=short
```

CI (`.github/workflows/ci.yml`) has two test jobs:

- **`lint-and-test`** runs `ruff`, `mypy`, and the three unit suites (`pytest tests/`). No
  service containers needed for the tests themselves.
- **`integration-tests`** spins up Postgres + Redis service containers, loads the schema
  (`init.sql` + the two `IF NOT EXISTS` keyword/AI migrations), and runs `pytest integration/`
  for each service. Kept separate so a slow, infra-bound job never gates the fast feedback loop.

## Conventions

- **One behavior per test**, named `test_<thing>_<condition>`.
- **Test doubles, not fixtures.** Prefer `types.SimpleNamespace` / tiny classes for ORM-like
  objects (pattern set by `_Listing` in `test_settlement_broadcast.py`). No fixture files, no
  factory libraries.
- **Assert behavior, not implementation.** Phase-2 tests check status codes, side-effect calls
  (`db.commit.assert_awaited_once()`), and returned shapes — never the exact query built.
- **Standard library first.** Phase 2 deliberately uses `unittest.mock`; `pytest-mock`,
  `fakeredis`, and `respx` are added only when Phase 3 needs them.

## What's deliberately not covered

- **Real infra behavior**: that Redis actually serializes concurrent lock holders, that a
  socket really delivers bytes, that httpx negotiates TLS. We test that *our code uses these
  correctly* (right lock key, error swallowed, fan-out attempted); the libraries' own
  guarantees are theirs to test.
- **ML training / APScheduler side effects** in the recommendation-engine — scheduling and
  model fitting are integration concerns, not unit-testable in isolation.
- **Full end-to-end / HTTP-route tests** (FastAPI routers, JWT dependency, 401 redirects) and
  MinIO object round-trips — the integration layer covers the money/concurrency/schema risks
  deliberately, not the whole surface. Route and E2E coverage would be a further layer if the
  project needs it.
