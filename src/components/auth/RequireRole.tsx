import { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { usePermissions } from '../../hooks/usePermissions';

interface RequireRoleProps {
  children: ReactNode;
  role: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
  showLoading?: boolean;
}

/**
 * Wrapper component that requires specific role(s) to render children
 * Simpler alternative to PermissionGuard for role-only checks
 *
 * @example
 * // Single role
 * <RequireRole role="admin">
 *   <AdminDashboard />
 * </RequireRole>
 *
 * @example
 * // Multiple roles (any)
 * <RequireRole role={["owner", "super_admin"]}>
 *   <SystemSettings />
 * </RequireRole>
 *
 * @example
 * // With custom fallback
 * <RequireRole role="developer" fallback={<AccessDenied />}>
 *   <DeveloperTools />
 * </RequireRole>
 */
export function RequireRole({
  children,
  role,
  requireAll = false,
  fallback = null,
  redirectTo = '/unauthorized',
  showLoading = true
}: RequireRoleProps) {
  const { hasRole, loading } = usePermissions();

  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const roles = Array.isArray(role) ? role : [role];
  const hasAccess = requireAll
    ? roles.every(r => hasRole(r))
    : roles.some(r => hasRole(r));

  if (!hasAccess) {
    return redirectTo ? <Navigate to={redirectTo} replace /> : <>{fallback}</>;
  }

  return <>{children}</>;
}
