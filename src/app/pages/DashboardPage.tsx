import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { mayWriteInvoiceModule } from '../../lib/invoiceAccess';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Package,
  Plus,
  Printer,
  RefreshCw,
  ReceiptText,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { isDemoMode } from '../../lib/supabase';
import { listInvoices, type Invoice } from '../../services/invoicesService';
import { invoiceMetrics } from '../../domain/dashboard/invoiceMetrics';
import { downloadCsv, printReport } from '../utils/reporting';
import {
  Button,
  DataTable,
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

export default function DashboardPage() {
  const { t } = useTranslation('operations');
  const { user, roles, permissions } = useAuth();
  const companyId = user?.company_id;
  const format = useWorkspaceFormat();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<Date>();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [currency, setCurrency] = useState('');
  const generation = useRef(0);
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
      const data = await listInvoices(companyId);
      if (request === generation.current) {
        setInvoices(data);
        setUpdated(new Date());
      }
    } catch {
      if (request === generation.current) setError('errors.load');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [companyId]);
  useEffect(() => {
    setInvoices([]);
    setUpdated(undefined);
    setCurrency('');
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const currencies = useMemo(
    () => [...new Set(invoices.map((row) => row.currency_code).filter(Boolean))].sort(),
    [invoices],
  );
  const selectedCurrency =
    currency ||
    (currencies.includes(user?.company?.currency || '')
      ? user!.company!.currency
      : currencies[0] || user?.company?.currency || 'SAR');
  const invalidRange = !!from && !!to && from > to;
  const filtered = useMemo(
    () =>
      invoices.filter(
        (row) =>
          !invalidRange &&
          row.currency_code === selectedCurrency &&
          (!from || row.issue_date.slice(0, 10) >= from) &&
          (!to || row.issue_date.slice(0, 10) <= to),
      ),
    [invoices, selectedCurrency, from, to, invalidRange],
  );
  const metrics = useMemo(() => invoiceMetrics(filtered), [filtered]);
  const excluded = ['draft', 'cancelled', 'void', 'refunded'];
  const todayParts = new Intl.DateTimeFormat('en', {
    timeZone: format.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const today = ['year', 'month', 'day']
    .map((type) => todayParts.find((part) => part.type === type)?.value)
    .join('-');
  const issued = filtered.filter((row) => !excluded.includes(row.status.toLowerCase()));
  const overdue = issued.filter(
    (row) => Number(row.amount_due) > 0 && row.due_date?.slice(0, 10) < today,
  );
  const drafts = filtered.filter((row) => row.status.toLowerCase() === 'draft');
  const labelStatus = (value: string) =>
    t(`status.${value.toLowerCase()}`, { defaultValue: value.replaceAll('_', ' ') });
  const exportRows = filtered.map((row) => ({
    [t('invoices.number')]: row.invoice_number,
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
  const newInvoice = mayWriteInvoiceModule(roles, permissions, 'finance_invoices') ? (
    <Link className="ws-btn ws-btn-primary" to="/finance/invoicing?create=1">
      <Plus size={16} aria-hidden="true" />
      {t('overview.newInvoice')}
    </Link>
  ) : null;
  return (
    <div className="ws-page ws-dashboard">
      <div className="ws-dashboard-hero">
        <PageHeader
          title={t('overview.title')}
          description={t('overview.description')}
          eyebrow={user?.company?.name || t('common.workspace')}
          actions={
            <>
              <Button onClick={() => void load()} disabled={loading} icon={<RefreshCw size={16} />}>
                {t('common.refresh')}
              </Button>
              {newInvoice}
            </>
          }
        />
      </div>
      {error && <ErrorState message={t(error)} onRetry={() => void load()} />}
      <FilterBar>
        <FormField label={t('common.from')} htmlFor="overview-from">
          <input
            id="overview-from"
            className="ws-input"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </FormField>
        <FormField label={t('common.to')} htmlFor="overview-to">
          <input
            id="overview-to"
            className="ws-input"
            type="date"
            min={from || undefined}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </FormField>
        <FormField label={t('common.currency')} htmlFor="overview-currency">
          <select
            id="overview-currency"
            className="ws-input"
            value={selectedCurrency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {[...new Set([...currencies, selectedCurrency])].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            icon={<Download size={16} />}
            disabled={!filtered.length || loading || invalidRange}
            onClick={() => downloadCsv('company-invoices', exportRows)}
          >
            {t('common.export')}
          </Button>
          <Button
            icon={<Printer size={16} />}
            disabled={!filtered.length || loading || invalidRange}
            onClick={() =>
              printReport(t('overview.title'), exportRows, {
                [t('overview.company')]: user?.company?.name || '',
                [t('common.currency')]: selectedCurrency,
              })
            }
          >
            {t('common.print')}
          </Button>
          {(from || to) && (
            <Button
              variant="ghost"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
            >
              {t('common.clearFilters')}
            </Button>
          )}
        </div>
      </FilterBar>
      {invalidRange && (
        <p role="alert" className="ws-inline-message ws-warning">
          {t('errors.dateRange')}
        </p>
      )}
      {loading && !invoices.length ? (
        <LoadingSkeleton cards={4} rows={6} />
      ) : (
        <>
          {error && !invoices.length ? null : !invoices.length ? (
            <Panel>
              <EmptyState
                title={t('overview.emptyTitle')}
                description={t('overview.emptyDescription')}
                icon={<ReceiptText size={28} />}
                action={newInvoice}
              />
            </Panel>
          ) : (
            <>
              <div className="ws-stats">
                <StatCard
                  label={t('overview.total')}
                  value={format.money(metrics.total, selectedCurrency)}
                  hint={t('overview.issuedCount', { count: metrics.count })}
                  icon={<FileText size={20} />}
                />
                <StatCard
                  label={t('overview.collected')}
                  value={format.money(metrics.collected, selectedCurrency)}
                  hint={t('common.currentRecords')}
                  tone="success"
                  icon={<Banknote size={20} />}
                />
                <StatCard
                  label={t('overview.outstanding')}
                  value={format.money(metrics.outstanding, selectedCurrency)}
                  hint={t('common.count', {
                    count: issued.filter((row) => Number(row.amount_due) > 0).length,
                  })}
                  tone={metrics.outstanding > 0 ? 'warning' : 'neutral'}
                  icon={<Clock3 size={20} />}
                />
                <StatCard
                  label={t('overview.tax')}
                  value={format.money(metrics.vat, selectedCurrency)}
                  hint={selectedCurrency}
                  icon={<CircleDollarSign size={20} />}
                />
              </div>
              <p className="ws-muted text-xs">
                {t('overview.metricsHint')} {t('common.filteredScope')} {t('common.currencyHint')}
              </p>
              <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(260px,1fr)]">
                <Panel title={t('overview.trend')} description={t('overview.trendDescription')}>
                  {!metrics.count ? (
                    <EmptyState
                      title={t('overview.emptyTrend')}
                      description={t('overview.emptyTrendDescription')}
                    />
                  ) : (
                    <div
                      className="h-72 min-w-0 px-2 pb-4 pt-5"
                      role="img"
                      aria-label={t('overview.trend')}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={metrics.months}
                          margin={{ top: 10, right: 12, bottom: 4, left: 4 }}
                        >
                          <CartesianGrid
                            vertical={false}
                            stroke="var(--app-border)"
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--app-muted)' }}
                            fontSize={12}
                            tickFormatter={(value) =>
                              format.date(`${value}-01`, {
                                month: 'short',
                                year: '2-digit',
                                day: undefined,
                              })
                            }
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'var(--app-muted)' }}
                            fontSize={12}
                            tickFormatter={(value) =>
                              new Intl.NumberFormat(format.locale, { notation: 'compact' }).format(
                                Number(value),
                              )
                            }
                          />
                          <Tooltip
                            formatter={(value) => format.money(Number(value), selectedCurrency)}
                            labelFormatter={(value) =>
                              format.date(`${value}-01`, {
                                month: 'long',
                                year: 'numeric',
                                day: undefined,
                              })
                            }
                            contentStyle={{
                              borderRadius: 10,
                              borderColor: 'var(--app-border)',
                              background: 'var(--app-surface)',
                              color: 'var(--app-text)',
                            }}
                          />
                          <Bar
                            dataKey="total"
                            name={t('overview.trendTotal')}
                            fill="var(--app-chart-issued)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={26}
                            isAnimationActive={false}
                          />
                          <Bar
                            dataKey="collected"
                            name={t('overview.trendCollected')}
                            fill="var(--app-chart-collected)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={26}
                            isAnimationActive={false}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap justify-center gap-5 text-xs ws-muted">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--app-chart-issued)]" />
                          {t('overview.trendTotal')}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm bg-slate-500" />
                          {t('overview.trendCollected')}
                        </span>
                      </div>
                    </div>
                  )}
                </Panel>
                <Panel
                  title={t('overview.attention')}
                  description={t('overview.attentionDescription')}
                >
                  <div className="space-y-1 p-4">
                    {[
                      [t('overview.drafts'), drafts.length, 'draft'],
                      [t('overview.overdue'), overdue.length, 'overdue'],
                      [
                        t('overview.outstandingCount'),
                        issued.filter((row) => Number(row.amount_due) > 0).length,
                        'outstanding',
                      ],
                    ].map(([label, count, status]) => (
                      <Link
                        key={String(status)}
                        className="flex items-center justify-between gap-4 rounded-lg px-3 py-4 hover:bg-[var(--app-surface-2)] focus-visible:outline focus-visible:outline-2"
                        to={`/finance/invoicing?status=${status}`}
                      >
                        <span className="text-sm">{label}</span>
                        <span className="flex items-center gap-3">
                          <strong>{format.number(Number(count))}</strong>
                          <ArrowUpRight size={16} aria-hidden="true" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </Panel>
              </div>
              <Panel
                title={t('overview.recent')}
                description={t('overview.recentDescription')}
                actions={
                  <Link className="ws-btn ws-btn-ghost" to="/finance/invoicing">
                    {t('common.viewAll')}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                }
              >
                <DataTable
                  rows={filtered.slice(0, 6)}
                  getRowKey={(row) => row.id}
                  pageSize={6}
                  caption={t('overview.recent')}
                  emptyTitle={t('overview.noRecent')}
                  columns={[
                    {
                      key: 'number',
                      label: t('invoices.number'),
                      render: (row) => (
                        <Link
                          className="font-semibold underline-offset-4 hover:underline"
                          dir="ltr"
                          to={`/finance/invoicing?invoice=${row.id}`}
                        >
                          {row.invoice_number}
                        </Link>
                      ),
                    },
                    {
                      key: 'date',
                      label: t('common.issueDate'),
                      render: (row) => format.date(row.issue_date),
                    },
                    {
                      key: 'total',
                      label: t('common.total'),
                      render: (row) => (
                        <span dir="auto">{format.money(row.total_amount, row.currency_code)}</span>
                      ),
                    },
                    {
                      key: 'due',
                      label: t('common.due'),
                      render: (row) => format.money(row.amount_due, row.currency_code),
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
          )}
          <Panel title={t('overview.quick')} description={t('overview.quickDescription')}>
            <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [t('overview.newDraft'), '/finance/invoicing?create=1', FileText],
                [t('common.pos'), '/pos', Banknote],
                [t('overview.products'), '/inventory', Package],
                [t('common.reports'), '/finance/reports', ReceiptText],
              ].filter(([,path]) => newInvoice || path !== '/finance/invoicing?create=1').map(([label, path, Icon]) => {
                const ActionIcon = Icon as typeof FileText;
                return (
                  <Link
                    key={String(path)}
                    to={String(path)}
                    className="flex items-center gap-3 rounded-lg border border-[var(--app-border)] p-4 hover:bg-[var(--app-surface-2)]"
                  >
                    <ActionIcon size={19} aria-hidden="true" />
                    <span className="flex-1 text-sm font-medium">{String(label)}</span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </Panel>
          {updated && (
            <p className="ws-muted text-xs">
              {t('common.lastUpdated', {
                date: format.date(updated, { hour: '2-digit', minute: '2-digit' }),
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
