import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { buildTrialBalance, recordsToCsv, toMinorUnits } from '../../../services/businessRules';
import {
  listBusinessLedger,
  downloadBusinessCsv,
  type LedgerJournal,
} from '../../../services/businessRecordsService';

export default function BusinessLedgerPage({
  mode = 'ledger',
}: {
  mode?: 'ledger' | 'trial' | 'reports' | 'cash' | 'dashboard';
}) {
  const { user } = useAuth();
  const companyId = user?.company_id ?? '';
  const [journals, setJournals] = useState<LedgerJournal[]>([]);
  const [loadError, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const titles = {
    ledger: 'General ledger',
    trial: 'Trial balance',
    reports: 'Financial reports',
    cash: 'Cash and bank ledger',
    dashboard: 'Finance dashboard',
  };
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setJournals([]);
    try {
      setJournals(await listBusinessLedger(companyId));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : (err as { message?: string }).message || 'Could not load the ledger.',
      );
    } finally {
      setLoading(false);
    }
  }, [companyId]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () => journals.filter((j) => (!from || j.entry_date >= from) && (!to || j.entry_date <= to)),
    [journals, from, to],
  );
  const aggregation = useMemo(() => {
    try {
      return {
        totals: buildTrialBalance(
          filtered.map((j) => ({
            status: j.status,
            data: {
              lines: j.lines.map((l) => ({
                account_id: l.account_id,
                account_code: l.account?.account_code || l.account_id,
                account_name: l.account?.account_name || 'Unavailable account',
                debit: Number(l.debit_amount),
                credit: Number(l.credit_amount),
              })),
            },
          })),
        ),
        error: '',
      };
    } catch (err) {
      return {
        totals: [],
        error: `Posted ledger data failed validation: ${err instanceof Error ? err.message : 'Review imported entries.'}`,
      };
    }
  }, [filtered]);
  const totals = aggregation.totals;
  const error = loadError || aggregation.error;
  const types = useMemo(
    () =>
      new Map(
        journals.flatMap((j) =>
          j.lines.map((l) => [l.account_id, l.account?.account_type] as const),
        ),
      ),
    [journals],
  );
  const money = (amount: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: user?.company?.currency || 'SAR',
    }).format(amount);
  const matches = (code: string, name: string) =>
    `${code} ${name}`.toLowerCase().includes(search.toLowerCase());
  const visible = totals.filter(
    (a) =>
      matches(a.account_code, a.account_name) &&
      (mode !== 'cash' || /cash|bank|card|نقد|بنك/i.test(a.account_name + a.account_code)),
  );
  const debit = totals.reduce((s, a) => s + toMinorUnits(a.debit), 0) / 100;
  const credit = totals.reduce((s, a) => s + toMinorUnits(a.credit), 0) / 100;
  const revenue = totals
    .filter((a) => ['revenue', 'income'].includes(types.get(a.account_id) || ''))
    .reduce((s, a) => s - a.balance, 0);
  const expenses = totals
    .filter((a) => types.get(a.account_id) === 'expense')
    .reduce((s, a) => s + a.balance, 0);
  const detail = filtered.flatMap((j) =>
    j.lines
      .filter((l) => matches(l.account?.account_code || '', l.account?.account_name || ''))
      .map((l) => ({
        date: j.entry_date,
        reference: j.entry_number,
        description: j.description,
        account: `${l.account?.account_code} · ${l.account?.account_name}`,
        debit: Number(l.debit_amount),
        credit: Number(l.credit_amount),
      })),
  );
  function exportCsv() {
    const isDetail = mode === 'ledger';
    downloadBusinessCsv(
      `${mode}-${new Date().toISOString().slice(0, 10)}.csv`,
      recordsToCsv(
        isDetail
          ? ['Date', 'Journal', 'Description', 'Account', 'Debit', 'Credit']
          : ['Account code', 'Account', 'Debit movement', 'Credit movement', 'Net debit movement'],
        isDetail
          ? detail.map((l) => [l.date, l.reference, l.description, l.account, l.debit, l.credit])
          : visible.map((a) => [a.account_code, a.account_name, a.debit, a.credit, a.balance]),
      ),
    );
  }
  return (
    <section className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{titles[mode]}</h1>
          <p className="mt-2 text-slate-500">
            Posted accounting entries, including POS and approved manual journals. Date filters show
            period movements; unposted workflow records are excluded.
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
      <nav className="flex flex-wrap gap-3 text-sm text-blue-600">
        {[
          ['Journal entries', '/finance/journal-entries'],
          ['Chart of accounts', '/finance/accounting'],
          ['Receivables', '/finance/accounts-receivable'],
          ['Supplier bills', '/finance/accounts-payable'],
        ].map(([name, href]) => (
          <Link key={href} to={href}>
            {name}
          </Link>
        ))}
      </nav>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Posted journals', filtered.length],
          ['Debit movement', money(debit)],
          ['Credit movement', money(credit)],
          ['Period result', money(revenue - expenses)],
        ].map(([name, value]) => (
          <div className="rounded-xl border p-4" key={String(name)}>
            <p className="text-sm text-slate-500">{name}</p>
            <strong className="text-xl">{loading || error ? '—' : value}</strong>
          </div>
        ))}
      </div>
      {!error && !loading && toMinorUnits(debit) !== toMinorUnits(credit) && (
        <p role="alert" className="rounded bg-red-50 p-4 text-red-800">
          The ledger is out of balance. Review the imported or legacy entries before relying on
          reports.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <label>
          From
          <input
            className="ml-2 rounded border bg-transparent p-2"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            className="ml-2 rounded border bg-transparent p-2"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <input
          className="rounded border bg-transparent p-2"
          aria-label="Search account"
          placeholder="Search account"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              {(mode === 'ledger'
                ? ['Date', 'Journal / description', 'Account', 'Debit', 'Credit']
                : [
                    'Account code',
                    'Account',
                    'Debit movement',
                    'Credit movement',
                    'Net debit movement',
                  ]
              ).map((h) => (
                <th className="p-4 text-start" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6">
                  Loading ledger…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="p-6">
                  Ledger unavailable.
                </td>
              </tr>
            ) : mode === 'ledger' ? (
              detail.map((row, index) => (
                <tr className="border-t" key={index}>
                  <td className="p-4">{row.date}</td>
                  <td className="p-4">
                    {row.reference}
                    <p className="text-xs text-slate-500">{row.description}</p>
                  </td>
                  <td className="p-4">{row.account}</td>
                  <td className="p-4">{money(row.debit)}</td>
                  <td className="p-4">{money(row.credit)}</td>
                </tr>
              ))
            ) : (
              visible.map((a) => (
                <tr className="border-t" key={a.account_id}>
                  <td className="p-4">{a.account_code}</td>
                  <td className="p-4">{a.account_name}</td>
                  <td className="p-4">{money(a.debit)}</td>
                  <td className="p-4">{money(a.credit)}</td>
                  <td className="p-4">{money(a.balance)}</td>
                </tr>
              ))
            )}
            {!loading && !error && (mode === 'ledger' ? detail : visible).length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No posted activity for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
