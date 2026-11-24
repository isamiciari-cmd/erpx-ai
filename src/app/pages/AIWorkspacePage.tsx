import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Bell, CalendarClock, FileText, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { isDemoMode } from '../../lib/supabase';
import { listInvoices, type Invoice } from '../../services/invoicesService';
import BusinessAssistantPage from '../components/erp/BusinessAssistantPage';
import {
  Button,
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
  type TableColumn,
} from '../components/erp/WorkspaceUI';

type InvoiceCustomer = { company_id?: string; company_name?: string };
type AlertInvoice = Invoice & { customer?: InvoiceCustomer | InvoiceCustomer[] | null };
export type InvoiceAlert = { invoice: AlertInvoice; customerName: string; daysOverdue: number };
const issuedStatuses = ['issued', 'sent', 'partial', 'paid', 'overdue'];
function dayNumber(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date.getTime() / 86400000
    : null;
}
export function companyToday(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((key) => parts.find((part) => part.type === key)?.value)
    .join('-');
}
/** These are derived invoice facts, not generated alerts or risk scores. */
export function deriveInvoiceAlerts(
  invoices: AlertInvoice[],
  companyId: string,
  today: string,
): InvoiceAlert[] {
  const current = dayNumber(today);
  if (current === null || !companyId) return [];
  return invoices
    .flatMap((invoice) => {
      const due = dayNumber(invoice.due_date || '');
      const amount = Number(invoice.amount_due);
      if (
        invoice.company_id !== companyId ||
        !issuedStatuses.includes(invoice.status?.toLowerCase()) ||
        invoice.invoice_type_code === '381' ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        due === null ||
        due >= current
      )
        return [];
      const customer = Array.isArray(invoice.customer) ? invoice.customer[0] : invoice.customer;
      return [
        {
          invoice,
          customerName:
            customer?.company_id === companyId && typeof customer.company_name === 'string'
              ? customer.company_name
              : '',
          daysOverdue: current - due,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.invoice.due_date.localeCompare(b.invoice.due_date) ||
        a.invoice.invoice_number.localeCompare(b.invoice.invoice_number),
    );
}

export function InvoiceAlertsPage() {
  const { t } = useTranslation('workspace');
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { isRtl, money, number, date, timeZone } = useWorkspaceFormat();
  const companyId = user?.company_id || '';
  const canRead = hasPermission('sales.view') || hasPermission('finance.view');
  const [invoices, setInvoices] = useState<AlertInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current;
    if (!companyId || !canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      if (isDemoMode) throw new Error();
      const rows = await listInvoices(companyId);
      if (request !== generation.current) return;
      setInvoices(rows.filter((row) => row.company_id === companyId));
      setLoadedAt(new Date().toISOString());
    } catch {
      if (request === generation.current) setError(true);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [companyId, canRead]);
  useEffect(() => {
    setInvoices([]);
    setSelectedId('');
    setLoadedAt(null);
    setQuery('');
    setStatusFilter('');
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const alerts = deriveInvoiceAlerts(invoices, companyId, companyToday(timeZone));
  const statuses = [...new Set(alerts.map((alert) => alert.invoice.status))].sort();
  const visible = alerts.filter(
    (alert) =>
      (!statusFilter || alert.invoice.status === statusFilter) &&
      `${alert.invoice.invoice_number} ${alert.customerName}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const selected = alerts.find((alert) => alert.invoice.id === selectedId);
  const outstanding = new Map<string, number>();
  for (const alert of visible) {
    const currency = alert.invoice.currency_code || '';
    outstanding.set(currency, (outstanding.get(currency) || 0) + Number(alert.invoice.amount_due));
  }
  const formatAmount = (amount: number, currency: string) =>
    /^[A-Z]{3}$/.test(currency) ? money(amount, currency) : number(amount);
  const invoiceLink = (id: string) => `/finance/invoicing?invoice=${encodeURIComponent(id)}`;
  const columns: TableColumn<InvoiceAlert>[] = [
    {
      key: 'invoice',
      label: t('intelligence.invoice'),
      sortValue: (alert) => alert.invoice.invoice_number,
      render: (alert) => (
        <button
          className="font-semibold hover:underline"
          onClick={() => setSelectedId(alert.invoice.id)}
        >
          {alert.invoice.invoice_number}
        </button>
      ),
    },
    {
      key: 'customer',
      label: t('intelligence.customer'),
      sortValue: (alert) => alert.customerName,
      render: (alert) => alert.customerName || t('common.notAvailable'),
    },
    {
      key: 'due',
      label: t('intelligence.due'),
      sortValue: (alert) => alert.invoice.due_date,
      render: (alert) => (
        <span>
          {date(alert.invoice.due_date)}
          <small className="ws-muted mt-1 block">
            {t('intelligence.days', { count: alert.daysOverdue })}
          </small>
        </span>
      ),
    },
    {
      key: 'amount',
      label: t('intelligence.amount'),
      sortValue: (alert) => Number(alert.invoice.amount_due),
      render: (alert) => (
        <bdi>{formatAmount(Number(alert.invoice.amount_due), alert.invoice.currency_code)}</bdi>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      render: (alert) => <StatusBadge status={alert.invoice.status} />,
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (alert) => (
        <Button
          variant="ghost"
          onClick={() => setSelectedId(alert.invoice.id)}
          aria-label={`${t('common.details')}: ${alert.invoice.invoice_number}`}
        >
          {t('common.details')}
        </Button>
      ),
    },
  ];
  return (
    <section className="ws-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <PageHeader
        eyebrow={t('nav.intelligence')}
        title={t('intelligence.alertsTitle')}
        description={t('intelligence.alertsDescription')}
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw size={16} />}
            disabled={loading || !canRead}
            onClick={() => void load()}
          >
            {t('common.refresh')}
          </Button>
        }
      />
      {!canRead ? (
        <ErrorState message={t('common.noPermission')} />
      ) : (
        <>
          <div className="ws-stats">
            <StatCard
              label={t('intelligence.overdue')}
              value={!loadedAt ? '—' : number(visible.length)}
              hint={t('intelligence.liveScope')}
              icon={<Bell size={19} />}
            />
            <StatCard
              label={t('intelligence.amount')}
              value={
                !loadedAt ? (
                  '—'
                ) : outstanding.size ? (
                  <div className="space-y-1 text-lg">
                    {[...outstanding.entries()].map(([currency, amount]) => (
                      <p key={currency}>
                        <bdi>{formatAmount(amount, currency)}</bdi>
                        {!currency && (
                          <small className="ws-muted ms-1">{t('common.notAvailable')}</small>
                        )}
                      </p>
                    ))}
                  </div>
                ) : (
                  number(0)
                )
              }
              hint={t('intelligence.overdueHint')}
              icon={<FileText size={19} />}
            />
            <StatCard
              label={t('common.source')}
              value={t('intelligence.derived')}
              hint={
                loadedAt
                  ? date(loadedAt, { hour: '2-digit', minute: '2-digit' })
                  : t('common.notChecked')
              }
              icon={<CalendarClock size={19} />}
            />
          </div>
          {error && (
            <ErrorState message={t('intelligence.loadFailed')} onRetry={() => void load()} />
          )}
          <Panel
            title={t('intelligence.overdue')}
            description={t('intelligence.overdueHint')}
            actions={<StatusBadge>{t('common.readOnly')}</StatusBadge>}
          >
            <FilterBar>
              <FormField label={t('common.search')} htmlFor="invoice-alert-search">
                <input
                  id="invoice-alert-search"
                  type="search"
                  className="ws-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('intelligence.searchAlerts')}
                />
              </FormField>
              <FormField label={t('common.status')} htmlFor="invoice-alert-status">
                <select
                  id="invoice-alert-status"
                  className="ws-input"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">{t('common.all')}</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {t(`status.${status.toLowerCase()}`, { defaultValue: status })}
                    </option>
                  ))}
                </select>
              </FormField>
            </FilterBar>
            {loading && !loadedAt ? (
              <LoadingSkeleton rows={5} />
            ) : error && !loadedAt ? null : !visible.length ? (
              <EmptyState
                title={t(alerts.length ? 'common.noResults' : 'intelligence.noAlerts')}
                description={t('intelligence.noAlertsHint')}
                icon={<Bell size={26} />}
              />
            ) : (
              <DataTable
                key={`${companyId}:${query}:${statusFilter}`}
                caption={t('intelligence.overdue')}
                columns={columns}
                rows={visible}
                getRowKey={(alert) => alert.invoice.id}
              />
            )}
          </Panel>
          <p className="ws-inline-message flex items-start gap-2">
            <Bell size={17} className="mt-0.5 shrink-0" />
            <span>{t('intelligence.derivedHint')}</span>
          </p>
          <DetailDrawer
            open={!!selected}
            onClose={() => setSelectedId('')}
            title={selected?.invoice.invoice_number || t('intelligence.alertDetails')}
            description={t('intelligence.derived')}
            footer={
              selected && (
                <Link
                  className="ws-btn ws-btn-primary"
                  to={invoiceLink(selected.invoice.id)}
                  onClick={() => setSelectedId('')}
                >
                  {t('intelligence.openInvoice')}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              )
            }
          >
            {selected && (
              <div className="space-y-5">
                <StatusBadge status={selected.invoice.status} />
                <Panel title={t('intelligence.evidence')}>
                  <dl className="space-y-4">
                    {[
                      [t('intelligence.invoice'), selected.invoice.invoice_number],
                      [
                        t('intelligence.customer'),
                        selected.customerName || t('common.notAvailable'),
                      ],
                      [t('intelligence.due'), date(selected.invoice.due_date)],
                      [
                        t('intelligence.amount'),
                        formatAmount(
                          Number(selected.invoice.amount_due),
                          selected.invoice.currency_code,
                        ),
                      ],
                      [t('common.status'), t('intelligence.days', { count: selected.daysOverdue })],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="ws-muted text-xs">{label}</dt>
                        <dd className="mt-1 font-medium">
                          <bdi>{value}</bdi>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Panel>
                <p className="ws-inline-message text-sm">{t('intelligence.derivedHint')}</p>
              </div>
            )}
          </DetailDrawer>
        </>
      )}
    </section>
  );
}

export default function AIWorkspacePage({ title = 'Business assistant' }: { title?: string }) {
  const { t } = useTranslation('workspace');
  if (title === 'AI Alerts') return <InvoiceAlertsPage />;
  if (title === 'AI Predictions')
    return <BusinessAssistantPage title={t('intelligence.scenariosTitle')} mode="scenario" />;
  if (title === 'AI Recommendations')
    return (
      <BusinessAssistantPage
        title={t('intelligence.recommendationsTitle')}
        mode="recommendations"
      />
    );
  return <BusinessAssistantPage />;
}
