-- Migration: Update email_accounts unique constraint
-- Allows users to have both Gmail and Outlook accounts simultaneously
-- Changes from UNIQUE(user_id, email) to UNIQUE(user_id, provider)

-- Drop old constraint if it exists
ALTER TABLE email_accounts DROP CONSTRAINT IF EXISTS email_accounts_user_id_email_key;
ALTER TABLE email_accounts DROP CONSTRAINT IF EXISTS email_accounts_email_key;

-- Add new constraint: one account per provider per user
-- This allows both Gmail and Outlook to be connected at the same time
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'email_accounts_user_id_provider_key'
  ) THEN
    ALTER TABLE email_accounts ADD CONSTRAINT email_accounts_user_id_provider_key UNIQUE(user_id, provider);
  END IF;
END $$;

