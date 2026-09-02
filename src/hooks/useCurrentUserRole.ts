import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from './usePermissions';

interface UseCurrentUserRoleReturn {
  primaryRole: UserRole | null;
  allRoles: UserRole[];
  roleLevel: number;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to get the current user's role information
 * Returns the highest-level role as the primary role
 */
export function useCurrentUserRole(): UseCurrentUserRoleReturn {
  const { currentUser } = useAuth();
  const [primaryRole, setPrimaryRole] = useState<UserRole | null>(null);
  const [allRoles, setAllRoles] = useState<UserRole[]>([]);
  const [roleLevel, setRoleLevel] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadUserRole = async () => {
      if (!currentUser) {
        setPrimaryRole(null);
        setAllRoles([]);
        setRoleLevel(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get all user roles and highest role level
        const [rolesResult, levelResult] = await Promise.all([
          supabase.rpc('get_user_roles', { p_user_id: currentUser.id }),
          supabase.rpc('get_highest_role_level', { p_user_id: currentUser.id }),
        ]);

        if (rolesResult.error) {
          throw new Error(`Failed to fetch roles: ${rolesResult.error.message}`);
        }

        if (levelResult.error) {
          throw new Error(`Failed to fetch role level: ${levelResult.error.message}`);
        }

        const roles = rolesResult.data || [];
        const level = levelResult.data || 0;

        setAllRoles(roles);
        setRoleLevel(level);

        // Set primary role as the highest level role
        if (roles.length > 0) {
          const sortedRoles = [...roles].sort((a, b) => b.level - a.level);
          setPrimaryRole(sortedRoles[0]);
        } else {
          setPrimaryRole(null);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error loading user role');
        console.error('Error loading user role:', error);
        setError(error);
        setPrimaryRole(null);
        setAllRoles([]);
        setRoleLevel(0);
      } finally {
        setLoading(false);
      }
    };

    loadUserRole();
  }, [currentUser?.id]);

  return {
    primaryRole,
    allRoles,
    roleLevel,
    loading,
    error,
  };
}
