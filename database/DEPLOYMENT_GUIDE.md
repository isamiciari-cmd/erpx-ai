# ERPX-AI Database Deployment Guide

## 🚀 Quick Start - Deploy to Supabase

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `svxmlejmhlocsjjtftxd`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Deploy Schema (5 minutes)

1. Open `/database/DEPLOY_TO_SUPABASE.sql`
2. Copy the **ENTIRE** contents (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **Run** (or press F5)
5. Wait for completion (you'll see success messages)

**What this creates:**

- ✅ 25+ database tables
- ✅ 30+ performance indexes
- ✅ Row Level Security on all tables
- ✅ 40+ security policies
- ✅ Auto-update triggers
- ✅ Helper functions

**Expected Output:**

```
========================================
Database schema created successfully!
========================================
Tables created: 25+
Indexes created: 30+
RLS enabled on all tables
Policies created: 40+

Next steps:
1. Run seed data script (next)
2. Test Supabase connection
3. Verify CRUD operations
========================================
```

### Step 3: Insert Sample Data (1 minute)

1. Open `/database/SEED_DATA.sql`
2. Copy the **ENTIRE** contents
3. Paste into Supabase SQL Editor (new query)
4. Click **Run**

**What this creates:**

- ✅ Demo company
- ✅ 5 sample products
- ✅ 3 customers
- ✅ 2 suppliers
- ✅ Inventory stock levels
- ✅ 5 departments

**Expected Output:**

```
========================================
Sample data inserted successfully!
========================================
Demo Company: ERPX Demo Company
Products: 5 items
Customers: 3 companies
Suppliers: 2 companies
Inventory: Stock levels populated
Departments: 5 departments

Ready for testing!
========================================
```

### Step 4: Verify Tables Created

Run this query in SQL Editor:

```sql
-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: 25+ tables including:
-- companies, users, products, inventory, customers, etc.
```

### Step 5: Verify RLS is Enabled

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true
ORDER BY tablename;

-- Expected: All 25+ tables should show rowsecurity = true
```

### Step 6: Test Sample Data

```sql
-- Check sample data
SELECT * FROM companies;
SELECT * FROM products LIMIT 5;
SELECT * FROM customers LIMIT 5;
SELECT * FROM inventory;

-- You should see the demo company, products, customers, and inventory
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] All tables created (25+ tables)
- [ ] RLS enabled on all tables
- [ ] Sample data inserted
- [ ] No SQL errors in log
- [ ] Company record exists
- [ ] Products visible
- [ ] Inventory records present

---

## 🔧 Test the Application

### 1. Test Supabase Connection

Visit your app diagnostic page:

```
http://localhost:5173/admin/supabase-diagnostic
```

Click **Run All Tests** and verify:

- ✅ Connection Test passes
- ✅ Read Test passes (should read customers)
- ✅ Create Test passes (creates test product)
- ✅ Update Test passes (updates test product)
- ✅ Delete Test passes (deletes test product)

### 2. Create First User

Since you don't have a user yet, you need to create one manually:

**Option A: Via Supabase Dashboard**

1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Enter email: `admin@erpx-ai.com`
4. Enter password: `Admin123!`
5. Click **Create User**
6. Note the user ID (UUID)

**Option B: Via SQL**

```sql
-- This will create a test user in auth.users
-- Note: In production, users sign up via the app
-- For now, we'll create a user profile manually

-- First, check if you have any auth users:
SELECT id, email FROM auth.users;

-- If you have a user from Supabase Auth signup,
-- create their profile:
INSERT INTO users (
  id,  -- Must match auth.users.id
  company_id,
  role_id,
  email,
  first_name,
  last_name,
  status
) VALUES (
  'YOUR-AUTH-USER-ID-HERE',  -- Replace with actual auth.users.id
  '00000000-0000-0000-0000-000000000001',  -- Demo company
  (SELECT id FROM roles WHERE name = 'admin' LIMIT 1),
  'admin@erpx-ai.com',
  'Admin',
  'User',
  'active'
);
```

### 3. Test Dashboard Data Loading

1. Run the dev server: `pnpm run dev`
2. Visit: http://localhost:5173
3. Login with your created user
4. Navigate to Dashboard
5. Check if KPIs load:
   - Total Stock Value should calculate
   - Product count should display
   - Inventory levels should show

---

## 🐛 Troubleshooting

### Error: "relation already exists"

**Solution:** Tables already exist. Either:

- Drop them first (dangerous!): `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
- Or modify SQL to use `CREATE TABLE IF NOT EXISTS`

### Error: "permission denied"

**Solution:** You're not using the service_role key.

- Use SQL Editor in Supabase Dashboard (has full permissions)
- Don't run SQL from frontend (anon key has limited access)

### Error: "null value in column violates not-null constraint"

**Solution:** Missing required data

- Check company_id is set
- Ensure foreign key references exist
- Verify role_id exists in roles table

### RLS Blocks All Queries

**Solution:** RLS requires authenticated user

- Create user first (see Step 2 above)
- Make sure user has company_id set
- Verify get_user_company_id() returns correct value

Test RLS functions:

```sql
-- Test as your user (replace with your auth.uid())
SELECT get_user_company_id();
-- Should return: 00000000-0000-0000-0000-000000000001

SELECT user_has_permission('admin');
-- Should return: true
```

### No Data Shows in App

**Possible causes:**

1. RLS blocking queries → Check policies
2. User not authenticated → Check AuthContext
3. company_id mismatch → Verify user.company_id = data.company_id
4. No sample data → Run SEED_DATA.sql

**Debug query:**

```sql
-- Check what your user can see
SELECT * FROM products
WHERE company_id = get_user_company_id();

-- If empty, check user setup:
SELECT
  u.id,
  u.email,
  u.company_id,
  u.role_id,
  r.name as role_name,
  r.permissions
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.id = auth.uid();
```

---

## 🔐 Create Additional Users

### Admin User

```sql
INSERT INTO users (
  id,  -- From auth.users
  company_id,
  role_id,
  email,
  first_name,
  last_name,
  employee_id,
  department,
  position,
  status
) VALUES (
  'auth-user-uuid-here',
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM roles WHERE name = 'admin'),
  'admin@company.com',
  'Admin',
  'User',
  'EMP-001',
  'IT',
  'System Administrator',
  'active'
);
```

### Manager User

```sql
INSERT INTO users (
  id,
  company_id,
  role_id,
  email,
  first_name,
  last_name,
  employee_id,
  department,
  position,
  status
) VALUES (
  'auth-user-uuid-here',
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM roles WHERE name = 'manager'),
  'manager@company.com',
  'Sales',
  'Manager',
  'EMP-002',
  'Sales',
  'Sales Manager',
  'active'
);
```

### Employee User

```sql
INSERT INTO users (
  id,
  company_id,
  role_id,
  email,
  first_name,
  last_name,
  employee_id,
  department,
  position,
  status
) VALUES (
  'auth-user-uuid-here',
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM roles WHERE name = 'employee'),
  'employee@company.com',
  'John',
  'Employee',
  'EMP-003',
  'Operations',
  'Staff Member',
  'active'
);
```

---

## 📊 Test CRUD Operations

### Create Product

```sql
INSERT INTO products (
  company_id,
  category_id,
  sku,
  product_name,
  unit_price,
  cost_price,
  min_stock_level
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000020',
  'TEST-001',
  'Test Product',
  99.99,
  75.00,
  10
);
```

### Read Products

```sql
SELECT * FROM products
WHERE company_id = '00000000-0000-0000-0000-000000000001';
```

### Update Product

```sql
UPDATE products
SET unit_price = 109.99
WHERE sku = 'TEST-001'
AND company_id = '00000000-0000-0000-0000-000000000001';
```

### Delete Product

```sql
DELETE FROM products
WHERE sku = 'TEST-001'
AND company_id = '00000000-0000-0000-0000-000000000001';
```

---

## 🎯 Next Steps

After successful deployment:

1. **Test all frontend pages**
   - Dashboard
   - Products
   - Inventory
   - Customers
   - Sales Orders
   - Invoices

2. **Verify realtime features**
   - Open two browser tabs
   - Update data in one tab
   - See changes in other tab

3. **Test role-based access**
   - Login as different users
   - Verify permissions work
   - Check RLS isolation

4. **Performance testing**
   - Add more sample data
   - Test query speeds
   - Monitor Supabase dashboard

5. **Backup strategy**
   - Enable daily backups in Supabase
   - Test restore procedure
   - Document recovery steps

---

## 📞 Support

If you encounter issues:

1. Check Supabase Logs:
   - Dashboard → Logs → SQL Editor
   - Look for error messages

2. Test RLS Policies:

   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'products';
   ```

3. Verify User Setup:

   ```sql
   SELECT
     u.*,
     r.name as role_name,
     r.permissions,
     c.name as company_name
   FROM users u
   JOIN roles r ON u.role_id = r.id
   JOIN companies c ON u.company_id = c.id
   WHERE u.id = auth.uid();
   ```

4. Check Supabase Documentation:
   - https://supabase.com/docs
   - https://supabase.com/docs/guides/auth/row-level-security

---

**Database Deployment Complete! 🎉**

You're now ready to use ERPX-AI with a fully configured Supabase database.
