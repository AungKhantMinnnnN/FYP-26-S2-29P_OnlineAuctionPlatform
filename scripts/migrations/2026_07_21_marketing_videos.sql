-- Migration: Marketing video library
-- Date: 2026-07-21
--
-- Changes:
--   1. Create marketing_videos table: every hero-video upload keeps its own row
--      (and its own MinIO object key) instead of the old behaviour of silently
--      overwriting a single fixed key with no history. Exactly one row is
--      is_active = TRUE at a time; that's the video the public landing page shows.
--
-- NOTE: the video previously uploaded under the old fixed key ("hero-video") has
-- no row here and won't appear in the library. Re-upload it once after this ships
-- if it should be kept.
--
-- Apply once on each environment's Postgres instance. Safe to re-run (idempotent).

BEGIN;

CREATE TABLE IF NOT EXISTS marketing_videos (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    s3_key            VARCHAR(255) NOT NULL UNIQUE,
    original_filename VARCHAR(255),
    content_type      VARCHAR(100),
    is_active         BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_videos_active ON marketing_videos(is_active) WHERE is_active = TRUE;

COMMIT;

-- Verify
SELECT 'marketing_videos' AS change, COUNT(*) FROM marketing_videos;
