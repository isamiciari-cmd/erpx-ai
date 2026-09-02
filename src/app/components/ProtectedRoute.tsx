import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // allow passing either a single role or an array on requiredRole
  requiredRole?: string | string[];
  requiredRoles?: string[];
  requiredPermission?: string;
}

const ProtectedRoute = ({
  children,
  requiredRole,
  requiredRoles,
  requiredPermission,
}: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuth();
  const { hasPermission, hasRole, loading: permissionsLoading } = usePermissions();

  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (loading) {
      // Fail-safe: if auth is still loading after 6s, allow retry UI
      t = setTimeout(() => setAuthTimedOut(true), 6000);
    } else {
      setAuthTimedOut(false);
    }

    return () => {
      if (t) clearTimeout(t);
    };
  }, [loading]);

  if (loading) {
    if (authTimedOut) {
      return (
        <div>
          <p>Still authenticating — something may be blocking the auth check.</p>
          <button onClick={() => window.location.reload()} style={{ marginRight: 8 }}>
            Retry
          </button>
          <a href="/login">Go to login</a>
        </div>
      );
    }

    return <div>Authenticating...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole || requiredRoles || requiredPermission) {
    if (permissionsLoading) return <div>Checking access…</div>;

    const allowedRoles =
      requiredRoles ??
      (requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : []);
    const hasRequiredRole = allowedRoles.length === 0 || allowedRoles.some(hasRole);
    const hasRequiredPermission = !requiredPermission || hasPermission(requiredPermission);

    if (!hasRequiredRole || !hasRequiredPermission) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
