-- CREATE ADMIN USER FOR ERPX-AI
-- This script creates a user record linked to a Supabase Auth user

-- Step 1: Create the auth user in Supabase Dashboard
-- Go to Authentication → Users → Add user
-- Email: admin-1@erpx-ai.com
-- Password: @12345@
-- ✅ Check "Auto Confirm User"

-- Step 2: Insert user record into users table
-- This will link to the auth user with email admin-1@erpx-ai.com
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
  au.id,                                          -- Get ID from auth.users
  'admin-1@erpx-ai.com',                           -- Email
  'Admin',                                        -- First name
  'User',                                         -- Last name
  (SELECT id FROM roles WHERE name = 'admin' LIMIT 1),  -- Admin role
  (SELECT id FROM companies LIMIT 1),            -- First company
  (SELECT id FROM branches LIMIT 1),             -- First branch
  'Management',                                   -- Department
  'System Administrator',                         -- Position
  'active'                                        -- Status (lowercase required)
FROM auth.users au
WHERE au.email = 'admin-1@erpx-ai.com'
ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate if already exists

-- Verify the user was created
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  r.display_name as role,
  c.name as company,
  u.status
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'admin-1@erpx-ai.com';
