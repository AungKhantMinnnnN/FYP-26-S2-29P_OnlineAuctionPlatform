-- Notification preferences: email alerts (bid updates) and marketing emails opt-in
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS email_alerts_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS marketing_emails_enabled  BOOLEAN NOT NULL DEFAULT FALSE;
