# FYP-26-S2-29P Online Auction Platform — Project Understanding

## 1. Project Overview

This is a **Final Year Project (FYP)** for an **Online Auction Platform** — a full-stack web application enabling users to list items for auction, place bids in real-time, manage wallets, and receive personalized recommendations. The platform supports multiple user roles (Buyer, Seller, Admin) and is designed with a microservices-oriented architecture.

---

## 2. Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **React Router v7** | Client-side routing |
| **Axios** | HTTP client for API calls |
| **React Query (TanStack Query)** | Server state management / data fetching |
| **Custom AuthContext** | Client-side auth state (JWT-based) |

### Backend (Main API)

| Technology | Purpose |
|---|---|
| **Python 3.11** | Runtime |
| **FastAPI** | REST API framework |
| **SQLAlchemy 2.x (async)** | ORM with async support |
| **PostgreSQL** | Primary relational database |
| **Redis** | Caching & session/pub-sub layer |
| **MinIO** | S3-compatible object storage (images/files) |
| **Nginx** | Reverse proxy & static file serving |
| **Docker** | Containerization |

### Bidding Engine (Microservice)

| Technology | Purpose |
|---|---|
| **Python / FastAPI** | API framework |
| **SQLAlchemy (async)** | Database ORM |
| **PostgreSQL** | Shared or separate DB |
| **Redis** | Real-time bid coordination / pub-sub |

### Recommendation Engine (Microservice)

| Technology | Purpose |
|---|---|
| **Python / FastAPI** | API framework |
| **SQLAlchemy (async)** | Database ORM |
| **PostgreSQL** | Data access for user/auction data |

### Infrastructure

| Technology | Purpose |
|---|---|
| **Docker Compose** | Multi-container orchestration (dev & prod) |
| **Nginx** | API gateway / reverse proxy |
| **PostgreSQL** | Shared database (with init scripts) |
| **Redis** | Caching, pub-sub, real-time features |
| **MinIO** | Object storage for auction images |

---

## 3. Architecture & Service Breakdown

### 3.1 Frontend (`frontend/`)

A React SPA with role-based routing and layouts.

**Layouts:**
- `PublicLayout` — For unauthenticated/general pages (Landing, Browse, Login, Register)
- `DashboardLayout` — For authenticated pages with Sidebar navigation (User/Seller/Admin dashboards)

**Pages:**

| Page | Role | Description |
|---|---|---|
| `LandingPage` | Public | Homepage / marketing page |
| `BrowseAuctionsPage` | Public | Search & filter active auctions |
| `AuctionDetailPage` | Public/Auth | View auction details, place bids |
| `LoginPage` / `RegisterPage` | Public | Authentication |
| `UserDashboardPage` | User | Overview of user activity |
| `SellerDashboardPage` | Seller | Manage listed auctions |
| `AdminDashboardPage` | Admin | Platform overview & management |
| `AdminManagementPage` | Admin | User/auction management |
| `AdminLoginPage` | Admin | Separate admin login |
| `ProfilePage` | Auth | User profile management |
| `WalletPage` | Auth | Balance & transaction management |
| `WatchlistPage` | Auth | Saved/watched auctions |
| `BidHistoryPage` | Auth | Historical bid records |
| `ListingFormPage` | Seller | Create/edit auction listings |

**Key Components:**
- `AuctionCard` — Displays auction preview with image, title, price, countdown
- `CountdownBadge` — Live countdown timer for auction end
- `DataTable` — Reusable table component (admin management)
- `FilterPanel` — Auction filtering (category, price, status)
- `SearchBar` — Auction search
- `StatusBadge` — Visual status indicator (active/ended/suspended)
- `Navbar` / `Sidebar` / `MarketplaceNav` — Navigation components
- `ProtectedRoute` — Auth guard for routes
- `FormInput`, `SelectField`, `TextAreaField` — Form components
- `PrimaryButton`, `SecondaryButton` — Styled buttons
- `DashboardStatCard` — Stat display for dashboards
- `EmptyState` — Empty data placeholder
- `SectionHeader` — Section title component

**API Layer:**
- `apiClient.ts` — Axios instance with base URL & JWT interceptor
- `auctionsApi.ts` — Auction-specific API calls

**State Management:**
- `AuthContext` — React context for auth state (login, register, logout, token persistence)
- `useAuctions` hook — React Query hook for auction data fetching

**Mock Data:**
- `mockData.ts` — Static mock data for development/prototyping

### 3.2 Backend Main API (`backend/`)

The core REST API handling authentication, user management, auction CRUD, and business logic.

**Structure:**
```
backend/app/
├── main.py              # FastAPI app entry point
├── api/
│   ├── router.py        # Root router aggregation
│   ├── deps.py          # Dependency injection (DB session, current user)
│   └── v1/              # API v1 endpoints
├── core/
│   ├── config.py        # Settings (env-based via pydantic-settings)
│   ├── logger.py        # Logging configuration
│   └── security.py      # JWT creation, password hashing (bcrypt)
├── db/
│   ├── base.py          # SQLAlchemy Base & model imports
│   └── session.py       # Async engine & session factory
├── models/
│   └── auction.py       # SQLAlchemy models (User, UserProfile, Auction, Bid, etc.)
├── schemas/
│   ├── auth.py          # Pydantic schemas for auth
│   └── auction.py       # Pydantic schemas for auctions
└── services/
    └── auth_service.py  # Auth business logic (register, login)
```

**Models (from `auction.py`):**
- `User` — id (UUID), username, email, password_hash, role (enum: user/seller/admin), status (enum: active/suspended/deleted), balance, timestamps
- `UserProfiles` — id (UUID), user_id (FK), full_name, phone, address, bio, updated_at
- `UserRole` — Enum: user, seller, admin
- `UserStatus` — Enum: active, suspended, deleted
- Auction, Bid, and other models (defined in `auction.py`)

**Auth Flow:**
1. **Register**: `POST /register` → Creates `User` + `UserProfile` → Returns user data
2. **Login**: `POST /login` → Validates credentials → Returns JWT `access_token`
3. **Protected Routes**: `Authorization: Bearer <token>` → `deps.py` extracts current user
4. **Password Security**: bcrypt hashing via `passlib`
5. **JWT**: Created in `security.py` with configurable expiry & secret

**Schemas (Pydantic v2):**
- `Token` — access_token, token_type
- `TokenPayload` — sub (user ID)
- `LoginRequest` — username_or_email, password
- `RegisterRequest` — full_name, username, email, password, phone, address, bio, role
- `UserBase`, `UserResponse`, `UserProfileResponse` — Response models with `from_attributes = True`

### 3.3 Bidding Engine (`bidding-engine/`)

A dedicated microservice for real-time bid processing.

**Structure:**
```
bidding-engine/app/
├── main.py
├── api/
│   ├── router.py
│   └── v1/
├── core/
│   ├── config.py
│   └── logger.py
├── db/
│   ├── base.py
│   └── session.py
├── models/
│   └── auction.py
└── services/
    └── bidding_service.py   # Core bidding logic
```

**Purpose:**
- Handles bid placement, validation, and real-time updates
- Likely uses Redis pub/sub for broadcasting bid events to connected clients
- Separate from main backend to scale independently under high bid traffic
- Shares the `Auction` and `Bid` models with the main backend

### 3.4 Recommendation Engine (`recommendation-engine/`)

A microservice for personalized auction recommendations.

**Structure:**
```
recommendation-engine/app/
├── main.py
├── api/
│   ├── router.py
│   └── v1/
├── core/
│   ├── config.py
│   └── logger.py
├── db/
│   ├── base.py
│   └── session.py
├── models/
│   └── auction.py
└── services/
    └── recommendation_service.py   # Recommendation logic
```

**Purpose:**
- Generates personalized auction recommendations based on user behavior
- Reads user bid history, watchlist, and preferences
- Likely uses collaborative filtering or content-based approaches

### 3.5 Infrastructure (`docker/`)

**PostgreSQL (`docker/postgres/`):**
- Custom Dockerfile
- `init.sql` — Database initialization script (creates tables, seeds data)

**Redis (`docker/redis/`):**
- Custom Dockerfile
- `init-redis.sh` — Redis initialization script

**MinIO (`docker/minio/`):**
- `init-buckets.sh` — Creates required buckets on startup

**Nginx (`docker/nginx/`):**
- `default.conf` — Reverse proxy configuration
- Routes frontend requests to React dev server / static files
- Routes `/api/` requests to backend
- Routes bidding/recommendation API requests to respective services

---

## 4. Integration Map

### 4.1 Frontend ↔ Backend (Main API)

```
Frontend (React) ──HTTP/REST──► Backend (FastAPI)
│
│  POST /auth/login          → Returns JWT
│  POST /auth/register       → Creates user
│  GET /auctions             → List auctions
│  GET /auctions/:id         → Auction detail
│  POST /auctions            → Create auction (seller)
│  GET /users/me             → Current user profile
│  PUT /users/me             → Update profile
│  GET /wallets/me           → Wallet balance
│  POST /wallets/deposit     → Add funds
│  GET /watchlists           → User watchlist
│  ...
```

**Integration Details:**
- Frontend uses `apiClient.ts` (Axios) with base URL pointing to Nginx/backend
- JWT token stored in localStorage, attached via Axios interceptor (`Authorization: Bearer <token>`)
- `AuthContext` manages login state, token refresh, and logout
- React Query (`useAuctions` hook) handles caching, refetching, and optimistic updates

### 4.2 Frontend ↔ Bidding Engine

```
Frontend (React) ──WebSocket/REST──► Bidding Engine (FastAPI)
│
│  POST /bids                → Place bid
│  WS   /ws/auction/:id      → Real-time bid stream
│  GET  /bids/auction/:id    → Bid history
```

**Integration Details:**
- Real-time bid updates likely via WebSocket connection
- Bid placement via REST API to bidding engine
- CountdownBadge component may subscribe to WebSocket for live updates
- AuctionDetailPage shows live bid feed

### 4.3 Frontend ↔ Recommendation Engine

```
Frontend (React) ──REST──► Recommendation Engine (FastAPI)
│
│  GET /recommendations/:userId  → Personalized suggestions
```

**Integration Details:**
- BrowseAuctionsPage or LandingPage may show "Recommended for You" section
- Recommendations based on user's bid history, watchlist, and browsing patterns

### 4.4 Backend ↔ Bidding Engine

```
Backend (FastAPI) ──REST/Redis──► Bidding Engine (FastAPI)
│
│  Shared PostgreSQL database    → Both read/write Auction, Bid tables
│  Redis pub/sub                 → Bid event notifications
│  REST calls for bid validation → Check auction status, user balance
```

**Integration Details:**
- Both services share the same PostgreSQL database (or coordinated via DB-level consistency)
- Backend creates auctions; Bidding Engine processes bids on those auctions
- Redis pub/sub used for cross-service event notification (e.g., "bid placed", "auction ended")
- Backend may call Bidding Engine to fetch bid history for a user

### 4.5 Backend ↔ Recommendation Engine

```
Backend (FastAPI) ──REST/DB──► Recommendation Engine (FastAPI)
│
│  Shared PostgreSQL database  → Read user behavior data
│  REST: trigger re-train      → Update recommendation model
```

**Integration Details:**
- Recommendation Engine reads from the same PostgreSQL to analyze user patterns
- May expose endpoints for Backend to trigger model updates
- Backend may cache recommendation results in Redis

### 4.6 Bidding Engine ↔ Recommendation Engine

```
Bidding Engine ──Redis/DB──► Recommendation Engine
│
│  Bid events (Redis pub/sub) → Update user behavior signals
```

**Integration Details:**
- Bid events can feed into the recommendation engine as real-time user preference signals
- Redis pub/sub acts as the event bus between these services

### 4.7 Object Storage (MinIO)

```
Frontend ──upload──► Backend ──S3 API──► MinIO
│                                      │
│  Image upload                        │  Stores images
│  Image display                       │  Buckets: auction-images, etc.
│         ←── Presigned URL ───────────┘
```

**Integration Details:**
- Auction images stored in MinIO (S3-compatible)
- Backend generates presigned URLs or serves images via Nginx proxy
- Frontend displays images from MinIO URLs
- `init-buckets.sh` creates required buckets on MinIO startup

### 4.8 Redis Usage

```
All Services ──► Redis
│
│  Caching        → Auction listings, user sessions
│  Pub/Sub        → Bid events, auction status changes
│  Rate Limiting  → API rate limiting
│  Session Store  → WebSocket connection tracking
```

---

## 5. Data Flow Summary

### User Registration & Login
1. User fills form on `RegisterPage` / `LoginPage`
2. Frontend POSTs to Backend API
3. Backend creates User + UserProfile (register) or validates credentials (login)
4. Backend returns JWT token
5. Frontend stores token in localStorage via `AuthContext`
6. Subsequent requests include `Authorization: Bearer <token>` header

### Auction Browsing
1. User visits `BrowseAuctionsPage`
2. Frontend calls Backend `GET /auctions` with filters
3. Backend queries PostgreSQL, returns paginated results
4. `AuctionCard` components render with countdown timers
5. Recommendation Engine may provide "Recommended" section

### Auction Detail & Bidding
1. User clicks auction → `AuctionDetailPage`
2. Frontend fetches auction details from Backend
3. Frontend opens WebSocket to Bidding Engine for live bids
4. User places bid → POST to Bidding Engine
5. Bidding Engine validates (balance, auction status, bid amount)
6. Bidding Engine writes bid to DB, publishes event via Redis
7. All connected clients receive real-time bid update via WebSocket
8. Backend may update auction current price

### Seller Listing
1. Seller navigates to `ListingFormPage`
2. Fills auction details + uploads images
3. Backend creates auction record + uploads images to MinIO
4. Auction appears in browse listings

### Wallet Operations
1. User visits `WalletPage`
2. Views current balance (from Backend)
3. Can deposit funds → Backend updates User balance in DB
4. Bidding Engine checks balance before accepting bids

---

## 6. Database Schema (Inferred)

### Core Tables

| Table | Key Fields | Relationships |
|---|---|---|
| `users` | id (UUID PK), username, email, password_hash, role, status, balance, created_at, updated_at | 1:1 with user_profiles |
| `user_profiles` | id (UUID PK), user_id (FK), full_name, phone, address, bio, updated_at | Belongs to users |
| `auctions` | id, seller_id (FK), title, description, starting_price, current_price, reserve_price, start_time, end_time, status, category, image_url, created_at, updated_at | Belongs to users (seller), has many bids |
| `bids` | id, auction_id (FK), bidder_id (FK), amount, created_at | Belongs to auctions, users |
| `watchlists` | id, user_id (FK), auction_id (FK), created_at | Belongs to users, auctions |
| `transactions` | id, user_id (FK), type, amount, reference_id, created_at | Belongs to users |

### Enums
- `UserRole`: user, seller, admin
- `UserStatus`: active, suspended, deleted
- `AuctionStatus`: (likely) draft, active, ended, cancelled, suspended
- `BidStatus`: (likely) pending, winning, outbid, won

---

## 7. Docker Compose Services

Based on `docker-compose.yml` and `docker-compose.prod.yml`:

| Service | Image/Build | Port | Description |
|---|---|---|---|
| `frontend` | frontend/ | 3000 (dev) / 80 (prod) | React app |
| `backend` | backend/ | 8000 | FastAPI main API |
| `bidding-engine` | bidding-engine/ | 8001 | Bidding microservice |
| `recommendation-engine` | recommendation-engine/ | 8002 | Recommendation microservice |
| `postgres` | docker/postgres/ | 5432 | PostgreSQL database |
| `redis` | docker/redis/ | 6379 | Redis cache & pub-sub |
| `minio` | minio/minio | 9000/9001 | Object storage |
| `nginx` | docker/nginx/ | 80/443 | Reverse proxy / API gateway |

---

## 8. Environment Configuration

The `.env` file contains configuration for:
- Database URL (PostgreSQL)
- Redis URL
- MinIO credentials & endpoint
- JWT secret key & token expiry
- API ports & service URLs
- CORS origins

---

## 9. Key Design Patterns & Decisions

1. **Microservices Architecture** — Bidding and Recommendation engines are separate services for independent scaling
2. **Async SQLAlchemy** — All database operations are async for better concurrency
3. **JWT Authentication** — Stateless auth with Bearer tokens
4. **Role-Based Access Control** — User, Seller, Admin roles with different permissions
5. **Redis Pub/Sub** — Event-driven communication between services
6. **Shared Database** — All services read from the same PostgreSQL instance (simpler than event sourcing)
7. **Nginx as API Gateway** — Single entry point routing to appropriate services
8. **S3-Compatible Storage** — MinIO for image storage (production-compatible with AWS S3)
9. **Pydantic v2 Schemas** — Type validation with `from_attributes = True` for ORM mode
10. **UUID Primary Keys** — All entities use UUIDs instead of sequential integers
11. **Wireframe/Prototype** — `WireFrame/Kimi/` contains an earlier JSX prototype (pre-TypeScript migration)
12. **Seed Data** — `scripts/seed_data.py` and `scripts/seed_data.sql` for populating test data

---

## 10. Integration Endpoints (Planned/Expected)

### Backend API (Port 8000)
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/users/me
PUT    /api/v1/users/me
GET    /api/v1/auctions
POST   /api/v1/auctions
GET    /api/v1/auctions/:id
PUT    /api/v1/auctions/:id
DELETE /api/v1/auctions/:id
GET    /api/v1/watchlists
POST   /api/v1/watchlists
DELETE /api/v1/watchlists/:id
GET    /api/v1/wallets/me
POST   /api/v1/wallets/deposit
GET    /api/v1/admin/users
PUT    /api/v1/admin/users/:id
```

### Bidding Engine (Port 8001)
```
POST   /api/v1/bids
GET    /api/v1/bids/auction/:id
GET    /api/v1/bids/user/:id
WS     /api/v1/ws/auction/:id
```

### Recommendation Engine (Port 8002)
```
GET    /api/v1/recommendations/:userId
GET    /api/v1/recommendations/trending
POST   /api/v1/recommendations/refresh
```

---

## 11. Current Development Status

- ✅ Project structure scaffolded (all services, Docker configs, DB init scripts)
- ✅ Backend auth service implemented (register, login, JWT)
- ✅ Backend models defined (User, UserProfile, enums)
- ✅ Frontend pages and components created (with mock data)
- ✅ Docker infrastructure configured (Postgres, Redis, MinIO, Nginx)
- ✅ Wireframe prototype exists (`WireFrame/Kimi/`)
- ⏳ Auction CRUD endpoints (partially implemented)
- ⏳ Bidding engine service logic (scaffolded)
- ⏳ Recommendation engine service logic (scaffolded)
- ⏳ Real-time WebSocket bidding (not yet implemented)
- ⏳ MinIO image upload integration (not yet implemented)
- ⏳ Wallet/transaction system (not yet implemented)
- ⏳ Admin management endpoints (not yet implemented)

---

## 12. Risks & Considerations

1. **Shared Database** — All microservices sharing one PostgreSQL instance creates coupling; consider separate schemas or databases per service
2. **Real-time Bidding** — WebSocket connection management and race conditions on concurrent bids need careful handling (Redis locks recommended)
3. **Data Consistency** — Balance deductions and bid placements must be atomic; consider distributed transactions or saga pattern
4. **Image Storage** — MinIO bucket policies and presigned URL expiry need security review
5. **CORS** — Frontend running on different port than API; Nginx must handle CORS or proxy correctly
6. **Token Security** — JWT stored in localStorage is vulnerable to XSS; consider httpOnly cookies for production
7. **Scaling** — Bidding engine may need horizontal scaling under load; Redis pub/sub helps but WebSocket state is sticky
8. **Seed Data** — `seed_data.py` and `init.sql` must stay in sync with model changes