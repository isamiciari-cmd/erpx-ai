import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RequireRole } from '../../components/auth';

interface Role {
  id: string;
  name: string;
  display_name: string;
  level: number;
}

interface Permission {
  id: string;
  key: string;
  name: string;
  category: string;
}

interface PermissionMatrix {
  [roleId: string]: {
    [permissionId: string]: boolean;
  };
}

export function PermissionMatrix() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id, name, display_name, level')
        .order('level', { ascending: false });

      if (rolesError) throw rolesError;

      // Load permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('id, key, name, category')
        .order('category, key');

      if (permissionsError) throw permissionsError;

      // Load role-permission mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('role_permissions')
        .select('role_id, permission_id');

      if (mappingsError) throw mappingsError;

      // Build matrix
      const newMatrix: PermissionMatrix = {};
      (rolesData || []).forEach(role => {
        newMatrix[role.id] = {};
        (permissionsData || []).forEach(perm => {
          newMatrix[role.id][perm.id] = false;
        });
      });

      (mappings || []).forEach(mapping => {
        if (newMatrix[mapping.role_id]) {
          newMatrix[mapping.role_id][mapping.permission_id] = true;
        }
      });

      setRoles(rolesData || []);
      setPermissions(permissionsData || []);
      setMatrix(newMatrix);
    } catch (err) {
      console.error('Error loading permission matrix:', err);
      setError(err instanceof Error ? err.message : 'Failed to load permission matrix');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(permissions.map(p => p.category)))];

  const filteredPermissions = selectedCategory === 'all'
    ? permissions
    : permissions.filter(p => p.category === selectedCategory);

  const getRoleLevelColor = (level: number) => {
    if (level >= 1000) return 'bg-purple-600';
    if (level >= 900) return 'bg-indigo-600';
    if (level >= 700) return 'bg-blue-600';
    if (level >= 500) return 'bg-green-600';
    if (level >= 300) return 'bg-yellow-600';
    return 'bg-gray-600';
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Permission Matrix</h1>
          <p className="text-gray-600 mt-1">Visual overview of role-permission assignments</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Category Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg transition capitalize ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Permission Matrix Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Permission
                  </th>
                  {roles.map((role) => (
                    <th key={role.id} className="px-4 py-3 text-center min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${getRoleLevelColor(role.level)} mb-1`}></div>
                        <div className="text-xs font-medium text-gray-900">{role.display_name}</div>
                        <div className="text-xs text-gray-500">L{role.level}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPermissions.map((permission, index) => (
                  <tr key={permission.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 sticky left-0 bg-inherit z-10">
                      <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                      <div className="text-xs text-gray-500">
                        <code>{permission.key}</code>
                      </div>
                      <div className="text-xs text-gray-400 capitalize mt-1">
                        {permission.category}
                      </div>
                    </td>
                    {roles.map((role) => (
                      <td key={role.id} className="px-4 py-4 text-center">
                        {matrix[role.id]?.[permission.id] ? (
                          <div className="flex justify-center">
                            <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <svg className="h-6 w-6 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPermissions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No permissions in this category</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Role Levels</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-600"></div>
              <span className="text-xs text-gray-700">Owner (1000)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              <span className="text-xs text-gray-700">Developer (900)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              <span className="text-xs text-gray-700">Admin (700-800)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span className="text-xs text-gray-700">Manager (500)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
              <span className="text-xs text-gray-700">Cashier (300)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-600"></div>
              <span className="text-xs text-gray-700">Employee/Viewer (100-200)</span>
            </div>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
