# Recommendation Engine — Algorithm Documentation

Living design doc for this service's recommendation/ML logic. **Update this file at the end of every phase** — add a new entry under "Phase Log", and update "Current Behavior" if the live formula changed. This doc describes what the code actually does; if it drifts from the code, trust the code and fix this file.

Business mandate (from the project's root `CLAUDE.md`): solve cold-start via onboarding interests, blend collaborative + content-based filtering ("Hybrid CF/RCBF") for the activity hub feed. This service also owns AI condition-vision scoring, which is unrelated to recommendations and not covered by this doc.

## Current Behavior

### Endpoint
`GET /v1.0.0/recs/trending?user_id=<optional UUID>&limit=<default 20>`
Implemented in `app/api/v1/endpoints/recommendations.py` → `app/services/recommendation_service.py::get_trending()`.

### Pipeline
1. Pull candidate listings: `status='active'`, `is_draft=False`, `end_time` in the future.
2. Pull `user_interactions` on those listings from the last `TRENDING_WINDOW_DAYS` (7), left-joined to each interacting user's `user_profiles` (for `dob`/`address`).
3. Score every candidate listing (`app/services/trending.py::rank_listings`) — see **Algorithm** below.
4. `personalized` (drives the response's `type` field) is `true` iff segment boost or category boost actually had data to apply — *not* just because `user_id` was passed. A `user_id` with no profile and no interaction history is true cold start and gets byte-identical output to the anonymous call.

### Cold start
No `user_id`, or a `user_id` with no `dob`/`address`, no interaction history, and no onboarding `user_interests` → plain popularity + urgency, no personalization. This is intentional, not a fallback bug.

### Data depended on
`listings` (`status`, `is_draft`, `end_time`, `category_id`), `user_interactions` (`action`, `occurred_at`), `user_profiles` (`dob`, `address`), `user_interests` (`category_id`, onboarding cold-start fallback for category boost).

## Algorithm

This is a rule-based hybrid ranker, not a trained model — every factor below is a deterministic formula over the last 7 days of interaction data. No `scikit-surprise`/CF model is trained yet (see Roadmap Phase 4); "Hybrid CF/RCBF" today means *popularity + recency + rule-based segment/category similarity*.

For each candidate listing, four factors combine into one `score`, computed top-to-bottom (each line multiplies the running score from the line above):

| # | Factor | Formula | Needs a profile/history? |
|---|--------|---------|---------------------------|
| 1 | **Popularity** | `Σ ACTION_WEIGHTS[action]` over that listing's interactions in the trending window. Weights: `bid=5, watchlist=3, view=1, search=1` (`trending.ACTION_WEIGHTS`). This is the base score everything else multiplies. | No |
| 2 | **Urgency** | `urgency = clip((72 - hours_remaining) / 72, 0, 1)`, i.e. 0 until 72h before `end_time`, ramping linearly to 1 at the deadline, 0 again once ended. `score *= 1 + 0.5 * urgency` (max +50%). | No |
| 3 | **Segment boost** | Take every interaction in the window from users sharing the requesting user's `age_group` (bucketed from `dob` — see table below) OR parsed `city` (from `address`, see `location.parse_location`). Re-run popularity *within that subset only*, normalize 0..1 against the subset's top listing → `segment_boost`. `score *= 1 + 0.5 * segment_boost` (max +50%). | Yes — `dob` or `address` on `user_profiles` |
| 4 | **Category boost** | Take every interaction in the window on listings whose `category_id` matches a category the requesting user has *ever* interacted with (any action, any time — not just this window). If the user has no behavioral history at all, fall back to their onboarding `user_interests` categories instead. Same normalize-against-subset-max pattern → `category_boost`. `score *= 1 + 0.5 * category_boost` (max +50%). | Yes — `user_interactions` history *or* `user_interests` rows for that user (profile not required) |

Net effect: `score = popularity × (1 + 0.5·urgency) × (1 + 0.5·segment_boost) × (1 + 0.5·category_boost)`. Boosts are multiplicative, so they compound — a listing that's both ending soon *and* trending in the user's segment *and* category can reach ~3.4× its raw popularity, but popularity is always the floor: a boost can't surface a listing nobody has touched (`0 × anything = 0`).

Age buckets (`trending.age_group()`): `under_18`, `18_24`, `25_34`, `35_44`, `45_54`, `55_plus`.

City grouping (`location.parse_location()`): comma-split heuristic over the freeform `address` text field (no address-parsing library installed) — `"123 Main St, Springfield, IL 62704"` → city `springfield`. Good enough to cluster users for segmentation, not a real geocoder.

## Integration

How this service fits into the rest of the platform — see root `CLAUDE.md` for the full architecture.

- **Process & port:** standalone FastAPI service, container `recommendation-engine` (image `auction-recommendation-engine:local`), port `8002`. Started by `docker-compose up --build` alongside `backend` (8000) and `bidding-engine` (8001). Healthcheck-only port exposure — `8002` is published mainly so `docker-compose`/devs can curl `/v1.0.0/recs/health` directly; production traffic goes through Nginx.
- **Routing:** Nginx (`docker/nginx/default.conf`) proxies `/v1.0.0/recs/*` to the `recommendation_engine` upstream, plus a convenience alias `/v1.0.0/trending` → `/v1.0.0/recs/trending`. Swagger docs live at `/v1.0.0/recs/docs`.
- **Database:** shares the *same* Postgres instance as `backend` and `bidding-engine` (`DATABASE_URL` in `.env.local`, async via `asyncpg`). This service only ever reads (`listings`, `user_interactions`, `user_profiles`) — it writes nothing. Its `app/models/auction.py` is a hand-maintained copy of the other two services' model file; any column this doc references must exist there too, or the query in `recommendation_service.py` will fail at runtime (no Alembic, no shared migration — see root `CLAUDE.md` "Shared DB / Duplicated Models").
- **Redis:** `REDIS_URL` is wired into config but unused by the current trending pipeline (no caching yet — every request recomputes from scratch, see Roadmap Phase 5).
- **Upstream data producers:** `user_interactions` rows (the entire signal this algorithm runs on) are written by `backend` and `bidding-engine`, not by this service — e.g. a bid placed through the bidding engine's WS flow, or a watchlist/view/search action through the core API. This service is purely a downstream reader/ranker.
- **Consumer (frontend):** intended consumer is the unified activity hub / dashboard, calling `GET /v1.0.0/trending?user_id=<id>` for the personalized feed. **Not wired yet** — `frontend/src/pages/UserDashboardPage.tsx` currently derives its "Recommended" section from a local mock filter (`auctions.filter(a => a.category === 'Electronics')`) instead of this endpoint. Wiring that call up is the natural next integration step once this doc's pipeline is trusted.
- **Auth:** the endpoint takes a plain `user_id` query param, not a JWT — it does not duplicate this platform's `HS256` auth flow. If/when the frontend wires it up, that `user_id` should come from the already-authenticated session (`AuthContext`), not be user-suppliable as an arbitrary query param in a public-facing route.

## Roadmap (Planned Phases)

Open-ended — append/reorder phases here as new requirements come up during implementation. This is the forward-looking list; **Phase Log** below only records what's actually been built and verified.

### Phase 3 — Content-based filtering (the "RCBF" half)
Recommend listings similar to ones a user engaged with, using listing attributes (`category`, `brand`, price range, `condition_confidence`) — actual similarity, not just "same category." First real content-based step beyond the current rule-based category boost.

### Phase 4 — Collaborative filtering (the "CF" half)
User-item interaction matrix, `scikit-surprise` or simple matrix factorization — recommend based on what similar users liked. The piece "Hybrid CF/RCBF" in the business mandate doesn't have at all yet.

### Phase 5 — Caching
APScheduler precomputes + Redis cache (`REDIS_URL` is already wired into config but unused). Every request recomputes from scratch today; becomes worth doing once Phase 3/4 make scoring heavier.

### Phase 6 — Location quality fix
Replace the freeform-`address` heuristic with structured city/country input. Known issue today: `_STATE_ZIP_RE` only matches 2-letter US state codes (non-US addresses parse the wrong field as "city"), spelling/format variants of the same city never group together, and a comma-less/vague address is taken at face value — all silent data-quality degradation (wrong/diluted `segment_boost`), never a crash. Fix is onboarding-form + schema scope (synced across all 3 services' model files), bigger than a `location.py` patch — kept last since it's profile scope, not engine scope.

## Open Questions
- Condition-vision scoring (separate mandate, no CV library installed) — not started, not part of this roadmap.

## Phase Log

### Phase 0 — Schema sync (foundation)
`app/models/auction.py` was badly out of sync with the live Postgres schema (invented enum values, missing tables/columns, wrong column names) and `sqlalchemy` wasn't even in `requirements.txt` — the ORM had never successfully imported. Fixed both; verified by querying every table live against a fresh Postgres instance.

### Phase 1 — Trending: popularity + urgency + segment + category
Replaced the `{"items": [], "count": 0}` stub with the pipeline described above, built incrementally:
1. Popularity + ending-soon urgency boost (no personalization).
2. Added `dob` column to `user_profiles` (synced across all 3 services' model files) for age-group segmentation.
3. Added `app/services/location.py::parse_location()` to group the freeform `address` field by city for location segmentation.
4. Added segment boost (age group OR city match).
5. Added category boost (categories the user has personally interacted with, independent of profile completeness).

Verified against live seeded data for: global trending, segment-personalized (boost flips ranking when urgency + segment compound), category-personalized (boost applies precisely to the matching category and nothing else), and cold start (numerically identical to anonymous global call).

### Phase 2 — Cold-start via onboarding interests
`_category_interactions` in `recommendation_service.py` now falls back to `user_interests` (onboarding category picks) when the user has no `user_interactions` history at all — previously such a user got zero category boost even with onboarding picks on file. Behavioral history still wins when present; `user_interests` is only consulted when it's empty. No schema change (`UserInterest` model already existed, just wasn't queried from this service). `__main__` self-checks intentionally omitted — pytest suite to follow once more phases land.
