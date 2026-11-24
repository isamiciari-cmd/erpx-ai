import { useLocalizedCopy } from '@/i18n/localizedCopy';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RequireRole } from '../../components/auth';

interface EmergencyAccessLog {
  id: string;
  user_id: string;
  reason: string;
  granted_at: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  is_active: boolean;
  user_email?: string;
  revoked_by_email?: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
}

export function EmergencyAccess() {
  const copy = useLocalizedCopy();
  const [logs, setLogs] = useState<EmergencyAccessLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grant access form
  const [selectedUser, setSelectedUser] = useState('');
  const [reason, setReason] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load emergency access logs
      const { data: logsData, error: logsError } = await supabase
        .from('emergency_access_logs')
        .select('*')
        .order('granted_at', { ascending: false });

      if (logsError) throw logsError;

      // Load all profiles for user selection
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');

      if (profilesError) throw profilesError;

      // Enrich logs with user emails
      const enrichedLogs = await Promise.all(
        (logsData || []).map(async (log) => {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', log.user_id)
            .single();

          let revoked_by_email = null;
          if (log.revoked_by) {
            const { data: revokerProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', log.revoked_by)
              .single();
            revoked_by_email = revokerProfile?.email || null;
          }

          return {
            ...log,
            user_email: userProfile?.email || 'Unknown',
            revoked_by_email,
          };
        }),
      );

      setLogs(enrichedLogs);
      setProfiles(profilesData || []);
    } catch (err) {
      console.error('Error loading emergency access data:', err);
      setError("Failed to load emergency access data");
    } finally {
      setLoading(false);
    }
  };

  const grantEmergencyAccess = async () => {
    if (!selectedUser || !reason) {
      alert(copy("Please select a user and provide a reason"));
      return;
    }

    try {
      setGranting(true);
      setError(null);

      const { error } = await supabase.rpc('grant_emergency_access', {
        p_user_id: selectedUser,
        p_reason: reason,
        p_duration_hours: durationHours,
      });

      if (error) throw error;

      alert(copy("Emergency access granted successfully"));
      setSelectedUser('');
      setReason('');
      setDurationHours(24);
      loadData();
    } catch (err) {
      console.error('Error granting emergency access:', err);
      setError("Failed to grant emergency access");
    } finally {
      setGranting(false);
    }
  };

  const revokeEmergencyAccess = async (accessId: string) => {
    if (!confirm(copy("Are you sure you want to revoke this emergency access?"))) {
      return;
    }

    try {
      const { error } = await supabase.rpc('revoke_emergency_access', {
        p_access_id: accessId,
      });

      if (error) throw error;

      alert(copy("Emergency access revoked successfully"));
      loadData();
    } catch (err) {
      console.error('Error revoking emergency access:', err);
      alert(err instanceof Error ? err.message : copy("Failed to revoke emergency access"));
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();
  const isActive = (log: EmergencyAccessLog) =>
    log.is_active && !isExpired(log.expires_at) && !log.revoked_at;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span role="status">{copy("Loading...")}</span>
      </div>
    );
  }

  return (
    <RequireRole role="owner">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--app-text)]">{copy("Emergency Access")}</h1>
          <p className="text-[var(--app-muted)] mt-1">
            {copy("Grant temporary elevated access with full audit trail")}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {copy(error ?? undefined)}
          </div>
        )}

        {/* Grant Access Form */}
        <div className="bg-[var(--app-surface)] rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--app-text)] mb-4">{copy("Grant Emergency Access")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--app-muted)] mb-1">{copy("Select User")}</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="ws-input"
              >
                <option value="">{copy("-- Select User --")}</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email} ({profile.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--app-muted)] mb-1">
                {copy("Duration (hours)")}
              </label>
              <input
                type="number"
                value={durationHours}
                onChange={(e) => setDurationHours(parseInt(e.target.value))}
                min="1"
                max="168"
                className="ws-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--app-muted)] mb-1">
                {copy("Reason (Required)")}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={copy("Explain why emergency access is needed...")}
                rows={3}
                className="ws-input"
              />
            </div>
            <div className="md:col-span-2">
              <button
                onClick={grantEmergencyAccess}
                disabled={granting}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                {granting ? 'Granting...' : copy("Grant Emergency Access")}
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Access Logs */}
        <div className="bg-[var(--app-surface)] rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--app-border)]">
            <h2 className="text-lg font-semibold text-[var(--app-text)]">{copy("Emergency Access History")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--app-border)]">
              <thead className="bg-[var(--app-surface-2)]">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("User")}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("Reason")}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("Granted")}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("Expires")}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("Status")}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
                    {copy("Actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--app-surface)] divide-y divide-[var(--app-border)]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--app-surface-2)]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--app-text)]">
                      {log.user_email}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--app-text)]">{log.reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--app-muted)]">
                      {new Date(log.granted_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--app-muted)]">
                      {new Date(log.expires_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isActive(log) ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {copy("Active")}
                        </span>
                      ) : log.revoked_at ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {copy("Revoked")}
                        </span>
                      ) : isExpired(log.expires_at) ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-[var(--app-surface-2)] text-[var(--app-text)]">
                          {copy("Expired")}
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {copy("Inactive")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isActive(log) ? (
                        <button
                          onClick={() => revokeEmergencyAccess(log.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          {copy("Revoke")}
                        </button>
                      ) : log.revoked_at ? (
                        <span className="text-[var(--app-muted)]">{copy("Revoked by")} {log.revoked_by_email}</span>
                      ) : (
                        <span className="text-[var(--app-muted)]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[var(--app-muted)]">{copy("No emergency access records")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
