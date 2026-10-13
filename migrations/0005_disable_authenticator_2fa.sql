-- Retire authenticator-based 2FA without deleting user accounts or sessions.
-- Keep legacy schema columns/tables for backwards-compatible rollback.
UPDATE auth_user SET two_factor_enabled = false WHERE two_factor_enabled IS TRUE;
UPDATE auth_session SET mfa_verified_at = NULL WHERE mfa_verified_at IS NOT NULL;
