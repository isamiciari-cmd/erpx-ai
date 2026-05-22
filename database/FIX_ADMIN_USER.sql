-- FIX ADMIN USER - Complete Reset and Recreation
-- Run this if you're having login issues

-- Step 1: Check if auth user exists
SELECT
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'admin-1@erpx-ai.com';

-- Step 2: If user exists in database, delete it first (to start fresh)
DELETE FROM users WHERE email = 'admin-1@erpx-ai.com';

-- Step 3: Create fresh user record linked to auth user
-- This will work ONLY if you already created the auth user in Supabase Dashboard
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  role_id,
  company_id,
  branch_id,
  department,
  position,
  status
)
SELECT
  au.id,
  'admin-1@erpx-ai.com',
  'Admin',
  'User',
  (SELECT id FROM roles WHERE name = 'admin' LIMIT 1),
  (SELECT id FROM companies LIMIT 1),
  (SELECT id FROM branches LIMIT 1),
  'Management',
  'System Administrator',
  'active'
FROM auth.users au
WHERE au.email = 'admin-1@erpx-ai.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role_id = EXCLUDED.role_id,
  company_id = EXCLUDED.company_id,
  status = EXCLUDED.status;

-- Step 4: Verify everything is correct
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.status,
  r.name as role_name,
  r.display_name as role_display,
  c.name as company_name,
  au.email_confirmed_at,
  au.created_at as auth_created_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'admin-1@erpx-ai.com';

-- If the query above returns a row, the user is ready!
-- Login credentials:
--   Email: admin-1@erpx-ai.com
--   Password: @12345@ (set this in Supabase Dashboard → Authentication → Users)
