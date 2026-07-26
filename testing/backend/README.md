# Backend QA Suite

Black-box API tests for the FastAPI backend (`backend/app`), plus the test
case document these scripts implement. Everything here talks to a *running*
backend over HTTP — it does not import backend code or touch the database
directly.

See [`TEST_PLAN.md`](TEST_PLAN.md) for the full test case document: what's
covered, the MVC/architecture review, and known findings.

## Setup

```bash
pip install -r testing/backend/requirements.txt
```

Only dependency is `requests`. Everything else (`framework.py`) is stdlib —
deliberately no pytest, so this runs on a bare Python 3.9+ with one pip
install, including directly on a deployment VM if that's more convenient than
running it from a dev machine.

## Running

```bash
cd testing/backend
python run_all.py                 # every module
python run_all.py test_auth.py    # just one
python test_auth.py               # a module is also runnable standalone
```

## Configuration

Everything is env-var driven (see `config.py`), with defaults that match this
project's shared dev VM:

| Variable | Default | Meaning |
|---|---|---|
| `QA_BASE_URL` | `http://100.75.75.48/v1.0.0` | API Gateway base URL |
| `QA_TIMEOUT` | `20` | Per-request timeout (seconds) |
| `QA_ADMIN_EMAIL` / `QA_ADMIN_PASSWORD` | seeded admin | Admin account for admin-only tests |
| `QA_SEEDED_USER_EMAIL` / `_PASSWORD` | `user1@example.com` | Seeded account for read-only cross-user checks |
| `QA_SEEDED_USER_2_EMAIL` / `_PASSWORD` | `user2@example.com` | Second seeded account (same purpose) |
| `QA_RUN_LIVE_AFFECTING_TESTS` | `0` | Set to `1` to opt into tests with a visible effect on real traffic (see below) |

To point at a local stack instead:

```bash
QA_BASE_URL=http://localhost:8000/v1.0.0 python run_all.py
```

## How the suite stays safe to run against a shared environment

Every test that creates data registers its own **brand-new ephemeral user**
(`auth_helpers.register_new_user()` — unique username/email per call) rather
than touching the seeded accounts from `scripts/seed_data.py`. Categories,
prohibited keywords, issue types, feedback types, and CMS pages created by
tests all use unique, timestamped names/slugs, and are hard-deleted at the
end of their test case wherever the API supports that.

**Two exceptions, both called out explicitly in code:**

1. **Marketing hero video** (`test_marketing.py`) — uploading/activating a
   video changes what real visitors see immediately. That round-trip test is
   gated behind `QA_RUN_LIVE_AFFECTING_TESTS=1` (off by default) and, when
   run, restores whatever was active before it and deletes its own upload
   afterward.
2. **Permanent rows with no delete path** — a few resources in this API have
   no delete endpoint at all (an individual `ItemFeedback` row, a CMS page's
   `SiteContent`/version history). Tests that exercise those flows
   (`test_feedback.py`, `test_cms.py`) necessarily leave a handful of small
   rows behind under obviously-QA-tagged names/slugs (`qa_*`, `qa-test-page-*`).
   This is a property of the API surface, not a gap in the tests — see
   TEST_PLAN.md.

Out of scope: the bidding-engine and recommendation-engine microservices
(separate FastAPI apps, not under `backend/app`) are not covered here. That
also means a handful of admin flows that depend on real bid data (restart a
finalized auction, cancel a specific bid, buyer-role feedback, board items
wrapping a won auction) can only be exercised on their error/precondition
paths from this suite — see TEST_PLAN.md for exactly which cases and why.
