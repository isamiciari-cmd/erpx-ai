import { usePermissions } from './usePermissions';

/** Derived from the shared access snapshot; account switches cannot retain old privileges. */
export function useCurrentUserRole() {
  const { roles, loading, error } = usePermissions();
  const primaryRole = [...roles].sort((a, b) => b.level - a.level)[0] ?? null;
  return {
    primaryRole, allRoles: roles, roleLevel: primaryRole?.level ?? 0, loading, error,
  };
}
