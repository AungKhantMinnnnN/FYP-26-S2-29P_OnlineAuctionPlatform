-- Phase 6: structured city/country columns for recommendation engine segment boost
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS city    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS country VARCHAR(100);
