# Service Profile

This document outlines the API endpoints, request schemas, and response schemas for each microservice in the Online Auction Platform.

---

## 1. Backend (API Gateway) - v1.0.0
Handles authentication, core auction CRUD operations, image uploads, and routing. All routes are served under the prefix `/{version}` (e.g. `/v1.0.0`).

### Authentication (`/v1.0.0/auth`)

* **`POST /v1.0.0/auth/register`**
  * **Description:** Register a new user. Creates both a `users` and a `user_profiles` record in a single call.
  * **Request:** JSON object (`RegisterRequest`)
    ```json
    {
      "full_name": "string",
      "username": "string",
      "email": "string (email)",
      "password": "string",
      "phone": "string | null",
      "address": "string | null",
      "bio": "string | null",
      "role": "string (default: \"user\")"
    }
    ```
  * **Response (201 Created):** JSON object (`UserResponse`)
    ```json
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "role": "string",
      "balance": "float",
      "profile": {
        "full_name": "string",
        "phone": "string | null",
        "address": "string | null",
        "bio": "string | null"
      }
    }
    ```

* **`POST /v1.0.0/auth/login`**
  * **Description:** Authenticate user and issue a JWT access token. Accepts either username or email in the `username_or_email` field.
  * **Request:** JSON object (`LoginRequest`)
    ```json
    {
      "username_or_email": "string",
      "password": "string"
    }
    ```
  * **Response (200 OK):** JSON object (`Token`)
    ```json
    {
      "access_token": "string (JWT)",
      "token_type": "bearer"
    }
    ```

* **`GET /v1.0.0/auth/get_current_user`**
  * **Description:** Get details of the currently authenticated user.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Response (200 OK):** JSON object (`UserResponse`)
    ```json
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "role": "string",
      "balance": "float",
      "profile": {
        "full_name": "string",
        "phone": "string | null",
        "address": "string | null",
        "bio": "string | null"
      }
    }
    ```

### Auctions (`/v1.0.0/auctions`)

* **`GET /v1.0.0/auctions/form_metadata`**
  * **Description:** Returns all data needed to populate a listing creation form: available categories, item conditions, and bidding types.
  * **Response (200 OK):** JSON object (`MetadataResponse`)
    ```json
    {
      "categories": [
        {
          "id": "uuid",
          "name": "string",
          "slug": "string",
          "parent_id": "uuid | null",
          "is_active": "boolean"
        }
      ],
      "conditions": [
        { "id": "string", "name": "string" }
      ],
      "biddingTypes": [
        { "id": "string", "name": "string" }
      ]
    }
    ```

* **`GET /v1.0.0/auctions/`**
  * **Description:** Get a paginated list of auctions. Excludes drafts by default unless `status=draft` is explicitly passed.
  * **Request Parameters:** `page` (int, default 1), `size` (int, default 20, max 100), `status` (enum, optional), `category_id` (uuid, optional), `search` (string, optional)
  * **Response (200 OK):** JSON object (`PaginatedAuctionResponse`)
    ```json
    {
      "items": [
        {
          "id": "uuid",
          "seller_id": "uuid",
          "category_id": "uuid | null",
          "title": "string",
          "description": "string | null",
          "brand": "string | null",
          "condition": "new | used | refurbished",
          "condition_confidence": "float | null",
          "bidding_type": "price_up | low_start | public",
          "starting_price": "float | null",
          "reserve_price": "float | null",
          "current_price": "float | null",
          "min_increment": "float | null",
          "status": "draft | pending_review | active | ended | removed",
          "is_draft": "boolean",
          "start_time": "datetime | null",
          "end_time": "datetime | null",
          "created_at": "datetime",
          "updated_at": "datetime",
          "images": [
            {
              "id": "uuid",
              "s3_key": "string",
              "sort_order": "int",
              "is_primary": "boolean",
              "image_url": "string | null"
            }
          ],
          "seller": {
            "id": "uuid",
            "username": "string",
            "email": "string"
          }
        }
      ],
      "total": "int",
      "page": "int",
      "size": "int",
      "pages": "int"
    }
    ```

* **`GET /v1.0.0/auctions/get_user_listings`**
  * **Description:** Get listings created by the authenticated user, paginated. Pass `status=draft` to view unpublished drafts.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Request Parameters:** `page` (int, default 1), `size` (int, default 20, max 100), `status` (enum, optional)
  * **Response (200 OK):** `PaginatedAuctionResponse` *(same structure as `GET /auctions/`)*

* **`GET /v1.0.0/auctions/get_auction/{id}`**
  * **Description:** Get details of a specific auction listing.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** `AuctionListingResponse` *(same single-item structure as above)*

* **`GET /v1.0.0/auctions/get_auction_bids/{id}/bids`**
  * **Description:** Get bid history for a specific auction.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** JSON array of `BidResponse`
    ```json
    [
      {
        "id": "uuid",
        "listing_id": "uuid",
        "bidder_id": "uuid",
        "amount": "float",
        "status": "accepted | rejected | cancelled",
        "placed_at": "datetime",
        "bidder": {
          "id": "uuid",
          "username": "string",
          "email": "string"
        }
      }
    ]
    ```

* **`POST /v1.0.0/auctions/create_listing`**
  * **Description:** Create a new auction listing (text/metadata only). Upload images separately via the image upload endpoint.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Request:** JSON object (`ListingCreate`)
    ```json
    {
      "title": "string",
      "description": "string | null",
      "condition": "new | used | refurbished",
      "bidding_type": "price_up | low_start | public",
      "starting_price": "float (>= 0)",
      "reserve_price": "float (>= starting_price)",
      "min_increment": "float (default: 1.0)",
      "start_time": "datetime",
      "end_time": "datetime (must be after start_time)",
      "category_id": "uuid | null",
      "status": "draft | pending_review | active | ended | removed (optional)"
    }
    ```
  * **Response (201 Created):** `AuctionListingResponse`

* **`POST /v1.0.0/auctions/upload_auction_images/{id}`**
  * **Description:** Upload one or more images for a listing. Only `image/*` content types are accepted.
  * **Request Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
  * **Request:** Form-Data — `files`: list of image files
  * **Response (200 OK):** JSON array of `ListingImageResponse`
    ```json
    [
      {
        "id": "uuid",
        "s3_key": "string",
        "sort_order": "int",
        "is_primary": "boolean",
        "image_url": "string | null"
      }
    ]
    ```

### Testimonials (`/v1.0.0/testimonials`)

* **`GET /v1.0.0/testimonials/`**
  * **Description:** Public. Returns only admin-approved testimonials (`is_featured = true`) for display on the website.
  * **Response (200 OK):** JSON array of `TestimonialResponse`
    ```json
    [
      {
        "id": "uuid",
        "user_id": "uuid",
        "content": "string",
        "rating": "int (1–5)",
        "is_featured": "boolean",
        "created_at": "datetime"
      }
    ]
    ```

* **`GET /v1.0.0/testimonials/admin`**
  * **Description:** Admin only. Returns all submitted testimonials regardless of approval status, for the admin review queue.
  * **Request Headers:** `Authorization: Bearer <token>` *(admin role required)*
  * **Response (200 OK):** JSON array of `TestimonialResponse` *(same shape as above)*

* **`GET /v1.0.0/testimonials/me`**
  * **Description:** Authenticated user. Returns the current user's own submissions including their `is_featured` approval status.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Response (200 OK):** JSON array of `TestimonialResponse` *(same shape as above)*

* **`POST /v1.0.0/testimonials/{id}/approve`**
  * **Description:** Admin only. Approves a testimonial for public display by setting `is_featured = true`.
  * **Request Headers:** `Authorization: Bearer <token>` *(admin role required)*
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** `TestimonialResponse` *(updated record)*

* **`POST /v1.0.0/testimonials/`**
  * **Description:** Authenticated user. Submit a platform testimonial. Pending admin approval before appearing publicly.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Request:** JSON object (`TestimonialCreate`)
    ```json
    {
      "content": "string",
      "rating": "int (1–5)"
    }
    ```
  * **Response (201 Created):** `TestimonialResponse`

---

### Disputes (`/v1.0.0/disputes`)

* **`GET /v1.0.0/disputes/`**
  * **Description:** Admin only. Returns all disputes across all users. Optionally filter by status.
  * **Request Headers:** `Authorization: Bearer <token>` *(admin role required)*
  * **Request Parameters:** `status` (enum, optional) — `open | in_review | resolved | closed`
  * **Response (200 OK):** JSON array of `DisputeResponse`
    ```json
    [
      {
        "id": "uuid",
        "reporter_id": "uuid",
        "listing_id": "uuid | null",
        "category": "string",
        "description": "string",
        "status": "open | in_review | resolved | closed",
        "resolution_note": "string | null",
        "resolved_at": "datetime | null",
        "created_at": "datetime"
      }
    ]
    ```

* **`GET /v1.0.0/disputes/me`**
  * **Description:** Authenticated user. Returns the current user's own submitted disputes including current status and any resolution note from the admin.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Response (200 OK):** JSON array of `DisputeResponse` *(same shape as above)*

* **`POST /v1.0.0/disputes/{id}/respond`**
  * **Description:** Admin only. Updates a dispute's status and optionally adds a resolution note. Sets `resolved_by` and `resolved_at` automatically.
  * **Request Headers:** `Authorization: Bearer <token>` *(admin role required)*
  * **Request Parameters:** `id` (UUID) in path
  * **Request:** JSON object (`DisputeResolveRequest`)
    ```json
    {
      "status": "open | in_review | resolved | closed",
      "resolution_note": "string | null"
    }
    ```
  * **Response (200 OK):** `DisputeResponse` *(updated record)*

* **`POST /v1.0.0/disputes/`**
  * **Description:** Authenticated user. Submit a dispute or platform feedback. `listing_id` is optional — omit for general platform feedback, include for listing-specific reports.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Request:** JSON object (`DisputeCreate`)
    ```json
    {
      "listing_id": "uuid | null",
      "category": "string",
      "description": "string"
    }
    ```
  * **Response (201 Created):** `DisputeResponse`

---

### Health Check

* **`GET /v1.0.0/health`**
  * **Response:** `{"status": "ok", "version": "v1.0.0"}`

---

## 2. Bidding Engine - v1.0.0
High-concurrency, real-time bid processing service using WebSockets and Redis distributed locks. All routes are served under the prefix `/{version}/bids` (e.g. `/v1.0.0/bids`).

### WebSockets (`/v1.0.0/bids/ws`)

* **`WebSocket /v1.0.0/bids/ws/{listing_id}?token=<jwt>`**
  * **Description:** Establish a real-time connection for a specific auction listing. Each inbound message is processed in a fresh DB session under a Redis lock (`lock:bid:{listing_id}`) to prevent race conditions.
  * **Connection:** Pass `token` (JWT) via query string. Missing or invalid token closes the connection with WebSocket code `1008 (Policy Violation)`.
  * **Client Send (Place Bid):**
    ```json
    {
      "type": "place_bid",
      "amount": "float"
    }
    ```
  * **Server Broadcast (Success):** Sent to all clients connected to the listing room.
    ```json
    {
      "type": "new_bid",
      "listing_id": "uuid (string)",
      "current_price": "float",
      "bidder_id": "uuid (string)",
      "amount": "float",
      "timestamp": "datetime (ISO 8601)"
    }
    ```
  * **Server Direct Message (Error):** Sent only to the originating client. Covers: invalid action type, invalid bid amount, non-active listing, expired auction, seller bidding on own listing, insufficient balance, bid below minimum increment.
    ```json
    {
      "type": "error",
      "message": "string"
    }
    ```

### Health Check

* **`GET /v1.0.0/bids/health`**
  * **Response:** `{"status": "ok", "service": "bidding-engine", "version": "v1.0.0"}`

---

## 3. Recommendation Engine - v1.0.0
Provides personalized and trending auction suggestions. All routes are served under the prefix `/{version}/recs` (e.g. `/v1.0.0/recs`). Personalization uses a hybrid of demographic segment matching (age group, city) and category affinity derived from behavioral history; when no behavioral history exists, falls back to cold-start onboarding interests (`user_interests` table).

### Recommendations (`/recs`)

* **`GET /v1.0.0/recs/trending`**
  * **Description:** Returns ranked active listings. When `user_id` is supplied and the user has a profile or interaction history, the ranking is personalized (demographic segment boost + category affinity boost). Without `user_id`, or for users with no profile/history/interests, returns pure engagement-weighted trending.
  * **Request Parameters:**

    | Param | Type | Required | Default | Description |
    |---|---|---|---|---|
    | `user_id` | `uuid` | No | `null` | Authenticated user's ID. Enables personalization. |
    | `limit` | `int` | No | `20` | Number of results (1–100). |

  * **Response (200 OK):** `TrendingResponse`
    ```json
    {
      "items": [
        {
          "id": "uuid",
          "title": "string",
          "current_price": "float",
          "end_time": "datetime | null",
          "score": "float"
        }
      ],
      "count": "int",
      "type": "personalized | trending"
    }
    ```
    * `score` — ML ranking score used to order results; higher = more relevant.
    * `type` — `"personalized"` if demographic or category signals were applied; `"trending"` if the response is cold-start/engagement-only.

### Health Check

* **`GET /v1.0.0/recs/health`**
  * **Response:** `{"status": "ok", "service": "recommendation-engine", "version": "v1.0.0"}`
