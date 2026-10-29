import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProfileSetupRequiredError, routeAccess } from '../lib/authAccess';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
  requiredRoles?: string[];
  requiredPermission?: string;
}

export default function ProtectedRoute({
  children, requiredRole, requiredRoles, requiredPermission,
}: ProtectedRouteProps) {
  const { currentUser, user, loading, roles, permissions, accessError, refreshAccess, signOut } = useAuth();
  const location = useLocation();
  const allowedRoles = requiredRoles ?? (requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : []);
  const access = routeAccess({
    authenticated: !!currentUser, loading, error: !!accessError, profileReady: !!user,
    roles, permissions, pathname: location.pathname, requiredRoles: allowedRoles, requiredPermission,
  });

  if (access === 'loading') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center" role="status">
      <p className="text-gray-400">جارٍ التحقق من الهوية والصلاحيات…</p>
    </div>
  );
  if (access === 'login') return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (access === 'cashier') return <Navigate to="/cashier/pos" replace />;
  if (access === 'unavailable' || access === 'denied') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-lg text-center text-gray-300" role="alert">
        <h1 className="mb-3 text-xl font-semibold">{access === 'denied' ? 'ليس لديك صلاحية لفتح هذه الصفحة' : 'تعذر التحقق من صلاحيات الحساب'}</h1>
        {accessError && <p className="mb-4 text-sm">{accessError.message}</p>}
        {accessError instanceof ProfileSetupRequiredError && <Link to="/register" className="mb-4 block text-blue-400">إكمال تسجيل الشركة</Link>}
        <div className="flex justify-center gap-4">
          {access === 'unavailable'
            ? <button onClick={() => { void refreshAccess().catch(() => window.location.reload()); }} className="text-blue-400">إعادة المحاولة</button>
            : <Link to="/dashboard" className="text-blue-400">لوحة التحكم</Link>}
          <button onClick={() => { void signOut().catch(() => window.location.assign('/login')); }}>تسجيل الخروج</button>
        </div>
      </div>
    </div>
  );
  return <>{children}</>;
}
