-- Drops categories.parent_id: it was fully wired (model, schema, admin CRUD
-- validation, admin UI) but never consumed by anything that reads categories —
-- listing form, browse filters, landing page tiles, and admin filters are all
-- flat lists. Every live category already has parent_id = NULL, so this drops
-- zero real data.

BEGIN;

ALTER TABLE categories DROP COLUMN IF EXISTS parent_id;

COMMIT;
