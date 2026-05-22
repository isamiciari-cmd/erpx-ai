import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RequireRole } from '../../components/auth';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  level: number;
  is_system_role: boolean;
}

interface Permission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
}

interface RoleWithPermissions extends Role {
  permissions: Permission[];
  userCount: number;
}

export function RolesPermissions() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('level', { ascending: false });

      if (rolesError) throw rolesError;

      // For each role, fetch permissions and user count
      const rolesWithDetails: RoleWithPermissions[] = await Promise.all(
        (rolesData || []).map(async (role) => {
          // Get permissions for this role
          const { data: rolePerms } = await supabase
            .from('role_permissions')
            .select(`
              permission_id,
              permissions (
                id,
                key,
                name,
                description,
                category
              )
            `)
            .eq('role_id', role.id);

          const permissions = rolePerms?.map((rp: any) => rp.permissions).filter(Boolean) || [];

          // Get user count for this role
          const { count: userCount } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('role_id', role.id);

          return {
            ...role,
            permissions,
            userCount: userCount || 0
          };
        })
      );

      setRoles(rolesWithDetails);
    } catch (err) {
      console.error('Error loading roles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLevelColor = (level: number) => {
    if (level >= 1000) return 'border-l-4 border-purple-500 bg-purple-50';
    if (level >= 900) return 'border-l-4 border-indigo-500 bg-indigo-50';
    if (level >= 700) return 'border-l-4 border-blue-500 bg-blue-50';
    if (level >= 500) return 'border-l-4 border-green-500 bg-green-50';
    if (level >= 300) return 'border-l-4 border-yellow-500 bg-yellow-50';
    return 'border-l-4 border-gray-500 bg-gray-50';
  };

  const groupPermissionsByCategory = (permissions: Permission[]) => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RequireRole role={['owner', 'developer', 'super_admin']}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-gray-600 mt-1">Manage system roles and their permissions</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">System Roles</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                      selectedRole?.id === role.id ? getRoleLevelColor(role.level) : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{role.display_name}</div>
                        <div className="text-sm text-gray-500 mt-1">{role.name}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            Level {role.level}
                          </span>
                          <span className="text-xs text-gray-500">
                            {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                          </span>
                          {role.is_system_role && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              System
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Role Details & Permissions */}
          <div className="lg:col-span-2">
            {selectedRole ? (
              <div className="bg-white rounded-lg shadow">
                <div className={`px-6 py-4 ${getRoleLevelColor(selectedRole.level)}`}>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedRole.display_name}</h2>
                  <p className="text-gray-600 mt-1">{selectedRole.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-sm bg-white px-3 py-1 rounded border border-gray-200">
                      Level: {selectedRole.level}
                    </span>
                    <span className="text-sm bg-white px-3 py-1 rounded border border-gray-200">
                      {selectedRole.permissions.length} permissions
                    </span>
                    <span className="text-sm bg-white px-3 py-1 rounded border border-gray-200">
                      {selectedRole.userCount} users
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>

                  {selectedRole.permissions.length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(groupPermissionsByCategory(selectedRole.permissions)).map(
                        ([category, perms]) => (
                          <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                              <h4 className="font-semibold text-gray-900 capitalize">{category}</h4>
                            </div>
                            <div className="divide-y divide-gray-200">
                              {perms.map((perm) => (
                                <div key={perm.id} className="px-4 py-3 hover:bg-gray-50">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-gray-900">{perm.name}</div>
                                      <div className="text-sm text-gray-500 mt-1">
                                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                          {perm.key}
                                        </code>
                                      </div>
                                      {perm.description && (
                                        <div className="text-sm text-gray-600 mt-1">
                                          {perm.description}
                                        </div>
                                      )}
                                    </div>
                                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      This role has no permissions assigned
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <p className="mt-2">Select a role to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
