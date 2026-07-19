-- Content moderation: admin-managed prohibited keyword list, and a log of
-- listing-creation/edit attempts blocked because they matched one.
CREATE TABLE IF NOT EXISTS prohibited_keywords (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword     VARCHAR(100) NOT NULL,
    added_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prohibited_keywords_keyword_ci ON prohibited_keywords (LOWER(keyword));

CREATE TABLE IF NOT EXISTS flagged_listing_attempts (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keyword_matched  VARCHAR(100) NOT NULL,
    field            VARCHAR(20) NOT NULL,
    attempted_text   TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flagged_listing_attempts_user    ON flagged_listing_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_listing_attempts_created ON flagged_listing_attempts(created_at DESC);

-- Verify
SELECT 'prohibited_keywords' AS table_name, COUNT(*) FROM prohibited_keywords
UNION ALL
SELECT 'flagged_listing_attempts',          COUNT(*) FROM flagged_listing_attempts;
