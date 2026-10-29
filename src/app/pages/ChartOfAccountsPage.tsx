import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  listBusinessAccounts,
  saveBusinessAccount,
  type BusinessAccount,
} from '../../services/businessRecordsService';

export default function ChartOfAccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [form, setForm] = useState({ account_code: '', account_name: '', account_type: 'asset' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      setAccounts(await listBusinessAccounts(user?.company_id || ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load accounts.');
    }
  }, [user?.company_id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await saveBusinessAccount(user?.company_id || '', form);
      setForm({ account_code: '', account_name: '', account_type: 'asset' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save account.');
    } finally {
      setBusy(false);
    }
  }
  async function archive(account: BusinessAccount) {
    setBusy(true);
    setError('');
    try {
      await saveBusinessAccount(user?.company_id || '', { ...account, is_active: false });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not deactivate account.');
    } finally {
      setBusy(false);
    }
  }
  const control = 'w-full rounded-lg border bg-transparent p-3';
  return (
    <section className="space-y-6 text-slate-900 dark:text-white">
      <h1 className="text-3xl font-bold">Chart of accounts</h1>
      <p className="text-slate-500">
        Active company accounts used by the general ledger. Used accounts remain in historical
        journals when deactivated.
      </p>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      <form onSubmit={create} className="grid gap-3 rounded-xl border p-5 md:grid-cols-4">
        <label>
          Account code
          <input
            className={control}
            required
            maxLength={50}
            value={form.account_code}
            onChange={(e) => setForm({ ...form, account_code: e.target.value })}
          />
        </label>
        <label>
          Account name
          <input
            className={control}
            required
            maxLength={255}
            value={form.account_name}
            onChange={(e) => setForm({ ...form, account_name: e.target.value })}
          />
        </label>
        <label>
          Type
          <select
            className={control}
            value={form.account_type}
            onChange={(e) => setForm({ ...form, account_type: e.target.value })}
          >
            {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <button
          disabled={busy}
          className="self-end rounded-lg bg-blue-600 p-3 text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Create account'}
        </button>
      </form>
      <div className="flex gap-3">
        <input
          aria-label="Search accounts"
          className={control}
          placeholder="Search accounts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="rounded border px-4" disabled={busy} onClick={() => void load()}>
          Refresh
        </button>
      </div>
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Code', 'Name', 'Type', 'Action'].map((h) => (
                <th className="p-4 text-start" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts
              .filter((a) =>
                `${a.account_code} ${a.account_name}`.toLowerCase().includes(search.toLowerCase()),
              )
              .map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-4">{a.account_code}</td>
                  <td className="p-4">{a.account_name}</td>
                  <td className="p-4">{a.account_type}</td>
                  <td className="p-4">
                    <button
                      disabled={busy}
                      className="rounded border px-3 py-2"
                      onClick={() => void archive(a)}
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
