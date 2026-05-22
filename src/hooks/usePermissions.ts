import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Permission {
  permission_key: string;
  permission_name: string;
  category: string;
}

export interface UserRole {
  role_name: string;
  display_name: string;
  level: number;
}

interface UsePermissionsReturn {
  permissions: Permission[];
  roles: UserRole[];
  hasPermission: (permissionKey: string) => boolean;
  hasRole: (roleName: string) => boolean;
  isOwner: boolean;
  isDeveloper: boolean;
  canAccessTenant: (tenantId: string) => Promise<boolean>;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage user permissions and roles using the RBAC system
 * Integrates with PostgreSQL functions created in 002_rbac_functions.sql
 */
export function usePermissions(): UsePermissionsReturn {
  console.log('[usePermissions] Hook initialized');

  const { currentUser } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadPermissionsAndRoles = async () => {
    console.log('[usePermissions] Loading permissions and roles for user:', currentUser?.id);

    // Clear any existing emergency timeout
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
    }

    // Set emergency timeout
    emergencyTimeoutRef.current = setTimeout(() => {
      console.warn('[usePermissions] ⚠️ Emergency timeout - forcing loading to false');
      setLoading(false);
    }, 3000);

    if (!currentUser) {
      console.log('[usePermissions] No current user - clearing permissions');
      setPermissions([]);
      setRoles([]);
      setLoading(false);
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[usePermissions] Fetching permissions and roles from RBAC...');

      // Call PostgreSQL functions to get user permissions and roles
      const [permissionsResult, rolesResult] = await Promise.all([
        supabase.rpc('get_user_permissions', { p_user_id: currentUser.id }),
        supabase.rpc('get_user_roles', { p_user_id: currentUser.id })
      ]);

      if (permissionsResult.error) {
        console.error('[usePermissions] ❌ Permissions fetch error:', permissionsResult.error);
        throw new Error(`Failed to fetch permissions: ${permissionsResult.error.message}`);
      }

      if (rolesResult.error) {
        console.error('[usePermissions] ❌ Roles fetch error:', rolesResult.error);
        throw new Error(`Failed to fetch roles: ${rolesResult.error.message}`);
      }

      console.log('[usePermissions] ✓ Permissions loaded:', permissionsResult.data?.length || 0);
      console.log('[usePermissions] ✓ Roles loaded:', rolesResult.data?.length || 0);

      setPermissions(permissionsResult.data || []);
      setRoles(rolesResult.data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error loading permissions');
      console.error('[usePermissions] ❌ Error loading permissions:', error);
      setPermissions([]);
      setRoles([]);
      setError(error);
    } finally {
      console.log('[usePermissions] Setting loading to false');
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[usePermissions] useEffect triggered - currentUser changed:', currentUser?.id);
    loadPermissionsAndRoles();

    return () => {
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
    };
  }, [currentUser?.id]);

  const hasPermission = (permissionKey: string): boolean => {
    if (!currentUser) return false;
    return permissions.some(p => p.permission_key === permissionKey);
  };

  const hasRole = (roleName: string): boolean => {
    if (!currentUser) return false;
    return roles.some(r => r.role_name === roleName);
  };

  const isOwner = hasRole('owner');
  const isDeveloper = hasRole('developer');

  const canAccessTenant = async (tenantId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { data, error } = await supabase.rpc('can_access_tenant', {
        p_user_id: currentUser.id,
        p_tenant_id: tenantId
      });

      if (error) {
        console.error('Error checking tenant access:', error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('Error checking tenant access:', err);
      return false;
    }
  };

  return {
    permissions,
    roles,
    hasPermission,
    hasRole,
    isOwner,
    isDeveloper,
    canAccessTenant,
    loading,
    error,
    refresh: loadPermissionsAndRoles
  };
}
