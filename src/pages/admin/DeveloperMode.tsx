import { useLocalizedCopy } from '@/i18n/localizedCopy';
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
  const copy = useLocalizedCopy();
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
      setError("Failed to load developer data");
    } finally {
      setLoading(false);
    }
  };

  const logDeveloperAction = async () => {
    if (!actionType) {
      alert(copy("Please enter an action type"));
      return;
    }

    try {
      const details = actionDetails ? JSON.parse(actionDetails) : null;

      const { error } = await supabase.rpc('log_developer_access', {
        p_action: actionType,
        p_details: details,
      });

      if (error) throw error;

      alert(copy("Developer action logged successfully"));
      setActionType('');
      setActionDetails('');
      loadDeveloperData();
    } catch (err) {
      console.error('Error logging developer action:', err);
      alert(err instanceof Error ? err.message : copy("Failed to log developer action"));
    }
  };

  const testPermissionFunction = async () => {
    try {
      if (!currentUser) {
        alert(copy("No user logged in"));
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
      alert(err instanceof Error ? err.message : copy("Failed to test permission function"));
    }
  };

  const testRoleFunction = async () => {
    try {
      if (!currentUser) {
        alert(copy("No user logged in"));
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
      alert(err instanceof Error ? err.message : copy("Failed to test role function"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span role="status">{copy("Loading...")}</span>
      </div>
    );
  }

  return (
    <RequireRole role="developer">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--app-text)]">{copy("Developer Mode")}</h1>
          <p className="text-[var(--app-muted)] mt-1">{copy("System debugging and testing tools")}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {copy(error ?? undefined)}
          </div>
        )}

        {/* Database Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-[var(--app-surface)] rounded-lg shadow p-4">
              <div className="text-sm text-[var(--app-muted)]">{copy("Total Tables")}</div>
              <div className="text-2xl font-bold text-[var(--app-text)]">{stats.totalTables}</div>
            </div>
            <div className="bg-[var(--app-surface)] rounded-lg shadow p-4">
              <div className="text-sm text-[var(--app-muted)]">{copy("Users")}</div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
            </div>
            <div className="bg-[var(--app-surface)] rounded-lg shadow p-4">
              <div className="text-sm text-[var(--app-muted)]">{copy("Roles")}</div>
              <div className="text-2xl font-bold text-green-600">{stats.totalRoles}</div>
            </div>
            <div className="bg-[var(--app-surface)] rounded-lg shadow p-4">
              <div className="text-sm text-[var(--app-muted)]">{copy("Permissions")}</div>
              <div className="text-2xl font-bold text-purple-600">{stats.totalPermissions}</div>
            </div>
            <div className="bg-[var(--app-surface)] rounded-lg shadow p-4">
              <div className="text-sm text-[var(--app-muted)]">{copy("Audit Logs")}</div>
              <div className="text-2xl font-bold text-orange-600">{stats.totalAuditLogs}</div>
            </div>
          </div>
        )}

        {/* Testing Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-[var(--app-surface)] rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-[var(--app-text)] mb-4">{copy("Function Testing")}</h2>
            <div className="space-y-3">
              <button
                onClick={testPermissionFunction}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {copy("Test get_user_permissions()")}
              </button>
              <button
                onClick={testRoleFunction}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                {copy("Test get_user_roles()")}
              </button>
              <button
                onClick={() => (window.location.href = '/admin/audit-logs')}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                {copy("View Audit Logs")}
              </button>
            </div>
          </div>

          <div className="bg-[var(--app-surface)] rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-[var(--app-text)] mb-4">{copy("Log Developer Action")}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--app-muted)] mb-1">{copy("Action Type")}</label>
                <input
                  type="text"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  placeholder="e.g., DEBUG_SESSION, TEST_FUNCTION"
                  className="ws-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--app-muted)] mb-1">
                  {copy("Details (JSON)")}
                </label>
                <textarea
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  placeholder='{"description": "Testing RBAC system", "module": "permissions"}'
                  rows={3}
                  className="ws-input"
                />
              </div>
              <button
                onClick={logDeveloperAction}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                {copy("Log Action")}
              </button>
            </div>
          </div>
        </div>

        {/* Developer Access Logs */}
        <div className="bg-[var(--app-surface)] rounded-lg shadow">
          <div className="px-6 py-4 border-b border-[var(--app-border)]">
            <h2 className="text-lg font-semibold text-[var(--app-text)]">{copy("Your Developer Access Logs")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--app-border)]">
              <thead className="bg-[var(--app-surface-2)]">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("Timestamp")}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("Action")}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("Details")}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("IP Address")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--app-surface)] divide-y divide-[var(--app-border)]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--app-surface-2)]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--app-muted)]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--app-text)]">
                      {log.details ? (
                        <pre className="text-xs bg-[var(--app-surface-2)] p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-[var(--app-muted)]">{copy("No details")}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--app-muted)]">
                      {log.ip_address || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[var(--app-muted)]">{copy("No developer logs yet")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
