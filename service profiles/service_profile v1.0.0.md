# Service Profile

This document outlines the API endpoints, request schemas, and response schemas for each microservice in the Online Auction Platform.

---

## 1. Backend (API Gateway) - v1.0.0
Handles authentication, core auction CRUD operations, image uploads, and routing.

### Authentication (`/auth`)

* **`POST /auth/register`**
  * **Description:** Register a new user.
  * **Request:** JSON object (`UserCreate`)
    ```json
    {
      "username": "string",
      "email": "string (email)",
      "password": "string"
    }
    ```
  * **Response (201 Created):** JSON object (`UserResponse`)
    ```json
    {
      "id": "uuid",
      "username": "string",
      "email": "string"
    }
    ```

* **`POST /auth/login`**
  * **Description:** Authenticate user and issue tokens.
  * **Request:** `multipart/form-data` (OAuth2 Password Request Form)
    * `username`: string
    * `password`: string
  * **Response (200 OK):** JSON object (`Token`)
    ```json
    {
      "access_token": "string (JWT)",
      "token_type": "bearer"
    }
    ```

* **`GET /auth/get_current_user`**
  * **Description:** Get details of the currently authenticated user.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Response (200 OK):** JSON object (`UserResponse`)
    ```json
    {
      "id": "uuid",
      "username": "string",
      "email": "string"
    }
    ```

### Auctions (`/auctions`)

* **`GET /auctions/`**
  * **Description:** Get a paginated list of auctions.
  * **Request Parameters:** `page` (int), `size` (int), `status` (string, optional), `search` (string, optional)
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
          "condition": "new | used | refurbished",
          "bidding_type": "price_up | low_start | public",
          "starting_price": "float",
          "reserve_price": "float",
          "current_price": "float",
          "min_increment": "float",
          "status": "draft | pending_review | active | ended | removed",
          "start_time": "datetime",
          "end_time": "datetime",
          "created_at": "datetime",
          "updated_at": "datetime",
          "images": [
            {
              "id": "uuid",
              "s3_key": "string",
              "sort_order": "int",
              "is_primary": "boolean",
              "image_url": "string"
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

* **`GET /auctions/get_user_listings`**
  * **Description:** Get listings created by the authenticated user.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Response (200 OK):** JSON object (`PaginatedAuctionResponse`)
    *(Same response structure as `GET /auctions/`)*

* **`GET /auctions/get_auction/{id}`**
  * **Description:** Get details of a specific auction listing.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** JSON object (`AuctionListingResponse`)
    *(Same single object structure as an item in `GET /auctions/`)*

* **`GET /auctions/get_auction_bids/{id}/bids`**
  * **Description:** Get bid history for a specific auction.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** JSON array of `BidResponse` objects.
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

* **`POST /auctions/create_listing`**
  * **Description:** Create a new auction listing (text data only).
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Request:** JSON object (`ListingCreate`)
    ```json
    {
      "title": "string",
      "description": "string | null",
      "condition": "new | used | refurbished",
      "bidding_type": "price_up | low_start | public",
      "starting_price": "float",
      "reserve_price": "float",
      "min_increment": "float",
      "start_time": "datetime",
      "end_time": "datetime",
      "category_id": "uuid | null"
    }
    ```
  * **Response (201 Created):** JSON object (`AuctionListingResponse`)

* **`POST /auctions/upload_auction_images/{id}`**
  * **Description:** Upload multiple images for a specific listing.
  * **Request Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
  * **Request:** Form-Data
    * `files`: List of `UploadFile` (image/jpeg, image/png)
  * **Response (200 OK):** JSON array of `ListingImageResponse`
    ```json
    [
      {
        "id": "uuid",
        "s3_key": "string",
        "sort_order": "int",
        "is_primary": "boolean",
        "image_url": "string"
      }
    ]
    ```

### Health Check

* **`GET /health`**
  * **Response:** `{"status": "ok", "service": "API Gateway", "version": "v1.0.0"}`

---

## 2. Bidding Engine - v1.0.0
High-concurrency, real-time bid processing service using WebSockets and Redis locks.

### WebSockets (`/ws`)

* **`WebSocket /ws/{listing_id}?token=<jwt>`**
  * **Description:** Establish a real-time connection for a specific auction listing.
  * **Connection Request:** Pass `token` via query string for JWT authentication.
  * **Client Send (Place Bid):**
    ```json
    {
      "type": "place_bid",
      "amount": "float"
    }
    ```
  * **Server Broadcast (Success):** Sent to all clients connected to the room.
    ```json
    {
      "type": "new_bid",
      "current_price": "float",
      "bidder_id": "uuid",
      "amount": "float"
    }
    ```
  * **Server Direct Message (Error):** Sent only to the client that made the invalid bid.
    ```json
    {
      "type": "error",
      "message": "string"
    }
    ```

### Health Check

* **`GET /health`**
  * **Response:** `{"status": "ok", "service": "bidding-engine", "version": "v1.0.0"}`

---

## 3. Recommendation Engine - v1.0.0
Provides personalized and trending suggestions to users.

### Recommendations (`/recommendations`)

* **`GET /trending`**
  * **Description:** Get trending items (mostly used for cold starts).
  * **Request Parameters:** None (potentially limit/offset in future)
  * **Response (200 OK):** JSON object
    ```json
    {
      "items": "array",
      "count": "int",
      "type": "string"
    }
    ```

### Health Check

* **`GET /health`**
  * **Response:** `{"status": "ok", "service": "recommendation-engine", "version": "v1.0.0"}`
