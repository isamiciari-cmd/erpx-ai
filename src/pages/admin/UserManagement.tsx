import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import { RequirePermission } from '../../components/auth';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  status: string;
  created_at: string;
}

interface UserWithRoles extends Profile {
  roles: {
    id: string;
    name: string;
    display_name: string;
    level: number;
  }[];
  tenants: {
    id: string;
    name: string;
    is_primary: boolean;
  }[];
}

export function UserManagement() {
  const { hasPermission } = usePermissions();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canCreate = hasPermission('users.create');
  const canUpdate = hasPermission('users.update');
  const canDelete = hasPermission('users.delete');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles: UserWithRoles[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: rolesData } = await supabase.rpc('get_user_roles', {
            p_user_id: profile.id
          });

          const { data: tenantsData } = await supabase.rpc('get_user_tenants', {
            p_user_id: profile.id
          });

          return {
            ...profile,
            roles: rolesData || [],
            tenants: tenantsData?.map((t: any) => ({
              id: t.tenant_id,
              name: t.tenant_name,
              is_primary: t.is_primary
            })) || []
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLevel = (roles: UserWithRoles['roles']) => {
    if (roles.length === 0) return 0;
    return Math.max(...roles.map(r => r.level));
  };

  const getRoleBadgeColor = (level: number) => {
    if (level >= 1000) return 'bg-purple-100 text-purple-800';
    if (level >= 900) return 'bg-indigo-100 text-indigo-800';
    if (level >= 700) return 'bg-blue-100 text-blue-800';
    if (level >= 500) return 'bg-green-100 text-green-800';
    if (level >= 300) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RequirePermission permission="users.view">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
          </div>
          {canCreate && (
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              + Add User
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenants
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                {(canUpdate || canDelete) && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                          {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.full_name || 'No name'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span
                          key={role.id}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(role.level)}`}
                        >
                          {role.display_name}
                        </span>
                      ))}
                      {user.roles.length === 0 && (
                        <span className="text-sm text-gray-400">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {user.tenants.length > 0 ? (
                        <div className="space-y-1">
                          {user.tenants.map((tenant) => (
                            <div key={tenant.id} className="flex items-center gap-1">
                              <span>{tenant.name}</span>
                              {tenant.is_primary && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Primary</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No tenants</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' :
                      user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button className="text-blue-600 hover:text-blue-900">
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button className="text-red-600 hover:text-red-900">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>
      </div>
    </RequirePermission>
  );
}
