-- Hard-deletes every ephemeral account (and its dependent rows) the QA suite
-- has ever registered, identified purely by the 'qa_' username prefix that
-- auth_helpers.random_registration_payload() always uses. Safe to re-run --
-- matches nothing once the suite has no leftover accounts.
--
-- Deletion order matters: a few FKs are ON DELETE RESTRICT (disputes.reporter_id,
-- wallet_transactions.user_id, listings.seller_id, bids.bidder_id/listing_id,
-- auction_results.listing_id), so those rows are cleared first. Everything else
-- (user_profiles, notifications, tokens, testimonials, watchlist, item_feedback,
-- user_interests, user_interactions, collector_boards -> board_items,
-- flagged_listing_attempts, listing_images) is ON DELETE CASCADE and follows
-- automatically once the owning user/listing row is removed.
BEGIN;

DELETE FROM auction_results WHERE listing_id IN (
    SELECT l.id FROM listings l JOIN users u ON u.id = l.seller_id WHERE u.username LIKE 'qa\_%'
);
DELETE FROM bids WHERE bidder_id IN (SELECT id FROM users WHERE username LIKE 'qa\_%')
    OR listing_id IN (
        SELECT l.id FROM listings l JOIN users u ON u.id = l.seller_id WHERE u.username LIKE 'qa\_%'
    );
DELETE FROM disputes WHERE reporter_id IN (SELECT id FROM users WHERE username LIKE 'qa\_%');
DELETE FROM wallet_transactions WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'qa\_%');
DELETE FROM listings WHERE seller_id IN (SELECT id FROM users WHERE username LIKE 'qa\_%');
DELETE FROM users WHERE username LIKE 'qa\_%';

-- Categories/feedback types aren't owned by a qa_ user, so they survive the cleanup
-- above -- catch them separately, by the fixed naming/slug convention every QA test
-- uses (test_admin_categories._unique_slug(), test_feedback._unique_name()). Placed
-- after the deletes above so any qa_-owned listings/item_feedback rows that
-- referenced them (RESTRICT FKs) are already gone.
DELETE FROM categories WHERE slug LIKE 'qa-test-cat-%';
DELETE FROM feedback_types WHERE name LIKE 'QA Feedback Type %';

COMMIT;
