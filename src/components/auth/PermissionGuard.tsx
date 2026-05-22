import { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  role?: string;
  requireAll?: boolean;
  permissions?: string[];
  roles?: string[];
  fallback?: ReactNode;
  redirectTo?: string;
  showLoading?: boolean;
}

/**
 * Guard component that checks user permissions before rendering children
 * Can check for single permission/role or multiple permissions/roles
 *
 * @example
 * // Single permission
 * <PermissionGuard permission="users.create">
 *   <CreateUserButton />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (any)
 * <PermissionGuard permissions={["finance.view", "finance.create"]}>
 *   <FinanceModule />
 * </PermissionGuard>
 *
 * @example
 * // Multiple permissions (all required)
 * <PermissionGuard permissions={["finance.view", "finance.delete"]} requireAll>
 *   <DeleteFinanceButton />
 * </PermissionGuard>
 *
 * @example
 * // Role-based guard
 * <PermissionGuard role="owner">
 *   <AdminPanel />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  role,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback = null,
  redirectTo,
  showLoading = true
}: PermissionGuardProps) {
  const { hasPermission, hasRole, loading } = usePermissions();

  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return redirectTo ? <Navigate to={redirectTo} replace /> : <>{fallback}</>;
  }

  // Check single role
  if (role && !hasRole(role)) {
    return redirectTo ? <Navigate to={redirectTo} replace /> : <>{fallback}</>;
  }

  // Check multiple permissions
  if (permissions.length > 0) {
    const hasAccess = requireAll
      ? permissions.every(p => hasPermission(p))
      : permissions.some(p => hasPermission(p));

    if (!hasAccess) {
      return redirectTo ? <Navigate to={redirectTo} replace /> : <>{fallback}</>;
    }
  }

  // Check multiple roles
  if (roles.length > 0) {
    const hasAccess = requireAll
      ? roles.every(r => hasRole(r))
      : roles.some(r => hasRole(r));

    if (!hasAccess) {
      return redirectTo ? <Navigate to={redirectTo} replace /> : <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
