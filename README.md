# Online Auction Platform (C2C)

A distributed, microservices-based **consumer-to-consumer (C2C) online auction platform**. Users list items, place real-time bids over WebSockets, pay through an internal wallet escrow system, and receive ML-powered personalized item discovery.

Built with **FastAPI**, **React**, **PostgreSQL**, **Redis**, and **MinIO**, orchestrated with **Docker Compose** behind an **Nginx** gateway.

---

## Features

- **Real-time auctions** — WebSocket-based bid stream with live price broadcasting and anti-snipe time extension.
- **Wallet escrow** — bids place money on hold; outbid bidders are auto-refunded; sellers are paid on settlement.
- **Smart recommendations** — cache-first pandas/scikit-learn pipeline computing a multi-factor trending/personalized score for every listing.
- **CMS-driven landing page** — visual page editor (Puck) with draft/publish/versioning/rollback.
- **Admin suite** — user & listing moderation, categories, prohibited-keyword filtering, disputes, testimonials, platform stats, cross-service log viewer.
- **Premium tier** — collector boards to curate won items.
- **Core commerce** — profiles, interests, watchlist, wallet top-up, subscription, feedback, seller analytics.

---

## Quick Start (for reviewers)

> The fastest way to evaluate the project. **Everything runs through Docker Compose** — including the built React frontend (served by Nginx). You do **not** need Node.js or Python installed.

### Prerequisites

| Requirement | Minimum |
|---|---|
| Docker Engine | 24+ |
| Docker Compose | v2 (bundled with Docker Desktop) |
| macOS / Windows / Linux | any (with Docker Desktop or Docker Engine) |
| Free ports | `80` (web), `5432` (Postgres), `6379` (Redis), `9000` (MinIO), plus `8001/8002` (engines) |
| Internet | first build downloads images & npm packages |

### Step 1 — Get the code

```bash
git clone <repository-url>
cd FYP_OnlineAuctionPlatform
```

### Step 2 — Create the environment file

```bash
cp .env.example .env.local
```

The stock `.env.example` uses consistent placeholder values that the stack resolves correctly, so **you can run it as-is**. You only need to change values if ports conflict with other software on the machine. Use the values provided in EnvironmentVariables.txt file.

### Step 3 — Start the entire stack

```bash
docker compose up --build
```

- First run **builds** the backend, both engines, and the frontend → Nginx images. Expect **5–15 minutes** on the first run (mostly `npm ci` inside the Nginx build).
- Subsequent starts are fast: `docker compose up -d`.

### Step 4 — Open the application

| What | URL |
|---|---|
| **Web application** (React SPA) | http://localhost |
| Core API / Gateway docs (Swagger) | http://localhost/v1.0.0/docs |
| Bidding Engine docs (Swagger) | http://localhost/v1.0.0/bids/docs |
| Recommendation Engine docs | http://localhost/v1.0.0/recs/docs |
| Service health check | http://localhost/health |

Register a new account from http://localhost/register, or seed the full demo dataset (with admin + 9 users + listings + bids + recommendations) using [Demo data](#demo-data-seeding).

### Stop / clean up

```bash
docker compose down          # keep data volumes
docker compose down -v       # wipe DB / cache / storage too
```

---

## Architecture

```
                          ┌──────────────────────────────────────────────┐
   Public / Tailscale     │  Docker Compose Stack                        │
        │                 │                                              │
        └───────────────► │  Nginx (port 80) — API Gateway / proxy       │
                          │     ├── /v1.0.0/*         → backend:8000     │
                          │     ├── /v1.0.0/bids/*    → bidding:8001     │
                          │     ├── /v1.0.0/bids/ws/* → bidding (WS)     │
                          │     ├── /v1.0.0/recs/*    → recommendation:8002
                          │     └── /v1.0.0/internal/* → 404 (blocked)   │
                          │                                              │
                          │   ┌───────────────┐      ┌───────────────┐   │
                          │   │  backend      ├─────►│ PostgreSQL 15 │   │
                          │   └──────┬────────┘      └───────────────┘   │
                          │          │ webhooks (/internal/notifications)│
                          │   ┌──────▼────────┐      ┌──────────────┐    │
                          │   │ bidding-engine │◄────►│    Redis 7   │    │
                          │   └────────────────┘      └──────────────┘    │
                          │   ┌────────────────┐      ┌──────────────┐    │
                          │   │ recommendation │─────►│ PostgreSQL   │    │
                          │   └────────────────┘      └──────────────┘    │
                          │   ┌────────────────┐                          │
                          │   │     MinIO      │  (images / avatars /     │
                          │   └────────────────┘   videos - S3)           │
                          └──────────────────────────────────────────────┘
```

Four services work together:

- **Core Backend** (`backend/`, port 8000) — user management, listings, transactions, moderation, CMS, and the *internal* callback endpoints used by the other engines.
- **Bidding Engine** (`bidding-engine/`, port 8001) — high-concurrency WebSocket bidding, wallet escrow (hold / release / settlement), and a 60-second settlement scheduler.
- **Recommendation Engine** (`recommendation-engine/`, port 8002) — read-only, cache-first trending/ranking with optional per-user personalization.
- **Nginx** — reverse proxy, rate limiter, single public entry point, and static host for the built React app.

The services share a single PostgreSQL schema, Redis, and JWT secret, and communicate via fire-and-forget webhooks (`X-Internal-Api-Key` guarded).

> See **[PROJECTOVERVIEW.md](./PROJECTOVERVIEW.md)** for the full technical reference: every endpoint, the complete data model, key algorithms, infrastructure, and testing.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend services | FastAPI, Pydantic v2, SQLAlchemy 2 (async), Python 3.11 |
| Real-time | WebSockets, Redis (locks, caching, rate limiting) |
| Database | PostgreSQL 15, Redis 7 |
| Object storage | MinIO (S3-compatible) |
| ML / recommendations | pandas, scikit-learn, scikit-surprise |
| Frontend | React 19, TypeScript, Vite, Tailwind v4, TanStack Query, Axios, React Router 7 |
| CMS | Puck (visual editor) |
| Infra | Docker Compose, Nginx, Cloudflare Tunnel |

---

## Repository structure

```
.
├── backend/                 # Core API gateway (FastAPI, port 8000)
├── bidding-engine/          # WebSocket bidding + settlement (port 8001)
├── recommendation-engine/   # Trending / personalized ranking (port 8002)
├── frontend/                # React SPA (Vite)
├── docker/                  # nginx / postgres / redis / minio configs
├── scripts/                 # seeding + migration + deploy helpers
├── testing/                 # end-to-end / integration test clients
├── docs/                    # architecture & algorithm docs
├── PROJECTOVERVIEW.md       # full technical reference
└── docker-compose.yml       # full stack orchestration
```

---

## Environment & Config files

The stack reads configuration from **`.env.local`** at the repo root (the default `ENV_FILE` resolved by `docker-compose.yml`). The root `.env` is a symlink to `.env.local` for tooling that expects it.

### Which config files ship with the project

| File | Tracked in repo | Contents | Submit as-is? |
|---|---|---|---|
| `.env.example` | ✅ | Documented template with placeholders | **Yes** — the canonical config reference |
| `.env.staging.example` | ✅ | Staging template | Yes |
| `.env.teammate` | ✅ | Team template (contains **real** demo passwords + a JWT secret) | ⚠️ Sanitize before a public submission |
| `docker-compose.yml` | ✅ | Orchestration, env resolution, port mapping | Yes |
| `docker/nginx/default.conf` | ✅ | Routing rules | Yes |
| `docker/postgres/init.sql` | ✅ | Schema + seed SQL (auto-runs on fresh DB) | Yes |
| `backend/app/core/config.py` *(+ engines)* | ✅ | All env-var definitions (pydantic settings) | Yes |
| `frontend/.env.example` | ✅ | Frontend `VITE_*` template | Yes |
| `.env.local` / `.env` / `.env.prod` | ❌ gitignored | Real secrets | **No** — never submit |
| `frontend/.env` | ❌ gitignored | Local dev URLs | No |

### Key environment variables

| Variable | Purpose |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Postgres credentials (compose wires these into `DATABASE_URL`) |
| `REDIS_PASSWORD` | Redis auth (compose wires into `REDIS_URL`) |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | MinIO / S3 credentials |
| `JWT_SECRET` | HS256 signing key shared by all three services |
| `INTERNAL_API_KEY` | Optional shared key for engine → backend webhooks |
| `DATABASE_URL`, `REDIS_URL`, `BACKEND_URL` | Connection URLs (overridden inside Docker to service hostnames) |
| `BIDDING_SERVICE_URL`, `RECOMMENDATION_SERVICE_URL` | Peer service URLs |
| `RATE_LIMIT_*` | Per-IP rate-limit knobs (`RATE_LIMIT_ENABLED=false` disables) |
| `RECS_*_CACHE_TTL` | Recommendation engine cache TTLs |
| `MAIL_*` | SMTP settings for transactional email |
| `ALLOWED_ORIGINS`, `FRONTEND_URL` | CORS + outbound email link origins |

---

## Demo data & seeding

A fresh `docker compose up` initializes the **schema** (tables + reference option sets) but contains **no users or listings**. To populate a full demo dataset (admin, 9 users, active/ended listings, bids, auction results, collector boards, testimonials, disputes, CMS landing page), run the seed script once against the running stack.

### Seeded accounts

| Account | Role | Tier | Email |
|---|---|---|---|
| `admin_user` | admin | free | admin@example.com |
| `normal_user_1` | user | premium | user1@example.com |
| `normal_user_2` | user | premium | user2@example.com |
| `normal_user_3` … `normal_user_9` | user | free | user3@example.com … user9@example.com |

**Password for every seeded account: `password123`**

### How to seed

The seed script needs a local Python 3.11+ environment that can reach the Dockerized Postgres (`localhost:5432`) and MinIO (`localhost:9000`):

```bash
# 1. create a local venv for the backend (only needed once)
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 2. run the seeder (reads .env.local; connects to docker infra)
cd ..
python scripts/seed_data.py
```

> Tip: seed **before** you register your own account so demo listings/top-up wallets are present. Seeding is idempotent (skips users/listings that already exist).

---

## Run services individually (outside Docker)

Backend:

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Bidding engine:

```bash
cd bidding-engine
pip install -r requirements.txt
python -m app.main            # serves on :8001
```

Recommendation engine:

```bash
cd recommendation-engine
pip install -r requirements.txt
python -m app.main            # serves on :8002
```

Frontend:

```bash
cd frontend
npm install
npm run dev                   # Vite dev server on :5173
```

Point the frontend at the services via `frontend/.env` — see `VITE_API_URL`, `VITE_RECS_URL`, `VITE_BIDDING_URL`, `VITE_WS_URL`.

---

## Testing

| Project | Framework | Run |
|---|---|---|
| Backend | pytest + pytest-asyncio | `cd backend && pytest tests/` + `pytest integration/` |
| Bidding engine | pytest | `cd bidding-engine && pytest tests/` + `pytest integration/` |
| Recommendation engine | pytest | `cd recommendation-engine && pytest tests/` + `pytest integration/` |
| Frontend | Vitest + Testing Library | `cd frontend && npm test` |

See **[TESTING.md](./TESTING.md)** for details.

---

## Troubleshooting

| Problem | Cause / Fix |
|---|---|
| `port is already allocated` for 80/5432/6379/9000 | Another service owns the port. Either stop it, or change the mapping in `.env.local`, e.g. `NGINX_PORT=8080`, `POSTGRES_PORT=5433`, `REDIS_PORT=6380`, `MINIO_PORT=9001`. |
| Build fails in `npm ci` (nginx stage) | Transient network. Re-run `docker compose build nginx`. |
| `docker compose up` says `.env.local` missing | You skipped Step 2 — `cp .env.example .env.local`. |
| Backend restarts in a loop | Check `docker compose logs backend`; most likely a missing required env var in `.env.local`. |
| Pages load but images are blank | MinIO bucket seeding (`minio-init`) may still be running — wait, then hard-refresh. |
| Bidding websocket won't connect | Ensure the browser is on `http://localhost` (port 80) so cookies are same-origin; direct-port dev URLs need `VITE_WS_URL`. |
| Want faster iteration on the frontend | Run Vite outside Docker (`cd frontend && npm run dev`) with `VITE_API_URL=/v1.0.0` via a proxy, or point `.env` at the published ports. |

---

## API Versioning

Project follows semantic versioning `vX.Y.Z`:

- `X` — sprint / major changes.
- `Y` — backward-compatible new features.
- `Z` — bug fixes / minor changes.

Current version: **`v1.0.0`**
