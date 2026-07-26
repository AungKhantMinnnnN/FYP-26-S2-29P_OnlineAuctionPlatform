-- Migration: Remove the OpenAI moderation feature's table
-- Date: 2026-07-26
--
-- Changes:
--   1. Drop ai_moderation_flags.
--
-- Rationale: the OpenAI Moderation API secondary listing check
-- (app.core.ai_moderation, AuctionService._check_ai_moderation,
-- AdminService.get_ai_moderation_flags, GET /admin/ai-moderation-flags, and the
-- admin "AI Moderation" review queue UI) has been removed. The prohibited-keyword
-- gate (prohibited_keywords, FlaggedListingAttempt) is unaffected and remains the
-- only listing moderation check.
--
-- Apply once on each environment's Postgres instance. Safe to re-run (the
-- table-exists check makes it idempotent). This does discard any existing
-- ai_moderation_flags rows — they were only ever surfaced through the admin UI
-- being removed here, so nothing else reads them.

BEGIN;

DROP TABLE IF EXISTS ai_moderation_flags;

COMMIT;
