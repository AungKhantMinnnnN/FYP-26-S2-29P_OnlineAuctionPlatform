# Bidding Engine — Algorithm & Implementation Reference

Living design doc for this service's real-time bidding logic. **Update this file at the end of every phase** — add a new entry under "Phase Log", update any section that drifts from what the code actually does. If this doc and the code disagree, trust the code and fix this file.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Python 3.12 | Async I/O for high-concurrency WebSocket connections |
| Framework | FastAPI | WebSocket endpoint + REST health check |
| Transport | WebSockets (native) | Persistent bidirectional connection per listing room |
| ORM | SQLAlchemy 2.x async | Async DB queries via `asyncpg` driver |
| Database | PostgreSQL 15 | Shared DB with backend and intelligence-engine (read/write) |
| Locking | Redis 7 (`redis-py` async) | Distributed lock per listing to serialise concurrent bids |
| Auth | JWT HS256 (`python-jose`) | Token validated on WS connect; shared `JWT_SECRET` with backend |
| Logging | Python `logging` + `RotatingFileHandler` | Per-level rotating log files + console output |
| Container | Docker (Python 3.12-slim) | Deployed via `docker-compose up --build` |

---

## Service Architecture

```
Browser / Frontend
        │  WS /v1.0.0/bids/ws/{listing_id}?token=JWT
        ▼
┌─────────────────────────────────────────────────────┐
│               FastAPI (port 8001)                   │
│  bids.py — WebSocket controller                     │
│    ├─ JWT validation (on connect)                   │
│    ├─ ConnectionManager (in-memory rooms)           │
│    └─ BiddingService.process_bid_message()          │
│         ├─ Redis lock (per listing)                 │
│         └─ _execute_bid() — core business logic     │
│  settlement_service.py — APScheduler (60s tick)     │
│    └─ settle_ended_auctions()                       │
└──────┬──────────────────────┬───────────┬───────────┘
       │                      │           │
 PostgreSQL               Redis 7    Backend (port 8000)
 (shared DB)              ├─ lock:bid:{listing_id}
 ├─ listings              └─ (no caching — writes only)
 ├─ bids                       POST /v1.0.0/internal/
 ├─ users                      notifications/outbid
 ├─ wallet_transactions        notifications/auction-ended
 ├─ user_interactions       → writes Notification rows
 └─ auction_results         → sends transactional emails
```

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Root health ping |
| `GET` | `/{API_VERSION}/bids/health` | Dependency-free health check |
| `WS` | `/{API_VERSION}/bids/ws/{listing_id}?token=JWT` | Real-time bidding room for a listing |

Swagger UI (REST endpoints only): `http://localhost:8001/{API_VERSION}/bids/docs`

---

## WebSocket Message Protocol

### Client → Server (place a bid)

```json
{
  "type": "place_bid",
  "amount": 150.00
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | Must be `"place_bid"` — only recognised action type |
| `amount` | float | Yes | Bid amount in platform currency. Must be > 0 |

### Server → All Subscribers (successful bid broadcast)

```json
{
  "type": "new_bid",
  "listing_id": "uuid",
  "current_price": 150.00,
  "bidder_id": "uuid",
  "bidder_username": "stewie",
  "amount": 150.00,
  "timestamp": "2026-07-15T10:23:45.123456+00:00",
  "end_time": "2026-07-15T10:24:45.123456+00:00",
  "time_extended": true
}
```

| Field | Type | Description |
|---|---|---|
| `type` | string | Always `"new_bid"` |
| `listing_id` | string UUID | The listing this bid was placed on |
| `current_price` | float | New current price after this bid |
| `bidder_id` | string UUID | UUID of the user who placed the bid |
| `bidder_username` | string | Display name of the bidder |
| `amount` | float | The accepted bid amount |
| `timestamp` | ISO 8601 | When the bid was recorded (`Bid.placed_at`) |
| `end_time` | ISO 8601 | Current auction end time — may be extended by anti-sniping |
| `time_extended` | bool | `true` if anti-sniping extended the end time on this bid |

### Server → Originating Socket Only (error)

```json
{
  "type": "error",
  "message": "Bid amount must be at least 110.00"
}
```

Errors are never broadcast to all subscribers — only the client whose bid failed receives the error message.

---

## Bid Processing Pipeline

Every inbound WS message passes through this pipeline in order. Any step that fails returns an error to the originating socket and aborts — no DB writes occur for failed bids.

```
Inbound WS message (JSON text)
        │
        ▼
Step 1 — Parse & validate message
        │  Parse JSON. Reject if type != "place_bid" or amount <= 0.
        │
        ▼
Step 2 — Acquire Redis distributed lock
        │  lock:bid:{listing_id}, timeout=5s, blocking_timeout=3s
        │  If lock not acquired in 3s → "Server busy" error.
        │
        ▼
Step 3 — Open fresh AsyncSession
        │  New session per message. Never held open across messages.
        │
        ▼
Step 4 — Fetch & validate listing
        │  ├─ Listing must exist
        │  ├─ listing.status == active
        │  ├─ listing.end_time > now  (auction not ended)
        │  └─ listing.seller_id != user_id  (seller can't self-bid)
        │
        ▼
Step 5 — Fetch previous highest bid
        │  SELECT ... WHERE listing_id=X AND status='accepted' ORDER BY amount DESC LIMIT 1
        │  Used for: minimum bid enforcement + escrow release
        │
        ▼
Step 6 — Enforce minimum bid amount
        │  Depends on bidding_type (see "Bidding Types" section below)
        │
        ▼
Step 7 — Fetch bidder & validate wallet
        │  ├─ User must exist
        │  └─ user.balance >= amount  (must have funds)
        │
        ▼
Step 8 — Enforce free tier hourly limit
        │  Free tier: max 10 bids in the last 60 minutes.
        │  Premium tier: unlimited.
        │
        ▼
Step 9 — Release previous highest bidder's hold
        │  If previous_highest_bid exists:
        │    prev_user.balance += previous_highest_bid.amount
        │    INSERT WalletTransaction(type=bid_release, amount=prev_amount)
        │
        ▼
Step 10 — Hold new bidder's funds
        │  current_user.balance -= amount
        │  INSERT Bid(status=accepted, amount=amount)
        │  INSERT WalletTransaction(type=bid_hold, amount=amount)
        │
        ▼
Step 11 — Update listing price
        │  listing.current_price = amount
        │  listing.updated_at = now
        │
        ▼
Step 12 — Anti-sniping check
        │  seconds_remaining = (listing.end_time - now).total_seconds()
        │  IF seconds_remaining <= 60:
        │    listing.end_time += 60 seconds
        │    time_extended = True
        │
        ▼
Step 13 — Log interaction & atomic commit
        │  INSERT UserInteraction(action=bid)
        │  await db.commit()  ← single commit covers steps 9-12
        │
        ▼
Step 14 — Fire outbid notification (fire-and-forget)
        │  If a previous highest bidder was displaced:
        │    notification_client.notify_outbid(prev_user_id, listing_id, title, amount)
        │    → POST http://backend:8000/v1.0.0/internal/notifications/outbid
        │    → backend writes Notification row + sends outbid email
        │  Failure is logged but never surfaces to the caller.
        │
        ▼
Step 15 — Broadcast result
         Broadcast new_bid payload to ALL subscribers on this listing.
         time_extended and new end_time included so frontend updates immediately.
```

---

## Bidding Types

Three auction formats are supported, each with different minimum bid rules.

### `price_up` (Standard English Auction)
The most common format. Each bid must exceed the previous by at least `min_increment`.

```
First bid:    amount >= listing.starting_price
Subsequent:   amount >= listing.current_price + listing.min_increment
```

### `low_start`
Price starts from whatever the first bidder offers (no floor). After the first bid, same rules as `price_up`.

```
First bid:    amount >= listing.starting_price  (any price, low entry barrier)
Subsequent:   amount >= listing.current_price + listing.min_increment
```

### `public`
Fixed $1.00 minimum increment regardless of `min_increment` setting. Designed for high-frequency, low-stakes auctions.

```
Any bid:      amount >= listing.current_price + 1.00
```

---

## Wallet / Escrow Model

The platform uses an **escrow-on-bid** model: funds are held immediately when a bid is placed and released as soon as the bidder is outbid. This guarantees the winning bidder's funds are always available for settlement.

```
User places bid ($150):
  user.balance    -= 150.00
  WalletTransaction(type=bid_hold,    amount=150.00, reference=bid_id)

User is outbid by a $180 bid:
  user.balance    += 150.00
  WalletTransaction(type=bid_release, amount=150.00, reference=prev_bid_id)

New bidder's hold:
  new_bidder.balance -= 180.00
  WalletTransaction(type=bid_hold,    amount=180.00, reference=new_bid_id)
```

All of the above (release + new hold + bid record + listing price update + anti-snipe extension) are committed in a **single `await db.commit()`**. If any write fails, SQLAlchemy rolls back the entire transaction — no partial escrow state is possible.

### Transaction Types Used by Bidding Engine

| `TransactionType` | Who | When |
|---|---|---|
| `bid_hold` | New highest bidder | Funds locked when bid accepted |
| `bid_release` | Previous highest bidder | Funds returned when outbid |
| `settlement` | Winner → Seller | Funds credited to seller on auction sold (Phase 2) |

---

## Anti-Sniping

Prevents last-second bot bids from winning by stealth. Implemented in `bidding_service.py`.

**Constants** (module-level, easy to tune):
```python
ANTI_SNIPE_WINDOW_SECONDS    = 60   # trigger if bid lands within this many seconds of end_time
ANTI_SNIPE_EXTENSION_SECONDS = 60   # extend end_time by this many seconds
```

**Logic:**
```python
end_time_aware = listing.end_time (normalised to UTC-aware)
seconds_remaining = (end_time_aware - now).total_seconds()
if seconds_remaining <= ANTI_SNIPE_WINDOW_SECONDS:
    listing.end_time = end_time_aware + timedelta(seconds=ANTI_SNIPE_EXTENSION_SECONDS)
    time_extended = True
```

**Key design decisions:**
- Extension is applied to `end_time_aware` (the pre-bid end time), not to `now`. This prevents accumulated processing delays from inflating the extension window.
- The extension is committed in the same transaction as the bid — if the commit fails, no extension is persisted.
- `time_extended` and updated `end_time` are included in every broadcast payload so all connected clients update their countdown timers immediately without polling.
- There is currently **no cap on total extensions** — an auction with continuous last-second bids extends indefinitely. A max-extensions counter requires a schema column; planned for a future phase.

---

## Redis Distributed Locking

Concurrent bids on the same listing from different WebSocket connections (different users, or the same user with multiple tabs) would create a race condition on `current_price` and wallet balances without serialisation.

**Lock key:** `lock:bid:{listing_id}` — one lock per listing, not per user. This serialises ALL bids on a listing regardless of bidder.

**Parameters:**
- `timeout=5.0` — lock auto-expires after 5 seconds if the holder crashes, preventing deadlock
- `blocking_timeout=3.0` — a competing bid waits up to 3 seconds to acquire the lock before returning "Server busy"

**Why not a DB transaction lock?** PostgreSQL row-level locks would work but require holding a DB connection open for the duration. Redis locks are cheaper (in-memory, sub-millisecond acquire) and allow the DB session to be opened only after the lock is held, which matches the "fresh session per message" design.

---

## Connection Management

`ConnectionManager` (singleton `manager`) maintains an in-memory dict of active WebSocket connections per listing:

```python
active_connections: Dict[str, List[WebSocket]] = {}
# key = listing_id string, value = list of open WebSocket objects
```

**Connect:** `websocket.accept()` + append to list. Logged with current room size.

**Disconnect:** Remove from list. Empty rooms are deleted from the dict. Uses try/except `ValueError` because a connection may attempt to remove itself twice (e.g. disconnect triggered by both `WebSocketDisconnect` and a broadcast failure).

**Broadcast:** Iterates a **copy** of the connection list to avoid modifying the list while iterating. Dead connections (send raises an exception) are disconnected silently and removed — one dead client does not block the broadcast to others.

**Scope:** In-process only. If the service runs multiple workers or replicas, each process has its own `ConnectionManager`. Horizontal scaling would require a Redis pub/sub fan-out layer (not implemented — single-process for FYP scope).

---

## JWT Authentication

Authentication happens once at WS connect time — not per message.

```
WS /ws/{listing_id}?token=<JWT>
    ↓
jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    ↓
payload["sub"] = user_id (UUID string)
```

- Algorithm: `HS256`, shared `JWT_SECRET` with backend and intelligence-engine
- If token is missing or invalid: `websocket.close(code=1008 POLICY_VIOLATION)` before accepting
- `user_id` is captured at connect time and reused for every message on that connection — no re-validation per bid

---

## Free Tier Limits

| Tier | Bid Limit | Window |
|---|---|---|
| `free` | 10 bids | Rolling 60 minutes |
| `premium` | Unlimited | — |

**Implementation:** Count query on the `bids` table:
```sql
SELECT COUNT(*) FROM bids
WHERE bidder_id = :user_id
AND placed_at >= (now - 1 hour)
```
Checked after wallet validation, before any writes. Returns a clear error message with the limit and an upsell prompt.

---

## Logging

Three output destinations configured in `app/core/logger.py`:

| File | Level | Contents |
|---|---|---|
| `{LOG_DIR}/BiddingEngine.log` | INFO+ | All general service events |
| `{LOG_DIR}/BiddingEngine-error.log` | ERROR+ | Errors only (for alerting) |
| `{LOG_DIR}/bid-events.log` | INFO+ | Bid-specific events |
| stdout/stderr | INFO+ | Visible in `docker compose logs -f bidding-engine` |

`LOG_DIR` defaults to `/tmp/logs`, overridden to `/logs` in docker-compose (mounted as `bidding_engine_logs` named volume).

---

## Roadmap (Planned Phases)

### Phase 4 — WS Rate Limiting + User Suspension Check
Add per-connection message counter in `ConnectionManager` to throttle WebSocket message floods. Add `user.status == active` check at bid validation time to block suspended/banned users from bidding.

---

## Phase Log

### Phase 0 — Core bidding loop
Implemented real-time WebSocket auction room with JWT auth on connect, Redis distributed lock per listing, fresh `AsyncSession` per message, full escrow model (bid_hold + bid_release in single atomic commit), three bidding types (`price_up`, `low_start`, `public`), free tier 10-bid/hour enforcement, broadcast to all subscribers with errors only to originator.

### Phase 1 — Anti-sniping
Added `ANTI_SNIPE_WINDOW_SECONDS = 60` and `ANTI_SNIPE_EXTENSION_SECONDS = 60` constants to `bidding_service.py`. In `_execute_bid`, after price update and before `db.commit()`: check `seconds_remaining` against the window; if triggered, extend `listing.end_time` by 60 seconds as part of the same atomic commit. Broadcast payload extended with `end_time` (always present) and `time_extended: bool` so frontends update countdown timers immediately on every bid. Replaced `print()` debug statements in `bids.py` with structured `logger` calls.

### Phase 2 — Auction Settlement
Added `app/services/settlement_service.py` and `app/core/scheduler.py`. APScheduler (`AsyncIOScheduler`) runs `settle_ended_auctions()` every 60 seconds. For each active listing with `end_time <= now`: acquires the same Redis lock used by the bid pipeline; checks for an existing `AuctionResult` row (idempotency guard); finds the highest accepted bid; settles with one of three outcomes — **no bids** (AuctionResult with winner=None, final_price=starting_price), **reserve not met** (refund highest bidder's hold via bid_release transaction, winner=None), **sold** (credit seller via settlement transaction, AuctionResult with winner). All DB writes committed atomically, then `auction_ended` broadcast sent to all WS subscribers in the listing room. `max_instances=1` on the scheduler job prevents overlap. Scheduler started/stopped via FastAPI lifespan hooks in `main.py`. Added `apscheduler==3.10.4` to requirements.

### Phase 3 — Outbid & Settlement Notifications
Added fire-and-forget notification delivery via the backend's internal API. New files:

- `app/services/notification_client.py` — thin `httpx` async client with two functions: `notify_outbid()` and `notify_auction_ended()`. Both post to `http://backend:8000/v1.0.0/internal/notifications/*` on the Docker-internal network. All exceptions are caught and logged; failures never propagate to the caller.

Backend changes (coordinated):
- `notification_service.py` — resolves user emails and full names from DB, writes `Notification` rows, dispatches the correct `EmailService` method per outcome.
- `internal.py` controller — two unauthenticated `POST` endpoints (`/internal/notifications/outbid`, `/internal/notifications/auction-ended`) registered under `/v1.0.0/`. No auth guard — protected by Nginx blocking `/v1.0.0/internal/` at the public edge (`return 404`).
- Five HTML email templates added to `backend/app/templates/email/`: `outbid.html`, `auction_won.html`, `auction_sold_seller.html`, `auction_reserve_not_met_bidder.html`, `auction_ended_seller.html`.

Notification matrix:

| Event | Recipients | Email template | In-app Notification |
|---|---|---|---|
| Outbid | Previous highest bidder | `outbid.html` | "You've been outbid on {title}" |
| Auction sold | Winner | `auction_won.html` | "You won the auction!" |
| Auction sold | Seller | `auction_sold_seller.html` | "Your auction sold" |
| Reserve not met | Losing bidder | `auction_reserve_not_met_bidder.html` | "Auction ended — reserve not met" |
| Reserve not met | Seller | `auction_ended_seller.html` | "Your auction ended" |
| No bids | Seller | `auction_ended_seller.html` | "Your auction ended" |

Call sites: `bidding_service.py` calls `notify_outbid` after `db.commit()` (outbid case only); `settlement_service.py` calls `notify_auction_ended` after commit and WS broadcast for all three settlement outcomes.
