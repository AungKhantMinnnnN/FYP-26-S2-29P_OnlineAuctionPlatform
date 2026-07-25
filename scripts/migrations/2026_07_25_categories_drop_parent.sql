-- Migration: Drop unused category hierarchy column
-- Date: 2026-07-25
--
-- Changes:
--   1. Drop categories.parent_id.
--
-- Rationale: parent_id was fully wired (model, schema, admin CRUD validation,
-- admin UI) but never consumed by anything that reads categories — the listing
-- form, browse filters, landing page category tiles, and admin listings filter
-- are all flat lists. Every live category already has parent_id = NULL, so this
-- drops zero real data.
--
-- Apply once on each environment's Postgres instance. Safe to re-run (the
-- column-exists check makes it idempotent).

BEGIN;

ALTER TABLE categories DROP COLUMN IF EXISTS parent_id;

COMMIT;
