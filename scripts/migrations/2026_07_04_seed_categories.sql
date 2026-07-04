-- Migration: Seed default categories
-- Date: 2026-07-04
--
-- Inserts 10 top-level categories used for listing classification and
-- cold-start interest selection during onboarding.
-- Safe to re-run: ON CONFLICT (slug) DO NOTHING.

INSERT INTO categories (name, slug, is_active) VALUES
    ('Electronics',         'electronics',          TRUE),
    ('Clothing & Fashion',  'clothing-fashion',     TRUE),
    ('Collectibles',        'collectibles',         TRUE),
    ('Home & Garden',       'home-garden',          TRUE),
    ('Sports & Outdoors',   'sports-outdoors',      TRUE),
    ('Toys & Hobbies',      'toys-hobbies',         TRUE),
    ('Jewellery & Watches', 'jewellery-watches',    TRUE),
    ('Books & Media',       'books-media',          TRUE),
    ('Art & Antiques',      'art-antiques',         TRUE),
    ('Vehicles & Parts',    'vehicles-parts',       TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Verify
SELECT name, slug, is_active FROM categories ORDER BY name;
