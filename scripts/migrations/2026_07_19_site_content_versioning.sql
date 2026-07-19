-- Admin CMS: draft/publish workflow + append-only version history for site_content.
--   - draft_content: admin's work-in-progress JSON, never public. NULL = no unpublished edits.
--   - site_content_versions: a snapshot per publish (and per rollback, which itself counts as
--     a publish) — never mutated, only inserted. Rollback restores by copying content forward
--     and recording a new version, not by deleting history.
ALTER TABLE site_content
    ADD COLUMN IF NOT EXISTS draft_content JSONB;

CREATE TABLE IF NOT EXISTS site_content_versions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug        VARCHAR(100) NOT NULL,
    content     JSONB NOT NULL,
    note        VARCHAR(200),
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_site_content_versions_slug ON site_content_versions (slug, created_at DESC);

-- Verify
SELECT 'site_content.draft_content' AS change, COUNT(*) FROM site_content
UNION ALL
SELECT 'site_content_versions', COUNT(*) FROM site_content_versions;
