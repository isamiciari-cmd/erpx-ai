-- CREATE CASHIER USER FOR ERPX-AI
-- This script creates a cashier role and user with restricted POS-only permissions

-- Step 1: Create cashier role if it doesn't exist
INSERT INTO roles (name, display_name, permissions)
VALUES (
  'cashier',
  'Cashier',
  '{
    "pos_access": true,
    "create_sales": true,
    "search_products": true,
    "scan_barcode": true,
    "add_to_cart": true,
    "apply_discount": true,
    "select_payment_method": true,
    "print_invoice": true,
    "hold_order": true,
    "cancel_order_before_payment": true,
    "request_refund_approval": true,
    "open_close_shift": true,
    "view_own_shift_report": true,
    "view_own_sales_summary": true,
    "view_product_availability": true,
    "finance_access": false,
    "hr_access": false,
    "inventory_management": false,
    "accounting_reports": false,
    "user_management": false,
    "system_settings": false,
    "financial_dashboard": false,
    "delete_permission": false,
    "admin_controls": false
  }'::jsonb
)
ON CONFLICT (name) DO UPDATE
SET permissions = EXCLUDED.permissions;

-- Step 2: Check if cashier auth user exists, if not you need to create it manually first
-- Go to Supabase Dashboard → Authentication → Users → Add user
-- Email: cashier@erpx-ai.com
-- Password: Aa12141312@
-- Auto Confirm User: YES

-- Step 3: Create cashier user profile (run AFTER creating auth user)
-- Replace 'CASHIER_AUTH_USER_ID' with the actual ID from auth.users table
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
  'cashier@erpx-ai.com',
  'Cashier',
  'User',
  (SELECT id FROM roles WHERE name = 'cashier' LIMIT 1),
  (SELECT id FROM companies LIMIT 1),
  (SELECT id FROM branches LIMIT 1),
  'Sales',
  'Cashier',
  'active'
FROM auth.users au
WHERE au.email = 'cashier@erpx-ai.com'
ON CONFLICT (id) DO UPDATE
SET
  role_id = (SELECT id FROM roles WHERE name = 'cashier' LIMIT 1),
  department = 'Sales',
  position = 'Cashier';

-- Step 4: Verify cashier user was created
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.position,
  r.name as role_name,
  r.display_name as role_display,
  c.name as company_name,
  b.name as branch_name
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN branches b ON u.branch_id = b.id
WHERE u.email = 'cashier@erpx-ai.com';

-- The result should show:
-- Email: cashier@erpx-ai.com
-- Role: cashier
-- Position: Cashier
-- Status: active
