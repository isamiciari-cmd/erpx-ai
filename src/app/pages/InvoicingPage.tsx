import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mayWriteInvoiceModule } from '../../lib/invoiceAccess';
import {
  ArrowUpRight,
  Banknote,
  Check,
  Download,
  FilePlus2,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isDemoMode } from '../../lib/supabase';
import { listInvoices, getInvoice, type Invoice } from '../../services/invoicesService';
import { listProducts, type Product } from '../../services/productsService';
import { createCustomer, listCustomers, type Customer } from '../../services/customersService';
import { saveInvoiceDraft } from '../../services/invoiceDraftService';
import {
  issueBusinessInvoice,
  recordBusinessReceipt,
  listBusinessReceipts,
} from '../../services/businessReceivablesService';
import { invoiceMetrics } from '../../domain/dashboard/invoiceMetrics';
import { downloadCsv, printReport } from '../utils/reporting';
import {
  Button,
  ConfirmDialog,
  DataTable,
  DetailDrawer,
  EmptyState,
  ErrorState,
  FilterBar,
  FormField,
  LoadingSkeleton,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
  useWorkspaceFormat,
} from '../components/erp/WorkspaceUI';

type DraftLine = { product_id: string; quantity: number; discount_percentage: number };
type Detail = Invoice & {
  lines?: {
    id?: string;
    description?: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    vat_amount: number;
    vat_rate?: number;
    discount_amount?: number;
  }[];
};
type Receipt = Awaited<ReturnType<typeof listBusinessReceipts>>[number];
const newLine = (): DraftLine => ({ product_id: '', quantity: 1, discount_percentage: 0 });
const closed = ['draft', 'cancelled', 'void', 'refunded'];

export default function InvoicingPage() {
  const { t } = useTranslation('operations');
  const { user, roles, permissions } = useAuth();
  const companyId = user?.company_id;
  const format = useWorkspaceFormat();
  const [params] = useSearchParams();
  const canWrite = mayWriteInvoiceModule(roles, permissions, 'finance_invoices');
  const canRecordReceipt = mayWriteInvoiceModule(roles, permissions, 'finance_receivables');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ key: string; number: string }>();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.get('status') || 'all');
  const [customerFilter, setCustomerFilter] = useState('');
  const [currency, setCurrency] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [draftOpen, setDraftOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [customerError, setCustomerError] = useState(false);
  const canAddCustomer = ['sales', 'sales.create'].some((key) =>
    permissions.some((permission) => permission.permission_key === key));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftLine[]>([newLine()]);
  const draftRequest = useRef(crypto.randomUUID());
  const [draftError, setDraftError] = useState('');
  const [selected, setSelected] = useState<Detail>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [issueTarget, setIssueTarget] = useState<Invoice>();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [receiptError, setReceiptError] = useState('');
  const receiptRequest = useRef('');
  const generation = useRef(0),
    detailGeneration = useRef(0),
    lock = useRef(false),
    openedQuery = useRef('');
  useRecoverableInputs(draftOpen, {
    title: t('invoices.title'), values: { customer, dueDate, notes, items },
    baseline: { customer: '', notes: '', items: [newLine()] },
  });
  useRecoverableInputs(receiptOpen, {
    title: t('invoices.newReceipt'), values: { amount, method, reference },
    baseline: { amount: String(selected?.amount_due ?? ''), method: 'bank_transfer', reference: '' },
  });
  const load = useCallback(async () => {
    const request = ++generation.current;
    if (!companyId) {
      setError('errors.company');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isDemoMode) {
        setError('errors.demo');
        return;
      }
      const [documents, catalog, clients] = await Promise.all([
        listInvoices(companyId),
        listProducts(companyId),
        listCustomers(companyId),
      ]);
      if (request === generation.current) {
        setInvoices(documents);
        setProducts(catalog.filter((product) => product.is_active));
        setCustomers(clients);
      }
    } catch {
      if (request === generation.current) setError('errors.load');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [companyId]);
  useEffect(() => {
    setInvoices([]);
    setProducts([]);
    setCustomers([]);
    setNewCustomer('');
    setCustomerError(false);
    setSelected(undefined);
    setDraftOpen(false);
    setIssueTarget(undefined);
    setReceiptOpen(false);
    setNotice(undefined);
    setDraftError('');
    openedQuery.current = '';
    void load();
    return () => {
      generation.current++;
      detailGeneration.current++;
    };
  }, [load]);
  const customerName = (row: Invoice) => {
    const joined = (row as Invoice & { customer?: Customer | null }).customer;
    return (
      customers.find((client) => client.id === row.customer_id)?.company_name ||
      (joined && joined.company_id === companyId ? joined.company_name : '') ||
      t('common.noCustomer', { reference: row.customer_id.slice(0, 8) })
    );
  };
  const labelStatus = (value: string) =>
    t(`status.${value?.toLowerCase()}`, {
      defaultValue: value?.replaceAll('_', ' ') || t('common.noValue'),
    });
  const todayParts = new Intl.DateTimeFormat('en', {
    timeZone: format.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const today = ['year', 'month', 'day']
    .map((type) => todayParts.find((part) => part.type === type)?.value)
    .join('-');
  const isOverdue = (row: Invoice) =>
    !closed.includes(row.status.toLowerCase()) &&
    Number(row.amount_due) > 0 &&
    row.due_date?.slice(0, 10) < today;
  const invalidRange = !!from && !!to && from > to;
  const filtered = invoices.filter(
    (row) =>
      !invalidRange &&
      `${row.invoice_number} ${customerName(row)} ${row.reference_number || ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (!customerFilter || row.customer_id === customerFilter) &&
      (!currency || row.currency_code === currency) &&
      (!from || row.issue_date.slice(0, 10) >= from) &&
      (!to || row.issue_date.slice(0, 10) <= to) &&
      (status === 'all' ||
        (status === 'outstanding'
          ? !closed.includes(row.status.toLowerCase()) && Number(row.amount_due) > 0
          : status === 'overdue'
            ? isOverdue(row)
            : row.status.toLowerCase() === status)),
  );
  const currencies = [...new Set(invoices.map((row) => row.currency_code))].sort();
  const metricCurrencies = [...new Set(filtered.map((row) => row.currency_code))].sort();
  const metrics = metricCurrencies.map((code) => ({
    code,
    ...invoiceMetrics(filtered.filter((row) => row.currency_code === code)),
  }));
  const metricValue = (key: 'total' | 'collected') =>
    metrics.length ? (
      <div className="space-y-1">
        {metrics.map((row) => (
          <div key={row.code}>
            <bdi className="ws-number" dir="ltr">{format.money(row[key], row.code)}</bdi>
          </div>
        ))}
      </div>
    ) : (
      format.money(0, currency || user?.company?.currency || 'SAR')
    );
  const reportRows = filtered.map((row) => ({
    [t('invoices.number')]: row.invoice_number,
    [t('common.customer')]: customerName(row),
    [t('common.issueDate')]: row.issue_date,
    [t('common.dueDate')]: row.due_date,
    [t('common.currency')]: row.currency_code,
    [t('common.net')]: row.subtotal,
    [t('common.vat')]: row.vat_amount,
    [t('common.total')]: row.total_amount,
    [t('common.paid')]: row.amount_paid,
    [t('common.due')]: row.amount_due,
    [t('common.status')]: labelStatus(row.status),
  }));
  const view = useCallback(
    async (invoice: Invoice) => {
      const request = ++detailGeneration.current;
      setSelected(invoice);
      setDetailLoading(true);
      setDetailError('');
      setReceipts([]);
      setReceiptOpen(false);
      setReceiptError('');
      try {
        if (!companyId || invoice.company_id !== companyId) throw new Error();
        const [detail, payments] = await Promise.all([
          getInvoice(invoice.id),
          listBusinessReceipts(companyId, invoice.id),
        ]);
        if (!detail || detail.company_id !== companyId) throw new Error();
        if (request === detailGeneration.current) {
          setSelected(detail as Detail);
          setReceipts(payments);
        }
      } catch {
        if (request === detailGeneration.current) setDetailError('errors.details');
      } finally {
        if (request === detailGeneration.current) setDetailLoading(false);
      }
    },
    [companyId],
  );
  function startDraft() {
    if (!canWrite) return;
    draftRequest.current = crypto.randomUUID();
    setCustomer('');
    setDueDate(today);
    setNotes('');
    setItems([newLine()]);
    setDraftError('');
    setDraftOpen(true);
  }
  useEffect(() => {
    if (loading || error || !companyId) return;
    const invoiceId = params.get('invoice');
    if (invoiceId && openedQuery.current !== invoiceId) {
      openedQuery.current = invoiceId;
      const invoice = invoices.find((row) => row.id === invoiceId);
      if (invoice) void view(invoice);
    } else if (params.get('create') === '1' && openedQuery.current !== 'create' && canWrite) {
      openedQuery.current = 'create';
      startDraft();
    }
  }, [loading, error, companyId, invoices, params, view, canWrite]);
  function changeLine(index: number, patch: Partial<DraftLine>) {
    draftRequest.current = crypto.randomUUID();
    setItems((previous) => previous.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!companyId || !canWrite || lock.current) return;
    if (
      !customer ||
      !items.length ||
      new Set(items.map((item) => item.product_id)).size !== items.length ||
      items.some(
        (item) =>
          !item.product_id ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.discount_percentage) ||
          item.discount_percentage < 0 ||
          item.discount_percentage > 100,
      )
    ) {
      setDraftError('errors.draftItems');
      return;
    }
    lock.current = true;
    setBusy(true);
    setDraftError('');
    const request = generation.current;
    try {
      const result = await saveInvoiceDraft({
        companyId,
        customerId: customer,
        items,
        dueDate,
        notes,
        requestId: draftRequest.current,
      });
      if (request !== generation.current) return;
      draftRequest.current = crypto.randomUUID();
      setDraftOpen(false);
      setNotice({ key: 'invoices.draftSaved', number: result.invoice_number });
      await load();
    } catch {
      if (request === generation.current) setDraftError('errors.draft');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function issue() {
    if (!issueTarget || !canWrite || lock.current) return;
    lock.current = true;
    setBusy(true);
    setDetailError('');
    const invoice = issueTarget;
    const scope = generation.current;
    try {
      const result = await issueBusinessInvoice(invoice.id);
      if (scope !== generation.current) return;
      setIssueTarget(undefined);
      setNotice({ key: 'invoices.issued', number: invoice.invoice_number });
      if (selected?.id === invoice.id) await view(result);
      await load();
    } catch {
      if (scope === generation.current) {
        setIssueTarget(undefined);
        setDetailError('errors.issue');
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function startReceipt() {
    if (!selected) return;
    setAmount(String(selected.amount_due));
    setMethod('bank_transfer');
    setReference('');
    setReceiptError('');
    receiptRequest.current = crypto.randomUUID();
    setReceiptOpen(true);
  }
  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!selected || !canRecordReceipt || lock.current) return;
    if (
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      Number(amount) > Number(selected.amount_due)
    ) {
      setReceiptError('errors.receiptAmount');
      return;
    }
    if (method !== 'cash' && !reference.trim()) {
      setReceiptError('errors.receiptReference');
      return;
    }
    lock.current = true;
    setBusy(true);
    setReceiptError('');
    const scope = generation.current;
    try {
      const updated = await recordBusinessReceipt(
        selected.id,
        Number(amount),
        method,
        reference,
        receiptRequest.current,
      );
      if (scope !== generation.current) return;
      setNotice({ key: 'invoices.receiptSaved', number: selected.invoice_number });
      setReceiptOpen(false);
      await view(updated);
      await load();
    } catch {
      if (scope === generation.current) setReceiptError('errors.receipt');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function addInvoiceCustomer() {
    const name = newCustomer.trim();
    if (!companyId || !canAddCustomer || !name || lock.current) return;
    const scope = generation.current;
    lock.current = true;
    setBusy(true);
    setCustomerError(false);
    try {
      const existing = customers.find((client) => client.company_name === name && client.status === 'active');
      const client = existing ?? await createCustomer({
        company_id: companyId,
        company_name: name,
        customer_code: 'CUS-' + crypto.randomUUID(),
        status: 'active',
      });
      if (scope !== generation.current) return;
      if (!existing) setCustomers((previous) => [...previous, client]);
      setCustomer(client.id);
      draftRequest.current = crypto.randomUUID();
      setNewCustomer('');
    } catch {
      if (scope === generation.current) setCustomerError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function print(invoice: Invoice) {
    const scope = generation.current;
    try {
      const detail =
        selected?.id === invoice.id && !detailLoading && !detailError
          ? selected
          : ((await getInvoice(invoice.id)) as Detail | null);
      if (!detail || detail.company_id !== companyId) throw new Error();
      if (scope !== generation.current) return;
      await printReport(
        `${t('invoices.standardInvoice')} ${invoice.invoice_number}`,
        (detail.lines || []).map((line) => ({
          [t('common.description')]: line.description,
          [t('common.quantity')]: line.quantity,
          [t('invoices.unitPrice')]: line.unit_price,
          [t('common.vat')]: line.vat_amount,
          [t('invoices.lineNet')]: line.line_total,
        })),
        {
          [t('common.customer')]: customerName(invoice),
          [t('common.status')]: labelStatus(invoice.status),
          [t('common.total')]: format.money(invoice.total_amount, invoice.currency_code),
          [t('common.vat')]: format.money(invoice.vat_amount, invoice.currency_code),
          [t('common.paid')]: format.money(invoice.amount_paid, invoice.currency_code),
        },
        companyId,
        format.isRtl,
      );
    } catch {
      if (scope === generation.current) setError('errors.print');
    }
  }
  const tabs = ['all', 'draft', 'outstanding', 'paid', 'overdue'];
  const receiptAllowed =
    !!selected &&
    ['issued', 'partial', 'unpaid', 'overdue'].includes(selected.status.toLowerCase()) &&
    selected.invoice_type_code !== '381' &&
    Number(selected.amount_due) > 0;
  return (
    <div className="ws-page ws-invoices">
      <PageHeader
        title={t('invoices.title')}
        description={t('invoices.description')}
        eyebrow={t('common.finance')}
        actions={
          <>
            <Button
              onClick={() => void load()}
              disabled={busy || loading}
              icon={<RefreshCw size={16} />}
            >
              {t('common.refresh')}
            </Button>
            <Button
              icon={<Download size={16} />}
              disabled={loading || !filtered.length}
              onClick={() => downloadCsv('invoices', reportRows)}
            >
              {t('common.export')}
            </Button>
            {canWrite && (
              <Button
                variant="primary"
                icon={<Plus size={17} />}
                onClick={startDraft}
                disabled={busy || loading || !!error}
              >
                {t('invoices.newDraft')}
              </Button>
            )}
          </>
        }
      />
      {error && <ErrorState message={t(error)} onRetry={() => void load()} />}
      {notice && (
        <p role="status" className="ws-inline-message ws-success">
          <Check size={17} aria-hidden="true" />
          {t(notice.key, { number: notice.number })}
        </p>
      )}
      {!canWrite && !canRecordReceipt && (
        <p className="ws-inline-message">{t('common.permissionHint')}</p>
      )}
      {loading && !invoices.length ? (
        <LoadingSkeleton cards={4} rows={5} />
      ) : (
        (!error || !!invoices.length) && (
          <div className="ws-stats">
            <StatCard
              label={t('invoices.total')}
              value={metricValue('total')}
              hint={t('invoices.summaryHint')}
              icon={<FileText size={20} />}
            />
            <StatCard
              label={t('invoices.collected')}
              value={metricValue('collected')}
              hint={t('common.currencyHint')}
              tone="success"
              icon={<Wallet size={20} />}
            />
            <StatCard
              label={t('overview.overdue')}
              value={format.number(filtered.filter(isOverdue).length)}
              hint={t('common.dueNow')}
              tone="warning"
              icon={<Banknote size={20} />}
            />
            <StatCard
              label={t('invoices.drafts')}
              value={format.number(filtered.filter((row) => row.status === 'draft').length)}
              hint={t('invoices.draftHint')}
              icon={<FilePlus2 size={20} />}
            />
          </div>
        )
      )}
      <Panel>
        <div
          className="flex flex-wrap gap-1 border-b border-[var(--app-border)] px-4 pt-3"
          role="group"
          aria-label={t('invoices.filterStatus')}
        >
          {tabs.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              className={`min-h-11 border-b-2 px-4 text-sm font-medium ${status === value ? 'border-[var(--app-primary)] text-[var(--app-text)]' : 'border-transparent text-[var(--app-muted)]'}`}
              onClick={() => setStatus(value)}
            >
              {value === 'all'
                ? t('invoices.tabAll')
                : value === 'outstanding'
                  ? t('invoices.tabOutstanding')
                  : labelStatus(value)}
            </button>
          ))}
        </div>
        <div className="p-4">
          <FilterBar>
            <FormField label={t('common.search')} htmlFor="invoice-search">
              <input
                id="invoice-search"
                className="ws-input"
                type="search"
                placeholder={t('invoices.search')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>
            <FormField label={t('common.customer')} htmlFor="invoice-customer-filter">
              <select
                id="invoice-customer-filter"
                className="ws-input"
                value={customerFilter}
                onChange={(event) => setCustomerFilter(event.target.value)}
              >
                <option value="">{t('invoices.allCustomers')}</option>
                {customers.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company_name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t('invoices.filterStatus')} htmlFor="invoice-status">
              <select
                id="invoice-status"
                className="ws-input"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">{t('invoices.tabAll')}</option>
                <option value="outstanding">{t('invoices.tabOutstanding')}</option>
                {[
                  ...new Set([
                    'draft',
                    'issued',
                    'partial',
                    'paid',
                    'overdue',
                    ...invoices.map((row) => row.status.toLowerCase()),
                  ]),
                ].map((value) => (
                  <option key={value} value={value}>
                    {labelStatus(value)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t('common.currency')} htmlFor="invoice-currency">
              <select
                id="invoice-currency"
                className="ws-input"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                <option value="">{t('common.allCurrencies')}</option>
                {currencies.map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t('common.from')} htmlFor="invoice-from">
              <input
                id="invoice-from"
                className="ws-input"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </FormField>
            <FormField label={t('common.to')} htmlFor="invoice-to">
              <input
                id="invoice-to"
                className="ws-input"
                type="date"
                min={from || undefined}
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </FormField>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setStatus('all');
                setCurrency('');
                setCustomerFilter('');
                setFrom('');
                setTo('');
              }}
            >
              {t('common.clearFilters')}
            </Button>
          </FilterBar>
        </div>
        {invalidRange && (
          <p role="alert" className="ws-inline-message ws-warning mx-4 mb-4">
            {t('errors.dateRange')}
          </p>
        )}
        {loading && !invoices.length ? (
          <LoadingSkeleton rows={5} />
        ) : !invoices.length && !error ? (
          <EmptyState
            title={t('invoices.invoiceEmpty')}
            description={t('invoices.invoiceEmptyDescription')}
            action={
              canWrite ? (
                <Button onClick={startDraft} variant="primary" icon={<Plus size={16} />}>
                  {t('invoices.newDraft')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            rows={filtered}
            getRowKey={(row) => row.id}
            caption={t('invoices.rows')}
            emptyTitle={t('invoices.noMatches')}
            emptyDescription={t('common.filterHint')}
            columns={[
              {
                key: 'number',
                label: t('invoices.number'),
                sortValue: (row) => row.invoice_number,
                render: (row) => (
                  <button
                    className="font-semibold hover:underline underline-offset-4"
                    onClick={() => void view(row)}
                    dir="ltr"
                  >
                    {row.invoice_number}
                  </button>
                ),
              },
              {
                key: 'customer',
                label: t('common.customer'),
                sortValue: customerName,
                render: customerName,
              },
              {
                key: 'issue',
                label: t('common.issueDate'),
                sortValue: (row) => row.issue_date,
                render: (row) => format.date(row.issue_date),
              },
              {
                key: 'dueDate',
                label: t('common.dueDate'),
                sortValue: (row) => row.due_date || '',
                render: (row) => (
                  <span
                    className={isOverdue(row) ? 'font-medium text-red-700 dark:text-red-300' : ''}
                  >
                    {format.date(row.due_date)}
                  </span>
                ),
              },
              {
                key: 'total',
                label: t('common.total'),
                className: 'ws-numeric',
                render: (row) => (
                  <bdi className="ws-number whitespace-nowrap" dir="ltr">
                    {format.money(row.total_amount, row.currency_code)}
                  </bdi>
                ),
              },
              {
                key: 'paid',
                label: t('common.paid'),
                className: 'ws-numeric',
                render: (row) => (
                  <bdi className="ws-number whitespace-nowrap" dir="ltr">
                    {format.money(row.amount_paid, row.currency_code)}
                  </bdi>
                ),
              },
              {
                key: 'due',
                label: t('common.due'),
                className: 'ws-numeric',
                render: (row) => (
                  <bdi className="ws-number whitespace-nowrap font-medium" dir="ltr">
                    {format.money(row.amount_due, row.currency_code)}
                  </bdi>
                ),
              },
              {
                key: 'status',
                label: t('common.status'),
                render: (row) => (
                  <StatusBadge status={row.status}>{labelStatus(row.status)}</StatusBadge>
                ),
              },
              {
                key: 'actions',
                label: t('common.actions'),
                render: (row) => (
                  <Button variant="ghost" onClick={() => void view(row)}>
                    {t('common.details')}
                  </Button>
                ),
              },
            ]}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border)] px-5 py-4">
          <p className="ws-muted text-xs">{t('common.filteredScope')}</p>
          <Link className="ws-btn ws-btn-ghost" to="/pos">
            {t('invoices.paidSale')}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </Panel>
      <DetailDrawer
        open={draftOpen}
        onClose={() => {
          if (!busy) setDraftOpen(false);
        }}
        title={t('invoices.newDraft')}
        description={t('invoices.newDraftDescription')}
        wide
        footer={
          <>
            <Button disabled={busy} onClick={() => setDraftOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="invoice-draft-form"
              variant="primary"
              loading={busy}
              disabled={!products.length || !customers.length}
              icon={<Check size={16} />}
            >
              {t('invoices.saveDraft')}
            </Button>
          </>
        }
      >
        <form id="invoice-draft-form" onSubmit={save} className="space-y-6">
          {draftError && (
            <p role="alert" className="ws-inline-message ws-error">
              {t(draftError)}
            </p>
          )}
          {!products.length && (
            <p className="ws-inline-message ws-warning">
              {t('invoices.productUnavailable')}{' '}
              <Link className="underline" to="/inventory">
                {t('overview.products')}
              </Link>
            </p>
          )}
          {!customers.length && (
            <p className="ws-inline-message ws-warning">
              {t('invoices.customerUnavailable')}{' '}
              <Link className="underline" to="/crm">
                {t('invoices.customerWorkspace')}
              </Link>
            </p>
          )}
          {canAddCustomer && (
            <div className="flex flex-wrap items-end gap-3">
              <FormField label={format.isRtl ? 'اسم العميل الجديد' : 'New customer name'} htmlFor="invoice-new-customer">
                <input id="invoice-new-customer" className="ws-input" maxLength={255}
                  disabled={busy} value={newCustomer} onChange={(event) => setNewCustomer(event.target.value)} />
              </FormField>
              <Button type="button" disabled={busy || !newCustomer.trim()} onClick={() => void addInvoiceCustomer()}>
                {format.isRtl ? 'إضافة عميل' : 'Add customer'}
              </Button>
              {customerError && <p role="alert">{format.isRtl ? 'تعذّر إضافة العميل.' : 'Could not add the customer.'}</p>}
            </div>
          )}
          <fieldset disabled={busy} className="space-y-6">
            <div>
              <h3 className="mb-4 font-semibold">{t('invoices.draftSection')}</h3>
              <div className="ws-form-grid">
                <FormField label={t('common.customer')} htmlFor="draft-customer">
                  <select
                    id="draft-customer"
                    required
                    className="ws-input"
                    value={customer}
                    onChange={(event) => {
                      draftRequest.current = crypto.randomUUID();
                      setCustomer(event.target.value);
                    }}
                  >
                    <option value="">{t('invoices.chooseCustomer')}</option>
                    {customers.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.company_name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t('common.dueDate')} htmlFor="draft-due">
                  <input
                    id="draft-due"
                    required
                    type="date"
                    className="ws-input"
                    value={dueDate}
                    onChange={(event) => {
                      draftRequest.current = crypto.randomUUID();
                      setDueDate(event.target.value);
                    }}
                  />
                </FormField>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{t('invoices.itemSection')}</h3>
                <p className="ws-muted mt-1 text-xs">{t('invoices.itemHelp')}</p>
              </div>
              {items.map((item, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-xl border border-[var(--app-border)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold">
                      {t('invoices.lineNumber', { number: format.number(index + 1) })}
                    </h4>
                    <Button
                      variant="ghost"
                      disabled={items.length === 1}
                      aria-label={`${t('common.remove')} ${t('invoices.lineNumber', { number: index + 1 })}`}
                      icon={<Trash2 size={15} />}
                      onClick={() => {
                        draftRequest.current = crypto.randomUUID();
                        setItems((previous) => previous.filter((_, i) => index !== i));
                      }}
                    >
                      {t('common.remove')}
                    </Button>
                  </div>
                  <FormField label={t('common.product')} htmlFor={`draft-product-${index}`}>
                    <select
                      id={`draft-product-${index}`}
                      aria-label={t('invoices.lineNumber', { number: index + 1 })}
                      required
                      className="ws-input"
                      value={item.product_id}
                      onChange={(event) => changeLine(index, { product_id: event.target.value })}
                    >
                      <option value="">{t('invoices.chooseProduct')}</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.sku} · {product.product_name} ·{' '}
                          {format.money(product.unit_price, user?.company?.currency)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <div className="ws-form-grid">
                    <FormField label={t('common.quantity')} htmlFor={`draft-quantity-${index}`}>
                      <input
                        id={`draft-quantity-${index}`}
                        required
                        type="number"
                        min="0.001"
                        step="0.001"
                        className="ws-input"
                        value={item.quantity}
                        onChange={(event) =>
                          changeLine(index, { quantity: Number(event.target.value) })
                        }
                      />
                    </FormField>
                    <FormField label={t('common.discount')} htmlFor={`draft-discount-${index}`}>
                      <input
                        id={`draft-discount-${index}`}
                        required
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="ws-input"
                        value={item.discount_percentage}
                        onChange={(event) =>
                          changeLine(index, { discount_percentage: Number(event.target.value) })
                        }
                      />
                    </FormField>
                  </div>
                </div>
              ))}
              <Button
                icon={<Plus size={16} />}
                onClick={() => {
                  draftRequest.current = crypto.randomUUID();
                  setItems((previous) => [...previous, newLine()]);
                }}
              >
                {t('invoices.addLine')}
              </Button>
            </div>
            <FormField label={t('common.notes')} htmlFor="draft-notes">
              <textarea
                id="draft-notes"
                className="ws-input"
                rows={3}
                maxLength={4000}
                placeholder={t('invoices.notesPlaceholder')}
                value={notes}
                onChange={(event) => {
                  draftRequest.current = crypto.randomUUID();
                  setNotes(event.target.value);
                }}
              />
            </FormField>
          </fieldset>
          <p className="ws-inline-message text-sm">
            {t('invoices.draftNotice')} {t('invoices.savedOnly')}
          </p>
        </form>
      </DetailDrawer>
      <DetailDrawer
        open={!!selected}
        onClose={() => {
          if (!busy) {
            detailGeneration.current++;
            setSelected(undefined);
            setReceiptOpen(false);
          }
        }}
        title={selected ? <bdi dir="ltr">{selected.invoice_number}</bdi> : t('invoices.detailsTitle')}
        description={t('invoices.detailHint')}
        wide
        footer={
          selected && (
            <>
              <Button
                disabled={detailLoading || !!detailError}
                onClick={() => void print(selected)}
                icon={<Printer size={16} />}
              >
                {t('common.printInvoice')}
              </Button>
              {canWrite && selected.status === 'draft' && (
                <Button
                  variant="primary"
                  disabled={busy || detailLoading || !!detailError}
                  onClick={() => setIssueTarget(selected)}
                >
                  {t('invoices.issue')}
                </Button>
              )}
              {canRecordReceipt && receiptAllowed && (
                <Button
                  variant="primary"
                  disabled={busy || detailLoading || !!detailError}
                  icon={<Plus size={16} />}
                  onClick={startReceipt}
                >
                  {t('invoices.showReceipt')}
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge status={selected.status}>{labelStatus(selected.status)}</StatusBadge>
              <span className="ws-muted text-sm">
                {selected.invoice_type_code === '381'
                  ? t('invoices.creditNote')
                  : t('invoices.standardInvoice')}
              </span>
            </div>
            <div className="ws-form-grid">
              <div>
                <p className="ws-muted text-xs">{t('common.customer')}</p>
                <p className="mt-1 font-semibold">{customerName(selected)}</p>
              </div>
              <div>
                <p className="ws-muted text-xs">{t('common.currency')}</p>
                <p className="mt-1 font-semibold" dir="ltr">
                  {selected.currency_code}
                </p>
              </div>
              <div>
                <p className="ws-muted text-xs">{t('common.issueDate')}</p>
                <p className="mt-1">{format.date(selected.issue_date)}</p>
              </div>
              <div>
                <p className="ws-muted text-xs">{t('common.dueDate')}</p>
                <p className="mt-1">{format.date(selected.due_date)}</p>
              </div>
            </div>
            {detailError && (
              <ErrorState message={t(detailError)} onRetry={() => void view(selected)} />
            )}
            {detailLoading ? (
              <LoadingSkeleton rows={4} />
            ) : (
              !detailError && (
                <>
                  <div className="ws-invoice-balance">
                    <h3 className="mb-4 font-semibold">{t('invoices.summary')}</h3>
                    <dl className="space-y-3">
                      {[
                        [t('common.net'), selected.taxable_amount ?? selected.subtotal],
                        [t('common.vat'), selected.vat_amount],
                        [t('common.total'), selected.total_amount],
                        [t('common.paid'), selected.amount_paid],
                        [t('common.due'), selected.amount_due],
                      ].map(([label, value], index) => (
                        <div className="ws-invoice-balance-line" data-highlight={index >= 2} key={String(label)}>
                          <dt className="text-sm ws-muted">{label}</dt>
                          <dd className="ws-number">
                            {format.money(Number(value), selected.currency_code)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <Panel title={t('invoices.lines')} description={t('invoices.netExcludesTax')}>
                    <DataTable
                      rows={selected.lines || []}
                      getRowKey={(row) =>
                        row.id || `${row.description}-${row.quantity}-${row.unit_price}`
                      }
                      emptyTitle={t('invoices.noLines')}
                      columns={[
                        {
                          key: 'description',
                          label: t('common.description'),
                          render: (row) => row.description || t('common.noValue'),
                        },
                        {
                          key: 'quantity',
                          label: t('common.quantity'),
                          render: (row) => format.number(row.quantity),
                        },
                        {
                          key: 'price',
                          label: t('invoices.unitPrice'),
                          render: (row) => format.money(row.unit_price, selected.currency_code),
                        },
                        {
                          key: 'vat',
                          label: t('common.vat'),
                          render: (row) => format.money(row.vat_amount, selected.currency_code),
                        },
                        {
                          key: 'net',
                          label: t('invoices.lineNet'),
                          render: (row) => format.money(row.line_total, selected.currency_code),
                        },
                      ]}
                    />
                  </Panel>
                  <Panel title={t('invoices.receipts')}>
                    <DataTable
                      rows={receipts}
                      getRowKey={(row) => String(row.id)}
                      emptyTitle={t('invoices.noReceipts')}
                      columns={[
                        {
                          key: 'number',
                          label: t('invoices.receiptNumber'),
                          render: (row) => <span dir="ltr">{String(row.payment_number)}</span>,
                        },
                        {
                          key: 'date',
                          label: t('common.date'),
                          render: (row) => format.date(row.payment_date),
                        },
                        {
                          key: 'method',
                          label: t('common.method'),
                          render: (row) =>
                            t(`methods.${row.payment_method}`, {
                              defaultValue: String(row.payment_method).replaceAll('_', ' '),
                            }),
                        },
                        {
                          key: 'amount',
                          label: t('common.amount'),
                          render: (row) => format.money(row.amount, selected.currency_code),
                        },
                        {
                          key: 'reference',
                          label: t('common.reference'),
                          render: (row) => row.reference_number || t('common.noValue'),
                        },
                        {
                          key: 'status',
                          label: t('common.status'),
                          render: (row) => (
                            <StatusBadge status={row.status}>{labelStatus(row.status)}</StatusBadge>
                          ),
                        },
                      ]}
                    />
                  </Panel>
                </>
              )
            )}
            {receiptOpen && receiptAllowed && (
              <form
                onSubmit={pay}
                className="space-y-4 rounded-xl border border-[var(--app-border)] p-5"
              >
                <div>
                  <h3 className="font-semibold">{t('invoices.newReceipt')}</h3>
                  <p className="ws-muted mt-1 text-sm">{t('invoices.receiptHint')}</p>
                </div>
                {receiptError && (
                  <p role="alert" className="ws-inline-message ws-error">
                    {t(receiptError)}
                  </p>
                )}
                <fieldset className="ws-form-grid" disabled={busy}>
                  <FormField label={t('invoices.amount')} htmlFor="receipt-amount">
                    <input
                      id="receipt-amount"
                      className="ws-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={Number(selected.amount_due)}
                      required
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('common.method')} htmlFor="receipt-method">
                    <select
                      id="receipt-method"
                      className="ws-input"
                      value={method}
                      onChange={(event) => setMethod(event.target.value)}
                    >
                      {['bank_transfer', 'cash', 'card', 'mada', 'apple_pay'].map((value) => (
                        <option key={value} value={value}>
                          {t(`methods.${value}`)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    label={t('invoices.receiptReference')}
                    htmlFor="receipt-reference"
                    className="sm:col-span-2"
                  >
                    <input
                      id="receipt-reference"
                      className="ws-input"
                      required={method !== 'cash'}
                      maxLength={100}
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                    />
                  </FormField>
                </fieldset>
                <div className="flex justify-end gap-2">
                  <Button disabled={busy} onClick={() => setReceiptOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" loading={busy}>
                    {t('invoices.saveReceipt')}
                  </Button>
                </div>
              </form>
            )}
            {selected.notes && (
              <div>
                <h3 className="mb-2 font-semibold">{t('common.notes')}</h3>
                <p className="whitespace-pre-wrap text-sm ws-muted">{selected.notes}</p>
              </div>
            )}
            <div className="space-y-3">
              <h3 className="font-semibold">{t('invoices.integration')}</h3>
              <dl className="ws-form-grid">
                {selected.reporting_status && (
                  <div>
                    <dt className="ws-muted text-xs">{t('invoices.reporting')}</dt>
                    <dd className="mt-2">
                      <StatusBadge status={selected.reporting_status}>
                        {labelStatus(selected.reporting_status)}
                      </StatusBadge>
                    </dd>
                  </div>
                )}
                {selected.clearance_status && (
                  <div>
                    <dt className="ws-muted text-xs">{t('invoices.clearance')}</dt>
                    <dd className="mt-2">
                      <StatusBadge status={selected.clearance_status}>
                        {labelStatus(selected.clearance_status)}
                      </StatusBadge>
                    </dd>
                  </div>
                )}
              </dl>
              <div className="flex flex-wrap gap-2">
                <Link className="ws-btn ws-btn-secondary" to="/finance/zatca">
                  {t('invoices.taxLink')}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
                <Link className="ws-btn ws-btn-ghost" to="/finance/general-ledger">
                  {t('invoices.ledgerLink')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
      <ConfirmDialog
        open={!!issueTarget}
        onOpenChange={(open) => {
          if (!open && !busy) setIssueTarget(undefined);
        }}
        title={t('invoices.issueTitle')}
        description={t('invoices.issueDescription')}
        onConfirm={issue}
        confirmLabel={t('invoices.issue')}
        busy={busy}
        variant="primary"
      />
    </div>
  );
}
import { useRecoverableInputs } from '../../hooks/useUnsavedChanges';
