-- Sample data: collector board entries for normal_user_1
-- Idempotent: skips if collector_boards already exist for this user.
-- Requires seed_data.py to have run first (users + categories must exist).

DO $$
DECLARE
  v_winner_id     UUID;
  v_seller_id     UUID;
  v_cat_elec      UUID;
  v_cat_coll      UUID;
  v_cat_sport     UUID;
  v_cat_fashion   UUID;

  v_l1 UUID; v_l2 UUID; v_l3 UUID;
  v_l4 UUID; v_l5 UUID; v_l6 UUID;

  v_b1 UUID; v_b2 UUID; v_b3 UUID;
  v_b4 UUID; v_b5 UUID; v_b6 UUID;

  v_r1 UUID; v_r2 UUID; v_r3 UUID;
  v_r4 UUID; v_r5 UUID; v_r6 UUID;

  v_board1 UUID;
  v_board2 UUID;
BEGIN

  SELECT id INTO v_winner_id FROM users WHERE username = 'normal_user_1';
  SELECT id INTO v_seller_id FROM users WHERE username = 'normal_user_3';

  IF v_winner_id IS NULL OR v_seller_id IS NULL THEN
    RAISE NOTICE 'Required users not found — run seed_data.py first.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM collector_boards WHERE user_id = v_winner_id) THEN
    RAISE NOTICE 'Collector board data already seeded for normal_user_1. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_cat_elec   FROM categories WHERE slug = 'electronics';
  SELECT id INTO v_cat_coll   FROM categories WHERE slug = 'collectibles';
  SELECT id INTO v_cat_sport  FROM categories WHERE slug = 'sporting-goods';
  SELECT id INTO v_cat_fashion FROM categories WHERE slug = 'fashion';

  -- ----------------------------------------------------------------
  -- 1. Six ended listings (seller = normal_user_3)
  -- ----------------------------------------------------------------
  INSERT INTO listings (id, seller_id, category_id, title, description, brand,
    condition, bidding_type, starting_price, reserve_price, current_price,
    min_increment, status, is_draft, start_time, end_time)
  VALUES
    (uuid_generate_v4(), v_seller_id, v_cat_coll,
     'Vintage Omega Seamaster 1960s',
     'Pristine example of the iconic Seamaster. Original dial, hands, and crown. Box and papers included.',
     'Omega', 'used', 'price_up', 450.00, 600.00, 780.00, 25.00,
     'ended', false,
     NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days')
  RETURNING id INTO v_l1;

  INSERT INTO listings (id, seller_id, category_id, title, description, brand,
    condition, bidding_type, starting_price, reserve_price, current_price,
    min_increment, status, is_draft, start_time, end_time)
  VALUES
    (uuid_generate_v4(), v_seller_id, v_cat_elec,
     'Sony PlayStation 5 Console (Disc Edition)',
     'Barely used PS5 disc edition. Includes two controllers, all original cables.',
     'Sony', 'used', 'price_up', 350.00, 450.00, 520.00, 20.00,
     'ended', false,
     NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days')
  RETURNING id INTO v_l2;

  INSERT INTO listings (id, seller_id, category_id, title, description, brand,
    condition, bidding_type, starting_price, reserve_price, current_price,
    min_increment, status, is_draft, start_time, end_time)
  VALUES
    (uuid_generate_v4(), v_seller_id, v_cat_elec,
     'Canon EOS R5 Mirrorless Camera Body',
     'Professional full-frame mirrorless. ~8,000 shutter actuations. Sensor in perfect condition.',
     'Canon', 'used', 'price_up', 1800.00, 2200.00, 2450.00, 50.00,
     'ended', false,
     NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day')
  RETURNING id INTO v_l3;

  INSERT INTO listings (id, seller_id, category_id, title, description, brand,
    condition, bidding_type, starting_price, reserve_price, current_price,
    min_increment, status, is_draft, start_time, end_time)
  VALUES
    (uuid_generate_v4(), v_seller_id, v_cat_coll,
     'Fender American Vintage 62 Stratocaster',
     'Made in USA 1992 reissue. Sunburst finish, original pickups, lightweight alder body.',
     'Fender', 'used', 'price_up', 900.00, 1100.00, 1250.00, 50.00,
     'ended', false,
     NOW() - INTERVAL '9 days', NOW() - INTERVAL '2 days')
  RETURNING id INTO v_l4;

  INSERT INTO listings (id, seller_id, category_id, title, description, brand,
    condition, bidding_type, starting_price, reserve_price, current_price,
    min_increment, status, is_draft, start_time, end_time)
  VALUES
    (uuid_generate_v4(), v_seller_id, v_cat_fashion,
     'Nike Air Jordan 1 Retro High OG Chicago (2015)',
     'Deadstock pair, size US 10. Original box. Authenticated by StockX.',
     'Nike', 'new', 'price_up', 300.00, 400.00, 620.00, 20.00,
     'ended', false,
     NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days')
  RETURNING id INTO v_l5;

  INSERT INTO listings (id, seller_id, category_id, title, description, brand,
    condition, bidding_type, starting_price, reserve_price, current_price,
    min_increment, status, is_draft, start_time, end_time)
  VALUES
    (uuid_generate_v4(), v_seller_id, v_cat_sport,
     'Trek Domane SL 6 Road Bike (56cm)',
     '2022 model. Shimano 105 R7000 groupset. Carbon fork. Under 500 miles.',
     'Trek', 'used', 'price_up', 1200.00, 1500.00, 1750.00, 50.00,
     'ended', false,
     NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day')
  RETURNING id INTO v_l6;

  -- ----------------------------------------------------------------
  -- 2. Winning bids from normal_user_1
  -- ----------------------------------------------------------------
  INSERT INTO bids (id, listing_id, bidder_id, amount, status, placed_at) VALUES
    (uuid_generate_v4(), v_l1, v_winner_id, 780.00,  'accepted', NOW() - INTERVAL '3 days' - INTERVAL '30 minutes')
  RETURNING id INTO v_b1;

  INSERT INTO bids (id, listing_id, bidder_id, amount, status, placed_at) VALUES
    (uuid_generate_v4(), v_l2, v_winner_id, 520.00,  'accepted', NOW() - INTERVAL '5 days' - INTERVAL '15 minutes')
  RETURNING id INTO v_b2;

  INSERT INTO bids (id, listing_id, bidder_id, amount, status, placed_at) VALUES
    (uuid_generate_v4(), v_l3, v_winner_id, 2450.00, 'accepted', NOW() - INTERVAL '1 day'  - INTERVAL '45 minutes')
  RETURNING id INTO v_b3;

  INSERT INTO bids (id, listing_id, bidder_id, amount, status, placed_at) VALUES
    (uuid_generate_v4(), v_l4, v_winner_id, 1250.00, 'accepted', NOW() - INTERVAL '2 days' - INTERVAL '20 minutes')
  RETURNING id INTO v_b4;

  INSERT INTO bids (id, listing_id, bidder_id, amount, status, placed_at) VALUES
    (uuid_generate_v4(), v_l5, v_winner_id, 620.00,  'accepted', NOW() - INTERVAL '2 days' - INTERVAL '10 minutes')
  RETURNING id INTO v_b5;

  INSERT INTO bids (id, listing_id, bidder_id, amount, status, placed_at) VALUES
    (uuid_generate_v4(), v_l6, v_winner_id, 1750.00, 'accepted', NOW() - INTERVAL '1 day'  - INTERVAL '5 minutes')
  RETURNING id INTO v_b6;

  -- ----------------------------------------------------------------
  -- 3. Auction results
  -- ----------------------------------------------------------------
  INSERT INTO auction_results (id, listing_id, winner_id, winning_bid_id, final_price, ended_at) VALUES
    (uuid_generate_v4(), v_l1, v_winner_id, v_b1, 780.00,  NOW() - INTERVAL '3 days')
  RETURNING id INTO v_r1;

  INSERT INTO auction_results (id, listing_id, winner_id, winning_bid_id, final_price, ended_at) VALUES
    (uuid_generate_v4(), v_l2, v_winner_id, v_b2, 520.00,  NOW() - INTERVAL '5 days')
  RETURNING id INTO v_r2;

  INSERT INTO auction_results (id, listing_id, winner_id, winning_bid_id, final_price, ended_at) VALUES
    (uuid_generate_v4(), v_l3, v_winner_id, v_b3, 2450.00, NOW() - INTERVAL '1 day')
  RETURNING id INTO v_r3;

  INSERT INTO auction_results (id, listing_id, winner_id, winning_bid_id, final_price, ended_at) VALUES
    (uuid_generate_v4(), v_l4, v_winner_id, v_b4, 1250.00, NOW() - INTERVAL '2 days')
  RETURNING id INTO v_r4;

  INSERT INTO auction_results (id, listing_id, winner_id, winning_bid_id, final_price, ended_at) VALUES
    (uuid_generate_v4(), v_l5, v_winner_id, v_b5, 620.00,  NOW() - INTERVAL '2 days')
  RETURNING id INTO v_r5;

  INSERT INTO auction_results (id, listing_id, winner_id, winning_bid_id, final_price, ended_at) VALUES
    (uuid_generate_v4(), v_l6, v_winner_id, v_b6, 1750.00, NOW() - INTERVAL '1 day')
  RETURNING id INTO v_r6;

  -- ----------------------------------------------------------------
  -- 4. Collector boards
  -- ----------------------------------------------------------------
  INSERT INTO collector_boards (id, user_id, name, description, is_public, created_at, updated_at) VALUES
    (uuid_generate_v4(), v_winner_id,
     'Premium Picks',
     'My finest auction wins — watches, cameras, and classics.',
     true,
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
  RETURNING id INTO v_board1;

  INSERT INTO collector_boards (id, user_id, name, description, is_public, created_at, updated_at) VALUES
    (uuid_generate_v4(), v_winner_id,
     'Hidden Gems',
     'Underrated finds I keep off the radar.',
     false,
     NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
  RETURNING id INTO v_board2;

  -- ----------------------------------------------------------------
  -- 5. Board items
  --    Board 1 "Premium Picks": watch, camera, guitar, sneakers
  --    Board 2 "Hidden Gems":   PS5, bike
  -- ----------------------------------------------------------------
  INSERT INTO board_items (id, board_id, auction_result_id, sort_order, added_at) VALUES
    (uuid_generate_v4(), v_board1, v_r1, 0, NOW() - INTERVAL '2 days'),  -- watch
    (uuid_generate_v4(), v_board1, v_r3, 1, NOW() - INTERVAL '2 days'),  -- camera
    (uuid_generate_v4(), v_board1, v_r4, 2, NOW() - INTERVAL '2 days'),  -- guitar
    (uuid_generate_v4(), v_board1, v_r5, 3, NOW() - INTERVAL '1 day');   -- sneakers

  INSERT INTO board_items (id, board_id, auction_result_id, sort_order, added_at) VALUES
    (uuid_generate_v4(), v_board2, v_r2, 0, NOW() - INTERVAL '1 day'),   -- PS5
    (uuid_generate_v4(), v_board2, v_r6, 1, NOW() - INTERVAL '1 day');   -- bike

  RAISE NOTICE 'Collector board sample data inserted for normal_user_1.';
END;
$$;
