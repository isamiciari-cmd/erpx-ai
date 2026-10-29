import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Plus, Download, RefreshCw, Search, X, FileText } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { isDemoMode } from '../../../lib/supabase';
import {
  BUSINESS_TRANSITIONS,
  FINAL_STATUSES,
  calculatePayroll,
  recordsToCsv,
  type BusinessField,
  type JournalLine,
} from '../../../services/businessRules';
import {
  completeBusinessPayment,
  downloadBusinessCsv,
  listBusinessAccounts,
  listBusinessAudit,
  listBusinessRecords,
  saveBusinessRecord,
  transitionBusinessRecord,
  type BusinessRecord,
  type BusinessAccount,
  type BusinessAuditEvent,
  type BusinessInput,
} from '../../../services/businessRecordsService';

export type { BusinessField } from '../../../services/businessRules';
export interface BusinessRecordsPageProps {
  module: string;
  title: string;
  description?: string;
  fields: BusinessField[];
  statuses?: string[];
  transitions?: Record<string, string[]>;
  initialStatus?: string;
  journal?: boolean;
  readOnly?: boolean;
  hideAmount?: boolean;
}

const control =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white';
const button =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-600';
const defaultStatuses = [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'posted',
  'paid',
  'completed',
  'cancelled',
  'active',
  'inactive',
  'on_hold',
];
const label = (status: string) => status.replaceAll('_', ' ');
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : String((error as { message?: string })?.message || 'Unable to complete this operation.');
const newLine = (): JournalLine => ({
  account_id: '',
  account_code: '',
  account_name: '',
  debit: 0,
  credit: 0,
});
function emptyInput(module: string, fields: BusinessField[]): BusinessInput {
  return {
    module,
    title: '',
    reference: '',
    record_date: new Date().toLocaleDateString('en-CA'),
    amount: 0,
    data: Object.fromEntries(fields.map((field) => [field.key, field.defaultValue ?? ''])),
  };
}

export default function BusinessRecordsPage({
  module,
  title,
  description,
  fields,
  statuses = defaultStatuses,
  transitions = BUSINESS_TRANSITIONS,
  initialStatus = 'draft',
  journal = false,
  readOnly = false,
  hideAmount = false,
}: BusinessRecordsPageProps) {
  const { user } = useAuth();
  const companyId = user?.company_id ?? '';
  const currency = user?.company?.currency || 'SAR';
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [employees, setEmployees] = useState<BusinessRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<BusinessRecord>();
  const [input, setInput] = useState<BusinessInput>(() => emptyInput(module, fields));
  const [formError, setFormError] = useState('');
  const [events, setEvents] = useState<BusinessAuditEvent[]>([]);
  const [auditError, setAuditError] = useState('');
  const [paymentRecord, setPaymentRecord] = useState<BusinessRecord>();
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const loadGeneration = useRef(0);
  const needsEmployees = fields.some((field) => field.key === 'employee_id');

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setError('');
    setRecords([]);
    try {
      const [rows, chart, staff] = await Promise.all([
        listBusinessRecords(companyId, module),
        journal ? listBusinessAccounts(companyId) : Promise.resolve([]),
        needsEmployees ? listBusinessRecords(companyId, 'hr_employees') : Promise.resolve([]),
      ]);
      if (generation === loadGeneration.current) {
        setRecords(rows);
        setAccounts(chart);
        setEmployees(staff);
      }
    } catch (err) {
      if (generation === loadGeneration.current) {
        setRecords([]);
        setError(errorText(err));
      }
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [companyId, module, journal, needsEmployees]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setOpen(false);
    setPaymentRecord(undefined);
    setSearch('');
    setStatusFilter('all');
  }, [module, companyId]);

  const filtered = useMemo(
    () =>
      records.filter((row) => {
        const matches = `${row.title} ${row.reference} ${JSON.stringify(row.data)}`
          .toLowerCase()
          .includes(search.toLowerCase());
        return (
          matches &&
          (statusFilter === 'all' || row.status === statusFilter) &&
          (!from || row.record_date >= from) &&
          (!to || row.record_date <= to)
        );
      }),
    [records, search, statusFilter, from, to],
  );
  const locked =
    readOnly ||
    Boolean(selected && [...FINAL_STATUSES, 'submitted', 'approved'].includes(selected.status));
  const lines = (input.data.lines ?? []) as JournalLine[];
  const money = (value: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);

  function startNew() {
    const initial = emptyInput(module, fields);
    if (journal) initial.data.lines = [newLine(), newLine()];
    setSelected(undefined);
    setInput(initial);
    setFormError('');
    setEvents([]);
    setAuditError('');
    setOpen(true);
  }
  async function view(row: BusinessRecord) {
    setSelected(row);
    setInput({ ...row, data: structuredClone(row.data) });
    setFormError('');
    setEvents([]);
    setAuditError('');
    setOpen(true);
    try {
      setEvents(await listBusinessAudit(companyId, row.id));
    } catch (err) {
      setAuditError(errorText(err));
    }
  }
  function setData(key: string, value: unknown) {
    setInput((current) => ({ ...current, data: { ...current.data, [key]: value } }));
  }
  function changeLine(index: number, patch: Partial<JournalLine>) {
    setData(
      'lines',
      lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      for (const field of fields) {
        const value = input.data[field.key];
        if (field.required && (value === '' || value == null))
          throw new Error(`${field.label} is required.`);
        if (
          field.type === 'number' &&
          value !== '' &&
          (!Number.isFinite(Number(value)) ||
            (field.min !== undefined && Number(value) < field.min))
        )
          throw new Error(`Check ${field.label}.`);
      }
      await saveBusinessRecord(companyId, input, selected, selected?.status ?? initialStatus);
      setOpen(false);
      await load();
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(row: BusinessRecord, status: string) {
    if (
      status === 'paid' &&
      ['hr_payroll', 'finance_payables', 'finance_expenses'].includes(row.module)
    ) {
      setPaymentRecord(row);
      setPaymentReference(String(row.data.payment_reference || ''));
      setPaymentError('');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await transitionBusinessRecord(companyId, row, status);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function settle(event: FormEvent) {
    event.preventDefault();
    if (!paymentRecord) return;
    setBusy(true);
    setPaymentError('');
    try {
      await completeBusinessPayment(companyId, paymentRecord, paymentReference);
      setPaymentRecord(undefined);
      await load();
    } catch (err) {
      setPaymentError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  function exportCsv() {
    const columns = [
      'Title',
      'Reference',
      'Date',
      'Status',
      ...(hideAmount ? [] : [`Amount (${currency})`]),
      ...fields.map((f) => f.label),
    ];
    downloadBusinessCsv(
      `${module}-${new Date().toISOString().slice(0, 10)}.csv`,
      recordsToCsv(
        columns,
        filtered.map((row) => [
          row.title,
          row.reference,
          row.record_date,
          row.status,
          ...(hideAmount ? [] : [row.amount]),
          ...fields.map((f) => row.data[f.key]),
        ]),
      ),
    );
  }
  let payrollNet: number | null = null;
  if (module === 'hr_payroll') {
    try {
      payrollNet = calculatePayroll(
        input.data.base_salary || 0,
        input.data.allowances || 0,
        input.data.deductions || 0,
      );
    } catch {
      /* Validation is displayed on save. */
    }
  }

  return (
    <section className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 max-w-3xl text-slate-500">
            {description || 'Company records, approvals, history and exports.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={button} onClick={() => void load()} disabled={loading || busy}>
            <RefreshCw className="inline h-4 w-4" /> Refresh
          </button>
          <button className={button} onClick={exportCsv} disabled={loading || Boolean(error)}>
            <Download className="inline h-4 w-4" /> Export CSV
          </button>
          {!readOnly && (
            <button
              className={`${button} bg-blue-600 text-white`}
              onClick={startNew}
              disabled={isDemoMode || loading || Boolean(error)}
            >
              <Plus className="inline h-4 w-4" /> New record
            </button>
          )}
        </div>
      </div>
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-slate-500">Filtered records</p>
          <strong className="text-2xl">{filtered.length}</strong>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-slate-500">Awaiting approval</p>
          <strong className="text-2xl">
            {filtered.filter((r) => r.status === 'submitted').length}
          </strong>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-slate-500">
            {hideAmount ? 'Active records' : 'Filtered amount (all statuses)'}
          </p>
          <strong className="text-2xl">
            {hideAmount
              ? filtered.filter((r) => r.status === 'active').length
              : money(filtered.reduce((sum, row) => sum + row.amount, 0))}
          </strong>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-60 flex-1 items-center gap-2">
          <Search className="h-4 w-4" />
          <input
            aria-label="Search records"
            className={control}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, reference or details"
          />
        </label>
        <select
          className={`${control} max-w-48`}
          aria-label="Filter status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {label(status)}
            </option>
          ))}
        </select>
        <label className="text-sm">
          From
          <input
            aria-label="From date"
            className={control}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="text-sm">
          To
          <input
            aria-label="To date"
            className={control}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              {[
                'Name / reference',
                'Date',
                'Status',
                ...(hideAmount ? [] : ['Amount']),
                'Actions',
              ].map((h) => (
                <th className="p-4 text-start" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-8" colSpan={5}>
                  Loading saved records…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  {error ? 'Records could not be loaded.' : 'No saved records match these filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr className="border-t" key={row.id}>
                  <td className="p-4">
                    <strong>{row.title}</strong>
                    <p className="text-xs text-slate-500">{row.reference || row.id.slice(0, 8)}</p>
                  </td>
                  <td className="p-4">{row.record_date}</td>
                  <td className="p-4 capitalize">{label(row.status)}</td>
                  {!hideAmount && <td className="p-4">{money(row.amount)}</td>}
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <button className={button} onClick={() => void view(row)}>
                        <FileText className="inline h-4 w-4" /> View
                        {!readOnly &&
                        ![...FINAL_STATUSES, 'submitted', 'approved'].includes(row.status)
                          ? ' / edit'
                          : ''}
                      </button>
                      {!readOnly &&
                        (transitions[row.status] ?? [])
                          .filter((s) => statuses.includes(s))
                          .map((status) => (
                            <button
                              key={status}
                              className={button}
                              disabled={busy}
                              onClick={() => void changeStatus(row, status)}
                            >
                              {label(status)}
                            </button>
                          ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-dialog-title"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
          >
            <div className="mb-5 flex justify-between gap-4">
              <h2 id="record-dialog-title" className="text-xl font-bold">
                {selected ? selected.title : `New ${title} record`}
              </h2>
              <button
                className={button}
                aria-label="Close dialog"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={save} className="space-y-5">
              {formError && (
                <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
                  {formError}
                </p>
              )}
              {locked && (
                <p className="text-sm text-slate-500">
                  {selected && ['submitted', 'approved'].includes(selected.status)
                    ? 'Submitted and approved amounts are locked. Record payment evidence using the paid action, or reject a submitted record to return it to draft.'
                    : 'Finalized records are retained for audit. Create a correcting record when necessary.'}
                </p>
              )}
              <fieldset disabled={busy || locked} className="grid gap-4 sm:grid-cols-2">
                <label>
                  Name / description *
                  <input
                    className={control}
                    value={input.title}
                    required
                    maxLength={255}
                    onChange={(e) => setInput({ ...input, title: e.target.value })}
                  />
                </label>
                <label>
                  Reference
                  <input
                    className={control}
                    value={input.reference}
                    maxLength={120}
                    onChange={(e) => setInput({ ...input, reference: e.target.value })}
                  />
                </label>
                <label>
                  Date *
                  <input
                    className={control}
                    type="date"
                    required
                    value={input.record_date}
                    onChange={(e) => setInput({ ...input, record_date: e.target.value })}
                  />
                </label>
                {!hideAmount && !journal && module !== 'hr_payroll' && (
                  <label>
                    Amount ({currency})
                    <input
                      className={control}
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={input.amount}
                      onChange={(e) => setInput({ ...input, amount: Number(e.target.value) })}
                    />
                  </label>
                )}
                {fields.map((field) => (
                  <label
                    key={field.key}
                    className={field.type === 'textarea' ? 'sm:col-span-2' : ''}
                  >
                    {field.label}
                    {field.required ? ' *' : ''}
                    {field.key === 'employee_id' ? (
                      <select
                        required={field.required}
                        className={control}
                        value={String(input.data[field.key] ?? '')}
                        onChange={(e) => setData(field.key, e.target.value)}
                      >
                        <option value="">Select saved employee</option>
                        {employees
                          .filter((e) => e.status === 'active' || e.id === input.data[field.key])
                          .map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.title} · {employee.reference}
                            </option>
                          ))}
                      </select>
                    ) : field.type === 'select' ? (
                      <select
                        className={control}
                        required={field.required}
                        value={String(input.data[field.key] ?? '')}
                        onChange={(e) => setData(field.key, e.target.value)}
                      >
                        <option value="">Select…</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        className={control}
                        rows={3}
                        required={field.required}
                        value={String(input.data[field.key] ?? '')}
                        onChange={(e) => setData(field.key, e.target.value)}
                      />
                    ) : (
                      <input
                        className={control}
                        type={field.type ?? 'text'}
                        min={field.min}
                        step={field.type === 'number' ? '0.01' : undefined}
                        required={field.required}
                        value={String(input.data[field.key] ?? '')}
                        onChange={(e) =>
                          setData(
                            field.key,
                            field.type === 'number'
                              ? e.target.value === ''
                                ? ''
                                : Number(e.target.value)
                              : e.target.value,
                          )
                        }
                      />
                    )}
                  </label>
                ))}
              </fieldset>
              {payrollNet !== null && (
                <p className="rounded-lg bg-blue-50 p-3 text-blue-800">
                  Net pay: {money(payrollNet)}
                </p>
              )}
              {journal && (
                <fieldset disabled={busy || locked} className="space-y-3">
                  <legend className="font-semibold">Journal lines</legend>
                  {accounts.length === 0 && (
                    <p className="text-amber-700">
                      Create active accounts in the chart of accounts before entering a journal.
                    </p>
                  )}
                  {lines.map((line, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                      <select
                        className={control}
                        aria-label={`Account ${index + 1}`}
                        required
                        value={line.account_id}
                        onChange={(e) => {
                          const a = accounts.find((account) => account.id === e.target.value);
                          changeLine(index, {
                            account_id: a?.id ?? '',
                            account_code: a?.account_code ?? '',
                            account_name: a?.account_name ?? '',
                          });
                        }}
                      >
                        <option value="">Choose account</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.account_code} · {account.account_name}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label={`Debit ${index + 1}`}
                        className={control}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit}
                        onChange={(e) => changeLine(index, { debit: Number(e.target.value) })}
                        placeholder="Debit"
                      />
                      <input
                        aria-label={`Credit ${index + 1}`}
                        className={control}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit}
                        onChange={(e) => changeLine(index, { credit: Number(e.target.value) })}
                        placeholder="Credit"
                      />
                      <button
                        className={button}
                        type="button"
                        disabled={lines.length <= 2}
                        onClick={() =>
                          setData(
                            'lines',
                            lines.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={button}
                    onClick={() => setData('lines', [...lines, newLine()])}
                  >
                    Add line
                  </button>
                  <p className="text-sm">
                    Debit {money(lines.reduce((sum, l) => sum + l.debit, 0))} · Credit{' '}
                    {money(lines.reduce((sum, l) => sum + l.credit, 0))}
                  </p>
                </fieldset>
              )}
              {selected && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold">History</h3>
                  {auditError && <p className="text-sm text-red-700">{auditError}</p>}
                  {events.map((event) => (
                    <p className="mt-1 text-sm text-slate-500" key={event.id}>
                      {new Date(event.created_at).toLocaleString()} · {event.action} ·{' '}
                      {event.old_status ? `${label(event.old_status)} → ` : ''}
                      {label(event.new_status)} · {event.actor_id.slice(0, 8)}
                    </p>
                  ))}
                  <p className="mt-2 text-xs text-slate-500">
                    Version {selected.version} · Updated{' '}
                    {new Date(selected.updated_at).toLocaleString()}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
                {!locked && (
                  <button
                    className={`${button} bg-blue-600 text-white`}
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? 'Saving…' : 'Save record'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {paymentRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="business-payment-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-slate-900"
          >
            <h2 id="business-payment-title" className="text-xl font-bold">
              Record payment evidence
            </h2>
            <p className="my-3">
              {paymentRecord.title} · {money(paymentRecord.amount)}
            </p>
            <form onSubmit={settle} className="space-y-4">
              {paymentError && (
                <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
                  {paymentError}
                </p>
              )}
              <label className="block">
                Actual payment / bank reference
                <input
                  className={control}
                  required
                  maxLength={250}
                  disabled={busy}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </label>
              <p className="text-sm text-slate-500">
                This records a payment already made. The approved amount is retained.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  className={button}
                  type="button"
                  disabled={busy}
                  onClick={() => setPaymentRecord(undefined)}
                >
                  Cancel
                </button>
                <button
                  className={`${button} bg-blue-600 text-white`}
                  disabled={busy}
                  type="submit"
                >
                  {busy ? 'Saving…' : 'Record paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
