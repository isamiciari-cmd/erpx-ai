import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { isDemoMode } from '../../../lib/supabase';
import { listInvoices, type Invoice } from '../../../services/invoicesService';
import {
  issueBusinessInvoice,
  recordBusinessReceipt,
  listBusinessReceipts,
} from '../../../services/businessReceivablesService';
import { downloadBusinessCsv } from '../../../services/businessRecordsService';
import { recordsToCsv } from '../../../services/businessRules';

type Receipt = Awaited<ReturnType<typeof listBusinessReceipts>>[number];
export default function AccountsReceivablePage() {
  const { user } = useAuth();
  const companyId = user?.company_id || '';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Invoice>();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [requestId, setRequestId] = useState('');
  const [formError, setFormError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setInvoices([]);
    try {
      if (isDemoMode) throw new Error('Connect Supabase to load invoices and record receipts.');
      setInvoices(await listInvoices(companyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load invoices.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);
  useEffect(() => {
    void load();
  }, [load]);
  const money = (v: number, currency = user?.company?.currency || 'SAR') =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(v));
  const rows = invoices.filter((i) =>
    `${i.invoice_number} ${i.reference_number || ''}`.toLowerCase().includes(search.toLowerCase()),
  );
  async function issue(invoice: Invoice) {
    setBusy(true);
    setError('');
    try {
      await issueBusinessInvoice(invoice.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue invoice.');
    } finally {
      setBusy(false);
    }
  }
  async function view(invoice: Invoice) {
    setSelected(invoice);
    setAmount(String(invoice.amount_due));
    setMethod('bank_transfer');
    setReference('');
    setRequestId(crypto.randomUUID());
    setFormError('');
    setReceipts([]);
    try {
      setReceipts(await listBusinessReceipts(companyId, invoice.id));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not load receipts.');
    }
  }
  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setFormError('');
    try {
      await recordBusinessReceipt(selected.id, Number(amount), method, reference, requestId);
      setSelected(undefined);
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Could not save receipt. Retry with the same payment details.',
      );
    } finally {
      setBusy(false);
    }
  }
  function exportCsv() {
    downloadBusinessCsv(
      'receivables.csv',
      recordsToCsv(
        ['Invoice', 'Issue date', 'Due date', 'Status', 'Currency', 'Total', 'Paid', 'Outstanding'],
        rows.map((i) => [
          i.invoice_number,
          i.issue_date,
          i.due_date,
          i.status,
          i.currency_code,
          i.total_amount,
          i.amount_paid,
          i.amount_due,
        ]),
      ),
    );
  }
  return (
    <section className="space-y-6 text-slate-900 dark:text-white">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Accounts receivable</h1>
          <p className="mt-2 text-slate-500">
            Issue sales invoices and record actual receipts. Accounting and payment updates are
            saved in one database transaction.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded border px-4 py-2"
            onClick={() => void load()}
            disabled={busy || loading}
          >
            Refresh
          </button>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white"
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
      <Link to="/finance/invoicing" className="inline-block text-blue-600">
        Create or edit draft invoice
      </Link>
      <input
        aria-label="Search invoices"
        className="w-full rounded border bg-transparent p-3"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search invoice or reference"
      />
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {['Invoice', 'Due date', 'Status', 'Total', 'Outstanding', 'Actions'].map((h) => (
                <th className="p-4 text-start" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((invoice) => (
              <tr className="border-t" key={invoice.id}>
                <td className="p-4">{invoice.invoice_number}</td>
                <td className="p-4">{invoice.due_date}</td>
                <td className="p-4">{invoice.status}</td>
                <td className="p-4">{money(invoice.total_amount, invoice.currency_code)}</td>
                <td className="p-4">{money(invoice.amount_due, invoice.currency_code)}</td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {invoice.status === 'draft' && (
                      <button
                        className="rounded border p-2"
                        disabled={busy}
                        onClick={() => void issue(invoice)}
                      >
                        Issue and post
                      </button>
                    )}
                    <button
                      className="rounded border p-2"
                      disabled={busy}
                      onClick={() => void view(invoice)}
                    >
                      Statement / receipt
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  {loading
                    ? 'Loading invoices…'
                    : error
                      ? 'Invoices unavailable.'
                      : 'No saved invoices.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-6 dark:bg-slate-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title"
          >
            <div className="flex justify-between gap-3">
              <h2 id="receipt-title" className="text-xl font-bold">
                {selected.invoice_number} statement
              </h2>
              <button
                className="rounded border px-3"
                disabled={busy}
                onClick={() => setSelected(undefined)}
              >
                Close
              </button>
            </div>
            <p className="my-3">
              Total {money(selected.total_amount, selected.currency_code)} · Paid{' '}
              {money(selected.amount_paid, selected.currency_code)} · Due{' '}
              {money(selected.amount_due, selected.currency_code)}
            </p>
            {formError && (
              <p role="alert" className="my-3 rounded bg-red-50 p-3 text-red-800">
                {formError}
              </p>
            )}
            <ul className="mb-5 space-y-2">
              {receipts.map((r) => (
                <li className="rounded border p-3 text-sm" key={r.id}>
                  {r.payment_number} · {new Date(r.payment_date).toLocaleDateString()} ·{' '}
                  {r.payment_method} · {money(r.amount, selected.currency_code)} · {r.status}
                  <p>{r.reference_number}</p>
                </li>
              ))}
              {!receipts.length && <li className="text-slate-500">No receipts loaded.</li>}
            </ul>
            {['issued', 'partial', 'unpaid', 'overdue'].includes(selected.status) &&
              Number(selected.amount_due) > 0 && (
                <form onSubmit={pay} className="space-y-3">
                  <h3 className="font-semibold">Record received payment</h3>
                  <label className="block">
                    Amount
                    <input
                      className="mt-1 w-full rounded border bg-transparent p-2"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selected.amount_due}
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    Method
                    <select
                      className="mt-1 w-full rounded border bg-transparent p-2"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      {['bank_transfer', 'cash', 'card', 'mada', 'apple_pay'].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    Bank / card reference
                    <input
                      className="mt-1 w-full rounded border bg-transparent p-2"
                      required={method !== 'cash'}
                      maxLength={100}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={busy}
                    className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                  >
                    {busy ? 'Saving…' : 'Save receipt'}
                  </button>
                </form>
              )}
          </div>
        </div>
      )}
    </section>
  );
}
