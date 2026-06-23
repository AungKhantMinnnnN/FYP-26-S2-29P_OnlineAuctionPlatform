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
3. Score every candidate listing (`app/services/trending.py::rank_listings`):
   - **Popularity** — weighted interaction count: `bid=5, watchlist=3, view=1, search=1` (`ACTION_WEIGHTS`).
   - **Urgency** — 0..1, ramps linearly over the last `ENDING_SOON_WINDOW_HOURS` (72) before `end_time`, 0 once ended. Applied as `popularity * (1 + URGENCY_WEIGHT * urgency)`, `URGENCY_WEIGHT=0.5` (always on, no profile needed).
   - **Segment boost** — if `user_id` is given and that user has a `dob` or `address`: filter the window's interactions to other users sharing the same `age_group` (bucketed from `dob`, see `trending.age_group()`) or the same parsed `city` (see `app/services/location.py::parse_location`, comma-heuristic over the freeform `address` field — no address-parsing library installed). Normalize that subset's popularity 0..1 against its own top listing, apply as `score * (1 + SEGMENT_WEIGHT * boost)`, `SEGMENT_WEIGHT=0.5`.
   - **Category boost** — if `user_id` is given and has *any* interaction history (independent of profile completeness): find the categories of listings they've ever interacted with, filter the window's interactions to listings in those categories, same normalize-and-apply pattern, `CATEGORY_WEIGHT=0.5`.
   - All three boosts stack multiplicatively.
4. `personalized` (drives the response's `type` field) is `true` iff segment boost or category boost actually had data to apply — *not* just because `user_id` was passed. A `user_id` with no profile and no interaction history is true cold start and gets byte-identical output to the anonymous call.

### Cold start
No `user_id`, or a `user_id` with no `dob`/`address` and no interaction history → plain popularity + urgency, no personalization. This is intentional, not a fallback bug.

### Data depended on
`listings` (`status`, `is_draft`, `end_time`, `category_id`), `user_interactions` (`action`, `occurred_at`), `user_profiles` (`dob`, `address`). `user_interests` (onboarding cold-start categories) exists in the schema but isn't used yet — see Open Questions.

## Open Questions / Next Phases
- `user_interests` (onboarding-selected categories) isn't wired into anything yet — `category_interactions` currently only ever derives from *behavioral* history, never from explicit onboarding picks. Decide whether onboarding interests should seed the category boost for users with no interaction history yet (the actual literal cold-start case).
- No caching — every call recomputes from scratch. Fine at FYP scale; revisit with APScheduler + Redis if it ever needs to serve real traffic.
- Phases 3+ (content-based similarity, collaborative filtering via `scikit-surprise`) not started.
- Condition-vision scoring (separate mandate, no CV library installed) not started.

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
