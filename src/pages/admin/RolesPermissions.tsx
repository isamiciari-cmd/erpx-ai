import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { RequireRole } from '../../components/auth';
import { listDirectoryRoles, type DirectoryRole } from '../../services/adminDirectoryService';

export function RolePermissionsView({ matrix = false }: { matrix?: boolean }) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<DirectoryRole[]>([]);
  const [selected, setSelected] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(''); setRoles([]);
    try {
      const rows = await listDirectoryRoles(user?.company_id ?? '');
      if (request !== generation.current) return;
      const sorted = rows.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
      setRoles(sorted); setSelected(sorted[0]?.id ?? '');
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : 'تعذر قراءة الصلاحيات.');
    } finally { if (request === generation.current) setLoading(false); }
  }, [user?.company_id]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  const permissions = [...new Map(roles.flatMap(role => role.permissions).map(permission => [permission.permission_key, permission])).values()];
  const categories = [...new Set(permissions.map(permission => permission.category))].sort();
  const visible = permissions.filter(permission => category === 'all' || permission.category === category);
  const selectedRole = roles.find(role => role.id === selected);

  return <RequireRole role={['owner', 'developer', 'super_admin', 'admin']} redirectTo="/dashboard">
    <section className="p-6 text-[var(--app-text)]" dir="rtl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">{matrix ? 'مصفوفة الصلاحيات الفعلية' : 'الأدوار والصلاحيات المطبقة'}</h1><p className="mt-2 text-sm text-[var(--app-muted)]">قراءة من قاعدة البيانات للشركة الحالية والأدوار العامة. تشمل صلاحيات الوحدات الإجراءات التابعة لها.</p></div>
        <button onClick={() => { void load(); }} disabled={loading} className="rounded-lg border border-[var(--app-border)] px-4 py-2 disabled:opacity-50">تحديث</button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/40 p-3 text-red-500">{error}</p>}
      {loading ? <p role="status">جارٍ قراءة الصلاحيات…</p> : matrix ? <>
        <label className="mb-4 block">الوحدة <select aria-label="الوحدة" value={category} onChange={event => setCategory(event.target.value)} className="rounded border bg-[var(--app-surface-2)] p-2"><option value="all">جميع الوحدات</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
        <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]"><table className="w-full text-right text-sm"><thead className="bg-[var(--app-surface-2)]"><tr><th className="p-3">الصلاحية</th>{roles.map(role => <th key={role.id} className="p-3">{role.display_name}</th>)}</tr></thead><tbody>{visible.map(permission => <tr key={permission.permission_key} className="border-t border-[var(--app-border)]"><td className="p-3" dir="ltr">{permission.permission_key}</td>{roles.map(role => <td key={role.id} className="p-3">{role.permissions.some(item => item.permission_key === permission.permission_key) ? 'مسموح' : '—'}</td>)}</tr>)}</tbody></table></div>
        {!visible.length && !error && <p className="mt-4">لا توجد صلاحيات ضمن هذا النطاق.</p>}
      </> : <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">{roles.map(role => <button key={role.id} onClick={() => setSelected(role.id)} className={`w-full rounded-xl border p-4 text-right ${selected === role.id ? 'border-blue-500 bg-blue-500/10' : 'border-[var(--app-border)]'}`}><span className="block font-semibold">{role.display_name}</span><span className="text-sm text-[var(--app-muted)]">{role.name} · {role.permissions.length} صلاحية</span></button>)}</div>
        <div className="rounded-xl border border-[var(--app-border)] p-5 md:col-span-2">{selectedRole ? <><h2 className="mb-4 text-xl font-semibold">{selectedRole.display_name}</h2><ul className="grid gap-2 sm:grid-cols-2">{selectedRole.permissions.map(permission => <li key={permission.permission_key} className="rounded-lg bg-[var(--app-surface-2)] p-3" dir="ltr">{permission.permission_key}</li>)}</ul>{!selectedRole.permissions.length && <p>لم تُمنح صلاحيات لهذا الدور.</p>}</> : <p>لا توجد أدوار متاحة.</p>}</div>
      </div>}
    </section>
  </RequireRole>;
}

export function RolesPermissions() { return <RolePermissionsView />; }
