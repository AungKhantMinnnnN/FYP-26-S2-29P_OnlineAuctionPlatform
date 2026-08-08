-- Marketing video library: every hero-video upload keeps its own row (and its
-- own MinIO object key) instead of overwriting a single fixed key with no
-- history. Exactly one row has is_active = TRUE at a time — that's the video
-- the public landing page shows.
--
-- NOTE: the video previously uploaded under the old fixed key ("hero-video")
-- has no row here and won't appear in the library; re-upload it if it should
-- be kept.

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
