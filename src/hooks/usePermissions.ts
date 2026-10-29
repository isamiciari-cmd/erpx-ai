import { useAuth } from '../contexts/AuthContext';
export type { Permission, UserRole } from '../lib/authAccess';

/** All guards consume the same session-scoped, server-verified access snapshot. */
export function usePermissions() {
  const { currentUser, user, roles, permissions, loading, accessError, refreshAccess, canAccessTenant } = useAuth();
  const ready = !!currentUser && !!user && !loading && !accessError;
  const hasPermission = (key: string) => ready && permissions.some((item) => item.permission_key === key);
  const hasRole = (name: string) => ready && roles.some((item) => item.role_name === name);
  return {
    roles: ready ? roles : [], permissions: ready ? permissions : [],
    hasPermission, hasRole, isOwner: hasRole('owner'), isDeveloper: hasRole('developer'),
    canAccessTenant, loading, error: accessError, refresh: refreshAccess,
  };
}
