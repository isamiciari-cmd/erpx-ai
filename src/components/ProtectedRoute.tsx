import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // accept either a single role string or an array of roles
  requiredRole?: string | string[];
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { currentUser, loading, isCashier, isAdmin } = useAuth();

  const location = useLocation();

  const requiredRoleIsCashier =
    requiredRole === 'cashier' || (Array.isArray(requiredRole) && requiredRole.includes('cashier'));

  const [roleChecking, setRoleChecking] = useState(requiredRoleIsCashier);

  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (loading) {
      t = setTimeout(() => setAuthTimedOut(true), 6000);
    } else {
      setAuthTimedOut(false);
    }

    return () => {
      if (t) clearTimeout(t);
    };
  }, [loading]);

  const [cashierUser, setCashierUser] = useState(false);
  const [adminUser, setAdminUser] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkRole = async () => {
      if (!currentUser) {
        if (mounted) {
          setRoleChecking(false);
        }
        return;
      }

      try {
        const cashier = await Promise.race([
          isCashier(),
          new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(false), 1500);
          }),
        ]);

        if (mounted) {
          setCashierUser(cashier);
        }

        // Only check admin if the user is not a cashier.
        if (!cashier) {
          const admin = await Promise.race([
            isAdmin(),
            new Promise<boolean>((resolve) => {
              setTimeout(() => resolve(false), 1500);
            }),
          ]);

          if (mounted) {
            setAdminUser(admin);
          }
        }
      } catch (error) {
        console.error('[ProtectedRoute] Role check failed:', error);
      } finally {
        if (mounted) {
          setRoleChecking(false);
        }
      }
    };

    checkRole();

    return () => {
      mounted = false;
    };
  }, [currentUser, isCashier, isAdmin]);

  if (loading || roleChecking) {
    if (authTimedOut) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-gray-400 max-w-md text-center">
            <p>Still authenticating — something may be blocking the auth check.</p>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="mr-3 px-4 py-2 bg-blue-600 text-white rounded"
              >
                Retry
              </button>
              <a href="/login" className="text-sm text-gray-300">
                Go to login
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Authenticating...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  /*
   * CASHIER ROUTE
   *
   * Only users with the cashier role can access /cashier/*
   */
  if (requiredRoleIsCashier) {
    if (!cashierUser) {
      return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
  }

  /*
   * CASHIER RESTRICTION
   *
   * Cashiers are only allowed to use the POS.
   * If a cashier tries to access any normal ERP route,
   * redirect them to /cashier/pos.
   */
  if (cashierUser) {
    const isCashierRoute = location.pathname.startsWith('/cashier');

    if (!isCashierRoute) {
      return <Navigate to="/cashier/pos" replace />;
    }
  }

  /*
   * Normal authenticated users
   */
  return <>{children}</>;
};

export default ProtectedRoute;
