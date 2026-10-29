import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserWithDetails } from '../services/usersService';
import { isMissingRpc, legacyPermissions, ProfileSetupRequiredError, roleFromName, type Permission, type UserRole } from './authAccess';

export interface AccessSnapshot {
  user: UserWithDetails;
  roles: UserRole[];
  permissions: Permission[];
}

/** Read only server-owned identity records; never trust auth user_metadata for roles. */
export async function readAccessSnapshot(
  client: Pick<SupabaseClient, 'from' | 'rpc'>,
  authUserId: string,
): Promise<AccessSnapshot> {
  const profileResult = await client.from('users').select('*').eq('id', authUserId).maybeSingle();
  if (profileResult.error) throw new Error(profileResult.error.message);
  const profile = profileResult.data;
  if (!profile) throw new ProfileSetupRequiredError();
  if (profile.id !== authUserId || !profile.company_id || !profile.role_id || profile.status !== 'active') {
    throw new Error('Your ERP profile is missing, inactive, or has no assigned company or role. Contact your administrator.');
  }

  const [roleResult, rolesResult, permissionsResult] = await Promise.all([
    client.from('roles').select('*').eq('id', profile.role_id).maybeSingle(),
    client.rpc('get_user_roles', { p_user_id: authUserId }),
    client.rpc('get_user_permissions', { p_user_id: authUserId }),
  ]);
  if (roleResult.error) throw new Error(roleResult.error.message);
  const role = roleResult.data;
  if (!role || !role.name || (role.company_id != null && role.company_id !== profile.company_id)
    || (role.status != null && role.status !== 'active')) {
    throw new Error('Your assigned role is unavailable or belongs to another company.');
  }

  // The canonical legacy schema has role JSON grants; enterprise RBAC has RPCs.
  // Only an explicitly missing RPC permits legacy resolution. Network/denial errors fail closed.
  const legacyRoles = isMissingRpc(rolesResult.error);
  const legacyGrants = isMissingRpc(permissionsResult.error);
  if (rolesResult.error && !legacyRoles) throw new Error(rolesResult.error.message);
  if (permissionsResult.error && !legacyGrants) throw new Error(permissionsResult.error.message);
  if (legacyRoles !== legacyGrants) throw new Error('Authorization schema is incomplete. Apply matching role and permission migrations.');

  const roles: UserRole[] = legacyRoles
    ? [roleFromName(role.name, role.display_name, role.level)]
    : (rolesResult.data || []);
  const permissions: Permission[] = legacyGrants
    ? legacyPermissions(role.permissions)
    : (permissionsResult.data || []);
  if (!Array.isArray(roles) || roles.some((item) => !item || typeof item.role_name !== 'string' || !Number.isFinite(item.level))) {
    throw new Error('Invalid role response from the authorization service.');
  }
  if (roles.length === 0) throw new Error('No active role is assigned to this account. Contact your administrator.');
  if (!Array.isArray(permissions) || permissions.some((item) => !item || typeof item.permission_key !== 'string')) {
    throw new Error('Invalid permission response from the authorization service.');
  }

  // Display metadata is optional and never determines identity or permissions.
  // Read the verified membership's company/branch directly, without relying on
  // historical FK aliases or any nested values carried in a profile response.
  const [company, branch] = await Promise.all([
    (async () => {
      try {
        const result = await client.from('companies').select('id,name,currency')
          .eq('id', profile.company_id).maybeSingle();
        const row = result.error ? null : result.data;
        return row && row.id === profile.company_id && typeof row.name === 'string' && row.name.trim()
          && typeof row.currency === 'string' && /^[A-Z]{3}$/.test(row.currency)
          ? { id: row.id, name: row.name, currency: row.currency }
          : undefined;
      } catch { return undefined; }
    })(),
    (async () => {
      if (!profile.branch_id) return undefined;
      try {
        const result = await client.from('branches').select('id,company_id,name')
          .eq('id', profile.branch_id).eq('company_id', profile.company_id).maybeSingle();
        const row = result.error ? null : result.data;
        return row && row.id === profile.branch_id && row.company_id === profile.company_id
          && typeof row.name === 'string' && row.name.trim()
          ? { id: row.id, name: row.name }
          : undefined;
      } catch { return undefined; }
    })(),
  ]);
  return { user: { ...profile, role, company, branch } as UserWithDetails, roles, permissions };
}
