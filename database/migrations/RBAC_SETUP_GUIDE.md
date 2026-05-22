

# ERPX-AI: Enterprise RBAC Setup Guide

**Complete Multi-Tenant Role-Based Access Control System**

---

## Overview

This guide will help you set up a complete enterprise-grade RBAC system with:

✅ Multi-tenant architecture  
✅ 11 predefined roles with granular permissions  
✅ Owner override capabilities  
✅ Developer mode with audit logging  
✅ Emergency access tracking  
✅ Complete audit trail  

---

## Prerequisites

- Supabase project created
- Database access (SQL Editor)
- Admin access to Supabase Dashboard

---

## Setup Steps

### Step 1: Create Auth Users in Supabase Dashboard

**IMPORTANT: Do this FIRST before running SQL scripts!**

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Create each user with these credentials:

#### User 1: Platform Owner
```
Email: i-1@erpx-ai.com
Password: Aa12141312@
Auto Confirm User: ✅ (check this!)
```

#### User 2: Developer Admin
```
Email: i.1122@erpx-ai.com
Password: @12345
Auto Confirm User: ✅
```

#### User 3: Administrator
```
Email: admin-1@erpx-ai.com
Password: @12345@
Auto Confirm User: ✅
```

#### User 4: Cashier
```
Email: cashier@erpx-ai.com
Password: Aa12141312@
Auto Confirm User: ✅
```

4. **COPY EACH USER ID** - You'll need these in Step 4!

---

### Step 2: Run Schema Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New query"**
3. Open `database/migrations/001_rbac_schema.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **"Run"**

**Expected Result:**
```
Success - Created 11 tables:
- tenants
- profiles
- roles
- permissions
- role_permissions
- user_roles
- user_tenants
- audit_logs
- emergency_access_logs
- developer_access_logs
- owner_override_logs
```

---

### Step 3: Run Functions Migration

1. Click **"New query"** in SQL Editor
2. Open `database/migrations/002_rbac_functions.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **"Run"**

**Expected Result:**
```
Success - Created 16 SQL functions:
- has_role()
- has_permission()
- is_owner()
- is_developer()
- get_user_tenants()
- (and 11 more...)
```

---

### Step 4: Run RLS Policies Migration

1. Click **"New query"** in SQL Editor
2. Open `database/migrations/003_rbac_policies.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **"Run"**

**Expected Result:**
```
Success - Created 40+ RLS policies
- Enabled RLS on all tables
- Created policies for each table
```

---

### Step 5: Update Initial Users Script with Auth User IDs

**CRITICAL STEP:**

1. Open `database/migrations/004_create_initial_users.sql`
2. Find these lines (around line 30-40):

```sql
-- Owner: i-1@erpx-ai.com
v_owner_id := 'REPLACE_WITH_OWNER_AUTH_USER_ID'::UUID;

-- Developer: i.1122@erpx-ai.com
v_developer_id := 'REPLACE_WITH_DEVELOPER_AUTH_USER_ID'::UUID;

-- Admin: admin-1@erpx-ai.com
v_admin_id := 'REPLACE_WITH_ADMIN_AUTH_USER_ID'::UUID;

-- Cashier: cashier@erpx-ai.com
v_cashier_id := 'REPLACE_WITH_CASHIER_AUTH_USER_ID'::UUID;
```

3. **Replace each UUID** with the actual User ID from Step 1:

```sql
-- Owner: i-1@erpx-ai.com
v_owner_id := 'a1b2c3d4-e5f6-7890-1234-567890abcdef'::UUID; -- YOUR ACTUAL ID

-- Developer: i.1122@erpx-ai.com
v_developer_id := 'b2c3d4e5-f6a7-8901-2345-67890abcdef1'::UUID; -- YOUR ACTUAL ID

-- Admin: admin-1@erpx-ai.com
v_admin_id := 'c3d4e5f6-a7b8-9012-3456-7890abcdef12'::UUID; -- YOUR ACTUAL ID

-- Cashier: cashier@erpx-ai.com
v_cashier_id := 'd4e5f6a7-b8c9-0123-4567-890abcdef123'::UUID; -- YOUR ACTUAL ID
```

4. Save the file

---

### Step 6: Run Initial Users Script

1. Click **"New query"** in SQL Editor
2. Copy the UPDATED `004_create_initial_users.sql` (with your UUIDs)
3. Paste into SQL Editor
4. Click **"Run"**

**Expected Result:**
```
Success - 4 rows returned

email                  | role      | level | tenant         | is_primary
-----------------------|-----------|-------|----------------|------------
i-1@erpx-ai.com       | owner     | 1000  | ERPX Platform  | true
i.1122@erpx-ai.com    | developer | 900   | ERPX Platform  | true
admin-1@erpx-ai.com   | admin     | 700   | ERPX Platform  | true
cashier@erpx-ai.com   | cashier   | 300   | ERPX Platform  | true
```

---

## Verification

### 1. Check Tables Created

Run this query:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'tenants', 'profiles', 'roles', 'permissions',
  'role_permissions', 'user_roles', 'user_tenants',
  'audit_logs', 'emergency_access_logs',
  'developer_access_logs', 'owner_override_logs'
)
ORDER BY table_name;
```

Should return 11 tables.

### 2. Check Roles Created

```sql
SELECT name, display_name, level, is_system_role
FROM roles
ORDER BY level DESC;
```

Should return 11 roles:
- owner (1000)
- developer (900)
- super_admin (800)
- admin (700)
- finance_manager (500)
- hr_manager (500)
- inventory_manager (500)
- sales_manager (500)
- cashier (300)
- employee (200)
- viewer (100)

### 3. Check Permissions Created

```sql
SELECT category, COUNT(*) as permission_count
FROM permissions
GROUP BY category
ORDER BY category;
```

Should return permissions grouped by category (dashboard, users, tenants, finance, hr, etc.)

### 4. Check User Roles Assigned

```sql
SELECT
  p.email,
  r.name AS role,
  r.level
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
ORDER BY r.level DESC;
```

Should show all 4 users with their roles.

### 5. Test Permission Function

```sql
-- Test if owner has permission
SELECT has_permission(
  (SELECT id FROM profiles WHERE email = 'i-1@erpx-ai.com'),
  'users.delete'
) AS owner_can_delete_users;

-- Test if cashier has permission
SELECT has_permission(
  (SELECT id FROM profiles WHERE email = 'cashier@erpx-ai.com'),
  'finance.view'
) AS cashier_can_view_finance;
```

First should return `true`, second should return `false`.

---

## Testing Login

1. Go to your ERPX-AI frontend
2. Try logging in with each user:

### Owner Login
```
Email: i-1@erpx-ai.com
Password: Aa12141312@
Expected: Full access to all modules, all tenants
```

### Developer Login
```
Email: i.1122@erpx-ai.com
Password: @12345
Expected: Technical access, audit logs, debugging tools
```

### Admin Login
```
Email: admin-1@erpx-ai.com
Password: @12345@
Expected: Full business access, no developer tools
```

### Cashier Login
```
Email: cashier@erpx-ai.com
Password: Aa12141312@
Expected: POS system only
```

---

## Role Permissions Matrix

| Role | Dashboard | Users | Finance | HR | Inventory | Sales | POS | Settings | Audit | Dev Tools |
|------|-----------|-------|---------|----|-----------| ------|-----|----------|-------|-----------|
| **owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **developer** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **super_admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **finance_manager** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **hr_manager** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **inventory_manager** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **sales_manager** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **cashier** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **employee** | ✅ (view) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **viewer** | ✅ (view) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Troubleshooting

### Error: "relation profiles does not exist"
**Solution:** Run `001_rbac_schema.sql` first

### Error: "function has_role does not exist"
**Solution:** Run `002_rbac_functions.sql`

### Error: "permission denied for table profiles"
**Solution:** Run `003_rbac_policies.sql`

### Users created but can't login
**Solution:**
1. Check auth users exist in Supabase Dashboard
2. Verify UUIDs match in `004_create_initial_users.sql`
3. Re-run step 6 with correct UUIDs

### Login works but no permissions
**Solution:**
1. Check user_roles table has entries
2. Verify role_permissions has mappings
3. Test `has_permission()` function manually

---

## Next Steps

After successful setup:

1. ✅ Test each user login
2. ✅ Verify permissions work correctly
3. ✅ Create additional tenants if needed
4. ✅ Assign users to multiple tenants
5. ✅ Configure frontend permission guards
6. ✅ Test audit logging
7. ✅ Set up developer mode UI
8. ✅ Test emergency access flow

---

## Security Notes

⚠️ **IMPORTANT:**

1. **Never expose service_role key** in frontend
2. **Always use anon key** for frontend connections
3. **RLS policies enforce permissions** - don't bypass them
4. **Audit logs are immutable** - no updates/deletes allowed
5. **Emergency access expires** - always temporary
6. **Owner override logs everything** - full accountability

---

## Support

If you encounter issues:

1. Check Supabase logs (Dashboard → Logs)
2. Verify all migrations ran successfully
3. Test SQL functions manually
4. Check RLS policies are enabled
5. Verify auth users exist

---

**Setup Complete! 🎉**

Your ERPX-AI platform now has enterprise-grade RBAC with:
- ✅ Multi-tenant support
- ✅ 11 roles with granular permissions
- ✅ Complete audit logging
- ✅ Owner override capabilities
- ✅ Developer mode
- ✅ Emergency access tracking

---

*For questions or issues, review the SQL migration files or contact support.*
