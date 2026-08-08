-- Auction duration lookup table, seeded with the four standard options used
-- in the listing creation form.

CREATE TABLE IF NOT EXISTS auction_durations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value INTEGER NOT NULL UNIQUE,
    label VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO auction_durations (value, label, is_active, sort_order) VALUES
    (1,  '1 Day',   TRUE, 1),
    (3,  '3 Days',  TRUE, 2),
    (7,  '7 Days',  TRUE, 3),
    (14, '14 Days', TRUE, 4)
ON CONFLICT (value) DO NOTHING;

-- Verify
SELECT value, label, is_active, sort_order FROM auction_durations ORDER BY sort_order;
