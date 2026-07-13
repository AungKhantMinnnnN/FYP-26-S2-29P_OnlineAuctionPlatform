# Recommendation Engine — Algorithm & Implementation Documentation

Living design doc for this service's recommendation/ML logic. **Update this file at the end of every phase** — add a new entry under "Phase Log", update "Current Algorithm" if the live formula changed, and update any section that drifts from what the code actually does. If this doc and the code disagree, trust the code and fix this file.

Business mandate: solve cold-start via onboarding interests, blend collaborative + content-based filtering ("Hybrid CF/RCBF") for the activity hub feed.

---

## Tech Stack

| Layer | Library / Tool | Version | Role |
|-------|---------------|---------|------|
| HTTP framework | FastAPI | 0.109 | Async REST API, Swagger UI at `/v1.0.0/recs/docs` |
| ASGI server | Uvicorn | 0.27 | Serves FastAPI, port 8002 |
| ORM | SQLAlchemy (async) | 2.0.25 | Async DB queries via `asyncpg` driver |
| Database driver | asyncpg | 0.29 | PostgreSQL 15 (shared instance) |
| Data processing | pandas | 2.2 | DataFrame operations — scoring, filtering, merging |
| Linear algebra | NumPy | (pandas dep) | Matrix math for CF cosine similarity |
| ML similarity | scikit-learn | 1.4 | `cosine_similarity` for collaborative filtering |
| ML (future) | scikit-surprise | 1.1.4 | Installed, deferred — SVD matrix factorization planned |
| Cache | Redis 7 + redis-py | 5.0.1 | Request-driven DataFrame + result caching |
| Config | pydantic-settings | 2.1 | `.env` → typed `Settings` object |
| Validation | pydantic | 2.5.3 | Request/response schemas |

Python version: **3.11**.

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   recommendation-engine (port 8002)          │
│                                                             │
│  FastAPI app                                                │
│    GET /v1.0.0/recs/health                                  │
│    GET /v1.0.0/recs/trending?user_id=<UUID>&limit=<int>     │
│                                                             │
│  app/services/                                              │
│    recommendation_service.py  ← pipeline orchestration      │
│    trending.py                ← scoring functions           │
│    cache_service.py           ← Redis read/write helpers    │
│    location.py                ← address → city parser       │
│                                                             │
│  app/core/                                                  │
│    config.py    ← Settings (env vars + TTL config)          │
│    redis.py     ← redis_client singleton                    │
│                                                             │
│  app/models/auction.py  ← hand-synced copy of shared schema │
└───────────────┬──────────────────────────┬──────────────────┘
                │ reads (async SQL)         │ reads/writes
                ▼                           ▼
        PostgreSQL 15                   Redis 7
        (shared with backend            (DataFrame + result
         and bidding-engine)             cache)
```

**This service is read-only against Postgres.** All writes to `user_interactions`, `bids`, `watchlist`, `auction_results`, `board_items`, and `user_interests` come from `backend` (port 8000) and `bidding-engine` (port 8001).

**Nginx routing:** `/v1.0.0/recs/*` proxies to this service. Frontend always goes through Nginx — no direct cross-origin calls to port 8002.

**Shared model file:** `app/models/auction.py` is a hand-maintained copy of the same file in `backend/` and `bidding-engine/`. Schema changes must be synced manually across all three services. No Alembic — migrations are raw SQL in `migrations/`.

---

## Endpoint

```
GET /v1.0.0/recs/trending?user_id=<optional UUID>&limit=<default 20>
```

**Response:**
```json
{
  "items": [ { ...listing fields..., "score": 42.7 } ],
  "count": 20,
  "type": "personalized" | "trending"
}
```

`type` is `"personalized"` when at least one personalization signal was active (segment, category, CF, brand, or price). It is `"trending"` for anonymous calls or true cold-start users. The score field is internal — not rendered in the UI, used only for ranking.

---

## Request Pipeline

Every call to `GET /recs/trending` runs through the following stages in order:

### Stage 1 — Anonymous short-circuit (cache)
If `user_id` is `None`, check Redis for a pre-scored anonymous result at key `recs:anonymous:{limit}`. On hit, return immediately — no DB queries, no computation.

### Stage 2 — Load candidate listings (cache-first)
```
Redis key: recs:global:listings   TTL: RECS_LISTINGS_CACHE_TTL (default 5 min)
```
Query: `listings WHERE status='active' AND is_draft=false AND end_time > now`.  
Columns fetched: `id, title, current_price, end_time, category_id, brand, condition_confidence`.  
On cache miss: run DB query, write result to Redis, continue.

### Stage 3 — Load unified interaction signals (cache-first)
```
Redis key: recs:global:interactions   TTL: RECS_INTERACTIONS_CACHE_TTL (default 5 min)
```
Three DB queries, results concatenated into one `interactions_df`:

| Source | Action label | Weight | Why this source? |
|--------|-------------|--------|-----------------|
| `user_interactions` (logged events) | `bid`, `watchlist`, `view`, `search` | 5 / 3 / 1 / 1 | Captures all browsing behaviour |
| `bids` table | `bid_placed` | **8** | Authoritative financial commitment — stronger than logged event |
| `watchlist` table | `watchlist_active` | **4** | Still-saved items — ongoing intent signal |

Dual-sourcing `bids` and `watchlist` directly means the engine degrades gracefully if any `log_interaction` background task fails silently. The logged event and virtual row can both be present for the same (user, listing) pair — the double weight is intentional.

### Stage 4 — Per-user enrichment
Runs only when `user_id` is provided:

| Signal | Source | Cached? |
|--------|--------|---------|
| Segment interactions (age group / city peers) | `interactions_df` pandas filter + 1 DB query for `user_profiles` | No — fast single-row lookup |
| Category interactions (user's category history) | `interactions_df` pandas merge, fallback DB queries for wins / board / interests | No — pandas ops on cached DF |
| Brand history | 3 DB queries (bids, wins, board items) | **Yes — `recs:user:{id}:signals`, 24h TTL** |
| Price profile (median bid) | 1 DB query (`bids.amount`) | **Yes — `recs:user:{id}:signals`, 24h TTL** |

Brand history and price profile are bundled together in a single Redis key `recs:user:{user_id}:signals` as `{"brands": [...], "median_price": float|null}`. On cache miss, both are computed together and written in one `SET`.

### Stage 5 — Scoring (`rank_listings`)
All candidate listings are scored in one pass — see **Algorithm** section below.

### Stage 6 — Full listing hydration
The top-N listing IDs from scoring are fetched again with `selectinload` for `images` and `seller`. This is a targeted fetch by primary key — always live, no cache.

### Stage 7 — Populate caches
- If `user_id` is `None`: write the scored result to `recs:anonymous:{limit}` for future anonymous short-circuits.
- If `user_id` signals were a cache miss: write `recs:user:{user_id}:signals`.

---

## Algorithm

The ranker is a **deterministic multiplicative scoring function** — not a trained model. Every factor is computed from the interaction data already loaded in Stages 2–4. No model training, no weights fitted from labelled data.

### Scoring formula

```
score = popularity
      × (1 + 0.5 · urgency)
      × (1 + 0.5 · segment)
      × (1 + 0.5 · category)
      × (1 + 0.5 · cf)
      × (1 + 0.4 · brand)
      × (1 + 0.3 · price)
      × (1 + 0.2 · condition)
```

All boost factors are in the range `[0, 1]`. The multiplier form means boosts compound — a listing that scores in every factor can reach ~6× its raw popularity score. Popularity is always the floor: `0 × anything = 0`, so the engine cannot surface a listing that no one has touched.

### Factor breakdown

#### 1. Popularity (base score)
```python
# trending.py :: popularity_scores()
weights = interactions["action"].map(ACTION_WEIGHTS).fillna(0)
score = weights.groupby(interactions["listing_id"]).sum()
```

Sums weighted interaction counts per listing over the last `TRENDING_WINDOW_DAYS` (7) days. Action weights:

| Action | Weight | Source |
|--------|--------|--------|
| `board_curated` | 12.0 | `board_items` — user explicitly showcased this item |
| `purchase` | 10.0 | `auction_results` — user won this auction |
| `bid_placed` | 8.0 | `bids` table — financial commitment |
| `bid` | 5.0 | `user_interactions` — logged bid event |
| `watchlist_active` | 4.0 | `watchlist` table — item still saved |
| `watchlist` | 3.0 | `user_interactions` — logged watchlist event |
| `view` | 1.0 | `user_interactions` — page view |
| `search` | 1.0 | `user_interactions` — appeared in search results |

#### 2. Urgency (time-decay boost, max +50%)
```python
# trending.py :: urgency_scores()
hours_remaining = (end_time - now).total_seconds() / 3600
urgency = clip((72 - hours_remaining) / 72, 0, 1)
```

Zero until 72 hours before `end_time`, then ramps linearly to 1.0 at the deadline. Zero again once ended. The 72-hour window (`ENDING_SOON_WINDOW_HOURS`) is a module-level constant.

#### 3. Segment boost (demographic/location peers, max +50%)
```python
# recommendation_service.py :: _segment_interactions()
# trending.py :: _relative_boost()
```

Finds all interactions in the current window from users who share the requesting user's **age group** (bucketed from `dob`) OR **city** (parsed from freeform `address`). Re-runs popularity within that peer subset only, normalizes 0..1 against the subset's top listing → `segment_boost`.

Age buckets: `under_18`, `18_24`, `25_34`, `35_44`, `45_54`, `55_plus`  
City extraction: `location.parse_location()` — comma-split heuristic, last non-state-zip part is taken as city, lowercased and whitespace-normalised. Known limitation: non-US addresses may parse incorrectly (see Phase 6 roadmap).

Requires `dob` or `address` on `user_profiles`. If neither is present, returns `None` (no segment boost applied).

#### 4. Category boost (interest matching, max +50%)
```python
# recommendation_service.py :: _category_interactions()
```

Collects the categories the user has historically engaged with, in priority order:

1. Categories from `interactions_df` rows where `user_id` matches (any action, all-time within window data)
2. If empty → categories from `auction_results` (auctions the user won)
3. If empty → categories from `board_items` (collector board)
4. If empty → categories from `user_interests` (onboarding picks — **cold-start fallback**)

Filters `interactions_df` to rows on listings in those categories. Re-runs popularity within that subset, normalizes 0..1 → `category_boost`.

This is the primary cold-start resolution mechanism: a brand-new user who picked interests during onboarding immediately gets category boost without any interaction history.

#### 5. Collaborative Filtering (CF, max +50%)
```python
# trending.py :: cf_scores()
# sklearn.metrics.pairwise.cosine_similarity
```

User-based CF computed directly from the already-loaded `interactions_df`:

1. Build a **user × listing weight matrix** — pivot `(user_id, listing_id)` → sum of `ACTION_WEIGHTS[action]` per cell.
2. Extract the requesting user's row vector and all other users' rows.
3. Compute **cosine similarity** between the requesting user and each peer. Clip negatives to 0 (only positive similarity contributes).
4. **Weighted sum** of peer listing scores using similarity as weights → raw CF signal per listing.
5. Normalize 0..1 against the maximum raw signal in the candidate set.

```python
sims = cosine_similarity(user_vec, other.values)[0]   # shape: (n_peers,)
sims = np.clip(sims, 0, None)
raw  = pd.Series(sims @ other.values, index=matrix.columns)
cf   = (raw / raw.max()).reindex(listing_ids).fillna(0.0)
```

Falls back to 0 (no boost, no penalty) when: `user_id` is `None`, user has no interactions in the current window, or fewer than 2 total users are in the matrix.

No model persistence — computed per request from the cached `interactions_df`. The matrix is rebuilt each time the cache is warm (within the 5-min TTL window, the same cached DF is reused across all requests).

#### 6. Brand affinity (content-based, max +40%)
```python
# trending.py :: brand_affinity_scores()
# recommendation_service.py :: _user_brands()
```

Binary score: `1.0` if `listing.brand` is in the user's all-time brand history, `0.0` otherwise.

Brand history is collected from four sources in `_user_brands()`:
- Current window `interactions_df` rows for this user (via merge with `listings_df["brand"]`)
- All-time `bids` join on `listings.brand`
- `auction_results` (wins) join on `listings.brand`
- `board_items → collector_boards` join on `listings.brand`

Result cached at `recs:user:{user_id}:signals` for `RECS_USER_SIGNALS_CACHE_TTL` (default 24h).

#### 7. Price affinity (content-based, max +30%)
```python
# trending.py :: price_affinity_scores()
# recommendation_service.py :: _user_price_profile()
```

Linear decay centered on the user's **median historical bid amount**:

```
price_score = clip(1.0 - |listing.current_price - median| / (2 × median), 0, 1)
```

- Exact match → 1.0
- Price within 2× of median → scores > 0
- Price > 2× deviation → 0.0
- No price data or user has no bid history → 0.5 (neutral, no boost, no penalty)

Primary signal: all-time `bids.amount` (up to 200 most recent). Fallback: `current_price` of listings the user interacted with in the current window.

Result cached with brand history in `recs:user:{user_id}:signals`.

#### 8. Condition quality tie-breaker (max +20%)
```python
# trending.py :: condition_quality_scores()
```

Uses the listing's own AI-generated `condition_confidence` score (0–100), normalized to 0..1. Not a user preference — it's a listing-quality signal that breaks ties between otherwise equal listings. Listings without a confidence score default to 0.5 (neutral).

---

## Cold Start Handling

| User state | Active factors |
|-----------|---------------|
| Anonymous (no `user_id`) | Popularity, Urgency only — served from `recs:anonymous` cache |
| New user, no history, no interests | Popularity, Urgency, Condition only |
| New user with onboarding interests | + Category boost (via `user_interests` fallback) |
| User with interaction history | All factors apply progressively as history accumulates |

Cold start is resolved incrementally — the moment a user completes onboarding, category boost activates. The moment they place a bid, CF, brand, and price signals begin building.

---

## Caching Layer

All cache operations are in `app/services/cache_service.py`. Controlled by `RECS_CACHE_ENABLED` in `.env` — set to `false` to bypass entirely and always compute from DB (useful for debugging or demo environments).

| Redis key | Content | Default TTL | Repopulated |
|-----------|---------|-------------|-------------|
| `recs:global:listings` | `listings_df` (JSON, `orient="split"`) | `RECS_LISTINGS_CACHE_TTL` = 300s | On next request after TTL expiry |
| `recs:global:interactions` | `interactions_df` (JSON, `orient="split"`) | `RECS_INTERACTIONS_CACHE_TTL` = 300s | On next request after TTL expiry |
| `recs:anonymous:{limit}` | Pre-scored list of listing dicts (JSON) | `RECS_ANONYMOUS_CACHE_TTL` = 300s | On next anonymous request after TTL expiry |
| `recs:user:{user_id}:signals` | `{"brands": [...], "median_price": float\|null}` | `RECS_USER_SIGNALS_CACHE_TTL` = 86400s | On next request from that user after TTL expiry |

**Strategy: request-driven, not scheduled.** The cache is populated on the first request that misses it, not by a background job. The first caller after a TTL expiry pays the DB query cost; every subsequent caller within the window hits cache.

**Graceful degradation:** all `cache_service` functions catch all exceptions and log a warning. Redis going down causes cache misses and falls through to DB computation — the service never crashes due to Redis unavailability.

**Serialization:** DataFrames use `to_json(orient="split", date_format="iso")` — column names appear once rather than repeating per row, saving ~60% payload size vs `orient="records"` for wide DataFrames. UUID and `datetime.date` columns are cast back to their Python types after deserialization via `_cast_listings_df()` and `_cast_interactions_df()` in `recommendation_service.py`.

---

## Integration

| Concern | Detail |
|---------|--------|
| **Auth** | Endpoint takes a plain `user_id` query param, not a JWT. The `user_id` should come from the already-authenticated frontend session (`AuthContext.user.id`), not be user-suppliable from an arbitrary query param in production |
| **Nginx** | `/v1.0.0/recs/*` → `recommendation_engine` upstream. Swagger at `/v1.0.0/recs/docs` |
| **DB access** | Read-only. `app/models/auction.py` is a hand-maintained copy — any new column used here must be added to all 3 services' model files |
| **Interaction producers** | `backend`: logs `view`, `search`, `watchlist` via `BackgroundTasks`. `bidding-engine`: writes `bid` atomically in the bid transaction |
| **Frontend** | `UserDashboardPage.tsx` — not yet wired to this endpoint |

---

## Roadmap (Planned Phases)

### Phase 6 — Location quality fix
Replace the freeform-`address` heuristic (`location.parse_location`) with structured city/country fields. Current issues: `_STATE_ZIP_RE` only matches 2-letter US state codes (non-US addresses parse incorrectly), spelling/format variants of the same city never cluster, and a comma-less address is silently taken at face value. Fix requires onboarding form changes + schema changes synced across all 3 services' model files.

---

## Open Questions
- Condition-vision scoring (AI image analysis generating `condition_confidence`) — not started, not part of this recommendation roadmap.

---

## Phase Log

### Phase 0 — Schema sync (foundation)
`app/models/auction.py` was badly out of sync with the live Postgres schema (invented enum values, missing tables/columns, wrong column names) and `sqlalchemy` was not in `requirements.txt` — the ORM had never successfully imported. Fixed both; verified by querying every table live against a fresh Postgres instance.

### Phase 1 — Trending: popularity + urgency + segment + category
Replaced the `{"items": [], "count": 0}` stub with the full pipeline:
1. Popularity + ending-soon urgency boost (no personalization).
2. Added `dob` column to `user_profiles` (synced across all 3 services) for age-group segmentation.
3. Added `app/services/location.py::parse_location()` to extract city from freeform `address`.
4. Added segment boost (age group OR city match).
5. Added category boost (categories the user has personally interacted with).

Verified: global trending, segment-personalized, category-personalized, and cold start (numerically identical to anonymous call).

### Phase 2 — Cold-start via onboarding interests
`_category_interactions()` now falls back to `user_interests` (onboarding picks) when the user has no `user_interactions` history. Behavioral history wins when present; `user_interests` is only consulted when it's empty. No schema change required — `UserInterest` model already existed.

### Phase 3 — Content-based filtering (RCBF)
Added brand affinity (`BRAND_WEIGHT = 0.4`, binary match) and price affinity (`PRICE_WEIGHT = 0.3`, linear decay from median bid) to `rank_listings()`. Both driven by `_user_brands()` and `_user_price_profile()` in `recommendation_service.py`. Fixed latent `NameError` — `Bid`, `AuctionResult`, `Watchlist`, `CollectorBoard`, `BoardItem` were used but missing from the import line.

### Phase 4 — Collaborative filtering (user-based CF)
Added `cf_scores()` to `trending.py`: builds a user × listing weight matrix from `interactions_df`, computes cosine similarity between the requesting user and all peers via `sklearn.metrics.pairwise.cosine_similarity`, produces a weighted-sum CF signal per listing normalized 0..1. Applied as `score *= 1 + 0.5 * cf_score`. Zero for users not present in the current window's matrix. No model persistence — recomputed from the already-loaded (and cached) `interactions_df`.

### Phase 5 — Request-driven caching
Added `app/core/redis.py` (client singleton) and `app/services/cache_service.py` (set/get helpers for DataFrames and JSON, all exceptions swallowed). `get_trending()` refactored with cache-first loading for `listings_df` (5-min TTL), `interactions_df` (5-min TTL), anonymous pre-scored result (5-min TTL), and per-user brand + price signals bundled at `recs:user:{id}:signals` (24h TTL). Segment and category derivations stay live (fast pandas ops on cached DataFrames, no extra DB queries). All TTLs configurable via `.env`. `RECS_CACHE_ENABLED=false` bypasses all cache operations for debugging. DataFrame serialization uses `orient="split"` + explicit UUID/date casting on deserialization.
