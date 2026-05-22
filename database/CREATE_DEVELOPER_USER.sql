-- ============================================
-- CREATE DEVELOPER USER FOR ERPX-AI
-- ============================================
-- Purpose: Create a developer test account with full system access
-- Email: i.1122@erpx-ai.com
-- Password: @12345
-- Role: Developer (full access to all modules and debugging tools)
-- ============================================

-- STEP 1: Create Developer Role (if it doesn't exist)
-- ============================================

DO $$
DECLARE
  v_developer_role_id UUID;
  v_company_id UUID;
BEGIN
  -- Get the first company (or use a specific company_id)
  SELECT id INTO v_company_id FROM companies LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company found. Please create a company first.';
  END IF;

  -- Check if developer role exists
  SELECT id INTO v_developer_role_id FROM roles WHERE name = 'developer' LIMIT 1;

  -- Create developer role if it doesn't exist
  IF v_developer_role_id IS NULL THEN
    INSERT INTO roles (
      company_id,
      name,
      description,
      permissions,
      created_at,
      updated_at
    ) VALUES (
      v_company_id,
      'developer',
      'Full developer access with debugging capabilities',
      jsonb_build_object(
        -- All permissions enabled
        'all', true,

        -- Finance permissions
        'finance_access', true,
        'finance_read', true,
        'finance_write', true,
        'finance_delete', true,
        'view_reports', true,
        'manage_budgets', true,

        -- HR permissions
        'hr_access', true,
        'hr_read', true,
        'hr_write', true,
        'hr_delete', true,
        'manage_employees', true,
        'manage_payroll', true,

        -- Inventory permissions
        'inventory_access', true,
        'inventory_read', true,
        'inventory_write', true,
        'inventory_delete', true,
        'manage_products', true,

        -- POS permissions
        'pos_access', true,
        'open_close_shift', true,
        'process_sales', true,
        'process_refunds', true,

        -- Admin permissions
        'admin_access', true,
        'manage_users', true,
        'manage_roles', true,
        'manage_companies', true,
        'manage_branches', true,
        'manage_settings', true,

        -- Developer-specific permissions
        'debug_access', true,
        'view_logs', true,
        'database_access', true,
        'api_testing', true,
        'supabase_diagnostic', true
      ),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_developer_role_id;

    RAISE NOTICE 'Developer role created successfully with ID: %', v_developer_role_id;
  ELSE
    RAISE NOTICE 'Developer role already exists with ID: %', v_developer_role_id;
  END IF;

END $$;

-- ============================================
-- STEP 2: Instructions for Creating Auth User
-- ============================================

/*
IMPORTANT: You must create the authentication user in Supabase Dashboard first!

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Fill in:
   - Email: i.1122@erpx-ai.com
   - Password: @12345
   - Auto Confirm User: ✅ CHECK THIS BOX
4. Click "Create user"
5. COPY THE USER ID from the newly created user
6. Replace YOUR_USER_ID_HERE below with the actual user ID
7. Run STEP 3 below

The user ID looks like: 123e4567-e89b-12d3-a456-426614174000
*/

-- ============================================
-- STEP 3: Create Developer Profile in Users Table
-- ============================================

DO $$
DECLARE
  v_auth_user_id UUID := 'YOUR_USER_ID_HERE'; -- REPLACE THIS!
  v_developer_role_id UUID;
  v_company_id UUID;
  v_branch_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Get company
  SELECT id INTO v_company_id FROM companies LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company found. Please create a company first.';
  END IF;

  -- Get branch
  SELECT id INTO v_branch_id FROM branches WHERE company_id = v_company_id LIMIT 1;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'No branch found. Please create a branch first.';
  END IF;

  -- Get developer role
  SELECT id INTO v_developer_role_id FROM roles WHERE name = 'developer' LIMIT 1;

  IF v_developer_role_id IS NULL THEN
    RAISE EXCEPTION 'Developer role not found. Please run STEP 1 first.';
  END IF;

  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = v_auth_user_id) INTO v_user_exists;

  IF v_user_exists THEN
    -- Update existing user
    UPDATE users
    SET
      email = 'i.1122@erpx-ai.com',
      full_name = 'Developer Account',
      role_id = v_developer_role_id,
      company_id = v_company_id,
      branch_id = v_branch_id,
      is_active = true,
      updated_at = NOW()
    WHERE id = v_auth_user_id;

    RAISE NOTICE 'Developer user profile updated successfully';
  ELSE
    -- Create new user profile
    INSERT INTO users (
      id,
      email,
      full_name,
      role_id,
      company_id,
      branch_id,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      v_auth_user_id,
      'i.1122@erpx-ai.com',
      'Developer Account',
      v_developer_role_id,
      v_company_id,
      v_branch_id,
      true,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Developer user profile created successfully';
  END IF;

END $$;

-- ============================================
-- STEP 4: Verify Developer User
-- ============================================

SELECT
  u.id,
  u.email,
  u.full_name,
  r.name AS role_name,
  c.name AS company_name,
  b.name AS branch_name,
  u.is_active,
  r.permissions
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN branches b ON u.branch_id = b.id
WHERE u.email = 'i.1122@erpx-ai.com';

-- ============================================
-- SETUP COMPLETE!
-- ============================================

/*
✅ Developer role created with full permissions
✅ Developer user profile created

Next steps:
1. Make sure you created the auth user in Supabase Dashboard (Step 2)
2. Make sure you replaced YOUR_USER_ID_HERE in Step 3 with the real user ID
3. Test login at: http://localhost:5173/login
4. Click "Developer Quick Login" button (yellow button)
5. You should be redirected to: /admin/control-tower

Security notes:
- Developer bypass only works on localhost or staging
- Automatically disabled on production domain (erpx-ai.com)
- Dev mode indicator shows when bypass is active
*/
