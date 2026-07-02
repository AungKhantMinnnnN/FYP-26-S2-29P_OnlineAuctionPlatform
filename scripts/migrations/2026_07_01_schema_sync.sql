-- Migration: Model-to-DB schema sync
-- Date: 2026-07-01
-- Sprint: 2
--
-- Changes:
--   1. notifications: replace type/ref_listing_id with title (model-driven)
--   2. admin_logs: replace target_type/metadata with details (model-driven)
--   3. auction_results: drop reserve_met (not tracked by backend model)
--   4. wallet_transactions: drop status (not tracked by backend model)
--
-- Apply once on each environment's Postgres instance.
-- Safe to re-run: uses IF EXISTS guards throughout.

BEGIN;

-- 1. notifications: add title, drop legacy columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Backfill title from type before dropping type
UPDATE notifications SET title = type WHERE title IS NULL AND type IS NOT NULL;
UPDATE notifications SET title = 'Notification' WHERE title IS NULL;
ALTER TABLE notifications ALTER COLUMN title SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE notifications DROP COLUMN type;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'notifications' AND column_name = 'ref_listing_id') THEN
        ALTER TABLE notifications DROP COLUMN ref_listing_id;
    END IF;
END $$;

-- 2. admin_logs: add details, drop legacy columns
ALTER TABLE admin_logs ADD COLUMN IF NOT EXISTS details TEXT;

DO $$
BEGIN
    -- Copy metadata JSON as text into details before dropping
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'admin_logs' AND column_name = 'metadata') THEN
        UPDATE admin_logs SET details = metadata::text WHERE details IS NULL AND metadata IS NOT NULL;
        ALTER TABLE admin_logs DROP COLUMN metadata;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'admin_logs' AND column_name = 'target_type') THEN
        ALTER TABLE admin_logs DROP COLUMN target_type;
    END IF;
END $$;

-- 3. auction_results: drop reserve_met
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'auction_results' AND column_name = 'reserve_met') THEN
        ALTER TABLE auction_results DROP COLUMN reserve_met;
    END IF;
END $$;

-- 4. wallet_transactions: drop status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'wallet_transactions' AND column_name = 'status') THEN
        ALTER TABLE wallet_transactions DROP COLUMN status;
    END IF;
END $$;

COMMIT;

-- Verify
SELECT 'notifications.title exists' AS check_item,
       COUNT(*) AS col_count
FROM information_schema.columns
WHERE table_name = 'notifications' AND column_name = 'title'
UNION ALL
SELECT 'notifications.type gone',
       COUNT(*)
FROM information_schema.columns
WHERE table_name = 'notifications' AND column_name = 'type'
UNION ALL
SELECT 'admin_logs.details exists',
       COUNT(*)
FROM information_schema.columns
WHERE table_name = 'admin_logs' AND column_name = 'details'
UNION ALL
SELECT 'auction_results.reserve_met gone',
       COUNT(*)
FROM information_schema.columns
WHERE table_name = 'auction_results' AND column_name = 'reserve_met'
UNION ALL
SELECT 'wallet_transactions.status gone',
       COUNT(*)
FROM information_schema.columns
WHERE table_name = 'wallet_transactions' AND column_name = 'status';
