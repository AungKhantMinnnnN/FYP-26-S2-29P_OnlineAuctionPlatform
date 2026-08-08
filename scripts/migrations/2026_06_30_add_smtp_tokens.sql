-- Password reset and email verification token tables.

BEGIN;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token       VARCHAR PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id ON password_reset_tokens (user_id);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    token        VARCHAR PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at   TIMESTAMPTZ NOT NULL,
    verified_at  TIMESTAMPTZ NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_email_verification_tokens_user_id ON email_verification_tokens (user_id);

COMMIT;

-- Verify
SELECT 'password_reset_tokens' AS table_name, COUNT(*) FROM password_reset_tokens
UNION ALL
SELECT 'email_verification_tokens', COUNT(*) FROM email_verification_tokens;
