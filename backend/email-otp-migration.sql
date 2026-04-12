-- ========================================
-- CampusGig - Passwordless OTP Migration
-- Run this ONCE in Supabase SQL Editor to add OTP support.
-- Safe to run on existing data: does NOT drop any tables.
-- ========================================

-- Table for storing short-lived email verification codes
CREATE TABLE IF NOT EXISTS email_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_codes(email);
CREATE INDEX IF NOT EXISTS idx_email_codes_expires ON email_codes(expires_at);

ALTER TABLE email_codes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all" ON email_codes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Make password_hash optional since we are going passwordless.
-- Existing users with a password hash will keep it but it is no longer used.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Cleanup helper: remove expired codes older than 1 hour
-- (Supabase does not auto-delete, so call this from a cron if you want.
--  It is optional — expired codes are ignored at verify time anyway.)
CREATE OR REPLACE FUNCTION cleanup_expired_email_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM email_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
