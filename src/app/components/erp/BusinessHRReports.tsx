import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  downloadBusinessCsv,
  listBusinessRecords,
  type BusinessRecord,
} from '../../../services/businessRecordsService';
import { recordsToCsv } from '../../../services/businessRules';

const modules = [
  ['hr_employees', 'Employees', '/hr/employees'],
  ['hr_attendance', 'Attendance', '/hr/attendance'],
  ['hr_leave', 'Leave', '/hr/leaves'],
  ['hr_payroll', 'Payroll', '/hr/payroll'],
  ['hr_recruitment', 'Recruitment', '/hr/recruitment'],
];
export default function BusinessHRReports({ dashboard = false }: { dashboard?: boolean }) {
  const { user } = useAuth();
  const [data, setData] = useState<Record<string, BusinessRecord[]>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState('hr_employees');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setData({});
    try {
      const results = await Promise.all(
        modules.map(
          async ([key]) => [key, await listBusinessRecords(user?.company_id || '', key)] as const,
        ),
      );
      setData(Object.fromEntries(results));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load HR records.');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);
  useEffect(() => {
    void load();
  }, [load]);
  const rows = useMemo(
    () =>
      (data[module] || []).filter(
        (r) => (!from || r.record_date >= from) && (!to || r.record_date <= to),
      ),
    [data, module, from, to],
  );
  function exportCsv() {
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row.data)))];
    downloadBusinessCsv(
      `${module}.csv`,
      recordsToCsv(
        ['Name', 'Reference', 'Date', 'Status', 'Amount', ...keys],
        rows.map((r) => [
          r.title,
          r.reference,
          r.record_date,
          r.status,
          r.amount,
          ...keys.map((k) => r.data[k]),
        ]),
      ),
    );
  }
  return (
    <section className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{dashboard ? 'HR dashboard' : 'HR reports'}</h1>
          <p className="mt-2 text-slate-500">
            Reports from saved company employee and HR workflow records.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded border px-4 py-2"
            disabled={loading}
            onClick={() => void load()}
          >
            Refresh
          </button>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            disabled={loading || !!error}
            onClick={exportCsv}
          >
            Export CSV
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [
            'Active employees',
            (data.hr_employees || []).filter((r) => r.status === 'active').length,
          ],
          [
            'Leave awaiting approval',
            (data.hr_leave || []).filter((r) => r.status === 'submitted').length,
          ],
          [
            'Payroll awaiting approval',
            (data.hr_payroll || []).filter((r) => r.status === 'submitted').length,
          ],
        ].map(([name, count]) => (
          <div className="rounded-xl border p-4" key={name}>
            <p className="text-sm text-slate-500">{name}</p>
            <strong className="text-2xl">{loading || error ? '—' : count}</strong>
          </div>
        ))}
      </div>
      <nav className="flex flex-wrap gap-4">
        {modules.map(([key, title, url]) => (
          <Link className="text-blue-600" key={key} to={url}>
            {title}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Report type"
          className="rounded border bg-transparent p-2"
          value={module}
          onChange={(e) => setModule(e.target.value)}
        >
          {modules.map(([key, title]) => (
            <option key={key} value={key}>
              {title}
            </option>
          ))}
        </select>
        <label>
          From{' '}
          <input
            className="rounded border bg-transparent p-2"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To{' '}
          <input
            className="rounded border bg-transparent p-2"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Name', 'Reference', 'Date', 'Status', 'Amount'].map((h) => (
                <th className="p-4 text-start" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr className="border-t" key={r.id}>
                <td className="p-4">{r.title}</td>
                <td className="p-4">{r.reference}</td>
                <td className="p-4">{r.record_date}</td>
                <td className="p-4">{r.status}</td>
                <td className="p-4">{Number(r.amount).toLocaleString()}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="p-8 text-center">
                  {loading
                    ? 'Loading…'
                    : error
                      ? 'Records unavailable.'
                      : 'No records in this period.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
