"""
Shared configuration for the backend QA suite. Everything is overridable via
environment variables so the same scripts can target a local dev stack, the
shared VM, or CI, without editing code.
"""
import os

# The API Gateway is served behind nginx with no path prefix beyond the API
# version, e.g. http://100.75.75.48/v1.0.0/auctions/. See backend/app/main.py
# and the root .env.local's VITE_API_URL for the canonical value.
BASE_URL = os.environ.get("QA_BASE_URL", "http://100.75.75.48/v1.0.0").rstrip("/")

TIMEOUT = float(os.environ.get("QA_TIMEOUT", "20"))

# Seeded admin account (see scripts/seed_data.py). Used for every admin-only test.
ADMIN_EMAIL = os.environ.get("QA_ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.environ.get("QA_ADMIN_PASSWORD", "password123")

# A seeded, non-admin account used only for read-only cross-user checks (e.g.
# "user A cannot see user B's private wallet"). Never mutated destructively —
# tests that need to create/delete/suspend data register a brand-new ephemeral
# user instead (see auth_helpers.register_new_user).
SEEDED_USER_EMAIL = os.environ.get("QA_SEEDED_USER_EMAIL", "user1@example.com")
SEEDED_USER_PASSWORD = os.environ.get("QA_SEEDED_USER_PASSWORD", "password123")

SEEDED_USER_2_EMAIL = os.environ.get("QA_SEEDED_USER_2_EMAIL", "user2@example.com")
SEEDED_USER_2_PASSWORD = os.environ.get("QA_SEEDED_USER_2_PASSWORD", "password123")

# The backend container's port is also published directly on the VM host (see
# `docker ps`), bypassing nginx entirely. test_internal.py uses this to prove
# whether nginx's `location /v1.0.0/internal/ { return 404; }` block (see
# docker/nginx/default.conf) is the *only* thing standing between the public
# internet/Tailscale network and the unauthenticated /internal/* routes.
INTERNAL_DIRECT_BASE_URL = os.environ.get("QA_INTERNAL_DIRECT_BASE_URL", "http://100.75.75.48:8000/v1.0.0")

# Shared secret /internal/* now checks (see backend/app/api/deps.py's require_internal_key
# and H1 in the security audit). Empty by default -- the check is a no-op until both the
# backend and bidding-engine are actually configured with a matching value.
INTERNAL_API_KEY = os.environ.get("QA_INTERNAL_API_KEY", "")

# Gate for the handful of tests whose side effects are visible to real visitors
# of the target environment (currently: uploading/activating a marketing hero
# video). Off by default. Everything else in this suite only ever touches data
# it creates itself (unique test users, unique category slugs, unique CMS
# slugs, etc.) and is safe to run unconditionally.
RUN_LIVE_AFFECTING_TESTS = os.environ.get("QA_RUN_LIVE_AFFECTING_TESTS", "0") == "1"
