# ERPX-AI RBAC Implementation Guide

## Overview

This document describes the complete Role-Based Access Control (RBAC) system implementation for ERPX-AI.

## Implementation Status

### ✅ Completed

#### Database Layer

- `001_rbac_schema.sql` - 11 tables with complete schema
- `002_rbac_functions.sql` - 16 PostgreSQL helper functions
- `003_rbac_policies.sql` - 40+ Row-Level Security policies
- `004_create_initial_users.sql` - Initial user creation template
- `RBAC_SETUP_GUIDE.md` - Complete setup instructions

#### Frontend Hooks

- `src/hooks/usePermissions.ts` - Permission checking hook
- `src/hooks/useCurrentUserRole.ts` - User role retrieval hook

#### Frontend Components

- `src/components/auth/PermissionGuard.tsx` - Permission-based route guard
- `src/components/auth/RequireRole.tsx` - Role requirement wrapper
- `src/components/auth/RequirePermission.tsx` - Permission requirement wrapper

#### Admin UI Pages

- `src/pages/admin/UserManagement.tsx` - User management interface
- `src/pages/admin/RolesPermissions.tsx` - Roles & permissions browser
- `src/pages/admin/PermissionMatrix.tsx` - Visual permission matrix
- `src/pages/admin/AuditLogs.tsx` - Audit log viewer
- `src/pages/admin/DeveloperMode.tsx` - Developer tools panel
- `src/pages/admin/EmergencyAccess.tsx` - Emergency access management

#### Routing

- Routes added to `src/app/App.tsx`:
  - `/admin/users`
  - `/admin/roles`
  - `/admin/permissions-matrix`
  - `/admin/audit-logs`
  - `/admin/developer-mode`
  - `/admin/emergency-access`

#### Context Integration

- Updated `src/contexts/AuthContext.tsx` to use RBAC functions

---

## How to Use the RBAC System

### 1. Database Setup

**IMPORTANT**: Follow the setup guide in `database/migrations/RBAC_SETUP_GUIDE.md`

Steps summary:

1. Create auth users in Supabase Dashboard
2. Run `001_rbac_schema.sql`
3. Run `002_rbac_functions.sql`
4. Run `003_rbac_policies.sql`
5. Update UUIDs in `004_create_initial_users.sql`
6. Run `004_create_initial_users.sql`

### 2. Frontend Usage

#### Check Permissions in Components

```tsx
import { usePermissions } from '../hooks/usePermissions';

function MyComponent() {
  const { hasPermission, hasRole, isOwner, isDeveloper } = usePermissions();

  if (hasPermission('users.create')) {
    return <CreateUserButton />;
  }

  return null;
}
```

#### Protect Routes with Guards

```tsx
import { PermissionGuard } from '../components/auth';

// Single permission
<PermissionGuard permission="finance.view">
  <FinanceModule />
</PermissionGuard>

// Multiple permissions (any)
<PermissionGuard permissions={["finance.view", "finance.create"]}>
  <FinanceDashboard />
</PermissionGuard>

// Multiple permissions (all required)
<PermissionGuard permissions={["users.delete", "users.update"]} requireAll>
  <DeleteUserButton />
</PermissionGuard>

// With redirect
<PermissionGuard permission="admin.access" redirectTo="/unauthorized">
  <AdminPanel />
</PermissionGuard>
```

#### Require Specific Roles

```tsx
import { RequireRole } from '../components/auth';

// Single role
<RequireRole role="admin">
  <AdminDashboard />
</RequireRole>

// Multiple roles (any)
<RequireRole role={["owner", "super_admin"]}>
  <SystemSettings />
</RequireRole>

// With fallback
<RequireRole role="developer" fallback={<AccessDenied />}>
  <DeveloperTools />
</RequireRole>
```

#### Get Current User Role

```tsx
import { useCurrentUserRole } from '../hooks/useCurrentUserRole';

function UserProfile() {
  const { primaryRole, allRoles, roleLevel } = useCurrentUserRole();

  return (
    <div>
      <h2>Your Role: {primaryRole?.display_name}</h2>
      <p>Level: {roleLevel}</p>
      {allRoles.length > 1 && (
        <p>Additional roles: {allRoles.map((r) => r.display_name).join(', ')}</p>
      )}
    </div>
  );
}
```

---

## Role Hierarchy

| Role                  | Level | Description                                |
| --------------------- | ----- | ------------------------------------------ |
| **owner**             | 1000  | Platform owner, full access to all tenants |
| **developer**         | 900   | Technical developer with debugging tools   |
| **super_admin**       | 800   | Full admin access to assigned tenants      |
| **admin**             | 700   | Full business access to assigned tenants   |
| **finance_manager**   | 500   | Finance module access                      |
| **hr_manager**        | 500   | HR module access                           |
| **inventory_manager** | 500   | Inventory module access                    |
| **sales_manager**     | 500   | Sales & CRM access                         |
| **cashier**           | 300   | POS system only                            |
| **employee**          | 200   | Limited self-service access                |
| **viewer**            | 100   | Read-only access                           |

---

## Permission Categories

1. **dashboard** - Dashboard access
2. **users** - User management (view, create, update, delete)
3. **tenants** - Tenant management (view, create, update, delete)
4. **finance** - Finance module (view, create, update, delete)
5. **hr** - HR module (view, create, update, delete)
6. **inventory** - Inventory module (view, create, update, delete)
7. **sales** - Sales module (view, create, update, delete)
8. **pos** - POS system (view, create, update, delete)
9. **reports** - Reporting (view, export)
10. **settings** - System settings (view, update)
11. **special** - Special permissions (developer.mode, owner.override, emergency.access, audit.view)

---

## PostgreSQL Functions Reference

### Permission Checking

```sql
-- Check if user has specific role
SELECT has_role('user-uuid', 'admin');

-- Check if user has specific permission
SELECT has_permission('user-uuid', 'users.create');

-- Check if user is owner
SELECT is_owner('user-uuid');

-- Check if user is developer
SELECT is_developer('user-uuid');
```

### User Data Retrieval

```sql
-- Get all permissions for user
SELECT * FROM get_user_permissions('user-uuid');

-- Get all roles for user
SELECT * FROM get_user_roles('user-uuid');

-- Get highest role level
SELECT get_highest_role_level('user-uuid');

-- Get user's tenants
SELECT * FROM get_user_tenants('user-uuid');

-- Check tenant access
SELECT can_access_tenant('user-uuid', 'tenant-uuid');
```

### Audit Logging

```sql
-- Log audit event
SELECT log_audit_event(
  'CREATE_USER',
  'profiles',
  'record-uuid',
  NULL, -- old_data
  '{"email": "new@example.com"}'::jsonb -- new_data
);

-- Log developer action
SELECT log_developer_access(
  'DEBUG_SESSION',
  '{"module": "permissions", "action": "test"}'::jsonb
);

-- Log owner override
SELECT log_owner_override(
  'OVERRIDE_PERMISSION',
  'tenant-uuid',
  'Emergency fix required',
  '{"permission": "users.delete"}'::jsonb
);
```

### Emergency Access

```sql
-- Grant emergency access (24 hours)
SELECT grant_emergency_access(
  'user-uuid',
  'Critical system issue requiring elevated access',
  24
);

-- Revoke emergency access
SELECT revoke_emergency_access('access-log-uuid');

-- Check if user has active emergency access
SELECT has_active_emergency_access('user-uuid');
```

---

## Security Notes

### Row-Level Security (RLS)

All tables have RLS enabled. Data access is automatically filtered based on:

- User's tenant assignments
- User's role level
- Specific permissions

### Audit Trail

All sensitive actions are logged:

- User creation/modification/deletion
- Role assignments
- Permission changes
- Emergency access grants/revocations
- Owner overrides
- Developer actions

### Developer Mode

Developer mode provides:

- Access to all audit logs
- Database statistics
- Function testing tools
- Developer action logging

**Security**: Only users with the `developer` role can access developer mode.

### Emergency Access

Emergency access allows:

- Temporary elevated permissions
- Time-limited access (default: 24 hours)
- Full audit logging
- Manual revocation by owner

**Security**: Only the `owner` role can grant/revoke emergency access.

### Owner Override

Owners can:

- Access all tenants
- Bypass most permission checks
- Perform emergency operations

**Security**: All owner override actions are logged in `owner_override_logs`.

---

## Testing the RBAC System

### 1. Test Permission Functions

Login as a user and open Developer Mode:

```
/admin/developer-mode
```

Click "Test get_user_permissions()" to verify permissions are loaded correctly.

### 2. Test Role Guards

Try accessing different admin pages with different user roles:

- Owner can access all pages
- Developer can access audit logs and developer mode
- Admin can access user management and roles
- Cashier should be redirected when accessing admin pages

### 3. Test Permission Guards

Create a test component:

```tsx
<PermissionGuard permission="users.delete">
  <button>Delete User</button>
</PermissionGuard>
```

Login with different roles and verify the button only appears for users with `users.delete` permission.

### 4. Test Audit Logging

Perform actions and check `/admin/audit-logs` to verify events are logged.

---

## Common Issues & Troubleshooting

### "function has_permission does not exist"

**Solution**: Run `002_rbac_functions.sql`

### "permission denied for table profiles"

**Solution**: Run `003_rbac_policies.sql`

### User can't login after RBAC setup

**Solution**:

1. Verify user exists in Supabase Auth
2. Verify profile exists in `profiles` table
3. Verify user has a role assigned in `user_roles` table
4. Check `004_create_initial_users.sql` UUIDs match auth user IDs

### Permission checks always return false

**Solution**:

1. Verify role_permissions mappings exist
2. Check user_roles table has correct assignments
3. Test with `SELECT get_user_permissions('user-uuid')`

### Frontend routing not working

**Solution**:

1. Verify routes are added to `src/app/App.tsx`
2. Check ProtectedRoute components
3. Verify user is authenticated

---

## Next Steps

1. **Test the System**: Login with each test user and verify permissions
2. **Create Additional Users**: Use User Management page to create new users
3. **Customize Permissions**: Adjust role-permission mappings as needed
4. **Add Custom Roles**: Create organization-specific roles
5. **Implement Permission Guards**: Add permission checks to sensitive components
6. **Monitor Audit Logs**: Regularly review audit logs for security

---

## Support

For issues or questions:

1. Check this guide
2. Review `RBAC_SETUP_GUIDE.md`
3. Examine SQL migration files for database details
4. Check frontend component source code for usage examples

---

**RBAC System Version**: 1.0  
**Last Updated**: 2026-05-20  
**Status**: ✅ Implementation Complete - Ready for Testing
