-- ClosePro CRM Database Schema
-- Run this in your Supabase SQL Editor
--
-- NOTE: This schema is idempotent - you can run it multiple times safely.
-- If you get errors about policies already existing, you can either:
-- 1. Ignore those errors (policies will remain as-is)
-- 2. Or drop policies first using: DROP POLICY IF EXISTS "policy_name" ON table_name;
--
-- Tables, indexes, triggers, and functions are all idempotent.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- CONTACTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  
  -- Lead info
  temperature TEXT CHECK (temperature IN ('hot', 'warm', 'cold')) DEFAULT 'warm',
  property_interest TEXT,
  budget TEXT,
  lead_source TEXT,
  notes TEXT,
  
  -- Deal info
  deal_stage TEXT,
  deal_value DECIMAL(12,2),
  expected_close_date TIMESTAMPTZ,
  
  -- Important dates
  birthday DATE,
  home_anniversary DATE,
  
  -- Timestamps
  last_contact TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ACTIVITIES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'showing', 'note')),
  note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- SHOWINGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS showings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  
  address TEXT NOT NULL,
  reaction TEXT CHECK (reaction IN ('loved', 'maybe', 'pass')) DEFAULT 'maybe',
  notes TEXT,
  showing_date TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- REMINDERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  completed BOOLEAN DEFAULT FALSE,
  auto_generated BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TEMPLATES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE showings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Contacts: Users can only see their own contacts
-- Basic policy - will be updated later with team visibility
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Activities: Users can only see their own activities
CREATE POLICY "Users can view own activities" ON activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities" ON activities
  FOR DELETE USING (auth.uid() = user_id);

-- Showings: Users can only see their own showings
CREATE POLICY "Users can view own showings" ON showings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own showings" ON showings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own showings" ON showings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own showings" ON showings
  FOR DELETE USING (auth.uid() = user_id);

-- Reminders: Users can only see their own reminders
CREATE POLICY "Users can view own reminders" ON reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" ON reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Templates: Users can only see their own templates
CREATE POLICY "Users can view own templates" ON templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON templates
  FOR DELETE USING (auth.uid() = user_id);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_temperature ON contacts(user_id, temperature);
CREATE INDEX IF NOT EXISTS idx_contacts_deal_stage ON contacts(user_id, deal_stage);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_showings_contact_id ON showings(contact_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(user_id, due_date) WHERE NOT completed;
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

-- =====================
-- FUNCTIONS
-- =====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for contacts
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for templates
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_contact when activity is added
CREATE OR REPLACE FUNCTION update_contact_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts 
  SET last_contact = NOW() 
  WHERE id = NEW.contact_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for activities
DROP TRIGGER IF EXISTS update_last_contact_on_activity ON activities;
CREATE TRIGGER update_last_contact_on_activity
  AFTER INSERT ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_last_contact();

-- Trigger for showings
DROP TRIGGER IF EXISTS update_last_contact_on_showing ON showings;
CREATE TRIGGER update_last_contact_on_showing
  AFTER INSERT ON showings
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_last_contact();

-- =====================
-- EMAIL ACCOUNTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Sync settings
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  sync_folder TEXT DEFAULT 'inbox',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, email)
);

-- Enable RLS
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

-- Email accounts policies
CREATE POLICY "Users can view own email accounts" ON email_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email accounts" ON email_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email accounts" ON email_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email accounts" ON email_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_email_accounts_updated_at ON email_accounts;
CREATE TRIGGER update_email_accounts_updated_at
  BEFORE UPDATE ON email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- SUBSCRIPTIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Stripe data
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  
  -- Subscription details
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired')),
  plan_name TEXT NOT NULL,
  plan_price DECIMAL(10,2) NOT NULL,
  plan_interval TEXT CHECK (plan_interval IN ('month', 'year')),
  
  -- Dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- CALENDAR ACCOUNTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS calendar_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT, -- Primary calendar ID
  
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, email)
);

-- =====================
-- CALENDAR EVENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
  
  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  
  -- Calendar sync
  calendar_account_id UUID REFERENCES calendar_accounts(id) ON DELETE SET NULL,
  external_event_id TEXT, -- ID from Google/Outlook calendar
  external_calendar_id TEXT,
  
  -- Metadata
  event_type TEXT CHECK (event_type IN ('showing', 'meeting', 'call', 'other')) DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE calendar_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Calendar accounts policies
CREATE POLICY "Users can view own calendar accounts" ON calendar_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar accounts" ON calendar_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar accounts" ON calendar_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar accounts" ON calendar_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Calendar events policies
CREATE POLICY "Users can view own calendar events" ON calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events" ON calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events" ON calendar_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events" ON calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_accounts_user_id ON calendar_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_contact_id ON calendar_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_external_id ON calendar_events(external_event_id);

-- Triggers
DROP TRIGGER IF EXISTS update_calendar_accounts_updated_at ON calendar_accounts;
CREATE TRIGGER update_calendar_accounts_updated_at
  BEFORE UPDATE ON calendar_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- TEAMS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Settings
  allow_auto_join BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TEAM MEMBERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Member settings
  show_team_deals BOOLEAN DEFAULT FALSE, -- Opt-in to see team deals
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- =====================
-- LEAD HANDOFFS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS lead_handoffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Handoff details
  handoff_type TEXT CHECK (handoff_type IN ('assigned', 'requested')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- =====================
-- TEAM NOTES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS team_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  
  note TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT TRUE, -- Internal team note (not visible to contact)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams they belong to" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update teams" ON teams
  FOR UPDATE USING (auth.uid() = owner_id);

-- Team members policies
CREATE POLICY "Users can view team members of their teams" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team owners can add members" ON team_members
  FOR INSERT WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update own team member settings" ON team_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave teams" ON team_members
  FOR DELETE USING (auth.uid() = user_id);

-- Update contacts policy to include team visibility (now that team_members exists)
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      -- Allow viewing team member contacts if user is in team and opted in
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.user_id = auth.uid()
        AND tm.show_team_deals = true
        AND EXISTS (
          SELECT 1 FROM team_members tm2
          WHERE tm2.team_id = tm.team_id
          AND tm2.user_id = contacts.user_id
        )
      )
    )
  );

-- Lead handoffs policies
CREATE POLICY "Users can view handoffs for their contacts or assigned to them" ON lead_handoffs
  FOR SELECT USING (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
    OR to_user_id = auth.uid()
    OR from_user_id = auth.uid()
  );

CREATE POLICY "Users can create handoffs" ON lead_handoffs
  FOR INSERT WITH CHECK (
    contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
    OR from_user_id = auth.uid()
  );

CREATE POLICY "Users can update handoffs assigned to them" ON lead_handoffs
  FOR UPDATE USING (to_user_id = auth.uid());

-- Team notes policies
CREATE POLICY "Users can view team notes for their team contacts" ON team_notes
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create team notes" ON team_notes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own team notes" ON team_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own team notes" ON team_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_handoffs_contact_id ON lead_handoffs(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_handoffs_to_user ON lead_handoffs(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_team_notes_contact_id ON team_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_team_id ON team_notes(team_id);

-- Triggers
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_notes_updated_at ON team_notes;
CREATE TRIGGER update_team_notes_updated_at
  BEFORE UPDATE ON team_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update contacts table to add commission field
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS commission_notes TEXT;

-- Update templates table to support team sharing
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_team_shared BOOLEAN DEFAULT FALSE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Function to get team members with emails
-- Note: This requires the function to run with SECURITY DEFINER to access auth.users
CREATE OR REPLACE FUNCTION get_team_members_with_emails(team_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  team_id UUID,
  show_team_deals BOOLEAN,
  joined_at TIMESTAMPTZ,
  email TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.id,
    tm.user_id,
    tm.team_id,
    tm.show_team_deals,
    tm.joined_at,
    COALESCE(au.email, 'Unknown') as email
  FROM team_members tm
  LEFT JOIN auth.users au ON tm.user_id = au.id
  WHERE tm.team_id = get_team_members_with_emails.team_id;
END;
$$;

