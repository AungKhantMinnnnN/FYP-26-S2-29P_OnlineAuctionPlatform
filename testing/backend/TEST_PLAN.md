# Backend API Test Plan

**Scope:** the API Gateway service at `backend/app` (FastAPI + SQLAlchemy async
+ Postgres). Out of scope: the `bidding-engine` and `recommendation-engine`
microservices, and the frontend — those are separate deployable apps with
their own request/response contracts, not files under `backend/`.

**Target under test:** `http://100.75.75.48/v1.0.0` (the shared dev VM), or
any other backend instance via `QA_BASE_URL` — see [README.md](README.md).

**How this document maps to code:** every section below names the
`test_*.py` module that implements it. Read the module docstring for the
exact endpoint list; read the module body for the exact assertions. This
document is the index and the narrative — the code is the source of truth.

---

## 1. Endpoint coverage matrix

14 controllers, ~105 distinct endpoint operations. Ambiguity note: a few
operations that mutate shared, real-time state visible to actual users
(marketing hero video), or that depend on data no endpoint in this API can
produce (a finalized/ended auction, an accepted bid, a won `AuctionResult`),
are covered on their error/precondition paths only — see §3.

| # | Controller | Base path | Ops | Test module | Auth model |
|---|---|---|---|---|---|
| 1 | `health.py` | `/health` | 1 | `test_health.py` | public |
| 2 | `auth.py` | `/auth` | 8 | `test_auth.py` | public + self |
| 3 | `auctions.py` | `/auctions` | 10 | `test_auctions.py` | public reads, owner writes |
| 4 | `users.py` | `/users/me/*` | 12 | `test_users_profile.py`, `test_users_wallet_subscription.py`, `test_users_watchlist.py` | self only |
| 5 | `admin.py` | `/admin/*` | 24 | `test_admin_users.py`, `test_admin_categories.py`, `test_admin_listings_bids.py`, `test_admin_moderation.py` | admin only |
| 6 | `disputes.py` | `/disputes` | 4 | `test_disputes.py` | mixed |
| 7 | `testimonials.py` | `/testimonials` | 6 | `test_testimonials.py` | mixed |
| 8 | `subscriptions.py` | `/subscription-tiers` | 1 | `test_subscriptions.py` | public |
| 9 | `issue_types.py` | `/issue-types` | 4 | `test_issue_types.py` | public read, admin write |
| 10 | `boards.py` | `/boards` | 10 | `test_boards.py` | public/owner reads, premium writes |
| 11 | `marketing.py` | `/marketing-video*` | 5 | `test_marketing.py` | public read, admin write |
| 12 | `feedback.py` | `/feedback` | 11 | `test_feedback.py` | mixed |
| 13 | `cms.py` | `/cms` | 7 | `test_cms.py` | public read, admin write |
| 14 | `internal.py` | `/internal/notifications` | 2 | `test_internal.py` | **none — see Finding F1** |

Every endpoint listed in a controller's docstring has at least one test case;
most have 3–6 covering the happy path, the primary validation/permission
rules, and the 404/409 edges. Case counts and exact scenarios are in the
module itself, not duplicated here.

---

## 2. Architecture / MVC review

The codebase follows a **Controller → Service → Model** split consistently:

- **Controllers** (`app/api/v1/controller/*.py`) only do HTTP concerns:
  parse the request via Pydantic, resolve auth via `Depends(...)`, call
  exactly one service method, return its result. None of them run a
  SQLAlchemy query directly, with one exception (below).
- **Services** (`app/services/*.py`) own all business logic and are the only
  layer that talks to the ORM (`select`, `db.add`, `db.commit`, ...).
- **Models** (`app/models/auction.py`) are plain SQLAlchemy declarative
  classes — columns and relationships only, no business logic, no query
  methods. Confirmed by grep: zero `db.execute`/`select(...)`/`db.commit`
  references anywhere in `app/models/`.

**Deviation found:** `internal.py`'s two routes call
`await db.commit()` directly in the controller after calling the service,
instead of the service owning its own transaction boundary (every other
service commits internally). Functionally harmless — it's just double-
committing the same session at worst — but inconsistent with the pattern
used everywhere else, and if the service is ever reused from another caller
that doesn't also commit, writes would silently never persist. Not covered
by an automated assertion (it's a code-organization observation, not an
externally observable behavior), but recorded here for whoever picks up
`internal.py` next.

Everything else — schema validation in Pydantic models, permission checks
via layered `Depends(get_current_user / get_admin_user / get_premium_user)`,
consistent `HTTPException` usage for domain errors — is textbook FastAPI
MVC and gave no other findings.

---

## 3. Coverage gaps (by design, not oversight)

Two structural reasons some endpoints can only be tested on part of their
range:

**A. Bids are placed through the bidding-engine microservice**, not this
gateway. This API only *reads* bids (`GET /auctions/get_auction_bids/{id}/bids`)
and lets an admin *cancel* one (`DELETE /admin/bids/{id}`). With no way to
create a real `Bid` row from here, the following can only be tested on their
not-found/precondition-failure paths:
- `DELETE /admin/bids/{id}` (cancel_bid) — happy path needs a real accepted bid.
- `POST /admin/listings/{id}/restart` (restart_auction) — needs a listing
  already in `status=ended`, which nothing in this API can produce (auction
  finalization isn't automated in this codebase yet either — see the comment
  in `admin_service.restart_auction`).
- `POST /feedback/` for a **buyer**-role feedback type — eligibility
  requires a real bid on the listing. (Seller-role feedback *is* fully
  tested — it only requires being the listing's seller.)
- `POST /boards/{id}/items` (add_item) — requires a real `AuctionResult`
  the caller won. Only the 404 "not won by you" path is tested.

**B. No delete endpoint exists** for an individual `ItemFeedback` row or a
CMS `SiteContent`/version-history row. `test_feedback.py`'s and
`test_cms.py`'s happy-path cases therefore leave a small number of rows
behind, tagged with obviously-QA names/slugs (`qa_*`, `qa-test-page-*`).
This is a property of the API, not a test gap — flagged in case the team
wants a cleanup script or a delete endpoint later.

---

## 4. Findings

Issues discovered by writing and actually running these tests against the
shared dev VM. Severity-ordered. Two (F8, F9) were fixed directly in this
pass since they were unambiguous bugs, not judgment calls; the rest are
reported, not silently patched — see the project's commit history for what
(if anything) was done about them afterward.

- **F1 — `POST /internal/notifications/outbid` and `/auction-ended` have no
  authentication, and the only thing stopping public access is nginx, not
  the app.** `app/api/v1/controller/internal.py` has no
  `Depends(get_current_user)`, no shared-secret header, nothing. On the
  target VM, `docker/nginx/default.conf` does block the public path
  (`location /v1.0.0/internal/ { return 404; }`) — confirmed working. But the
  backend container's port is **also published directly on the VM host**
  (`0.0.0.0:8000->8000/tcp` per `docker ps`) and is reachable from outside the
  VM over the Tailscale network, bypassing nginx entirely. Verified live:
  `curl -X POST http://100.75.75.48:8000/v1.0.0/internal/notifications/outbid
  ...` (no auth header) returns `200 {"ok": true}` and creates a real
  `Notification` row for an arbitrary user id, from a machine that is not the
  VM itself. `test_internal.py` proves both halves — the nginx block on port
  80, and the bypass on port 8000. **Recommended fix:** add a shared-secret
  header check in `internal.py` (cheap, works regardless of network
  topology) rather than relying solely on nginx/firewall config to be
  correct forever. Not fixed in this pass — it's a design decision (shared
  secret vs. removing the host port publish vs. both) worth confirming with
  the team before touching a live auth boundary.

- **F2 — `outbid_user_id` (and the other id fields) on `OutbidPayload` /
  `AuctionEndedPayload` are typed `str`, not a UUID type.** A non-UUID string
  passes Pydantic validation, then reaches
  `notification_service._get_user()`'s bare `uuid.UUID(user_id)` call with no
  try/except, producing an **unhandled `ValueError` → bare 500** instead of a
  clean 4xx. `test_internal.py` documents this as the current behavior
  (asserts 500) rather than silently expecting 4xx; the assertion has a
  comment pointing at itself for whoever fixes it.

- **F3 — `RegisterRequest.role` is accepted by the schema but silently
  discarded by `AuthService.register_user`** (always hardcodes
  `role=UserRole.user`). This is *safe* — a client cannot self-elevate to
  admin — but the field's presence in the request schema is misleading (it
  implies the API might honor it). `test_auth.py` asserts the safe behavior
  explicitly. Worth either removing the field or documenting it as
  ignored, but not a bug.

- **F4 — `DELETE /auctions/{id}` (delete_listing) doesn't special-case an
  already-removed listing.** It only blocks `status == "ended"`; calling
  DELETE twice on the same listing returns `204` both times (idempotent by
  accident, not by an explicit check). Not unsafe, but slightly surprising —
  a second delete gives no signal that nothing changed. `test_auctions.py`
  documents this as observed behavior.

- **F5 — Seller-role feedback doesn't verify the reviewee actually
  participated in the listing.** `FeedbackService._check_eligibility` for
  `reviewer_role == "seller"` only checks `listing.seller_id == reviewer_id`;
  it never checks that `reviewee_id` was the winning bidder (or a bidder at
  all) on that listing. A seller can leave "feedback" about any real user id,
  whether or not that user ever interacted with the listing.
  `test_feedback.py`'s seller-feedback case exercises this path but doesn't
  fail on it — it's a plausible intentional trust-the-client design (the
  frontend presumably only offers real winners as choices), but is worth a
  second look given it's not enforced server-side.

- **F6 — The prohibited-keyword fuzzy matcher (`app/core/text_matching.py`)
  false-positives on ordinary domain vocabulary, blocking legitimate listing
  creation right now.** `_fuzzy_threshold()` allows a Damerau-Levenshtein
  distance of 1 for any word within one character of a seeded keyword's
  length. The seeded keyword **"fisting"** is exactly one substitution away
  from **"listing"** (`l`↔`f`, everything else identical) — meaning any
  listing `title`/`description`/`brand` containing the plain English word
  "listing" is rejected with *"the title contains a prohibited term
  ('fisting')"*. On an auction platform, "listing" is about as core a word
  as exists. This isn't theoretical: this test suite's own first draft
  tripped it immediately (titles like "QA Admin Listing ..."), and a second,
  independent instance was found the same way — the seeded keyword
  **"shite"** is one substitution from **"suite"** (`h`↔`u`), so this very
  test suite's own boilerplate text "backend QA suite" was *also* rejected.
  Two unrelated seeded keywords, two unrelated common English words, both
  caught within the same short test-writing session — suggests this isn't a
  rare edge case but a systemic false-positive rate. The code's own comment
  acknowledges this exact tradeoff category ("heron" vs. "heroin") and
  treats the admin-visible Flagged Attempts log as the mitigation (an admin
  notices and retires the offending keyword) — but that only works if
  someone is actively watching that log, and in the meantime real sellers
  silently can't create listings containing "listing." **Not fixed in this
  pass**: this is a moderation-policy tradeoff (fuzzy matching sensitivity),
  not a clear-cut bug, and changing it affects actual content-moderation
  behavior — flagging for the team to decide (e.g., raise the length/distance
  bar, or exclude common English dictionary words from the fuzzy path).
  Test titles/descriptions in this suite were rewritten to avoid both
  trigger words once discovered.

- **F7 — The `2026_07_20_option_sets.sql` migration was never applied to the
  shared VM's database**, even though the code that depends on it
  (`AdminService.get_options`, backing `GET /admin/options/{set_key}`) has
  been deployed for a while. Verified directly:
  `SELECT to_regclass('public.option_sets')` on the VM's Postgres returns
  NULL (table doesn't exist). Every call to `GET /admin/options/{set_key}`
  therefore 500s right now — which silently breaks every admin-UI dropdown
  that sources its options from it (System Logs' level/service filters,
  Audit Logs, the Users role/status filters, and others, per the frontend's
  `adminApi.getOptions` usage). This is a **deployment gap, not a code
  bug** — the migration file is correct and purely additive
  (`CREATE TABLE` + `INSERT ... ON CONFLICT DO NOTHING`), just never run.
  **Not applied in this pass** — deliberately left for the user to run
  themselves (or explicitly ask this suite's author to), consistent with
  this project's established "never mutate the live VM without being asked"
  norm. `test_admin_moderation.py`'s two `get_options` cases will go green
  the moment it's applied; no test or app code changes needed.

- **F8 — FIXED: `create_prohibited_keyword` logged every new keyword's admin
  audit-log entry with `target_id = NULL`.** In
  `AdminService.create_prohibited_keyword`, the code read `entry.id`
  immediately after `db.add(entry)` but before any flush/commit —
  `ProhibitedKeyword.id` has a *client-side* default (`default=uuid.uuid4`),
  which SQLAlchemy only evaluates at flush time, so `entry.id` was still
  `None` at that point and that `None` got baked into the `AdminLog` row
  permanently. Confirmed on the live VM: `SELECT target_id FROM admin_logs
  WHERE action='add_prohibited_keyword'` showed **6 out of 6** real historical
  rows with a blank `target_id` — this has been silently broken since the
  feature shipped. **Fixed** by adding `await db.flush()` right after
  `db.add(entry)`, before the `AdminLog` is constructed (see the diff in
  `backend/app/services/admin_service.py`). The existing 6 historical rows on
  the VM remain `NULL` (this fix only prevents new ones) — a one-off
  backfill isn't possible since the actual keyword id was never recorded.
  This fix is in the repo but **not yet deployed** to the VM (would need a
  backend rebuild/redeploy) — `test_admin_moderation.py`'s `get_admin_logs`
  case will go green once that happens.

None of F1–F5 are exercised as "expected failures" that would make the
overall suite red — F1/F3/F4 are asserted as the actual (intentional or at
least stable) current behavior, and F2 is asserted with an explicit
self-documenting comment so it turns into a visible signal the moment
someone fixes the underlying bug. F7 and F8's corresponding test cases
(`get_options`, `get_admin_logs`) are currently red in the suite and will
turn green once the migration is applied / the fix is deployed — see §7.

---

## 5. Test data & safety

See [README.md](README.md#how-the-suite-stays-safe-to-run-against-a-shared-environment)
for the full policy. Summary: every test that mutates data creates its own
ephemeral user/category/keyword/etc. and cleans up what the API lets it clean
up; the one exception (`test_marketing.py`'s upload/activate round trip) is
opt-in via `QA_RUN_LIVE_AFFECTING_TESTS=1` and restores prior state when run.

---

## 6. Latest run results

Run against the live shared VM (`http://100.75.75.48/v1.0.0`), 2026-07-26:

```
TOTAL   pass=216  fail=3  skip=1   (566s)
```

The 3 failures are `test_admin_moderation.py`'s `get_options` (×2) and
`get_admin_logs` (×1) — both explained in full under Findings F7 and F8
above. They are **expected to fail** until:
1. `scripts/migrations/2026_07_20_option_sets.sql` is applied to the VM (F7), and
2. the backend service is rebuilt/redeployed with the F8 fix already made in
   `backend/app/services/admin_service.py` (part of this pass).

The 1 skip is `test_marketing.py`'s live-affecting upload/activate round
trip, skipped by default per `QA_RUN_LIVE_AFFECTING_TESTS` — see §5.

Every other module — all 18 of them — is fully green.

---

## 7. How to run

```bash
pip install -r testing/backend/requirements.txt
cd testing/backend
python run_all.py
```

See [README.md](README.md) for environment variables and targeting a
different backend instance.
