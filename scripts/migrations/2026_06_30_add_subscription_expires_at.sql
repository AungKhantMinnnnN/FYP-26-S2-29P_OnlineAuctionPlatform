-- Migration: Sprint 2 subscription features
-- Date: 2026-06-30
-- Sprint: 2 (US #101 - Renew/Cancel subscription)
--
-- Changes:
--   1. Add users.subscription_expires_at column (tracks when premium tier expires)
--   2. Create subscription_tiers table (data-driven pricing config)
--   3. Seed subscription_tiers with default free + premium rows
--
-- Apply once on each environment's Postgres instance.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT guards.

BEGIN;

-- 0. Ensure pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Add subscription_expires_at to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ NULL;

-- 2. Create subscription_tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier            subscription_tier UNIQUE NOT NULL,
    price           DOUBLE PRECISION NOT NULL,
    duration_days   INTEGER NOT NULL,
    description     VARCHAR NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_subscription_tiers_id ON subscription_tiers (id);

-- 3. Seed default tiers (idempotent via ON CONFLICT on the unique 'tier' column)
INSERT INTO subscription_tiers (tier, price, duration_days, description, is_active)
VALUES
    ('free',    0.0,   365, 'Free tier - basic marketplace access',                TRUE),
    ('premium', 49.0,  365, 'Premium - unlimited bids, priority support, 1 year', TRUE)
ON CONFLICT (tier) DO NOTHING;

COMMIT;

-- Verify
SELECT 'users.subscription_expires_at' AS check_item, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'subscription_expires_at';

SELECT 'subscription_tiers seed rows' AS check_item, tier, price, duration_days, is_active
FROM subscription_tiers
ORDER BY tier;
