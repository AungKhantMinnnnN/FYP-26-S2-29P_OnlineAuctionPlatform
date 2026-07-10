-- Migration: item_feedback + feedback_types
-- Date: 2026-07-10

CREATE TABLE IF NOT EXISTS feedback_types (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(50) NOT NULL UNIQUE,
    reviewer_role VARCHAR(10) NOT NULL CHECK (reviewer_role IN ('buyer', 'seller')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feedback_types (name, reviewer_role)
VALUES
    ('Buyer to Seller',  'buyer'),
    ('Buyer to Listing', 'buyer'),
    ('Seller to Buyer',  'seller')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS item_feedback (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id       UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    reviewer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_type_id UUID NOT NULL REFERENCES feedback_types(id) ON DELETE RESTRICT,
    rating           SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment          TEXT,
    is_public        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, reviewer_id, feedback_type_id)
);

CREATE INDEX IF NOT EXISTS idx_item_feedback_listing  ON item_feedback(listing_id);
CREATE INDEX IF NOT EXISTS idx_item_feedback_reviewee ON item_feedback(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_item_feedback_public   ON item_feedback(is_public, created_at DESC) WHERE is_public = TRUE;

-- ── Seed feedback (15 rows: 5 per type, all public) ─────────────────────────
-- Uses a PL/pgSQL block to resolve UUIDs from seeded usernames and titles.
-- All listings used below are ended auctions with a known winner (from seed_data.py).
--
-- ended_specs seller_idx → normal_users index → username:
--   0=stewie  1=zixin  2=ethan  3=jn  4=wesley  5=gavrel
--   8=normal_user_3  9=normal_user_4  13=normal_user_8
--
-- Listing          | seller          | winner
-- Omega Seamaster  | normal_user_3   | stewie
-- PS5 Console      | normal_user_4   | zixin
-- Gibson Les Paul  | jn              | ethan
-- DJI Mavic 3 Pro  | wesley          | jn
-- Sony WH-1000XM5  | normal_user_8   | gavrel

DO $$
DECLARE
    ft_buyer_seller  UUID := (SELECT id FROM feedback_types WHERE name = 'Buyer to Seller');
    ft_buyer_listing UUID := (SELECT id FROM feedback_types WHERE name = 'Buyer to Listing');
    ft_seller_buyer  UUID := (SELECT id FROM feedback_types WHERE name = 'Seller to Buyer');

    u_stewie   UUID := (SELECT id FROM users WHERE username = 'stewie');
    u_zixin    UUID := (SELECT id FROM users WHERE username = 'zixin');
    u_ethan    UUID := (SELECT id FROM users WHERE username = 'ethan');
    u_jn       UUID := (SELECT id FROM users WHERE username = 'jn');
    u_wesley   UUID := (SELECT id FROM users WHERE username = 'wesley');
    u_gavrel   UUID := (SELECT id FROM users WHERE username = 'gavrel');
    u_normal3  UUID := (SELECT id FROM users WHERE username = 'normal_user_3');
    u_normal4  UUID := (SELECT id FROM users WHERE username = 'normal_user_4');
    u_normal8  UUID := (SELECT id FROM users WHERE username = 'normal_user_8');

    -- ILIKE partial matches so minor title/punctuation differences don't break the lookup
    l_omega   UUID := (SELECT id FROM listings WHERE title ILIKE '%Omega Seamaster%'   LIMIT 1);
    l_ps5     UUID := (SELECT id FROM listings WHERE title ILIKE '%PlayStation 5%'     LIMIT 1);
    l_gibson  UUID := (SELECT id FROM listings WHERE title ILIKE '%Gibson Les Paul%'   LIMIT 1);
    l_dji     UUID := (SELECT id FROM listings WHERE title ILIKE '%Mavic 3 Pro%'       LIMIT 1);
    l_wh1000  UUID := (SELECT id FROM listings WHERE title ILIKE '%WH-1000XM5%'        LIMIT 1);
BEGIN

-- Warn about any unresolved listings so the caller can investigate
IF l_omega   IS NULL THEN RAISE NOTICE 'listing not found: Omega Seamaster';   END IF;
IF l_ps5     IS NULL THEN RAISE NOTICE 'listing not found: PlayStation 5';     END IF;
IF l_gibson  IS NULL THEN RAISE NOTICE 'listing not found: Gibson Les Paul';   END IF;
IF l_dji     IS NULL THEN RAISE NOTICE 'listing not found: Mavic 3 Pro';       END IF;
IF l_wh1000  IS NULL THEN RAISE NOTICE 'listing not found: WH-1000XM5';        END IF;

-- INSERT ... SELECT ... WHERE pattern: rows with any null UUID are silently skipped
-- rather than crashing with a NOT NULL constraint violation.

-- ── Buyer to Seller (winner reviews the seller) ───────────────────────────────
INSERT INTO item_feedback (listing_id, reviewer_id, reviewee_id, feedback_type_id, rating, comment, is_public)
SELECT listing_id, reviewer_id, reviewee_id, feedback_type_id, rating, comment, is_public
FROM (VALUES
    (l_omega,  u_stewie,  u_normal3, ft_buyer_seller, 5, 'Excellent seller! Watch was exactly as described — original dial, hands, crown all intact. Fast, secure packaging.',                TRUE::BOOLEAN),
    (l_ps5,    u_zixin,   u_normal4, ft_buyer_seller, 4, 'Good experience overall. Console arrived in great condition. Minor delay on dispatch but seller communicated well.',               TRUE::BOOLEAN),
    (l_gibson, u_ethan,   u_jn,      ft_buyer_seller, 5, 'Incredible guitar, even better than the photos. JN answered every question promptly and packed it perfectly. Highly recommended.',TRUE::BOOLEAN),
    (l_dji,    u_jn,      u_wesley,  ft_buyer_seller, 4, 'Drone was in great shape as advertised. Wesley responded quickly to all my questions and shipped the same day.',                  TRUE::BOOLEAN),
    (l_wh1000, u_gavrel,  u_normal8, ft_buyer_seller, 5, 'Factory sealed exactly as listed. Dispatched within hours of payment clearing. Would absolutely buy from this seller again.',     TRUE::BOOLEAN)
) AS v(listing_id, reviewer_id, reviewee_id, feedback_type_id, rating, comment, is_public)
WHERE v.listing_id IS NOT NULL
  AND v.reviewer_id IS NOT NULL
  AND v.reviewee_id IS NOT NULL
ON CONFLICT (listing_id, reviewer_id, feedback_type_id) DO NOTHING;

-- ── Buyer to Listing (winner reviews the listing accuracy) ────────────────────
INSERT INTO item_feedback (listing_id, reviewer_id, reviewee_id, feedback_type_id, rating, comment, is_public)
SELECT listing_id, reviewer_id, reviewee_id, feedback_type_id, rating, comment, is_public
FROM (VALUES
    (l_omega,  u_stewie,  u_normal3, ft_buyer_listing, 5, 'Photos were accurate and the description covered every detail including case, papers, and crown. No surprises on arrival.',       TRUE::BOOLEAN),
    (l_ps5,    u_zixin,   u_normal4, ft_buyer_listing, 4, 'Clear photos and honest condition notes. Could have mentioned the slight scuff on the disc drive, but overall a fair listing.',   TRUE::BOOLEAN),
    (l_gibson, u_ethan,   u_jn,      ft_buyer_listing, 5, 'One of the most detailed and honest listings I have come across. Weight, fret wear, and case condition all documented precisely.',TRUE::BOOLEAN),
    (l_dji,    u_jn,      u_wesley,  ft_buyer_listing, 5, 'Photos and description matched perfectly on delivery. Flight hours and battery health were exactly as stated. Great listing.',    TRUE::BOOLEAN),
    (l_wh1000, u_gavrel,  u_normal8, ft_buyer_listing, 5, 'Listing was flawless — sealed box confirmed on arrival, serial matched the photo. Nothing to criticise.',                        TRUE::BOOLEAN)
) AS v(listing_id, reviewer_id, reviewee_id, feedback_type_id, rating, comment, is_public)
WHERE v.listing_id IS NOT NULL
  AND v.reviewer_id IS NOT NULL
  AND v.reviewee_id IS NOT NULL
ON CONFLICT (listing_id, reviewer_id, feedback_type_id) DO NOTHING;

-- ── Seller to Buyer (seller reviews the winning bidder) ───────────────────────
INSERT INTO item_feedback (listing_id, reviewer_id, reviewee_id, feedback_type_id, rating, comment, is_public)
SELECT listing_id, reviewer_id, reviewee_id, feedback_type_id, rating, comment, is_public
FROM (VALUES
    (l_omega,  u_normal3, u_stewie,  ft_seller_buyer, 5, 'Payment arrived instantly and communication was polite throughout. Stewie is a model buyer — highly recommended.',                TRUE::BOOLEAN),
    (l_ps5,    u_normal4, u_zixin,   ft_seller_buyer, 5, 'Smooth and professional transaction. Zixin confirmed delivery quickly and kept in touch. Would sell to again without hesitation.', TRUE::BOOLEAN),
    (l_gibson, u_jn,      u_ethan,   ft_seller_buyer, 4, 'Ethan was patient while I arranged specialist packaging for the guitar. Pleasant deal overall — zero issues.',                    TRUE::BOOLEAN),
    (l_dji,    u_wesley,  u_jn,      ft_seller_buyer, 5, 'JN paid within minutes of the auction closing and was very responsive to shipping updates. Perfect buyer experience.',             TRUE::BOOLEAN),
    (l_wh1000, u_normal8, u_gavrel,  ft_seller_buyer, 5, 'Gavrel was a fantastic buyer — prompt payment, professional messages, and confirmed receipt the same day. Five stars.',           TRUE::BOOLEAN)
) AS v(listing_id, reviewer_id, reviewee_id, feedback_type_id, rating, comment, is_public)
WHERE v.listing_id IS NOT NULL
  AND v.reviewer_id IS NOT NULL
  AND v.reviewee_id IS NOT NULL
ON CONFLICT (listing_id, reviewer_id, feedback_type_id) DO NOTHING;

END $$;

-- Verify
SELECT 'feedback_types' AS table_name, COUNT(*) FROM feedback_types
UNION ALL
SELECT 'item_feedback',                COUNT(*) FROM item_feedback;
