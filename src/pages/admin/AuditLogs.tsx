import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RequirePermission } from '../../components/auth';
import { usePermissions } from '../../hooks/usePermissions';

interface AuditLog {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email?: string;
  tenant_name?: string;
}

type LogFilter = 'all' | 'users' | 'tenants' | 'finance' | 'hr' | 'inventory' | 'sales';

export function AuditLogs() {
  const { isOwner, isDeveloper } = usePermissions();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, [filter]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.ilike('table_name', `%${filter}%`);
      }

      const { data, error: logsError } = await query;

      if (logsError) throw logsError;

      // Enrich with user and tenant info
      const enrichedLogs = await Promise.all(
        (data || []).map(async (log) => {
          let user_email = 'System';
          let tenant_name = 'N/A';

          if (log.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', log.user_id)
              .single();
            if (profile) user_email = profile.email;
          }

          if (log.tenant_id) {
            const { data: tenant } = await supabase
              .from('tenants')
              .select('name')
              .eq('id', log.tenant_id)
              .single();
            if (tenant) tenant_name = tenant.name;
          }

          return {
            ...log,
            user_email,
            tenant_name
          };
        })
      );

      setLogs(enrichedLogs);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(search) ||
      log.table_name?.toLowerCase().includes(search) ||
      log.user_email?.toLowerCase().includes(search)
    );
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('INSERT')) return 'bg-green-100 text-green-800';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-100 text-blue-800';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-red-100 text-red-800';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (!isOwner && !isDeveloper) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          Access Denied: Only Owner and Developer roles can view audit logs
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RequirePermission permission="audit.view">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">Complete system audit trail</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by action, table, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'users', 'tenants', 'finance', 'hr', 'inventory', 'sales'] as LogFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg transition ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.table_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.tenant_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <button className="text-blue-600 hover:text-blue-900">
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No audit logs found</p>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Audit Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <span className={`mt-1 inline-block px-3 py-1 text-sm font-semibold rounded-full ${getActionBadgeColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.user_email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Table</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.table_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Record ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedLog.record_id || 'N/A'}</p>
                </div>
                {selectedLog.old_data && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Old Data</label>
                    <pre className="mt-1 text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.new_data && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Data</label>
                    <pre className="mt-1 text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.ip_address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{selectedLog.ip_address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
