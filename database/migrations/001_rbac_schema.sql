-- ============================================
-- ERPX-AI: Enterprise RBAC Schema Migration
-- Multi-Tenant Role-Based Access Control
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. TENANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255),
  settings JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================
-- 2. PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_status ON profiles(status);

-- ============================================
-- 3. ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  level INTEGER DEFAULT 0, -- Higher level = more privileged
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_level ON roles(level);

-- Insert system roles
INSERT INTO roles (name, display_name, description, level, is_system_role) VALUES
('owner', 'Platform Owner', 'Full platform access, can manage all tenants', 1000, true),
('developer', 'Developer Admin', 'System developer with technical access and debugging tools', 900, true),
('super_admin', 'Super Administrator', 'Full administrative access to assigned tenants', 800, true),
('admin', 'Administrator', 'Full business access to assigned tenants', 700, true),
('finance_manager', 'Finance Manager', 'Full finance module access', 500, true),
('hr_manager', 'HR Manager', 'Full HR module access', 500, true),
('inventory_manager', 'Inventory Manager', 'Full inventory module access', 500, true),
('sales_manager', 'Sales Manager', 'Full sales and CRM access', 500, true),
('cashier', 'Cashier', 'POS system access', 300, true),
('employee', 'Employee', 'Limited self-service access', 200, true),
('viewer', 'Viewer', 'Read-only access to reports and dashboards', 100, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permissions_key ON permissions(key);
CREATE INDEX idx_permissions_category ON permissions(category);

-- Insert system permissions
INSERT INTO permissions (key, name, description, category) VALUES
-- Dashboard
('dashboard.view', 'View Dashboard', 'Access to main dashboard', 'dashboard'),

-- Users
('users.view', 'View Users', 'View user list and profiles', 'users'),
('users.create', 'Create Users', 'Create new users', 'users'),
('users.update', 'Update Users', 'Edit user information', 'users'),
('users.delete', 'Delete Users', 'Remove users', 'users'),

-- Tenants
('tenants.view', 'View Tenants', 'View tenant information', 'tenants'),
('tenants.create', 'Create Tenants', 'Create new tenants', 'tenants'),
('tenants.update', 'Update Tenants', 'Edit tenant settings', 'tenants'),
('tenants.delete', 'Delete Tenants', 'Remove tenants', 'tenants'),

-- Finance
('finance.view', 'View Finance', 'View financial data', 'finance'),
('finance.create', 'Create Finance Records', 'Create financial records', 'finance'),
('finance.update', 'Update Finance Records', 'Edit financial records', 'finance'),
('finance.delete', 'Delete Finance Records', 'Remove financial records', 'finance'),

-- HR
('hr.view', 'View HR', 'View HR data', 'hr'),
('hr.create', 'Create HR Records', 'Create HR records', 'hr'),
('hr.update', 'Update HR Records', 'Edit HR records', 'hr'),
('hr.delete', 'Delete HR Records', 'Remove HR records', 'hr'),

-- Inventory
('inventory.view', 'View Inventory', 'View inventory data', 'inventory'),
('inventory.create', 'Create Inventory Records', 'Create inventory records', 'inventory'),
('inventory.update', 'Update Inventory Records', 'Edit inventory records', 'inventory'),
('inventory.delete', 'Delete Inventory Records', 'Remove inventory records', 'inventory'),

-- Sales
('sales.view', 'View Sales', 'View sales data', 'sales'),
('sales.create', 'Create Sales Records', 'Create sales records', 'sales'),
('sales.update', 'Update Sales Records', 'Edit sales records', 'sales'),
('sales.delete', 'Delete Sales Records', 'Remove sales records', 'sales'),

-- POS
('pos.view', 'View POS', 'Access POS system', 'pos'),
('pos.create', 'Create POS Transactions', 'Process sales in POS', 'pos'),
('pos.update', 'Update POS Transactions', 'Edit POS transactions', 'pos'),
('pos.delete', 'Delete POS Transactions', 'Remove POS transactions', 'pos'),

-- Reports
('reports.view', 'View Reports', 'View reports and analytics', 'reports'),
('reports.export', 'Export Reports', 'Export reports to PDF/Excel', 'reports'),

-- Settings
('settings.view', 'View Settings', 'View system settings', 'settings'),
('settings.update', 'Update Settings', 'Modify system settings', 'settings'),

-- Special Access
('developer.mode', 'Developer Mode', 'Access developer tools and debugging', 'special'),
('owner.override', 'Owner Override', 'Bypass tenant restrictions', 'special'),
('emergency.access', 'Emergency Access', 'Emergency system access', 'special'),
('audit.view', 'View Audit Logs', 'View system audit logs', 'special')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 5. ROLE_PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- Assign permissions to roles
DO $$
DECLARE
  owner_role_id UUID;
  developer_role_id UUID;
  super_admin_role_id UUID;
  admin_role_id UUID;
  finance_mgr_role_id UUID;
  hr_mgr_role_id UUID;
  inventory_mgr_role_id UUID;
  sales_mgr_role_id UUID;
  cashier_role_id UUID;
  employee_role_id UUID;
  viewer_role_id UUID;
BEGIN
  -- Get role IDs
  SELECT id INTO owner_role_id FROM roles WHERE name = 'owner';
  SELECT id INTO developer_role_id FROM roles WHERE name = 'developer';
  SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO finance_mgr_role_id FROM roles WHERE name = 'finance_manager';
  SELECT id INTO hr_mgr_role_id FROM roles WHERE name = 'hr_manager';
  SELECT id INTO inventory_mgr_role_id FROM roles WHERE name = 'inventory_manager';
  SELECT id INTO sales_mgr_role_id FROM roles WHERE name = 'sales_manager';
  SELECT id INTO cashier_role_id FROM roles WHERE name = 'cashier';
  SELECT id INTO employee_role_id FROM roles WHERE name = 'employee';
  SELECT id INTO viewer_role_id FROM roles WHERE name = 'viewer';

  -- Owner: ALL permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT owner_role_id, id FROM permissions
  ON CONFLICT DO NOTHING;

  -- Developer: All permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT developer_role_id, id FROM permissions
  ON CONFLICT DO NOTHING;

  -- Super Admin: All except developer/owner/emergency
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT super_admin_role_id, id FROM permissions
  WHERE key NOT IN ('developer.mode', 'owner.override', 'emergency.access')
  ON CONFLICT DO NOTHING;

  -- Admin: All business permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT admin_role_id, id FROM permissions
  WHERE key NOT IN ('developer.mode', 'owner.override', 'emergency.access', 'audit.view',
                    'tenants.create', 'tenants.delete')
  ON CONFLICT DO NOTHING;

  -- Finance Manager: Finance + Dashboard + Reports
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT finance_mgr_role_id, id FROM permissions
  WHERE key LIKE 'finance.%' OR key LIKE 'dashboard.%' OR key LIKE 'reports.%'
  ON CONFLICT DO NOTHING;

  -- HR Manager: HR + Dashboard + Reports
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT hr_mgr_role_id, id FROM permissions
  WHERE key LIKE 'hr.%' OR key LIKE 'dashboard.%' OR key LIKE 'reports.%'
  ON CONFLICT DO NOTHING;

  -- Inventory Manager: Inventory + Dashboard + Reports
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT inventory_mgr_role_id, id FROM permissions
  WHERE key LIKE 'inventory.%' OR key LIKE 'dashboard.%' OR key LIKE 'reports.%'
  ON CONFLICT DO NOTHING;

  -- Sales Manager: Sales + Dashboard + Reports
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT sales_mgr_role_id, id FROM permissions
  WHERE key LIKE 'sales.%' OR key LIKE 'dashboard.%' OR key LIKE 'reports.%'
  ON CONFLICT DO NOTHING;

  -- Cashier: POS only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT cashier_role_id, id FROM permissions
  WHERE key LIKE 'pos.%'
  ON CONFLICT DO NOTHING;

  -- Employee: View dashboard
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT employee_role_id, id FROM permissions
  WHERE key = 'dashboard.view'
  ON CONFLICT DO NOTHING;

  -- Viewer: View only
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT viewer_role_id, id FROM permissions
  WHERE key IN ('dashboard.view', 'reports.view')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================
-- 6. USER_ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- ============================================
-- 7. USER_TENANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_user_tenants_user ON user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant ON user_tenants(tenant_id);
CREATE INDEX idx_user_tenants_primary ON user_tenants(user_id, is_primary);

-- ============================================
-- 8. AUDIT_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================
-- 9. EMERGENCY_ACCESS_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS emergency_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_emergency_access_user ON emergency_access_logs(user_id);
CREATE INDEX idx_emergency_access_active ON emergency_access_logs(is_active, expires_at);

-- ============================================
-- 10. DEVELOPER_ACCESS_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS developer_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_developer_access_user ON developer_access_logs(user_id);
CREATE INDEX idx_developer_access_created ON developer_access_logs(created_at DESC);

-- ============================================
-- 11. OWNER_OVERRIDE_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS owner_override_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  reason TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_owner_override_user ON owner_override_logs(user_id);
CREATE INDEX idx_owner_override_tenant ON owner_override_logs(tenant_id);
CREATE INDEX idx_owner_override_created ON owner_override_logs(created_at DESC);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE tenants IS 'Multi-tenant organizations';
COMMENT ON TABLE profiles IS 'User profiles linked to Supabase Auth';
COMMENT ON TABLE roles IS 'System and custom roles';
COMMENT ON TABLE permissions IS 'Granular permissions';
COMMENT ON TABLE role_permissions IS 'Role to permission mapping';
COMMENT ON TABLE user_roles IS 'User to role assignment';
COMMENT ON TABLE user_tenants IS 'User to tenant assignment';
COMMENT ON TABLE audit_logs IS 'System-wide audit trail';
COMMENT ON TABLE emergency_access_logs IS 'Emergency access tracking';
COMMENT ON TABLE developer_access_logs IS 'Developer action logging';
COMMENT ON TABLE owner_override_logs IS 'Owner override action logging';
