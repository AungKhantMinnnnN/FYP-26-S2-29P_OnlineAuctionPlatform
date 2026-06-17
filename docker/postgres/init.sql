CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; 

-- Enums
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE listing_status AS ENUM ('draft', 'pending_review', 'active', 'ended', 'removed');
CREATE TYPE bidding_type AS ENUM ('price_up', 'low_start', 'public');
CREATE TYPE item_condition AS ENUM ('new', 'used', 'refurbished');
CREATE TYPE bid_status AS ENUM ('accepted', 'rejected', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('topup', 'bid_hold', 'bid_release', 'settlement');
CREATE TYPE dispute_status AS ENUM ('open', 'in_review', 'resolved', 'closed');
CREATE TYPE interaction_action AS ENUM ('view', 'search', 'bid', 'watchlist');

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    avatar_key VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    bio TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listings
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    condition item_condition NOT NULL,
    bidding_type bidding_type NOT NULL DEFAULT 'price_up',
    starting_price DECIMAL(12,2) NOT NULL,
    reserve_price DECIMAL(12,2),
    current_price DECIMAL(12,2) NOT NULL,
    min_increment DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    status listing_status NOT NULL DEFAULT 'draft',
    is_draft BOOLEAN NOT NULL DEFAULT TRUE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE listing_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    s3_key VARCHAR(500) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bids
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount DECIMAL(12,2) NOT NULL,
    status bid_status NOT NULL DEFAULT 'accepted',
    placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auction_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL UNIQUE REFERENCES listings(id) ON DELETE RESTRICT,
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    winning_bid_id UUID REFERENCES bids(id) ON DELETE SET NULL,
    final_price DECIMAL(12,2) NOT NULL,
    reserve_met BOOLEAN NOT NULL DEFAULT FALSE,
    ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User activity
CREATE TABLE watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type transaction_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    reference VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    ref_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status dispute_status NOT NULL DEFAULT 'open',
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    action interaction_action NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_listings_category ON listings(category_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_end_time ON listings(end_time);
CREATE INDEX idx_listings_title_trgm ON listings USING GIN (title gin_trgm_ops);
CREATE INDEX idx_bids_listing ON bids(listing_id);
CREATE INDEX idx_bids_bidder ON bids(bidder_id);
CREATE INDEX idx_bids_placed_at ON bids(placed_at);
CREATE INDEX idx_user_interactions_user ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_listing ON user_interactions(listing_id);
CREATE INDEX idx_user_interactions_occurred ON user_interactions(occurred_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;