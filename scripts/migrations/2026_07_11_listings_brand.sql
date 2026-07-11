-- Migration: add brand column to listings
-- Date: 2026-07-11

ALTER TABLE listings ADD COLUMN IF NOT EXISTS brand VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_listings_brand ON listings(brand);

-- Verify
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'listings' AND column_name = 'brand';
