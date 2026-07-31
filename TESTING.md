# Testing

Two independent, code-based test suites. Neither depends on the other.

| | Backend QA suite | Frontend test suite |
|---|---|---|
| **What** | Black-box HTTP tests against a *running* backend | Unit/component tests, jsdom + mocked HTTP |
| **Location** | [`testing/backend/`](testing/backend/) | test files colocated as `*.test.ts(x)` under [`frontend/src/`](frontend/src/); suite entry point/config in [`testing/frontend/`](testing/frontend/) |
| **Needs a live backend?** | Yes — talks to a real API over HTTP | No — every HTTP client is mocked |
| **Writes real test data?** | Yes, ephemerally (see below) | No, never |
| **Run it** | `testing/backend/run_tests.sh` / `.ps1` | `testing/frontend/run_tests.sh` / `.ps1` |
| **Output** | `testing/backend/reports/backend_test.<timestamp>.md` | `testing/frontend/reports/frontend_test.<timestamp>.md` |

Both report files are Markdown, gitignored, and share the same shape: a
metadata table, a per-file/per-module pass/fail summary, and a full
case-by-case table with status/timing/failure notes. Old reports are
generated artifacts — delete them freely, they regenerate on every run.

## Backend QA suite

Full detail lives in [`testing/backend/README.md`](testing/backend/README.md)
and [`testing/backend/TEST_PLAN.md`](testing/backend/TEST_PLAN.md). Summary:

```bash
cd testing/backend
./run_tests.sh                 # this machine has Python 3.9+
```
```powershell
cd testing/backend
.\run_tests.ps1                # same, PowerShell
```

If this machine doesn't have Python but can SSH to one that does (the shared
dev VM, by default), use `./run_remote.sh` instead — see that file's header
comment for the full option list (`REMOTE_HOST`, `KEEP_REMOTE_DIR`, etc.).

**Test data and cleanup.** Every test that creates data registers its own
brand-new ephemeral user (`qa_`-prefixed, via `POST /auth/register`) rather
than touching seeded accounts, and categories/keywords/CMS pages the tests
create are torn down at the end of their own test case. The `qa_` accounts
themselves are the exception: the API has no hard-delete for a user (only an
admin *soft*-delete, which is unusable for bulk cleanup — it emails the user
and writes an audit row), so those rows only actually leave the database when
`run_remote.sh` runs [`cleanup_qa_data.sql`](testing/backend/cleanup_qa_data.sql)
against it afterward (default on, `QA_AUTO_CLEANUP=0` to skip). **This only
happens from `run_remote.sh`** — it's the one entry point with SSH/Docker
access to the database host. A plain `run_tests.sh`/`.ps1` run still creates
real ephemeral rows on whatever backend `QA_BASE_URL` points at (the shared
VM by default); nothing deletes them automatically in that path. Prefer
`run_remote.sh` for anything beyond a quick spot-check, or run
`cleanup_qa_data.sql` by hand afterward if you used the local scripts against
a shared target. A couple of resource types (a single `ItemFeedback` row, a
CMS page's version history) have no delete endpoint at all regardless of
path — those leave a handful of obviously-tagged (`qa_*`) rows behind by
design; see `TEST_PLAN.md`.

## Frontend test suite

Vitest + React Testing Library, running in jsdom. There is no live-backend
counterpart to this suite yet (see "What isn't covered" below) — everything
that would otherwise hit the network is swapped for a mock before the test
runs, so **no test ever writes anything anywhere**: no real HTTP request
leaves the process, no database is touched, nothing to clean up. This is a
structural property, not a discipline the tests have to maintain — there's
nothing analogous to the backend suite's `qa_`-account problem to reproduce
here.

```bash
cd testing/frontend
./run_tests.sh                       # everything
./run_tests.sh src/api/authApi.test.ts   # just one file
```
```powershell
cd testing/frontend
.\run_tests.ps1
```

The scripts `cd` into `frontend/` themselves to install deps and run Vitest,
then write the report back to `testing/frontend/reports/`. (`vitest.config.ts`
stays inside `frontend/` — it has to live alongside `frontend/node_modules`
for its own plugin imports to resolve; only the run scripts, report
generator, and output live under `testing/frontend/`.)

Or run Vitest directly without the report step: `npm test` (single run) /
`npm run test:watch` (watch mode) / `npm run test:coverage` (with coverage)
from inside `frontend/`. `ci.yml`'s `frontend-lint-and-build` job also runs
`npm test` on every push/PR to `development`/`main`.

### What's covered

50 files, 354 cases:

- **All 12 API modules** (`apiClient`, `authApi`, `usersApi`, `auctionsApi`,
  `adminApi`, `boardsApi`, `cmsApi`, `feedbackApi`, `interestsApi`,
  `marketingApi`, `recommendationsApi`, `supportApi`) — every exported
  function's endpoint/method/payload shape, plus real branching logic where
  it exists (`adminApi.checkServicesHealth`'s per-service try/catch,
  `marketingApi.getMarketingVideoUrl`'s 404-vs-real-error handling).
- **`hooks/useOptions.ts`** and **`services/adminUsersApi.ts`**.
- **All 22 shared components** in `src/components/`.
- **`context/AuthContext.tsx`** — login/logout/register, session bootstrap
  from a stored token, stale-token cleanup, balance rounding.
- **All of `cms/`** (`CmsPage`, `VersionHistoryPanel`, `puckConfig`'s 8
  dynamic blocks) and both **`layouts/`** wrappers.
- **`pages/admin/adminShared.tsx`** — the date/error-formatting and
  slug/pagination helpers shared across every admin section.
- **7 pages**: `LoginPage`, `RegisterPage`, `ForgotPasswordPage`,
  `ResetPasswordPage`, `VerifyEmailPage`, `AuctionDetailPage` (bidding
  validation, WebSocket message handling, watchlist), `ListingFormPage`
  (validation, image upload/type-rejection, create vs. edit-mode save).

### What isn't covered

- **~17 remaining top-level pages** — `BrowseAuctionsPage`, `LandingPage`,
  `ChooseInterestsPage`, `CollectorBoardPage`, `ProfilePage`,
  `SellerDashboardPage`, `SupportPage` (+ its two `*SuccessPage`s),
  `UserActivityPage`, `UserDashboardPage`, `WalletPage`, `WatchlistPage`,
  `AdminLoginPage`, `AdminManagementPage`, `AdminListingsPage`.
- **All 11 `pages/admin/*Section.tsx` files** (`UsersSection`,
  `CategoriesSection`, `ModerationSection`, `CasesSection`,
  `FeedbackTypesSection`, `MarketingSection`, `TestimonialsSection`,
  `ActivityStatsSection`, `AuditLogsSection`, `SystemLogsSection`,
  `ServiceHealthPanel`).
- **No end-to-end/browser tests** — nothing drives the real app against a
  live backend the way the backend QA suite drives the API. Manual browser
  QA passes are still the only coverage for full user flows end-to-end.

Expand this the same way it was built: pick the next highest-risk file,
mock its dependencies, colocate a `*.test.ts(x)` next to it.

### Bugs found while writing these tests

Testing surfaced several real defects, now fixed (each has a regression
test in place of the original bug-reproducing one):

- **`FormInput`/`SelectField`/`TextAreaField`** never linked their `<label>`
  to the input via `htmlFor`/`id` — an app-wide accessibility gap (no
  screen-reader field announcement, no click-label-to-focus) affecting
  nearly every form in the app. Fixed with `useId()`.
- **`AccountMenu` / `Navbar`'s admin dropdown**: hover-to-open and
  click-to-toggle fought each other — a real mouse click (which always
  fires a hover event first) opened then immediately closed the menu.
  Fixed by making click always open rather than toggle.
- **`PrimaryButton`/`SecondaryButton`**: `disabled` was silently ignored
  whenever `to` was also set, rendering a fully clickable link. Fixed to
  render an inert element instead.
- **`MarketplaceNav`**: the `compact` prop was declared and passed by
  `Navbar` but never read — dead prop, no visual effect. Now applies
  tighter spacing/smaller text.
- **`LoginPage`**: validated the trimmed username/email but submitted the
  untrimmed value. Now trims before submitting (password left untouched).
- **`RegisterPage`**: had no password length/strength check at all
  (inconsistent with `ResetPasswordPage`'s 8-character minimum for the same
  credential), and the terms-agreement gate lived only in the submit
  button's `disabled` attribute with no check inside the handler itself.
  Both fixed.
- **`AuctionDetailPage`**: `minimumBid` and the initial `currentBid` crashed
  (uncaught `TypeError`, no recovery UI) if a listing ever loaded with a
  missing `starting_price`/`current_price` — both now fall back to `0`.
- **`ListingFormPage`**: "Save Changes" in edit mode always submitted
  `status: 'draft'`, silently un-publishing an already-*active* listing.
  Now preserves the listing's current status; only "Publish Auction" forces
  it active.

Left flagged but not changed (lower-priority, more of a design call, or
purely cosmetic with no real trigger in current data): `StatusBadge`'s
`text-transform: capitalize` doesn't fully normalize an all-caps status
string; `usersApi.getMyInterests`/`updateMyInterests` and
`auctionsApi.getSellerStats`/`usersApi.getMyStats` are dead-code duplicates
of `interestsApi`/other `usersApi` functions hitting the same endpoints;
`boardsApi.updateBoard` uses POST where sibling update functions use PATCH.
