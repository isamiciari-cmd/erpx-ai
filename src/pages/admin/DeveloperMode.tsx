import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RequireRole } from '../../components/auth';
import { useAuth } from '../../contexts/AuthContext';

interface DeveloperLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  ip_address: string | null;
  created_at: string;
}

interface DatabaseStats {
  totalTables: number;
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalAuditLogs: number;
}

export function DeveloperMode() {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState<DeveloperLog[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionType, setActionType] = useState('');
  const [actionDetails, setActionDetails] = useState('');

  useEffect(() => {
    loadDeveloperData();
  }, []);

  const loadDeveloperData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load developer access logs
      const { data: logsData, error: logsError } = await supabase
        .from('developer_access_logs')
        .select('*')
        .eq('user_id', currentUser?.id || '')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      setLogs(logsData || []);

      // Load database stats
      const [
        { count: usersCount },
        { count: rolesCount },
        { count: permissionsCount },
        { count: auditLogsCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('roles').select('*', { count: 'exact', head: true }),
        supabase.from('permissions').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalTables: 11,
        totalUsers: usersCount || 0,
        totalRoles: rolesCount || 0,
        totalPermissions: permissionsCount || 0,
        totalAuditLogs: auditLogsCount || 0,
      });
    } catch (err) {
      console.error('Error loading developer data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load developer data');
    } finally {
      setLoading(false);
    }
  };

  const logDeveloperAction = async () => {
    if (!actionType) {
      alert('Please enter an action type');
      return;
    }

    try {
      const details = actionDetails ? JSON.parse(actionDetails) : null;

      const { error } = await supabase.rpc('log_developer_access', {
        p_action: actionType,
        p_details: details,
      });

      if (error) throw error;

      alert('Developer action logged successfully');
      setActionType('');
      setActionDetails('');
      loadDeveloperData();
    } catch (err) {
      console.error('Error logging developer action:', err);
      alert(err instanceof Error ? err.message : 'Failed to log developer action');
    }
  };

  const testPermissionFunction = async () => {
    try {
      if (!currentUser) {
        alert('No user logged in');
        return;
      }

      const { data, error } = await supabase.rpc('get_user_permissions', {
        p_user_id: currentUser.id,
      });

      if (error) throw error;

      console.log('User Permissions:', data);
      alert(`Found ${data?.length || 0} permissions. Check console for details.`);
    } catch (err) {
      console.error('Error testing permission function:', err);
      alert(err instanceof Error ? err.message : 'Failed to test permission function');
    }
  };

  const testRoleFunction = async () => {
    try {
      if (!currentUser) {
        alert('No user logged in');
        return;
      }

      const { data, error } = await supabase.rpc('get_user_roles', {
        p_user_id: currentUser.id,
      });

      if (error) throw error;

      console.log('User Roles:', data);
      alert(`Found ${data?.length || 0} roles. Check console for details.`);
    } catch (err) {
      console.error('Error testing role function:', err);
      alert(err instanceof Error ? err.message : 'Failed to test role function');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RequireRole role="developer">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Developer Mode</h1>
          <p className="text-gray-600 mt-1">System debugging and testing tools</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Database Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Total Tables</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalTables}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Users</div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Roles</div>
              <div className="text-2xl font-bold text-green-600">{stats.totalRoles}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Permissions</div>
              <div className="text-2xl font-bold text-purple-600">{stats.totalPermissions}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Audit Logs</div>
              <div className="text-2xl font-bold text-orange-600">{stats.totalAuditLogs}</div>
            </div>
          </div>
        )}

        {/* Testing Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Function Testing</h2>
            <div className="space-y-3">
              <button
                onClick={testPermissionFunction}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Test get_user_permissions()
              </button>
              <button
                onClick={testRoleFunction}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Test get_user_roles()
              </button>
              <button
                onClick={() => (window.location.href = '/admin/audit-logs')}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                View Audit Logs
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Log Developer Action</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                <input
                  type="text"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  placeholder="e.g., DEBUG_SESSION, TEST_FUNCTION"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Details (JSON)
                </label>
                <textarea
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  placeholder='{"description": "Testing RBAC system", "module": "permissions"}'
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={logDeveloperAction}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Log Action
              </button>
            </div>
          </div>
        </div>

        {/* Developer Access Logs */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Developer Access Logs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.details ? (
                        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-gray-400">No details</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No developer logs yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
