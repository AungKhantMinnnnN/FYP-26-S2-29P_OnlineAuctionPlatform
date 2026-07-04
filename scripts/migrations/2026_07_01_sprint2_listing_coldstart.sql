-- Migration: Sprint 2 listing features + ML cold-start
-- Date: 2026-07-01
-- Sprint: 2
--
-- Changes:
--   1. Add listings.brand, condition_confidence, is_draft columns
--   2. Make listings.start_time, end_time, reserve_price nullable (draft support)
--   3. Create user_interests table (ML cold-start onboarding picks)
--
-- Apply once on each environment's Postgres instance.
-- Safe to re-run: uses IF NOT EXISTS / idempotent guards.

BEGIN;

-- 1. Listing new columns
ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS brand              VARCHAR(100),
    ADD COLUMN IF NOT EXISTS condition_confidence DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS is_draft          BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Make time/price columns nullable to support draft listings without scheduled times
ALTER TABLE listings
    ALTER COLUMN start_time   DROP NOT NULL,
    ALTER COLUMN end_time     DROP NOT NULL,
    ALTER COLUMN reserve_price DROP NOT NULL;

-- 3. Create user_interests table
CREATE TABLE IF NOT EXISTS user_interests (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, category_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_listings_brand       ON listings(brand);
CREATE INDEX IF NOT EXISTS idx_user_interests_user  ON user_interests(user_id);

COMMIT;

-- Verify
SELECT 'listings.brand'              AS check_item, COUNT(*) AS rows_with_value FROM listings WHERE brand IS NOT NULL
UNION ALL
SELECT 'listings.is_draft',           COUNT(*)                                  FROM listings WHERE is_draft = TRUE
UNION ALL
SELECT 'user_interests rows',          COUNT(*)                                  FROM user_interests;
