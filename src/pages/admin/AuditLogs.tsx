import { useLocalizedCopy } from '@/i18n/localizedCopy';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RequirePermission } from '../../components/auth';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../contexts/AuthContext';

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
  const copy = useLocalizedCopy();
  const { user } = useAuth();
  const { isOwner, isDeveloper } = usePermissions();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, [filter, user?.company_id]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', user?.company_id ?? '')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.ilike('entity_type', `%${filter}%`);
      }

      const { data, error: logsError } = await query;

      if (logsError) throw logsError;

      // Enrich with user and tenant info
      const enrichedLogs = await Promise.all(
        (data || []).map(async (log) => {
          let user_email = 'System';
          const tenant_name = user?.company?.name || user?.company_id || '';

          if (log.user_id) {
            const { data: profile } = await supabase
              .from('users')
              .select('email')
              .eq('id', log.user_id)
              .single();
            if (profile) user_email = profile.email;
          }

          return {
            ...log,
            tenant_id: log.company_id,
            table_name: log.entity_type,
            record_id: log.entity_id,
            old_data: log.old_values,
            new_data: log.new_values,
            user_email,
            tenant_name,
          };
        }),
      );

      setLogs(enrichedLogs);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(search) ||
      log.table_name?.toLowerCase().includes(search) ||
      log.user_email?.toLowerCase().includes(search)
    );
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('INSERT'))
      return 'bg-green-100 text-green-800';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-100 text-blue-800';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-red-100 text-red-800';
    if (action.includes('LOGIN') || action.includes('LOGOUT'))
      return 'bg-purple-100 text-purple-800';
    return 'bg-[var(--app-surface-2)] text-[var(--app-text)]';
  };

  if (!isOwner && !isDeveloper) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          {copy("Access Denied: Only Owner and Developer roles can view audit logs")}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span role="status">{copy("Loading...")}</span>
      </div>
    );
  }

  return (
    <RequirePermission permission="audit.view">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--app-text)]">{copy("Audit Logs")}</h1>
          <p className="text-[var(--app-muted)] mt-1">{copy("Complete system audit trail")}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {copy(error ?? undefined)}
          </div>
        )}

        {/* Filters */}
        <div className="bg-[var(--app-surface)] rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder={copy("Search by action, table, or user...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ws-input"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(
                ['all', 'users', 'tenants', 'finance', 'hr', 'inventory', 'sales'] as LogFilter[]
              ).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg transition ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-[var(--app-surface-2)] text-[var(--app-muted)] hover:bg-[var(--app-accent-soft)]'
                  }`}
                >
                  {copy({ all: 'All', users: 'Users', tenants: 'Tenants', finance: 'Finance', hr: 'Human Resources', inventory: 'Inventory', sales: 'Sales' }[f])}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-[var(--app-surface)] rounded-lg shadow overflow-hidden">
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
                    {copy("User")}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("Table")}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("Tenant")}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("Details")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--app-surface)] divide-y divide-[var(--app-border)]">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--app-surface-2)] cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--app-muted)]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--app-text)]">
                      {log.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--app-muted)]">
                      {log.table_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--app-muted)]">
                      {log.tenant_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--app-muted)]">
                      <button className="text-blue-600 hover:text-blue-900">{copy("View Details →")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[var(--app-muted)]">{copy("No audit logs found")}</p>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--app-surface)] rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-[var(--app-border)] flex justify-between items-center">
                <h3 className="text-lg font-semibold text-[var(--app-text)]">{copy("Audit Log Details")}</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-[var(--app-muted)] hover:text-[var(--app-muted)]"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--app-muted)]">{copy("Action")}</label>
                  <span
                    className={`mt-1 inline-block px-3 py-1 text-sm font-semibold rounded-full ${getActionBadgeColor(selectedLog.action)}`}
                  >
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--app-muted)]">{copy("Timestamp")}</label>
                  <p className="mt-1 text-sm text-[var(--app-text)]">
                    {new Date(selectedLog.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--app-muted)]">{copy("User")}</label>
                  <p className="mt-1 text-sm text-[var(--app-text)]">{selectedLog.user_email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--app-muted)]">{copy("Table")}</label>
                  <p className="mt-1 text-sm text-[var(--app-text)]">{selectedLog.table_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--app-muted)]">{copy("Record ID")}</label>
                  <p className="mt-1 text-sm text-[var(--app-text)] font-mono">
                    {selectedLog.record_id || 'N/A'}
                  </p>
                </div>
                {selectedLog.old_data && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--app-muted)]">{copy("Old Data")}</label>
                    <pre className="mt-1 text-xs bg-[var(--app-surface-2)] p-3 rounded border border-[var(--app-border)] overflow-x-auto">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.new_data && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--app-muted)]">{copy("New Data")}</label>
                    <pre className="mt-1 text-xs bg-[var(--app-surface-2)] p-3 rounded border border-[var(--app-border)] overflow-x-auto">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.ip_address && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--app-muted)]">{copy("IP Address")}</label>
                    <p className="mt-1 text-sm text-[var(--app-text)] font-mono">{selectedLog.ip_address}</p>
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
