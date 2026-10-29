import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { isDemoMode } from '../../../lib/supabase';
import { listInvoices, type Invoice } from '../../../services/invoicesService';
import { downloadBusinessCsv } from '../../../services/businessRecordsService';
import { recordsToCsv } from '../../../services/businessRules';
export default function VATTaxPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setInvoices([]);
    try {
      if (isDemoMode) throw new Error('Connect Supabase to load the sales VAT register.');
      setInvoices(await listInvoices(user?.company_id || ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load invoices.');
    } finally {
      setLoading(false);
    }
  }, [user?.company_id]);
  useEffect(() => {
    void load();
  }, [load]);
  const rows = invoices.filter(
    (i) =>
      !['draft', 'cancelled'].includes(i.status) &&
      (!from || i.issue_date >= from) &&
      (!to || i.issue_date <= to),
  );
  const sign = (i: Invoice) => (i.invoice_type_code === '381' ? -1 : 1);
  const vatByCurrency = rows.reduce<Record<string, number>>((totals, invoice) => {
    const currency = invoice.currency_code || user?.company?.currency || 'SAR';
    totals[currency] =
      (totals[currency] || 0) + Math.round(Number(invoice.vat_amount) * 100) * sign(invoice);
    return totals;
  }, {});
  if (!Object.keys(vatByCurrency).length) vatByCurrency[user?.company?.currency || 'SAR'] = 0;
  function exportCsv() {
    downloadBusinessCsv(
      'sales-vat-register.csv',
      recordsToCsv(
        ['Invoice', 'Issue date', 'Type code', 'Currency', 'Taxable amount', 'VAT', 'Total'],
        rows.map((i) => [
          i.invoice_number,
          i.issue_date,
          i.invoice_type_code,
          i.currency_code,
          Number(i.taxable_amount) * sign(i),
          Number(i.vat_amount) * sign(i),
          Number(i.total_amount) * sign(i),
        ]),
      ),
    );
  }
  return (
    <section className="space-y-6 text-slate-900 dark:text-white">
      <h1 className="text-3xl font-bold">Sales VAT register</h1>
      <p className="max-w-3xl text-slate-500">
        Issued invoice VAT for the selected period. Credit notes reduce totals. Input VAT requires
        supplier tax documents; this register does not submit a tax return.
      </p>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
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
        <button className="rounded border p-2" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
        <button
          className="rounded bg-blue-600 p-2 text-white"
          onClick={exportCsv}
          disabled={loading || !!error}
        >
          Export CSV
        </button>
      </div>
      {Object.entries(vatByCurrency).map(([currency, minorUnits]) => (
        <div key={currency} className="rounded-xl border p-5">
          <p>Output VAT ({currency})</p>
          <strong className="text-2xl">
            {loading || error
              ? '—'
              : (minorUnits / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </strong>
        </div>
      ))}
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Invoice', 'Date', 'Currency', 'Taxable amount', 'VAT', 'Total'].map((h) => (
                <th key={h} className="p-4 text-start">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-4">{i.invoice_number}</td>
                <td className="p-4">{i.issue_date}</td>
                <td className="p-4">{i.currency_code}</td>
                <td className="p-4">{(Number(i.taxable_amount) * sign(i)).toFixed(2)}</td>
                <td className="p-4">{(Number(i.vat_amount) * sign(i)).toFixed(2)}</td>
                <td className="p-4">{(Number(i.total_amount) * sign(i)).toFixed(2)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  {loading
                    ? 'Loading…'
                    : error
                      ? 'Register unavailable.'
                      : 'No issued invoices in this period.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
