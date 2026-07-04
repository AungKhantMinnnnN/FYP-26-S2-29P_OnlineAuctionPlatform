-- Migration: Collector boards feature (Premium)
-- Date: 2026-07-01
-- Sprint: 2
--
-- Changes:
--   1. Create collector_boards table (premium showcase of won items)
--   2. Create board_items table (won auction results added to boards)
--
-- Apply once on each environment's Postgres instance.
-- Safe to re-run: uses IF NOT EXISTS guards.

BEGIN;

CREATE TABLE IF NOT EXISTS collector_boards (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    is_public   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_items (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id          UUID NOT NULL REFERENCES collector_boards(id) ON DELETE CASCADE,
    auction_result_id UUID NOT NULL REFERENCES auction_results(id) ON DELETE CASCADE,
    note              TEXT,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    added_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (board_id, auction_result_id)
);

CREATE INDEX IF NOT EXISTS idx_collector_boards_user ON collector_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_board_items_board      ON board_items(board_id);

COMMIT;

-- Verify
SELECT 'collector_boards' AS table_name, COUNT(*) FROM collector_boards
UNION ALL
SELECT 'board_items',                     COUNT(*) FROM board_items;
