-- Adds users.rating_avg/rating_count: a seller's aggregate feedback rating, computed
-- by FeedbackService.submit on every new item_feedback row. Safe to re-run: IF NOT
-- EXISTS guards.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_avg DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

COMMIT;
