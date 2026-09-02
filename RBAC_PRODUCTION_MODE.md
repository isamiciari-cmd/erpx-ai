# RBAC Production Mode - Strict Enforcement

## ✅ Production Mode Enabled

The RBAC system is now configured for **strict enforcement** with **no development fallbacks**.

## What This Means

### Permission Enforcement

- ✅ All permission guards are **strictly enforced**
- ❌ No automatic "allow all" fallbacks
- ❌ No development mode bypasses
- ✅ Users without proper permissions will be **denied access**

### Required Setup

For the application to work, you **MUST** complete the RBAC database setup:

1. **Create auth users** in Supabase Dashboard
2. **Run all 4 SQL migrations** in order
3. **Assign roles** to users via migration 004

**Without RBAC setup, permission-gated features will be inaccessible.**

## Current Behavior

### If RBAC Tables Exist ✅

- Permission checks work normally
- Users see only features they have permission for
- Role-based access control enforced
- Multi-tenant data isolation active
- Full audit logging

### If RBAC Tables Don't Exist ❌

- Permission checks fail (no data to check against)
- Users with no roles will be redirected to `/unauthorized`
- Protected pages will be inaccessible
- Application may appear broken to users without permissions

## Setup Required

### Step 1: Create Auth Users (Supabase Dashboard)

Navigate to: **Supabase Dashboard → Authentication → Users**

Create these 4 users:

| Email               | Password    | Role      | Auto-Confirm |
| ------------------- | ----------- | --------- | ------------ |
| i-1@erpx-ai.com     | Aa12141312@ | owner     | ✅           |
| i.1122@erpx-ai.com  | @12345      | developer | ✅           |
| admin-1@erpx-ai.com | @12345@     | admin     | ✅           |
| cashier@erpx-ai.com | Aa12141312@ | cashier   | ✅           |

**⚠️ IMPORTANT:** Copy each user's UUID - you'll need these for Step 4!

### Step 2: Run Schema Migration

**File:** `database/migrations/001_rbac_schema.sql`

**Location:** Supabase Dashboard → SQL Editor → New Query

This creates:

- 11 tables (tenants, profiles, roles, permissions, etc.)
- 11 system roles (owner, developer, admin, etc.)
- 38 permissions across 11 categories
- Role-permission mappings

### Step 3: Run Functions Migration

**File:** `database/migrations/002_rbac_functions.sql`

**Location:** Supabase Dashboard → SQL Editor → New Query

This creates 16 PostgreSQL functions:

- `has_role()` - Check user role
- `has_permission()` - Check user permission
- `is_owner()` - Check if owner
- `is_developer()` - Check if developer
- `get_user_permissions()` - Get all user permissions
- `get_user_roles()` - Get all user roles
- And 10 more helper functions

### Step 4: Run RLS Policies Migration

**File:** `database/migrations/003_rbac_policies.sql`

**Location:** Supabase Dashboard → SQL Editor → New Query

This creates:

- 40+ Row-Level Security policies
- Multi-tenant data isolation
- Permission-based table access

### Step 5: Update Initial Users Script

**File:** `database/migrations/004_create_initial_users.sql`

1. Open the file
2. Find these lines (around line 42-52):

   ```sql
   v_owner_id := 'REPLACE_WITH_OWNER_AUTH_USER_ID'::UUID;
   v_developer_id := 'REPLACE_WITH_DEVELOPER_AUTH_USER_ID'::UUID;
   v_admin_id := 'REPLACE_WITH_ADMIN_AUTH_USER_ID'::UUID;
   v_cashier_id := 'REPLACE_WITH_CASHIER_AUTH_USER_ID'::UUID;
   ```

3. Replace with actual UUIDs from Step 1:
   ```sql
   v_owner_id := 'a1b2c3d4-...'::UUID;  -- i-1@erpx-ai.com
   v_developer_id := 'b2c3d4e5-...'::UUID;  -- i.1122@erpx-ai.com
   v_admin_id := 'c3d4e5f6-...'::UUID;  -- admin-1@erpx-ai.com
   v_cashier_id := 'd4e5f6a7-...'::UUID;  -- cashier@erpx-ai.com
   ```

### Step 6: Run Initial Users Script

**File:** `database/migrations/004_create_initial_users.sql` (with your UUIDs)

**Location:** Supabase Dashboard → SQL Editor → New Query

This creates:

- Default tenant "ERPX Platform"
- 4 user profiles
- Role assignments
- Tenant assignments

### Step 7: Verify Setup

Run this verification query in SQL Editor:

```sql
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
ORDER BY r.level DESC NULLS LAST;
```

**Expected Output:**

```
email                  | role      | level | tenant         | is_primary
-----------------------|-----------|-------|----------------|------------
i-1@erpx-ai.com       | owner     | 1000  | ERPX Platform  | true
i.1122@erpx-ai.com    | developer | 900   | ERPX Platform  | true
admin-1@erpx-ai.com   | admin     | 700   | ERPX Platform  | true
cashier@erpx-ai.com   | cashier   | 300   | ERPX Platform  | true
```

## Testing

### Test User Logins

Login with each user and verify access:

**Owner (i-1@erpx-ai.com)**

- ✅ Full access to all modules
- ✅ Can access `/admin/users`
- ✅ Can access `/admin/roles`
- ✅ Can access `/admin/audit-logs`
- ✅ Can access all other admin pages

**Developer (i.1122@erpx-ai.com)**

- ✅ Technical access to most modules
- ✅ Can access `/admin/developer-mode`
- ✅ Can access `/admin/audit-logs`
- ✅ Cannot access emergency access

**Admin (admin-1@erpx-ai.com)**

- ✅ Full business module access
- ✅ Can access `/admin/users`
- ❌ Cannot access `/admin/developer-mode`
- ❌ Cannot access `/admin/audit-logs`

**Cashier (cashier@erpx-ai.com)**

- ✅ POS system only
- ❌ Redirected from all admin pages
- ❌ Cannot access finance, HR, inventory modules

## Troubleshooting

### Error: "function has_permission does not exist"

**Solution:** Run `002_rbac_functions.sql`

### Error: "relation profiles does not exist"

**Solution:** Run `001_rbac_schema.sql` first

### Error: "permission denied for table profiles"

**Solution:** Run `003_rbac_policies.sql`

### User can login but has no permissions

**Solution:**

1. Verify user profile exists in `profiles` table
2. Check `user_roles` table for role assignment
3. Run verification query from Step 7

### Browser console shows errors

**Solution:**

1. Check exact error message
2. Verify all 4 migrations ran successfully
3. Confirm user UUIDs match in migration 004

## Permission Matrix

| Role              | Dashboard | Users | Finance | HR  | Inventory | Sales | POS | Admin | Audit | Dev |
| ----------------- | --------- | ----- | ------- | --- | --------- | ----- | --- | ----- | ----- | --- |
| owner             | ✅        | ✅    | ✅      | ✅  | ✅        | ✅    | ✅  | ✅    | ✅    | ✅  |
| developer         | ✅        | ✅    | ✅      | ✅  | ✅        | ✅    | ✅  | ✅    | ✅    | ✅  |
| super_admin       | ✅        | ✅    | ✅      | ✅  | ✅        | ✅    | ✅  | ✅    | ✅    | ❌  |
| admin             | ✅        | ✅    | ✅      | ✅  | ✅        | ✅    | ✅  | ✅    | ❌    | ❌  |
| finance_manager   | ✅        | ❌    | ✅      | ❌  | ❌        | ❌    | ❌  | ❌    | ❌    | ❌  |
| hr_manager        | ✅        | ❌    | ❌      | ✅  | ❌        | ❌    | ❌  | ❌    | ❌    | ❌  |
| inventory_manager | ✅        | ❌    | ❌      | ❌  | ✅        | ❌    | ❌  | ❌    | ❌    | ❌  |
| sales_manager     | ✅        | ❌    | ❌      | ❌  | ❌        | ✅    | ❌  | ❌    | ❌    | ❌  |
| cashier           | ❌        | ❌    | ❌      | ❌  | ❌        | ❌    | ✅  | ❌    | ❌    | ❌  |
| employee          | ✅ (view) | ❌    | ❌      | ❌  | ❌        | ❌    | ❌  | ❌    | ❌    | ❌  |
| viewer            | ✅ (view) | ❌    | ❌      | ❌  | ❌        | ❌    | ❌  | ❌    | ❌    | ❌  |

## Security Features

✅ **Row-Level Security** - All tables protected  
✅ **Multi-tenant isolation** - Data segregated by tenant  
✅ **Immutable audit logs** - All actions tracked  
✅ **Emergency access** - Time-limited elevated permissions  
✅ **Owner override** - Full accountability logging  
✅ **Developer mode** - Secure debugging tools

## Documentation

📚 **Complete guides:**

- `database/migrations/RBAC_SETUP_GUIDE.md` - Detailed setup instructions
- `database/RBAC_IMPLEMENTATION_GUIDE.md` - API reference and usage
- `RBAC_IMPLEMENTATION_SUMMARY.md` - System overview

---

**Status:** Production RBAC enforcement enabled - Database setup required for full functionality
