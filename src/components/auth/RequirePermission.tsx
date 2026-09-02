import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

interface RequirePermissionProps {
  children: ReactNode;
  permission: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
  showLoading?: boolean;
}

/**
 * Wrapper component that requires specific permission(s) to render children
 * Simpler alternative to PermissionGuard for permission-only checks
 *
 * @example
 * // Single permission
 * <RequirePermission permission="users.create">
 *   <CreateUserForm />
 * </RequirePermission>
 *
 * @example
 * // Multiple permissions (any)
 * <RequirePermission permission={["finance.view", "finance.create"]}>
 *   <FinanceDashboard />
 * </RequirePermission>
 *
 * @example
 * // Multiple permissions (all required)
 * <RequirePermission permission={["users.delete", "users.update"]} requireAll>
 *   <DeleteUserButton />
 * </RequirePermission>
 *
 * @example
 * // With custom fallback
 * <RequirePermission permission="audit.view" fallback={<NoAccess />}>
 *   <AuditLogs />
 * </RequirePermission>
 */
export function RequirePermission({
  children,
  permission,
  requireAll = false,
  fallback = null,
  redirectTo = '/unauthorized',
  showLoading = true,
}: RequirePermissionProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = requireAll
    ? permissions.every((p) => hasPermission(p))
    : permissions.some((p) => hasPermission(p));

  if (!hasAccess) {
    return redirectTo ? <Navigate to={redirectTo} replace /> : <>{fallback}</>;
  }

  return <>{children}</>;
}
