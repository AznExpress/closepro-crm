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

