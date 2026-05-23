-- Clear existing data
TRUNCATE users, user_profiles, categories, listings RESTART IDENTITY CASCADE;

-- 1. Categories
INSERT INTO categories (id, name, slug) VALUES
(uuid_generate_v4(), 'Electronics', 'electronics'),
(uuid_generate_v4(), 'Collectibles', 'collectibles'),
(uuid_generate_v4(), 'Fashion', 'fashion'),
(uuid_generate_v4(), 'Home & Garden', 'home-and-garden');

-- 2. Test user and profile
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := uuid_generate_v4();
    
    INSERT INTO users (id, username, email, password_hash, role, balance, status)
    VALUES (
        v_user_id, 
        'testuser', 
        'test@example.com', 
        '$2b$12$FUBDxAsvJ7pvKVJn6grBpenXNvyL/lK2PgBqW5JObpwJ9nIBUFxkS', -- Password123!
        'seller', 
        1000.00, 
        'active'
    );
    
    INSERT INTO user_profiles (user_id, full_name, phone, address, bio)
    VALUES (
        v_user_id, 
        'Test User', 
        '+65 0000 0000', 
        '123 Testing Lane, Singapore', 
        'Main developer account for testing listings.'
    );
END $$;

-- Sample Listings for the Test User
INSERT INTO listings (id, seller_id, category_id, title, description, condition, starting_price, current_price, min_increment, status, is_draft, start_time, end_time)
VALUES
(
    uuid_generate_v4(), 
    (SELECT id FROM users WHERE username = 'testuser'),
    (SELECT id FROM categories WHERE slug = 'electronics'),
    'Test Smartphone 2024',
    'A sample electronics item for testing purposes.',
    'new', 500.00, 500.00, 10.00, 'active', false, 
    NOW(), NOW() + INTERVAL '7 days'
),
(
    uuid_generate_v4(), 
    (SELECT id FROM users WHERE username = 'testuser'),
    (SELECT id FROM categories WHERE slug = 'fashion'),
    'Sample Designer Jacket',
    'A sample fashion item for testing purposes.',
    'used', 120.00, 120.00, 5.00, 'active', false, 
    NOW(), NOW() + INTERVAL '3 days'
),
(
    uuid_generate_v4(), 
    (SELECT id FROM users WHERE username = 'testuser'),
    (SELECT id FROM categories WHERE slug = 'home-and-garden'),
    'Ergonomic Desk Chair',
    'A sample home item for testing purposes.',
    'new', 250.00, 250.00, 10.00, 'active', false, 
    NOW(), NOW() + INTERVAL '5 days'
);
