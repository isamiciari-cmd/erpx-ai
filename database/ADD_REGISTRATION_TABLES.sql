-- ADD REGISTRATION TABLES FOR COMPANY REGISTRATION FEATURE
-- Run this SQL in Supabase SQL Editor to add the subscription and module tables

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_name VARCHAR(50) NOT NULL CHECK (plan_name IN ('trial', 'monthly', 'yearly')),
  billing_cycle VARCHAR(50) NOT NULL,
  max_branches INTEGER NOT NULL DEFAULT 1,
  max_users INTEGER NOT NULL DEFAULT 5,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Company Modules Table
CREATE TABLE IF NOT EXISTS company_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module_name VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, module_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_company_modules_company_id ON company_modules(company_id);
CREATE INDEX IF NOT EXISTS idx_company_modules_enabled ON company_modules(company_id, is_enabled);

-- Auto-update timestamps trigger for subscriptions
CREATE OR REPLACE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update timestamps trigger for company_modules
CREATE OR REPLACE TRIGGER update_company_modules_updated_at
  BEFORE UPDATE ON company_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their company subscription"
  ON subscriptions FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Only admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (
    company_id = get_user_company_id() AND
    user_has_permission('manage_subscription')
  );

-- RLS Policies for company_modules
CREATE POLICY "Users can view their company modules"
  ON company_modules FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Only admins can manage modules"
  ON company_modules FOR ALL
  USING (
    company_id = get_user_company_id() AND
    user_has_permission('manage_modules')
  );

-- Grant permissions
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON company_modules TO authenticated;

-- Verify tables were created
SELECT 'Subscriptions table created' as status, COUNT(*) as rows FROM subscriptions;
SELECT 'Company modules table created' as status, COUNT(*) as rows FROM company_modules;
