# Service Profile

This document outlines the API endpoints, request schemas, and response schemas for each microservice in the Online Auction Platform.

---

## 1. Backend (API Gateway) - v1.0.0
Handles authentication, core auction CRUD operations, image uploads, and routing. All routes are served under the prefix `/{version}` (e.g. `/v1.0.0`).

### Authentication (`/v1.0.0/auth`)

* **`POST /v1.0.0/auth/register`**
  * **Description:** Register a new user. Creates both a `users` and a `user_profiles` record in a single call. After successful creation, a verification email is sent to the new user's address automatically (no-op if SMTP is not configured; the user can request a resend later).
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

* **`POST /v1.0.0/auth/password-reset/request`**
  * **Description:** Initiate password reset. Always returns a success-shaped response regardless of whether the email is registered (prevents account enumeration). When the email exists, a token row is created in `password_reset_tokens` and a reset link is emailed to the user. The link points to `${FRONTEND_URL}/reset-password?token=<token>` and expires in 1 hour.
  * **Request:** JSON object (`PasswordResetRequest`)
    ```json
    {
      "email": "string (email)"
    }
    ```
  * **Response (200 OK):** JSON object (`GenericMessageResponse`)
    ```json
    {
      "message": "If an account with that email exists, a password reset link has been sent."
    }
    ```

* **`POST /v1.0.0/auth/password-reset/confirm`**
  * **Description:** Submit a new password using a reset token from the email link. Tokens are single-use and time-bound — reusing or submitting an expired token returns 400.
  * **Request:** JSON object (`PasswordResetConfirm`)
    ```json
    {
      "token": "string",
      "new_password": "string"
    }
    ```
  * **Response (200 OK):** JSON object (`GenericMessageResponse`)
    ```json
    {
      "message": "Password reset successful. You can now log in with your new password."
    }
    ```
  * **Error responses (400):** Invalid token, used token, or expired token.

* **`POST /v1.0.0/auth/email-verification/send`**
  * **Description:** Re-send the email verification link to the currently authenticated user. No-ops with a success message if the user is already verified. Token expires in 24 hours.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Request Body:** *(none)*
  * **Response (200 OK):** JSON object (`GenericMessageResponse`)
    ```json
    {
      "message": "Verification email sent. Please check your inbox."
    }
    ```

* **`POST /v1.0.0/auth/email-verification/confirm`**
  * **Description:** Confirm an email verification token from the link in the verification email. Sets `users.email_verified = true` on success. Idempotent — re-submitting an already-used token succeeds silently. Expired tokens return 400.
  * **Request:** JSON object (`EmailVerificationConfirm`)
    ```json
    {
      "token": "string"
    }
    ```
  * **Response (200 OK):** JSON object (`GenericMessageResponse`)
    ```json
    {
      "message": "Email verified successfully."
    }
    ```

* **`POST /v1.0.0/auth/change-password`**
  * **Description:** Change the current authenticated user's password. Requires the correct current password for verification before the new password is applied.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Request:** JSON object (`ChangePasswordRequest`)
    ```json
    {
      "current_password": "string",
      "new_password": "string"
    }
    ```
  * **Response (200 OK):** JSON object (`GenericMessageResponse`)
    ```json
    {
      "message": "Password updated successfully."
    }
    ```
  * **Errors:** `400` if `current_password` is incorrect.

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
  * **Request Parameters:** `page` (int, default 1), `size` (int, default 20, max 100), `status` (enum, optional), `category_id` (uuid, optional), `search` (string, optional), `condition` (`new | used | refurbished`, optional), `min_price` (float ≥ 0, optional), `max_price` (float ≥ 0, optional)
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

* **`DELETE /v1.0.0/auctions/{id}`**
  * **Description:** Seller only. Soft-deletes a listing by setting its status to `removed`. Blocked if the listing has any bids (escrow integrity) or has already ended.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Request Parameters:** `id` (UUID) in path
  * **Response (204 No Content)**
  * **Errors:** `403` if not the seller. `404` if not found. `400` if listing is already ended. `409` if the listing has one or more bids.

* **`POST /v1.0.0/auctions/{id}/status`**
  * **Description:** Seller only. Update the status of a listing. The primary use case is publishing a draft (`draft → active` or `draft → pending_review`). Reverting an active listing back to `draft` or `pending_review` is only permitted if no bids have been placed. Setting status to `ended` is blocked — that transition is system-only.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Request Parameters:** `id` (UUID) in path
  * **Request:** JSON object (`ListingStatusUpdate`)
    ```json
    { "status": "draft | pending_review | active | removed" }
    ```
  * **Response (200 OK):** `AuctionListingResponse` *(full updated listing)*
  * **Errors:** `403` if not the seller. `404` if not found. `400` if listing is already ended or if `ended` is passed as the new status. `409` if reverting an active listing that already has bids.

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
        "issue_type_id": "uuid | null",
        "subject": "string | null",
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
  * **Description:** Authenticated user. Submit a dispute or platform feedback. `listing_id` is optional — omit for general platform feedback, include for a listing-specific report. `issue_type_id` must reference a valid entry from `/issue-types/`.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Request:** JSON object (`DisputeCreate`)
    ```json
    {
      "listing_id": "uuid | null",
      "issue_type_id": "uuid",
      "subject": "string",
      "category": "string",
      "description": "string"
    }
    ```
  * **Response (201 Created):** `DisputeResponse`

---

### Issue Types (`/v1.0.0/issue-types`)

Lookup table used to categorise support disputes. Populated by admins, consumed by the public support form.

* **`GET /v1.0.0/issue-types/`**
  * **Description:** Public. Returns all issue types for use in the support page dropdown.
  * **Response (200 OK):** JSON array of `IssueTypeResponse`
    ```json
    [
      {
        "id": "uuid",
        "name": "string",
        "created_at": "datetime"
      }
    ]
    ```

* **`POST /v1.0.0/issue-types/`**
  * **Description:** Admin only. Create a new issue type. Name must be unique.
  * **Request Headers:** `Authorization: Bearer <token>` *(admin role required)*
  * **Request:** JSON object (`IssueTypeCreate`)
    ```json
    { "name": "string" }
    ```
  * **Response (201 Created):** `IssueTypeResponse`
  * **Errors:** `409 Conflict` if name already exists.

* **`PATCH /v1.0.0/issue-types/{id}`**
  * **Description:** Admin only. Rename an existing issue type.
  * **Request Headers:** `Authorization: Bearer <token>` *(admin role required)*
  * **Request Parameters:** `id` (UUID) in path
  * **Request:** JSON object (`IssueTypeUpdate`)
    ```json
    { "name": "string" }
    ```
  * **Response (200 OK):** `IssueTypeResponse`
  * **Errors:** `404` if not found, `409 Conflict` if name already taken.

* **`DELETE /v1.0.0/issue-types/{id}`**
  * **Description:** Admin only. Delete an issue type. Existing disputes that reference this type will have their `issue_type_id` set to `null` (ON DELETE SET NULL).
  * **Request Headers:** `Authorization: Bearer <token>` *(admin role required)*
  * **Request Parameters:** `id` (UUID) in path
  * **Response (204 No Content)**
  * **Errors:** `404` if not found.

---

### Users (`/v1.0.0/users`)

All routes require authentication (`Authorization: Bearer <token>`).

* **`POST /v1.0.0/users/me/profile`**
  * **Description:** Update the current user's profile. All fields are optional — only supplied fields are updated. Creates the profile row if it doesn't exist yet.
  * **Request:** JSON object (`ProfileUpdateRequest`)
    ```json
    {
      "full_name": "string | null",
      "phone": "string | null",
      "address": "string | null",
      "dob": "string | null (YYYY-MM-DD)",
      "bio": "string | null"
    }
    ```
  * **Response (200 OK):** `ProfileResponse`
    ```json
    {
      "full_name": "string | null",
      "phone": "string | null",
      "address": "string | null",
      "dob": "string | null (YYYY-MM-DD)",
      "bio": "string | null"
    }
    ```
  * **Errors:** `400` if `dob` is not a valid ISO date string.

* **`GET /v1.0.0/users/me/interests`**
  * **Description:** Returns the interest categories the current user selected during onboarding. Used by the recommendation engine for cold-start personalisation.
  * **Response (200 OK):** `InterestsResponse`
    ```json
    {
      "items": [
        {
          "id": "uuid",
          "name": "string",
          "slug": "string"
        }
      ]
    }
    ```

* **`POST /v1.0.0/users/me/interests`**
  * **Description:** Save or replace the user's interest categories. If interests already exist, the full set is replaced (delete + insert in one transaction). At least one category ID is required.
  * **Request Headers:** `Authorization: Bearer <token>`
  * **Request:** JSON object (`InterestsUpdateRequest`)
    ```json
    { "category_ids": ["uuid", "uuid"] }
    ```
  * **Response (200 OK):** `InterestsResponse` *(updated list, ordered by name)*
    ```json
    {
      "items": [
        { "id": "uuid", "name": "string", "slug": "string" }
      ]
    }
    ```
  * **Errors:** `400` if `category_ids` is empty. `404` if any ID does not match a known category.

* **`GET /v1.0.0/users/me/bids`**
  * **Description:** Paginated bid history for the current user across all listings. Use `result` filter to narrow to won, outbid, or all bids.
  * **Request Parameters:** `page` (int, default 1), `size` (int, default 20, max 100), `result` (`all | won | outbid`, default `all`)
  * **Response (200 OK):** `BidHistoryResponse`
    ```json
    {
      "total": "int",
      "page": "int",
      "size": "int",
      "pages": "int",
      "items": [
        {
          "listing_id": "uuid",
          "listing_title": "string",
          "listing_image_url": "string | null",
          "listing_status": "string",
          "listing_end_time": "datetime",
          "my_highest_bid": "float",
          "current_price": "float",
          "result": "won | outbid | leading | active",
          "placed_at": "datetime"
        }
      ]
    }
    ```

* **`GET /v1.0.0/users/me/purchases`**
  * **Description:** Paginated list of auctions the current user has won.
  * **Request Parameters:** `page` (int, default 1), `size` (int, default 20, max 100)
  * **Response (200 OK):** `PurchasesResponse`
    ```json
    {
      "total": "int",
      "page": "int",
      "size": "int",
      "pages": "int",
      "items": [
        {
          "auction_result_id": "uuid",
          "listing_id": "uuid",
          "listing_title": "string",
          "listing_image_url": "string | null",
          "final_price": "float",
          "ended_at": "datetime"
        }
      ]
    }
    ```

* **`GET /v1.0.0/users/me/watchlist`**
  * **Description:** Returns the current user's full watchlist with listing details.
  * **Response (200 OK):** `WatchlistResponse`
    ```json
    {
      "items": [
        {
          "watchlist_id": "uuid",
          "listing_id": "uuid",
          "added_at": "datetime",
          "listing": {
            "id": "uuid",
            "title": "string",
            "description": "string | null",
            "condition": "string",
            "current_price": "float",
            "starting_price": "float",
            "status": "string",
            "start_time": "datetime",
            "end_time": "datetime",
            "image_url": "string | null"
          }
        }
      ],
      "listing_ids": ["uuid"]
    }
    ```

* **`POST /v1.0.0/users/me/watchlist`**
  * **Description:** Add a listing to the current user's watchlist.
  * **Request:** JSON object (`WatchlistAddRequest`)
    ```json
    { "listing_id": "uuid" }
    ```
  * **Response (200 OK):** `WatchlistAddResponse`
    ```json
    {
      "watchlist_id": "uuid",
      "listing_id": "uuid",
      "added_at": "datetime"
    }
    ```

* **`DELETE /v1.0.0/users/me/watchlist/{listing_id}`**
  * **Description:** Remove a listing from the current user's watchlist.
  * **Request Parameters:** `listing_id` (UUID) in path
  * **Response (204 No Content)**

* **`GET /v1.0.0/users/me/wallet`**
  * **Description:** Returns current wallet balance and paginated transaction history.
  * **Request Parameters:** `page` (int, default 1), `size` (int, default 20, max 100)
  * **Response (200 OK):** `WalletResponse`
    ```json
    {
      "balance": "float",
      "transactions": {
        "total": "int",
        "page": "int",
        "size": "int",
        "pages": "int",
        "items": [
          {
            "id": "uuid",
            "amount": "float",
            "type": "topup | bid_hold | bid_release | settlement",
            "reference": "string | null",
            "created_at": "datetime"
          }
        ]
      }
    }
    ```

* **`POST /v1.0.0/users/me/subscription`**
  * **Description:** Renew or cancel the current user's subscription tier.
  * **Request:** JSON object (`SubscriptionActionRequest`)
    ```json
    { "action": "renew | cancel" }
    ```
  * **Response (200 OK):** `SubscriptionResponse`
    ```json
    {
      "subscription_tier": "free | premium",
      "subscription_expires_at": "datetime | null",
      "balance": "float",
      "message": "string"
    }
    ```

* **`GET /v1.0.0/users/me/stats`**
  * **Description:** Returns aggregated seller statistics for the current user — total views on all their listings, how many users have watchlisted their items, number of completed sales (won auctions where the seller is the current user), and cumulative sales revenue.
  * **Response (200 OK):** `SellerStatsResponse`
    ```json
    {
      "total_views": "int",
      "total_watchlists": "int",
      "total_sales": "int",
      "total_revenue": "float"
    }
    ```

---

### Subscription Tiers (`/v1.0.0/subscription-tiers`)

* **`GET /v1.0.0/subscription-tiers`**
  * **Description:** Public. Returns all active subscription tier configurations for display on the plans/pricing page.
  * **Response (200 OK):** `SubscriptionTiersResponse`
    ```json
    {
      "items": [
        {
          "id": "uuid",
          "tier": "free | premium",
          "price": "float",
          "duration_days": "int",
          "description": "string | null",
          "is_active": "boolean",
          "created_at": "datetime",
          "updated_at": "datetime"
        }
      ]
    }
    ```

---

### Collector Boards (`/v1.0.0/boards`)

Premium feature. Boards let premium users curate and publicly share a showcase of items they have won. All write routes require a premium subscription (admins bypass this gate). Public read routes require no authentication.

* **`GET /v1.0.0/boards/me`**
  * **Description:** Premium owner. Returns all own boards (public and private) with item counts.
  * **Response (200 OK):** JSON array of `BoardSummaryResponse`
    ```json
    [
      {
        "id": "uuid",
        "user_id": "uuid",
        "name": "string",
        "description": "string | null",
        "is_public": "boolean",
        "item_count": "int",
        "created_at": "datetime",
        "updated_at": "datetime"
      }
    ]
    ```

* **`GET /v1.0.0/boards/user/{user_id}`**
  * **Description:** Public. Returns all public boards belonging to a specific user.
  * **Request Parameters:** `user_id` (UUID) in path
  * **Response (200 OK):** JSON array of `BoardSummaryResponse` *(same shape as above)*

* **`GET /v1.0.0/boards/{id}`**
  * **Description:** Mixed auth. Public boards are visible to anyone. Private boards return `404` (not `403`) to avoid leaking existence.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** `BoardResponse`
    ```json
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "string",
      "description": "string | null",
      "is_public": "boolean",
      "created_at": "datetime",
      "updated_at": "datetime",
      "items": [
        {
          "id": "uuid",
          "board_id": "uuid",
          "auction_result_id": "uuid",
          "note": "string | null",
          "sort_order": "int",
          "added_at": "datetime",
          "listing": {
            "id": "uuid",
            "title": "string",
            "image_url": "string | null",
            "final_price": "float",
            "ended_at": "datetime"
          }
        }
      ]
    }
    ```

* **`POST /v1.0.0/boards/`**
  * **Description:** Premium owner. Create a new collector board.
  * **Request:** JSON object (`BoardCreate`)
    ```json
    {
      "name": "string",
      "description": "string | null",
      "is_public": "boolean (default: false)"
    }
    ```
  * **Response (201 Created):** `BoardSummaryResponse`

* **`POST /v1.0.0/boards/{id}`**
  * **Description:** Premium owner. Update board name, description, or visibility. All fields optional.
  * **Request Parameters:** `id` (UUID) in path
  * **Request:** JSON object (`BoardUpdate`)
    ```json
    {
      "name": "string | null",
      "description": "string | null",
      "is_public": "boolean | null"
    }
    ```
  * **Response (200 OK):** `BoardSummaryResponse`
  * **Errors:** `404` if board not found or not owned by the caller.

* **`DELETE /v1.0.0/boards/{id}`**
  * **Description:** Premium owner. Delete a board and all its items (cascade).
  * **Request Parameters:** `id` (UUID) in path
  * **Response (204 No Content)**

* **`POST /v1.0.0/boards/{id}/items`**
  * **Description:** Premium owner. Add a won auction result to a board. The caller must be the winner of the referenced auction result. Duplicate items on the same board return `409`.
  * **Request Parameters:** `id` (UUID, board) in path
  * **Request:** JSON object (`BoardItemAdd`)
    ```json
    {
      "auction_result_id": "uuid",
      "note": "string | null",
      "sort_order": "int (default: 0)"
    }
    ```
  * **Response (201 Created):** `BoardItemResponse` *(full item with listing snapshot)*
  * **Errors:** `404` if board not found or auction result not won by caller. `409` if item already on board.

* **`POST /v1.0.0/boards/{id}/items/reorder`**
  * **Description:** Premium owner. Batch-update `sort_order` for drag-and-drop reordering.
  * **Request Parameters:** `id` (UUID, board) in path
  * **Request:** JSON object (`BoardItemsReorder`)
    ```json
    {
      "items": [
        { "item_id": "uuid", "sort_order": "int" }
      ]
    }
    ```
  * **Response (204 No Content)**

* **`POST /v1.0.0/boards/{id}/items/{item_id}`**
  * **Description:** Premium owner. Edit an item's note or sort order. Pass `target_board_id` to move the item to a different board owned by the same user. Duplicate check is performed on the target board.
  * **Request Parameters:** `id` (UUID, board), `item_id` (UUID) in path
  * **Request:** JSON object (`BoardItemUpdate`)
    ```json
    {
      "note": "string | null",
      "sort_order": "int | null",
      "target_board_id": "uuid | null"
    }
    ```
  * **Response (200 OK):** `BoardItemResponse`
  * **Errors:** `404` if item not found. `409` if item already exists on target board.

* **`DELETE /v1.0.0/boards/{id}/items/{item_id}`**
  * **Description:** Premium owner. Remove an item from a board.
  * **Request Parameters:** `id` (UUID, board), `item_id` (UUID) in path
  * **Response (204 No Content)**

---

### Feedback (`/v1.0.0/feedback`)

#### Feedback Types (Public & Admin)

* **`GET /v1.0.0/feedback/types`**
  * **Description:** Public. Returns all active feedback types.
  * **Response (200 OK):**
    ```json
    [{ "id": "uuid", "name": "string", "reviewer_role": "buyer|seller", "is_active": true, "created_at": "datetime" }]
    ```

* **`GET /v1.0.0/feedback/types/all`**
  * **Description:** Admin only. Returns all feedback types including inactive ones.
  * **Headers:** `Authorization: Bearer <token>` (admin role required)
  * **Response (200 OK):** Same shape as above.

* **`POST /v1.0.0/feedback/types`**
  * **Description:** Admin only. Create a new feedback type.
  * **Headers:** `Authorization: Bearer <token>` (admin role required)
  * **Request Body:**
    ```json
    { "name": "string", "reviewer_role": "buyer|seller" }
    ```
  * **Response (201 Created):** Created `FeedbackType` object.
  * **Error (409):** Name already exists.

* **`PATCH /v1.0.0/feedback/types/{id}`**
  * **Description:** Admin only. Rename or toggle active status of a feedback type.
  * **Headers:** `Authorization: Bearer <token>` (admin role required)
  * **Request Body (all fields optional):**
    ```json
    { "name": "string", "is_active": true }
    ```
  * **Response (200 OK):** Updated `FeedbackType` object.
  * **Error (409):** Name already taken by another type.

* **`DELETE /v1.0.0/feedback/types/{id}`**
  * **Description:** Admin only. Delete a feedback type. Fails if any feedback records reference it — deactivate instead.
  * **Headers:** `Authorization: Bearer <token>` (admin role required)
  * **Response (204 No Content)**
  * **Error (409):** Feedback records reference this type.

#### Feedback Reads (Public)

* **`GET /v1.0.0/feedback/public?limit=10`**
  * **Description:** Public. Returns recent public feedback items for the landing page carousel. `limit` max 50.
  * **Response (200 OK):**
    ```json
    [{
      "id": "uuid", "listing_id": "uuid", "reviewer_id": "uuid", "reviewee_id": "uuid",
      "feedback_type_id": "uuid", "rating": 5, "comment": "string|null",
      "is_public": true, "created_at": "datetime",
      "reviewer": { "id": "uuid", "username": "string" },
      "reviewee": { "id": "uuid", "username": "string" },
      "feedback_type": { "id": "uuid", "name": "string", "reviewer_role": "buyer|seller", "is_active": true, "created_at": "datetime" },
      "listing": { "id": "uuid", "title": "string" }
    }]
    ```

* **`GET /v1.0.0/feedback/listing/{listing_id}`**
  * **Description:** Public. All public feedback for a specific listing.
  * **Response (200 OK):** Same shape as above.

* **`GET /v1.0.0/feedback/user/{user_id}`**
  * **Description:** Public. All public feedback received by a user.
  * **Response (200 OK):** Same shape as above.

#### Feedback Submit (Authenticated)

* **`GET /v1.0.0/feedback/me/eligibility/{listing_id}`**
  * **Description:** Authenticated. Check which feedback types the current user can submit for a listing. A buyer is eligible if they have placed at least one bid; a seller is eligible if they own the listing.
  * **Headers:** `Authorization: Bearer <token>`
  * **Response (200 OK):**
    ```json
    {
      "eligible_type_ids": ["uuid"],
      "already_submitted_type_ids": ["uuid"],
      "seller_id": "uuid"
    }
    ```
    * `seller_id` — the listing's seller user ID; used by the frontend to populate `reviewee_id` on submission.

* **`POST /v1.0.0/feedback/`**
  * **Description:** Authenticated. Submit feedback for a listing participant. One submission per `(listing_id, reviewer_id, feedback_type_id)` triple.
  * **Headers:** `Authorization: Bearer <token>`
  * **Request Body:**
    ```json
    {
      "listing_id": "uuid",
      "reviewee_id": "uuid",
      "feedback_type_id": "uuid",
      "rating": 5,
      "comment": "string (optional)"
    }
    ```
  * **Validation:**
    * `rating` — integer 1–5.
    * For `buyer` feedback types: `reviewee_id` must be the listing's seller. Reviewer must have bid on the listing.
    * For `seller` feedback types: reviewer must be the listing's seller.
  * **Response (201 Created):** Full `FeedbackItem` object (same shape as public reads).
  * **Error (403):** Not eligible (no bids / not seller).
  * **Error (409):** Already submitted this feedback type for this listing.

---

### Marketing (`/v1.0.0`)

* **`GET /v1.0.0/marketing-video`**
  * **Description:** Public. Returns a 1-hour presigned URL for the hero marketing video stored in MinIO.
  * **Response (200 OK):**
    ```json
    { "url": "string (presigned URL)" }
    ```
  * **Errors:** `404` if no video has been uploaded yet.

* **`POST /v1.0.0/marketing-video`**
  * **Description:** Admin only. Upload (or replace) the hero marketing video. Always writes to the fixed key `hero-video` in the `auction-videos` bucket — re-uploading silently replaces the previous video. Accepted types: `video/mp4`, `video/webm`, `video/ogg`.
  * **Request Headers:** `Authorization: Bearer <token>` *(admin role required)*, `Content-Type: multipart/form-data`
  * **Request:** Form-Data — `file`: video file
  * **Response (204 No Content)**
  * **Errors:** `400` if file type is not an accepted video format.

---

### Admin (`/v1.0.0/admin`)

All routes require `Authorization: Bearer <token>` for a user with `role = admin`; otherwise `403 Forbidden`. Every mutating action writes a row to `admin_logs` (`admin_id`, `action`, `target_id`, `details`, `created_at`) in the same transaction as the change it performs, so the change and its audit trail can never diverge.

#### User management

Reconciled with the `feature/admin-user-management` PR that merged separately: that PR's `admin_users` router was never actually registered (imported but no `include_router()` call — none of its endpoints were reachable) and it never implemented `unsuspend` despite the spec requiring it, so this `admin.py` implementation stays canonical. Its good ideas — admin-account protection, suspension notifications, a required reason, and a single-user detail endpoint — are folded in below.

* **`GET /v1.0.0/admin/users`**
  * **Description:** Paginated list of all users. Search matches username, email, or full name (case-insensitive, partial). Filter by status.
  * **Request Parameters:** `search` (string, optional), `status` (`active | suspended | deleted`, optional), `page` (int, default 1), `size` (int, default 20, max 100)
  * **Response (200 OK):** `AdminUsersResponse`
    ```json
    {
      "total": "int",
      "page": "int",
      "size": "int",
      "pages": "int",
      "items": [
        {
          "id": "uuid",
          "username": "string",
          "email": "string",
          "role": "user | admin",
          "status": "active | suspended | deleted",
          "created_at": "datetime"
        }
      ]
    }
    ```

* **`GET /v1.0.0/admin/users/{id}`**
  * **Description:** Full detail view of a single user, including profile and (if currently suspended) the suspension reason and timestamp, derived from the latest `suspend_user` row in `admin_logs` for this user — no separate suspension columns needed.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** `AdminUserDetails`
    ```json
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "role": "user | admin",
      "status": "active | suspended | deleted",
      "created_at": "datetime",
      "subscription_tier": "free | premium",
      "balance": "float",
      "email_verified": "boolean",
      "updated_at": "datetime",
      "suspended_at": "datetime | null",
      "suspension_reason": "string | null",
      "profile": {
        "full_name": "string | null",
        "phone": "string | null",
        "address": "string | null",
        "dob": "string | null (YYYY-MM-DD)",
        "bio": "string | null"
      } | null
    }
    ```
  * **Errors:** `404` if not found.

* **`PATCH /v1.0.0/admin/users/{id}/suspend`**
  * **Description:** Sets `user.status = suspended`. Sends the user a `Notification` explaining why (via `reason`).
  * **Request Parameters:** `id` (UUID) in path
  * **Request:** JSON object (`SuspendUserRequest`)
    ```json
    { "reason": "string (3-1000 chars)" }
    ```
  * **Response (200 OK):** `AdminUserDetails`
  * **Errors:** `404` if not found. `400` if the admin targets their own account, the reason is blank/whitespace-only, the account is already deleted, or it's already suspended. `403` if the target is an administrator account — admins cannot be suspended.

* **`PATCH /v1.0.0/admin/users/{id}/unsuspend`**
  * **Description:** Sets `user.status = active`. Sends the user a `Notification` confirming reinstatement.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** `AdminUserDetails`
  * **Errors:** `404` if not found. `400` if the user is not currently suspended.

* **`DELETE /v1.0.0/admin/users/{id}`**
  * **Description:** Soft delete — sets `user.status = deleted`. The row is never physically removed. Sends the user a `Notification`.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (204 No Content)**
  * **Errors:** `404` if not found. `400` if the admin targets their own account or the account is already deleted. `403` if the target is an administrator account — admins cannot be deleted.

#### Listing moderation

* **`GET /v1.0.0/admin/listings`**
  * **Description:** Admin view of all listings across all sellers, including `draft` and `pending_review` (unlike the public `GET /auctions/`, which excludes drafts and isn't admin-gated).
  * **Request Parameters:** `status` (`draft | pending_review | active | ended | removed`, optional), `search` (string, optional), `page` (int, default 1), `size` (int, default 20, max 100)
  * **Response (200 OK):** `PaginatedAuctionResponse` *(same shape as `GET /auctions/`, see above)*

* **`PATCH /v1.0.0/admin/listings/{id}/approve`**
  * **Description:** Sets `status = active`, `is_draft = false`. Only valid from `draft` or `pending_review`.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** `AuctionListingResponse`
  * **Errors:** `404` if not found. `400` if the listing isn't in `draft` or `pending_review`.

* **`PATCH /v1.0.0/admin/listings/{id}/remove`**
  * **Description:** Sets `status = removed` regardless of bid count or ownership (the owner-only, no-active-bids guard on `DELETE /auctions/{id}` does not apply here). If the listing has a live current-highest bid and hasn't already been finalized (no `AuctionResult`), that bid's held funds are released back to the bidder and the bid is cancelled — otherwise removing a listing with an active bid would trap that bidder's money with no automatic way back.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** `AuctionListingResponse`
  * **Errors:** `404` if not found. `400` if already removed.

#### Auction restart

* **`POST /v1.0.0/admin/listings/{id}/restart`**
  * **Description:** For an ended auction affected by technical issues: sets `status = active` with a new `end_time`. If an `AuctionResult` exists for the listing, it is cleared and, if it had a `winner_id`, the winner is refunded `final_price` back to their wallet balance (`WalletTransaction`, `type = settlement`) — this is skipped entirely if no result exists yet, since auction finalisation isn't automated anywhere in this codebase (only ever produced by seed data today). Existing bids and bid history are left untouched.
  * **Request Parameters:** `id` (UUID) in path
  * **Request:** JSON object (`AuctionRestartRequest`)
    ```json
    { "end_time": "datetime" }
    ```
  * **Response (200 OK):** `AuctionListingResponse`
  * **Errors:** `404` if not found. `400` if the listing is not `ended`, or if `end_time` is not in the future. `409` if the existing `AuctionResult` is pinned to a user's collector board (`board_items.auction_result_id` is a non-cascading `NOT NULL` FK) — remove it from the board first.

#### Category management

* **`GET /v1.0.0/admin/categories`**
  * **Description:** Lists all categories including inactive ones (the public `GET /auctions/form_metadata` only returns `is_active = true`).
  * **Response (200 OK):** JSON array of `CategoryResponse` *(same shape as `form_metadata.categories`)*

* **`POST /v1.0.0/admin/categories`**
  * **Description:** Create a category. `slug` must be unique and lowercase-alphanumeric-with-hyphens (e.g. `vintage-watches`).
  * **Request:** JSON object (`CategoryCreate`)
    ```json
    { "name": "string", "slug": "string", "parent_id": "uuid | null", "is_active": "boolean (default true)" }
    ```
  * **Response (201 Created):** `CategoryResponse`
  * **Errors:** `409` if the slug is already taken. `404` if `parent_id` doesn't exist.

* **`PATCH /v1.0.0/admin/categories/{id}`**
  * **Description:** Update `name`, `slug`, `parent_id`, and/or toggle `is_active`. Only supplied fields are changed.
  * **Request Parameters:** `id` (UUID) in path
  * **Request:** JSON object (`CategoryUpdate`, all fields optional)
    ```json
    { "name": "string", "slug": "string", "parent_id": "uuid | null", "is_active": "boolean" }
    ```
  * **Response (200 OK):** `CategoryResponse`
  * **Errors:** `404` if the category (or given `parent_id`) doesn't exist. `409` if the new slug is already taken. `400` if `parent_id` is set to itself.

* **`DELETE /v1.0.0/admin/categories/{id}`**
  * **Description:** Hard-deletes the category only if nothing references it (no listings, no `user_interests` rows, no child categories) — otherwise it's deactivated (`is_active = false`) instead, to avoid breaking those foreign keys.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** `CategoryDeleteResponse`
    ```json
    { "id": "uuid", "action": "deleted | deactivated" }
    ```
  * **Errors:** `404` if not found.

#### Bid override

* **`DELETE /v1.0.0/admin/bids/{id}`**
  * **Description:** Cancels a specific bid (`bid.status = cancelled`). Only the *current* highest bid on a listing actually holds funds at any time — every earlier bid already had its hold released back to its bidder when it was outbid (see the bidding engine's own hold/release logic), so cancelling a non-current bid is a no-op beyond the status flip (`funds_released: false`). Cancelling the current highest bid releases its hold back to the bidder, then either re-holds funds for the next-highest remaining accepted bid and restores it as `current_price` (mirroring how a normal new bid holds funds), or resets `current_price` to `starting_price` if no other bids remain.
  * **Request Parameters:** `id` (UUID) in path
  * **Response (200 OK):** `BidCancelResponse`
    ```json
    {
      "bid_id": "uuid",
      "listing_id": "uuid",
      "status": "cancelled",
      "new_current_price": "float",
      "funds_released": "boolean"
    }
    ```
  * **Errors:** `404` if the bid or its listing isn't found. `400` if the bid isn't currently `accepted`. `409` if the auction has already been finalised (has an `AuctionResult` — use restart-auction instead), or if restoring the previous bid would require re-holding funds the bidder no longer has.

#### Admin logs & statistics

* **`GET /v1.0.0/admin/logs`**
  * **Description:** Reads the `admin_logs` audit trail — covers both "monitor system logs" and "view audit logs," which are the same underlying data. Every admin action above writes here.
  * **Request Parameters:** `page` (int, default 1), `size` (int, default 20, max 100), `admin_id` (uuid, optional), `action` (string, optional — exact match, e.g. `suspend_user`, `approve_listing`, `cancel_bid`, `restart_auction`, `deleted_category`)
  * **Response (200 OK):** `AdminLogsResponse`
    ```json
    {
      "total": "int",
      "page": "int",
      "size": "int",
      "pages": "int",
      "items": [
        {
          "id": "uuid",
          "admin_id": "uuid",
          "admin_username": "string",
          "action": "string",
          "target_id": "uuid | null",
          "details": "string | null",
          "created_at": "datetime"
        }
      ]
    }
    ```

* **`GET /v1.0.0/admin/stats`**
  * **Description:** Platform-wide aggregates for the admin dashboard. `total_users` and `suspended_users` exclude soft-deleted accounts from the total. `revenue` sums only negative-signed `settlement` wallet transactions (currently: premium subscription renewals) — auction settlements are peer-to-peer value transfer, not platform revenue, and aren't implemented as an automated flow anywhere in this codebase yet, so they're intentionally excluded rather than producing a misleading number. `new_registrations` covers the trailing 30 days, grouped by day.
  * **Response (200 OK):** `AdminStatsResponse`
    ```json
    {
      "total_users": "int",
      "active_auctions": "int",
      "total_bids": "int",
      "revenue": "float",
      "suspended_users": "int",
      "new_registrations": [
        { "date": "string (YYYY-MM-DD)", "count": "int" }
      ]
    }
    ```

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
Provides personalized and trending auction suggestions. All routes are served under the prefix `/{version}/recs` (e.g. `/v1.0.0/recs`). Personalization uses a hybrid of demographic segment matching (age group, city), category affinity, and brand affinity, derived from multiple signal sources: `user_interactions` (view, search, bid, watchlist events), explicit `bids` placed, active `watchlist` entries, `auction_results` (won auctions), and `board_items` curated on collector boards. Condition quality (`condition_confidence`) acts as a tie-breaker quality weight. When no behavioral history exists, falls back to cold-start onboarding interests (`user_interests` table).

### Recommendations (`/recs`)

* **`GET /v1.0.0/recs/trending`**
  * **Description:** Returns ranked active listings. When `user_id` is supplied and the user has a profile or interaction history, the ranking is personalized (demographic segment boost + category affinity boost + brand affinity boost + condition quality boost). Without `user_id`, or for users with no profile/history/interests, returns pure engagement-weighted trending. Category affinity cascades through: window interactions → auction wins → board-curated items → cold-start interests.
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
          "status": "listing_status",
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
          },
          "score": "float"
        }
      ],
      "count": "int",
      "type": "personalized | trending"
    }
    ```
    * `score` — ML ranking score used to order results; higher = more relevant.
    * `type` — `"personalized"` if demographic or category signals were applied; `"trending"` if the response is cold-start/engagement-only.
    * `image_url` — public URL constructed from `S3_PUBLIC_URL/{s3_key}`, served through Nginx.

### Health Check

* **`GET /v1.0.0/recs/health`**
  * **Response:** `{"status": "ok", "service": "recommendation-engine", "version": "v1.0.0"}`
