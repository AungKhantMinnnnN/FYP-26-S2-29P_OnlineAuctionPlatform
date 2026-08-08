-- Adds users.subscription_expires_at and a data-driven subscription_tiers table.

BEGIN;

-- Required for gen_random_uuid() below
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ NULL;

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
