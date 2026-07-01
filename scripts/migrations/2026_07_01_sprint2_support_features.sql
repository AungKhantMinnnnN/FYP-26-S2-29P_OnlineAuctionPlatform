-- Migration: Sprint 2 support page features
-- Date: 2026-07-01
-- Sprint: 2
--
-- Changes:
--   1. Create testimonials table
--   2. Create issue_types table
--   3. Update disputes table:
--      a. Rename legacy 'reason' column -> 'description' (if it exists)
--      b. Add 'category', 'subject', 'issue_type_id' columns
--      c. Make listing_id nullable
--      d. Add resolved_by, resolution_note, resolved_at columns
--
-- Apply once on each environment's Postgres instance.
-- Safe to re-run: uses IF NOT EXISTS / DO-block guards.

BEGIN;

-- 1. Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_featured
    ON testimonials(is_featured) WHERE is_featured = TRUE;

-- 2. Issue types
CREATE TABLE IF NOT EXISTS issue_types (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default issue types
INSERT INTO issue_types (name) VALUES
    ('Item Not Received'),
    ('Item Not as Described'),
    ('Damaged or Defective Item'),
    ('Fraudulent Listing'),
    ('Payment Issue'),
    ('Seller Misconduct'),
    ('Buyer Misconduct'),
    ('Counterfeit Item'),
    ('Shipping Problem'),
    ('Other')
ON CONFLICT (name) DO NOTHING;

-- 3. Disputes table updates
-- 3a. Rename legacy 'reason' -> 'description' if old column still exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'disputes' AND column_name = 'reason'
    ) THEN
        ALTER TABLE disputes RENAME COLUMN reason TO description;
    END IF;
END $$;

-- 3b. Add new columns
ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS category      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS subject       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS issue_type_id UUID REFERENCES issue_types(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS resolution_note TEXT,
    ADD COLUMN IF NOT EXISTS resolved_at   TIMESTAMPTZ;

-- Backfill category from description if blank (preserves existing data on upgrade)
UPDATE disputes SET category = 'General' WHERE category IS NULL;
ALTER TABLE disputes ALTER COLUMN category SET NOT NULL;

-- 3c. Make listing_id nullable (disputes can exist without a specific listing)
ALTER TABLE disputes ALTER COLUMN listing_id DROP NOT NULL;

COMMIT;

-- Verify
SELECT 'testimonials'  AS table_name, COUNT(*) FROM testimonials
UNION ALL
SELECT 'issue_types',                  COUNT(*) FROM issue_types
UNION ALL
SELECT 'disputes with category',        COUNT(*) FROM disputes WHERE category IS NOT NULL;
