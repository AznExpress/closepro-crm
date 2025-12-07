-- ClosePro CRM Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- CONTACTS TABLE
-- =====================
CREATE TABLE contacts (
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
CREATE TABLE activities (
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
CREATE TABLE showings (
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
CREATE TABLE reminders (
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
CREATE TABLE templates (
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
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_temperature ON contacts(user_id, temperature);
CREATE INDEX idx_contacts_deal_stage ON contacts(user_id, deal_stage);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_showings_contact_id ON showings(contact_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_due_date ON reminders(user_id, due_date) WHERE NOT completed;
CREATE INDEX idx_templates_user_id ON templates(user_id);

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
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for templates
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
CREATE TRIGGER update_last_contact_on_activity
  AFTER INSERT ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_last_contact();

-- Trigger for showings
CREATE TRIGGER update_last_contact_on_showing
  AFTER INSERT ON showings
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_last_contact();

-- =====================
-- EMAIL ACCOUNTS TABLE
-- =====================
CREATE TABLE email_accounts (
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
CREATE INDEX idx_email_accounts_user_id ON email_accounts(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_email_accounts_updated_at
  BEFORE UPDATE ON email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- SUBSCRIPTIONS TABLE
-- =====================
CREATE TABLE subscriptions (
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
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- CALENDAR ACCOUNTS TABLE
-- =====================
CREATE TABLE calendar_accounts (
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
CREATE TABLE calendar_events (
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
CREATE INDEX idx_calendar_accounts_user_id ON calendar_accounts(user_id);
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(user_id, start_time);
CREATE INDEX idx_calendar_events_contact_id ON calendar_events(contact_id);
CREATE INDEX idx_calendar_events_external_id ON calendar_events(external_event_id);

-- Triggers
CREATE TRIGGER update_calendar_accounts_updated_at
  BEFORE UPDATE ON calendar_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

