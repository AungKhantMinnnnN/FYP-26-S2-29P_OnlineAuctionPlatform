-- Tags each prohibited keyword as 'illegal_item' or 'profanity', and adds a
-- secondary review queue for listings the OpenAI moderation API flagged after
-- passing the keyword gate. Never auto-blocks — see app.core.ai_moderation.
ALTER TABLE prohibited_keywords
    ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'illegal_item';

ALTER TABLE prohibited_keywords
    DROP CONSTRAINT IF EXISTS chk_prohibited_keywords_category;
ALTER TABLE prohibited_keywords
    ADD CONSTRAINT chk_prohibited_keywords_category CHECK (category IN ('illegal_item', 'profanity'));

CREATE TABLE IF NOT EXISTS ai_moderation_flags (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    categories    VARCHAR(200) NOT NULL,
    field         VARCHAR(20) NOT NULL,
    flagged_text  TEXT NOT NULL,
    reviewed      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_moderation_flags_reviewed ON ai_moderation_flags(reviewed, created_at DESC);

-- Verify
SELECT 'prohibited_keywords.category' AS change, COUNT(*) FROM prohibited_keywords
UNION ALL
SELECT 'ai_moderation_flags', COUNT(*) FROM ai_moderation_flags;
