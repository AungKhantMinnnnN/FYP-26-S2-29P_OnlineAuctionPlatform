-- Admin dropdown option catalogue: a single lookup table keyed by set_key that
-- backs every admin dropdown (statuses, roles, actions, log level/service, etc.),
-- seeded with the previously-hardcoded option lists.
--
-- NOTE: the status/role sets mirror Python enums the backend still references
-- directly (UserStatus, DisputeStatus, ListingStatus). These rows drive the
-- dropdown LABELS only — adding a value here doesn't make it functional
-- without code changes.

BEGIN;

CREATE TABLE IF NOT EXISTS option_sets (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_key    VARCHAR(50)  NOT NULL,
    value      VARCHAR(100) NOT NULL,
    label      VARCHAR(100) NOT NULL,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (set_key, value)
);

CREATE INDEX IF NOT EXISTS idx_option_sets_key ON option_sets(set_key) WHERE is_active = TRUE;

INSERT INTO option_sets (set_key, value, label, sort_order) VALUES
    -- user account status
    ('user_status', 'active',    'Active',    1),
    ('user_status', 'suspended', 'Suspended', 2),
    ('user_status', 'deleted',   'Deleted',   3),
    -- user role
    ('user_role', 'user',  'Users',          1),
    ('user_role', 'admin', 'Administrators', 2),
    -- listing status (admin listings filter; excludes 'draft' by design)
    ('listing_status', 'pending_review', 'Needs review', 1),
    ('listing_status', 'active',         'Live now',     2),
    ('listing_status', 'ended',          'Ended',        3),
    ('listing_status', 'removed',        'Removed',      4),
    -- dispute / support case status
    ('dispute_status', 'open',      'Open',      1),
    ('dispute_status', 'in_review', 'In Review', 2),
    ('dispute_status', 'resolved',  'Resolved',  3),
    ('dispute_status', 'closed',    'Closed',    4),
    -- audit-log admin actions
    ('audit_action', 'suspend_user',              'Suspend user',              1),
    ('audit_action', 'unsuspend_user',            'Unsuspend user',            2),
    ('audit_action', 'delete_user',               'Delete user',               3),
    ('audit_action', 'approve_listing',           'Approve listing',           4),
    ('audit_action', 'remove_listing',            'Remove listing',            5),
    ('audit_action', 'restart_auction',           'Restart auction',           6),
    ('audit_action', 'cancel_bid',                'Cancel bid',                7),
    ('audit_action', 'add_prohibited_keyword',    'Add prohibited keyword',    8),
    ('audit_action', 'remove_prohibited_keyword', 'Remove prohibited keyword', 9),
    -- system-log source service
    ('log_service', 'backend',                'Backend',                1),
    ('log_service', 'bidding-engine',         'Bidding engine',         2),
    ('log_service', 'recommendation-engine',  'Recommendation engine',  3),
    -- system-log level
    ('log_level', 'info',    'Info',    1),
    ('log_level', 'warning', 'Warning', 2),
    ('log_level', 'error',   'Error',   3),
    -- prohibited-keyword category
    ('keyword_category', 'illegal_item', 'Illegal item', 1),
    ('keyword_category', 'profanity',    'Profanity',    2),
    -- feedback reviewer role
    ('feedback_role', 'buyer',  'Buyer',  1),
    ('feedback_role', 'seller', 'Seller', 2),
    -- item condition
    ('item_condition', 'new',         'New',         1),
    ('item_condition', 'used',        'Used',        2),
    ('item_condition', 'refurbished', 'Refurbished', 3)
ON CONFLICT (set_key, value) DO NOTHING;

COMMIT;
