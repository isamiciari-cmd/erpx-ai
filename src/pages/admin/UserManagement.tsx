import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { RequirePermission } from '../../components/auth';
import { listCompanyDirectory, manageCompanyUser, type DirectoryBranch, type DirectoryRole, type DirectoryUser } from '../../services/adminDirectoryService';

const protectedRoles = ['owner', 'developer', 'super_admin'];
type FormState = { id?: string; email: string; first_name: string; last_name: string; role_id: string; branch_id: string; status: string };
const blank: FormState = { email: '', first_name: '', last_name: '', role_id: '', branch_id: '', status: 'active' };

export function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [roles, setRoles] = useState<DirectoryRole[]>([]);
  const [branches, setBranches] = useState<DirectoryBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(''); setUsers([]);
    try {
      const result = await listCompanyDirectory(user?.company_id ?? '');
      if (request !== generation.current) return;
      setUsers(result.users); setRoles(result.roles); setBranches(result.branches);
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : 'تعذر تحميل المستخدمين.');
    } finally { if (request === generation.current) setLoading(false); }
  }, [user?.company_id]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await manageCompanyUser({ ...form, action: form.id ? 'update' : 'invite', user_id: form.id });
      setForm(null);
      setNotice(result.audit_warning || result.message || 'تم حفظ بيانات الحساب.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر حفظ المستخدم.'); }
    finally { setSaving(false); }
  };
  const editable = (record: DirectoryUser) => record.id !== user?.id && !protectedRoles.includes(roles.find(role => role.id === record.role_id)?.name ?? '');
  const assignableRoles = roles.filter(role => !protectedRoles.includes(role.name) && (!role.status || role.status === 'active'));

  return <RequirePermission permission="users.view">
    <section className="p-6 text-[var(--app-text)]" dir="rtl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">إدارة المستخدمين</h1><p className="text-sm text-[var(--app-muted)]">حسابات الشركة وأدوارها الفعلية. تعطيل الحساب يحافظ على السجلات السابقة.</p></div>
        <div className="flex gap-3"><button onClick={() => { setForm({ ...blank }); setNotice(''); }} disabled={loading || saving} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">دعوة مستخدم بالبريد</button><button onClick={() => { void load(); }} disabled={loading || saving}>تحديث</button></div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/40 p-3 text-red-500">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-green-500/40 p-3 text-green-500">{notice}</p>}
      {form && <form onSubmit={save} className="mb-6 grid gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">{form.id ? 'تعديل حساب' : 'إرسال دعوة لإنشاء كلمة مرور'}</h2>
        <label>البريد الإلكتروني<input aria-label="البريد الإلكتروني" type="email" required disabled={!!form.id || saving} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded border bg-[var(--app-surface-2)] p-2" /></label>
        <label>الاسم الأول<input aria-label="الاسم الأول" required maxLength={100} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="mt-1 w-full rounded border bg-[var(--app-surface-2)] p-2" /></label>
        <label>اسم العائلة<input aria-label="اسم العائلة" maxLength={100} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="mt-1 w-full rounded border bg-[var(--app-surface-2)] p-2" /></label>
        <label>الدور<select aria-label="الدور" required value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })} className="mt-1 w-full rounded border bg-[var(--app-surface-2)] p-2"><option value="">اختر الدور</option>{assignableRoles.map(role => <option key={role.id} value={role.id}>{role.display_name}</option>)}</select></label>
        <label>الفرع<select aria-label="الفرع" value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} className="mt-1 w-full rounded border bg-[var(--app-surface-2)] p-2"><option value="">بلا فرع</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label>الحالة<select aria-label="الحالة" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded border bg-[var(--app-surface-2)] p-2"><option value="active">نشط</option><option value="inactive">معطل</option><option value="suspended">موقوف</option></select></label>
        <div className="flex gap-4 sm:col-span-2"><button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'جارٍ التنفيذ…' : form.id ? 'حفظ التعديلات' : 'إرسال دعوة بالبريد'}</button><button type="button" disabled={saving} onClick={() => setForm(null)}>إلغاء</button></div>
      </form>}
      {loading ? <p role="status">جارٍ تحميل الحسابات…</p> : <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]"><table className="w-full text-right text-sm"><thead className="bg-[var(--app-surface-2)]"><tr>{['المستخدم', 'البريد', 'الدور الأساسي', 'الفرع', 'الحالة', 'الإجراءات'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{users.map(record => <tr key={record.id} className="border-t border-[var(--app-border)]"><td className="p-3">{[record.first_name, record.last_name].filter(Boolean).join(' ') || '—'}</td><td className="p-3">{record.email}</td><td className="p-3">{roles.find(role => role.id === record.role_id)?.display_name || 'غير متاح'}</td><td className="p-3">{branches.find(branch => branch.id === record.branch_id)?.name || '—'}</td><td className="p-3">{record.status}</td><td className="p-3">{editable(record) && <button disabled={saving} onClick={() => setForm({ ...record, branch_id: record.branch_id ?? '' })} className="text-blue-500">تعديل الحالة والدور</button>}</td></tr>)}</tbody></table>{users.length === 0 && !error && <p className="p-5">لا توجد حسابات مسجلة.</p>}</div>}
    </section>
  </RequirePermission>;
}
