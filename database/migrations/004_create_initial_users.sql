-- ============================================
-- ERPX-AI: Create Initial Users
-- ============================================
-- IMPORTANT: You must create the auth users in Supabase Dashboard FIRST!
-- Then replace the UUIDs below with the actual user IDs from Supabase Auth.
-- ============================================

-- ============================================
-- STEP 1: Create Default Tenant
-- ============================================
INSERT INTO tenants (name, slug, status)
VALUES ('ERPX Platform', 'erpx-platform', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Get the tenant ID for later use
DO $$
DECLARE
  v_tenant_id UUID;
  v_owner_id UUID;
  v_developer_id UUID;
  v_admin_id UUID;
  v_cashier_id UUID;
  v_owner_role_id UUID;
  v_developer_role_id UUID;
  v_admin_role_id UUID;
  v_cashier_role_id UUID;
BEGIN
  -- Get tenant ID
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'erpx-platform';

  -- Get role IDs
  SELECT id INTO v_owner_role_id FROM roles WHERE name = 'owner';
  SELECT id INTO v_developer_role_id FROM roles WHERE name = 'developer';
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
  SELECT id INTO v_cashier_role_id FROM roles WHERE name = 'cashier';

  -- ============================================
  -- IMPORTANT: Replace these UUIDs with actual auth.users IDs
  -- ============================================
  -- After creating users in Supabase Dashboard, copy their IDs here:

  -- Owner: i-1@erpx-ai.com
  v_owner_id := 'REPLACE_WITH_OWNER_AUTH_USER_ID'::UUID;

  -- Developer: i.1122@erpx-ai.com
  v_developer_id := 'REPLACE_WITH_DEVELOPER_AUTH_USER_ID'::UUID;

  -- Admin: admin-1@erpx-ai.com
  v_admin_id := 'REPLACE_WITH_ADMIN_AUTH_USER_ID'::UUID;

  -- Cashier: cashier@erpx-ai.com
  v_cashier_id := 'REPLACE_WITH_CASHIER_AUTH_USER_ID'::UUID;

  -- ============================================
  -- STEP 2: Create Profiles
  -- ============================================

  -- Owner Profile
  INSERT INTO profiles (id, email, full_name, status)
  VALUES (v_owner_id, 'i-1@erpx-ai.com', 'Platform Owner', 'active')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

  -- Developer Profile
  INSERT INTO profiles (id, email, full_name, status)
  VALUES (v_developer_id, 'i.1122@erpx-ai.com', 'Developer Admin', 'active')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

  -- Admin Profile
  INSERT INTO profiles (id, email, full_name, status)
  VALUES (v_admin_id, 'admin-1@erpx-ai.com', 'System Administrator', 'active')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

  -- Cashier Profile
  INSERT INTO profiles (id, email, full_name, status)
  VALUES (v_cashier_id, 'cashier@erpx-ai.com', 'Cashier User', 'active')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

  -- ============================================
  -- STEP 3: Assign Roles
  -- ============================================

  -- Assign Owner Role
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_owner_id, v_owner_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- Assign Developer Role
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_developer_id, v_developer_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- Assign Admin Role
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_admin_id, v_admin_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- Assign Cashier Role
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_cashier_id, v_cashier_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- ============================================
  -- STEP 4: Assign to Tenant
  -- ============================================

  -- Owner doesn't need explicit tenant assignment (can access all)
  -- But we'll add for consistency
  INSERT INTO user_tenants (user_id, tenant_id, is_primary)
  VALUES (v_owner_id, v_tenant_id, true)
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_primary = EXCLUDED.is_primary;

  -- Developer to tenant
  INSERT INTO user_tenants (user_id, tenant_id, is_primary)
  VALUES (v_developer_id, v_tenant_id, true)
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_primary = EXCLUDED.is_primary;

  -- Admin to tenant
  INSERT INTO user_tenants (user_id, tenant_id, is_primary)
  VALUES (v_admin_id, v_tenant_id, true)
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_primary = EXCLUDED.is_primary;

  -- Cashier to tenant
  INSERT INTO user_tenants (user_id, tenant_id, is_primary)
  VALUES (v_cashier_id, v_tenant_id, true)
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_primary = EXCLUDED.is_primary;

  RAISE NOTICE 'Initial users created successfully!';
  RAISE NOTICE 'Owner: i-1@erpx-ai.com';
  RAISE NOTICE 'Developer: i.1122@erpx-ai.com';
  RAISE NOTICE 'Admin: admin-1@erpx-ai.com';
  RAISE NOTICE 'Cashier: cashier@erpx-ai.com';

END $$;

-- ============================================
-- STEP 5: Verify Setup
-- ============================================
SELECT
  p.email,
  r.name AS role,
  r.level,
  t.name AS tenant,
  ut.is_primary
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN user_tenants ut ON p.id = ut.user_id
LEFT JOIN tenants t ON ut.tenant_id = t.id
WHERE p.email IN (
  'i-1@erpx-ai.com',
  'i.1122@erpx-ai.com',
  'admin-1@erpx-ai.com',
  'cashier@erpx-ai.com'
)
ORDER BY r.level DESC NULLS LAST, p.email;
