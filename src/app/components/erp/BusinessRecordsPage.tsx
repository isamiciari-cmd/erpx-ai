import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Download, FileText, Plus, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';
import { isDemoMode } from '../../../lib/supabase';
import {
  BUSINESS_TRANSITIONS,
  FINAL_STATUSES,
  calculatePayroll,
  recordsToCsv,
  toMinorUnits,
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
  type TableColumn,
} from './WorkspaceUI';
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

/** Mirrors existing trusted grants for presentation; server RPC/RLS remains authoritative. */
export function useBusinessAccess(module: string) {
  const access = usePermissions();
  const category = module.split('_')[0];
  const admin = ['owner', 'developer', 'super_admin', 'admin', 'manager'].some(access.hasRole);
  const domain =
    admin ||
    (category === 'finance' && ['accountant', 'finance_manager'].some(access.hasRole)) ||
    (category === 'hr' && ['hr', 'hr_manager'].some(access.hasRole));
  const grant = (action: string) =>
    domain ||
    [module, category, `${category}.write`, `${category}.${action}`, `${module}.${action}`].some(
      access.hasPermission,
    );
  const salary =
    admin ||
    ['hr', 'hr_manager'].some(access.hasRole) ||
    ['hr', 'hr.read'].some(access.hasPermission) ||
    (['hr_employees', 'hr_payroll'].includes(module) && access.hasPermission(module));
  return {
    canCreate: grant('create'),
    canUpdate: grant('update'),
    canExport: domain || [`${category}.export`, `${module}.export`].some(access.hasPermission),
    canSeeSalary: salary,
  };
}
const defaults = [
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
const salaryFields = new Set(['base_salary', 'allowances', 'deductions', 'salary', 'net_salary']);
class FormValidationError extends Error {}
const rawError = (value: unknown) =>
  value instanceof Error ? value.message : String((value as { message?: string })?.message || '');
const blankLine = (): JournalLine => ({
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
  statuses = defaults,
  transitions = BUSINESS_TRANSITIONS,
  initialStatus = 'draft',
  journal = false,
  readOnly = false,
  hideAmount = false,
}: BusinessRecordsPageProps) {
  const { t } = useTranslation('finance');
  const { user } = useAuth();
  const access = useBusinessAccess(module);
  const fmt = useWorkspaceFormat();
  const companyId = user?.company_id || '';
  const scope = `${companyId}:${module}`;
  const currency = user?.company?.currency || 'SAR';
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [loadedScope, setLoadedScope] = useState('');
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [employees, setEmployees] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [department, setDepartment] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'overview' | 'activity'>('overview');
  const [selected, setSelected] = useState<BusinessRecord>();
  const [input, setInput] = useState<BusinessInput>(() => emptyInput(module, fields));
  const [baseline, setBaseline] = useState('');
  const [formError, setFormError] = useState('');
  const [events, setEvents] = useState<BusinessAuditEvent[]>([]);
  const [auditError, setAuditError] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<BusinessRecord>();
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [pending, setPending] = useState<{ row: BusinessRecord; status: string }>();
  const [discard, setDiscard] = useState(false);
  const generation = useRef(0);
  const auditGeneration = useRef(0);
  const mutation = useRef(false);
  const needsEmployees = fields.some((field) => field.key === 'employee_id');
  const employeePage = module === 'hr_employees';
  const sensitive = employeePage || module === 'hr_payroll';
  const showAmount = !hideAmount && (!sensitive || access.canSeeSalary);
  const effectiveFields = fields.filter(
    (field) => access.canSeeSalary || !salaryFields.has(field.key),
  );
  const displayTitle = t(`modules.${module}.title`, { defaultValue: title });
  const displayDescription = t(`modules.${module}.description`, {
    defaultValue: description || t('common.workflowDescription'),
  });
  const fieldLabel = (field: BusinessField) =>
    t(`fields.${field.key}`, { defaultValue: field.label });
  const statusLabel = (status: string) =>
    t(`status.${status}`, { defaultValue: status.replaceAll('_', ' ') });
  const actionLabel = (status: string) =>
    t(`transition.${status}`, { defaultValue: statusLabel(status) });
  const optionLabel = (option: string) =>
    t(`options.${option.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, { defaultValue: option });
  const friendlyError = (value: string) =>
    t(
      /permission|denied|42501|forbidden/i.test(value)
        ? 'common.permissionError'
        : /migration|setup|PGRST20|42P01/i.test(value)
          ? 'common.setupError'
          : /network|fetch|connection|timeout/i.test(value)
            ? 'common.connectionError'
            : 'common.operationError',
    );
  const load = useCallback(async () => {
    const id = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const [rows, chart, staff] = await Promise.all([
        listBusinessRecords(companyId, module),
        journal ? listBusinessAccounts(companyId) : Promise.resolve([]),
        needsEmployees ? listBusinessRecords(companyId, 'hr_employees') : Promise.resolve([]),
      ]);
      if (id === generation.current) {
        setRecords(rows);
        setLoadedScope(scope);
        setAccounts(chart);
        setEmployees(staff);
      }
    } catch (err) {
      if (id === generation.current) setError(rawError(err));
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, [companyId, module, scope, journal, needsEmployees]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
      auditGeneration.current++;
    };
  }, [load]);
  useEffect(() => {
    setOpen(false);
    setEditing(false);
    setSelected(undefined);
    setDiscard(false);
    setPaymentRecord(undefined);
    setPending(undefined);
    setSearch('');
    setStatusFilter('all');
    setDepartment('all');
    setFrom('');
    setTo('');
    setNotice('');
  }, [scope]);
  const scoped = loadedScope === scope ? records : [];
  const statsUnavailable = loadedScope !== scope && (loading || !!error);
  const invalidPeriod = !!from && !!to && from > to;
  const filtered = useMemo(
    () =>
      scoped.filter(
        (row) =>
          !invalidPeriod &&
          `${row.title} ${row.reference} ${effectiveFields.map((field) => row.data[field.key] ?? '').join(' ')}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (statusFilter === 'all' || row.status === statusFilter) &&
          (department === 'all' || row.data.department === department) &&
          (!from || row.record_date >= from) &&
          (!to || row.record_date <= to),
      ),
    [scoped, search, statusFilter, department, from, to, invalidPeriod, effectiveFields],
  );
  const departments = [
    ...new Set(scoped.map((row) => String(row.data.department || '')).filter(Boolean)),
  ].sort();
  const locked =
    readOnly ||
    (!!selected &&
      (!access.canUpdate ||
        [...FINAL_STATUSES, 'submitted', 'approved'].includes(selected.status)));
  const canNew = !readOnly && access.canCreate && !isDemoMode;
  const dirty = editing && JSON.stringify(input) !== baseline;
  useUnsavedChanges(open && dirty, t('common.discardHint'), { title, values: input, baseline });
  const lines = Array.isArray(input.data.lines) ? (input.data.lines as JournalLine[]) : [];
  const total = filtered.reduce((sum, row) => sum + toMinorUnits(row.amount), 0) / 100;
  const debit = lines.reduce((sum, row) => sum + toMinorUnits(row.debit || 0), 0) / 100;
  const credit = lines.reduce((sum, row) => sum + toMinorUnits(row.credit || 0), 0) / 100;
  let payrollNet: number | undefined;
  if (module === 'hr_payroll' && access.canSeeSalary) {
    try {
      payrollNet = calculatePayroll(
        input.data.base_salary || 0,
        input.data.allowances || 0,
        input.data.deductions || 0,
      );
    } catch {
      /* The form reports validation on save. */
    }
  }
  function closeRecord() {
    if (busy) return;
    if (dirty) setDiscard(true);
    else {
      setOpen(false);
      auditGeneration.current++;
    }
  }
  function startNew() {
    const next = emptyInput(module, fields);
    if (journal) next.data.lines = [blankLine(), blankLine()];
    setSelected(undefined);
    setInput(next);
    setBaseline(JSON.stringify(next));
    setEditing(true);
    setFormError('');
    setEvents([]);
    setAuditError('');
    setTab('overview');
    setOpen(true);
  }
  async function view(row: BusinessRecord) {
    const id = ++auditGeneration.current;
    setSelected(row);
    const next = { ...row, data: structuredClone(row.data) };
    setInput(next);
    setBaseline(JSON.stringify(next));
    setEditing(false);
    setFormError('');
    setEvents([]);
    setAuditError('');
    setAuditLoading(true);
    setTab('overview');
    setOpen(true);
    try {
      const result = await listBusinessAudit(companyId, row.id);
      if (id === auditGeneration.current) setEvents(result);
    } catch (err) {
      if (id === auditGeneration.current) setAuditError(rawError(err));
    } finally {
      if (id === auditGeneration.current) setAuditLoading(false);
    }
  }
  const setData = (key: string, value: unknown) =>
    setInput((current) => ({ ...current, data: { ...current.data, [key]: value } }));
  const changeLine = (index: number, patch: Partial<JournalLine>) =>
    setData(
      'lines',
      lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  async function save(event: FormEvent) {
    event.preventDefault();
    if (mutation.current || locked || (!selected && !canNew)) return;
    mutation.current = true;
    setBusy(true);
    setFormError('');
    try {
      for (const field of effectiveFields) {
        const value = input.data[field.key];
        if (field.required && (value === '' || value == null))
          throw new FormValidationError(t('common.required', { field: fieldLabel(field) }));
        if (
          field.type === 'number' &&
          value !== '' &&
          (!Number.isFinite(Number(value)) ||
            (field.min !== undefined && Number(value) < field.min))
        )
          throw new FormValidationError(t('common.invalid', { field: fieldLabel(field) }));
      }
      await saveBusinessRecord(companyId, input, selected, selected?.status ?? initialStatus);
      setOpen(false);
      setNotice(t('common.saved'));
      await load();
    } catch (err) {
      setFormError(err instanceof FormValidationError ? err.message : friendlyError(rawError(err)));
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  function requestTransition(row: BusinessRecord, status: string) {
    if (readOnly || !access.canUpdate || busy) return;
    if (
      status === 'paid' &&
      ['hr_payroll', 'finance_payables', 'finance_expenses'].includes(row.module)
    ) {
      setOpen(false);
      setPaymentRecord(row);
      setPaymentReference(String(row.data.payment_reference || ''));
      setPaymentError('');
      return;
    }
    setPending({ row, status });
  }
  async function changeStatus() {
    if (!pending || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError('');
    try {
      await transitionBusinessRecord(companyId, pending.row, pending.status);
      setPending(undefined);
      setOpen(false);
      setNotice(t('common.transitioned'));
      await load();
    } catch (err) {
      setError(rawError(err));
      setPending(undefined);
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  async function settle(event: FormEvent) {
    event.preventDefault();
    if (!paymentRecord || mutation.current || !access.canUpdate) return;
    mutation.current = true;
    setBusy(true);
    setPaymentError('');
    try {
      await completeBusinessPayment(companyId, paymentRecord, paymentReference);
      setPaymentRecord(undefined);
      setNotice(t('common.paymentSaved'));
      await load();
    } catch (err) {
      setPaymentError(rawError(err));
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  function exportCsv() {
    downloadBusinessCsv(
      `${module}-${new Date().toISOString().slice(0, 10)}.csv`,
      recordsToCsv(
        [
          t('common.name'),
          t('common.reference'),
          t('common.date'),
          t('common.status'),
          ...(showAmount
            ? [t(employeePage ? 'common.salary' : 'common.amount') + ` (${currency})`]
            : []),
          ...effectiveFields.map(fieldLabel),
        ],
        filtered.map((row) => [
          row.title,
          row.reference,
          row.record_date,
          statusLabel(row.status),
          ...(showAmount ? [row.amount] : []),
          ...effectiveFields.map((field) =>
            field.type === 'select'
              ? optionLabel(String(row.data[field.key] || ''))
              : row.data[field.key],
          ),
        ]),
      ),
    );
  }
  function valueText(row: BusinessRecord, field: BusinessField) {
    const value = row.data[field.key];
    if (value === '' || value == null) return t('common.missing');
    if (field.key === 'employee_id') {
      const employee = employees.find((item) => item.id === value);
      return employee ? `${employee.title} · ${employee.reference}` : String(value);
    }
    return field.type === 'select'
      ? optionLabel(String(value))
      : field.type === 'date'
        ? fmt.date(String(value))
        : String(value);
  }
  const columns: TableColumn<BusinessRecord>[] = [
    {
      key: 'name',
      label: t(employeePage ? 'common.employeeName' : 'common.name'),
      sortValue: (row) => row.title,
      render: (row) => (
        <div>
          <button
            className="text-start font-semibold hover:underline"
            onClick={() => void view(row)}
          >
            {row.title}
          </button>
          <p className="ws-muted text-xs">
            <bdi>{row.reference || row.id.slice(0, 8)}</bdi>
          </p>
        </div>
      ),
    },
    ...(employeePage
      ? ['department', 'position'].map((key) => ({
          key,
          label: t(`fields.${key}`),
          sortValue: (row: BusinessRecord) => String(row.data[key] || ''),
          render: (row: BusinessRecord) => (
            <span>{String(row.data[key] || t('common.missing'))}</span>
          ),
        }))
      : module === 'purchases_requests'
        ? ['supplier_name', 'requested_by'].map((key) => ({
            key,
            label: t(`fields.${key}`),
            render: (row: BusinessRecord) => String(row.data[key] || t('common.missing')),
          }))
        : []),
    {
      key: 'date',
      label: t(employeePage ? 'common.hireDate' : 'common.date'),
      sortValue: (row) => row.record_date,
      render: (row) => fmt.date(row.record_date),
    },
    {
      key: 'status',
      label: t('common.status'),
      sortValue: (row) => row.status,
      render: (row) => <StatusBadge status={row.status}>{statusLabel(row.status)}</StatusBadge>,
    },
    ...(showAmount
      ? [
          {
            key: 'amount',
            label: t(
              employeePage
                ? 'common.salary'
                : module === 'purchases_requests'
                  ? 'common.requestValue'
                  : 'common.amount',
            ),
            sortValue: (row: BusinessRecord) => row.amount,
            className: 'tabular-nums',
            render: (row: BusinessRecord) => fmt.money(row.amount),
          },
        ]
      : []),
    {
      key: 'actions',
      label: t('common.actions'),
      render: (row) => (
        <Button variant="ghost" icon={<FileText size={15} />} onClick={() => void view(row)}>
          {t('common.view')}
        </Button>
      ),
    },
  ];
  return (
    <section className="ws-page">
      <PageHeader
        title={displayTitle}
        description={displayDescription}
        eyebrow={t(`common.${module.split('_')[0]}`, { defaultValue: t('common.workspace') })}
        actions={
          <>
            <Button
              onClick={() => void load()}
              disabled={loading || busy}
              icon={<RefreshCw size={16} />}
            >
              {t('common.refresh')}
            </Button>
            {access.canExport && (
              <Button
                onClick={exportCsv}
                disabled={loading || !!error || invalidPeriod || !filtered.length}
                icon={<Download size={16} />}
              >
                {t('common.export')}
              </Button>
            )}
            {canNew && (
              <Button
                variant="primary"
                onClick={startNew}
                disabled={loading || !!error}
                icon={<Plus size={16} />}
              >
                {t(
                  employeePage
                    ? 'common.newEmployee'
                    : module === 'purchases_requests'
                      ? 'common.newRequest'
                      : 'common.new',
                )}
              </Button>
            )}
          </>
        }
      />
      {error && <ErrorState message={friendlyError(error)} onRetry={() => void load()} />}
      {notice && (
        <p className="ws-inline-message ws-success" role="status">
          {notice}
        </p>
      )}
      {isDemoMode && <p className="ws-inline-message ws-warning">{t('common.demo')}</p>}
      {module === 'purchases_requests' && (
        <p className="ws-inline-message">
          <ShieldCheck size={17} aria-hidden="true" />
          {t('common.purchaseNotice')}
        </p>
      )}
      {sensitive && <p className="ws-muted text-sm">{t('common.salarySensitive')}</p>}
      <div className="ws-stats">
        <StatCard
          label={t('common.matching')}
          value={statsUnavailable ? '—' : fmt.number(filtered.length)}
          icon={employeePage ? <Users size={20} /> : <FileText size={20} />}
        />
        <StatCard
          label={t(employeePage ? 'common.active' : 'common.pending')}
          value={
            statsUnavailable
              ? '—'
              : fmt.number(
                  filtered.filter((row) => row.status === (employeePage ? 'active' : 'submitted'))
                    .length,
                )
          }
          tone="warning"
        />
        <StatCard
          label={t('common.approved')}
          value={
            statsUnavailable
              ? '—'
              : fmt.number(filtered.filter((row) => row.status === 'approved').length)
          }
          tone="success"
        />
        {showAmount && (
          <StatCard
            label={t(employeePage ? 'common.salary' : 'common.filteredAmount')}
            value={statsUnavailable ? '—' : fmt.money(total)}
            hint={t('common.amountScope')}
          />
        )}
      </div>
      <Panel title={t('common.records')} description={t('common.scope')}>
        <FilterBar>
          <FormField label={t('common.search')} htmlFor={`${module}-search`}>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute start-3 top-3.5 text-slate-400"
              />
              <input
                id={`${module}-search`}
                className="ws-input ps-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('common.searchHint')}
              />
            </div>
          </FormField>
          <FormField label={t('common.status')} htmlFor={`${module}-status`}>
            <select
              id={`${module}-status`}
              className="ws-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">{t('common.allStatuses')}</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </FormField>
          {employeePage && (
            <FormField label={t('fields.department')}>
              <select
                aria-label={t('fields.department')}
                className="ws-input"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
              >
                <option value="all">{t('common.allDepartments')}</option>
                {departments.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label={t('common.from')}>
            <input
              aria-label={t('common.from')}
              className="ws-input"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </FormField>
          <FormField label={t('common.to')}>
            <input
              aria-label={t('common.to')}
              className="ws-input"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </FormField>
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setDepartment('all');
              setFrom('');
              setTo('');
            }}
          >
            {t('common.clearFilters')}
          </Button>
        </FilterBar>
        {invalidPeriod && (
          <p className="ws-inline-message ws-error" role="alert">
            {t('common.dateRange')}
          </p>
        )}
        {loading && !scoped.length ? (
          <LoadingSkeleton rows={6} />
        ) : error && !scoped.length ? (
          <p className="ws-muted p-5">{t('common.operationError')}</p>
        ) : !scoped.length && !error ? (
          <EmptyState
            title={t('common.empty')}
            description={t('common.emptyHint')}
            action={
              canNew ? (
                <Button variant="primary" onClick={startNew}>
                  {t('common.new')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            getRowKey={(row) => row.id}
            caption={displayTitle}
            emptyTitle={t('common.noMatches')}
            emptyDescription={t('common.noMatchesHint')}
          />
        )}
      </Panel>
      <DetailDrawer
        open={open && loadedScope === scope}
        onClose={closeRecord}
        title={selected?.title || t('common.new')}
        description={displayTitle}
        wide={journal}
        footer={
          <>
            <Button onClick={closeRecord} disabled={busy}>
              {t('common.close')}
            </Button>
            {editing && !locked && (
              <Button variant="primary" type="submit" form="business-record-form" loading={busy}>
                {t('common.save')}
              </Button>
            )}
            {!editing && selected && !locked && (
              <Button onClick={() => setEditing(true)}>{t('common.edit')}</Button>
            )}
            {!editing &&
              selected &&
              !readOnly &&
              access.canUpdate &&
              (transitions[selected.status] || [])
                .filter((status) => statuses.includes(status))
                .map((status) => (
                  <Button
                    key={status}
                    variant={['cancelled', 'rejected'].includes(status) ? 'danger' : 'primary'}
                    disabled={busy}
                    onClick={() => requestTransition(selected, status)}
                  >
                    {actionLabel(status)}
                  </Button>
                ))}
          </>
        }
      >
        {selected && !editing && (
          <>
            <div className="flex gap-2 border-b pb-3">
              <Button
                variant={tab === 'overview' ? 'primary' : 'ghost'}
                onClick={() => setTab('overview')}
              >
                {t('common.overview')}
              </Button>
              <Button
                variant={tab === 'activity' ? 'primary' : 'ghost'}
                onClick={() => setTab('activity')}
              >
                {t('common.activity')}
              </Button>
            </div>
            {tab === 'activity' ? (
              <div className="mt-5 space-y-4">
                {auditLoading ? (
                  <LoadingSkeleton rows={3} />
                ) : auditError ? (
                  <ErrorState message={friendlyError(auditError)} />
                ) : !events.length ? (
                  <p className="ws-muted">{t('common.historyEmpty')}</p>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="border-s-2 border-slate-200 ps-4">
                      <p className="font-medium">
                        {event.old_status && (
                          <>
                            {statusLabel(event.old_status)} <span aria-hidden="true">→</span>{' '}
                          </>
                        )}
                        {statusLabel(event.new_status)}
                      </p>
                      <p className="ws-muted text-xs">
                        {fmt.date(event.created_at, { hour: '2-digit', minute: '2-digit' })} ·{' '}
                        {t('common.actor')}{' '}
                        <bdi>
                          {event.actor_id === user?.id
                            ? user?.first_name || event.actor_id.slice(0, 8)
                            : event.actor_id.slice(0, 8)}
                        </bdi>
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <StatusBadge status={selected.status}>{statusLabel(selected.status)}</StatusBadge>
                {locked && (
                  <p className="ws-inline-message">
                    {t(
                      ['submitted', 'approved'].includes(selected.status)
                        ? 'common.approvalLocked'
                        : 'common.locked',
                    )}
                  </p>
                )}
                <dl className="grid gap-5 sm:grid-cols-2">
                  {[
                    [t('common.reference'), selected.reference || t('common.missing')],
                    [
                      t(employeePage ? 'common.hireDate' : 'common.date'),
                      fmt.date(selected.record_date),
                    ],
                    ...(showAmount
                      ? [
                          [
                            t(employeePage ? 'common.salary' : 'common.amount'),
                            fmt.money(selected.amount),
                          ],
                        ]
                      : []),
                    ...effectiveFields.map((field) => [
                      fieldLabel(field),
                      valueText(selected, field),
                    ]),
                  ].map(([key, value]) => (
                    <div key={key}>
                      <dt className="ws-muted text-xs">{key}</dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words font-medium" dir="auto">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {journal && (
                  <div className="ws-table-wrap">
                    <table className="ws-table">
                      <thead>
                        <tr>
                          <th>{t('common.account')}</th>
                          <th>{t('common.debit')}</th>
                          <th>{t('common.credit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line, index) => (
                          <tr key={index}>
                            <td>
                              {line.account_code} · {line.account_name}
                            </td>
                            <td>{fmt.money(line.debit)}</td>
                            <td>{fmt.money(line.credit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="ws-muted text-xs">
                  {t('common.version', {
                    version: fmt.number(selected.version),
                    date: fmt.date(selected.updated_at, { hour: '2-digit', minute: '2-digit' }),
                  })}
                </p>
              </div>
            )}
          </>
        )}
        {editing && (
          <form id="business-record-form" onSubmit={save} className="space-y-6">
            {formError && <ErrorState message={formError} />}
            <fieldset disabled={busy || locked} className="ws-form-grid">
              <FormField
                label={t(employeePage ? 'common.employeeName' : 'common.name')}
                htmlFor="record-title"
              >
                <input
                  id="record-title"
                  className="ws-input"
                  required
                  maxLength={255}
                  value={input.title}
                  onChange={(event) => setInput({ ...input, title: event.target.value })}
                />
              </FormField>
              <FormField
                label={t(employeePage ? 'common.employeeNumber' : 'common.reference')}
                htmlFor="record-reference"
              >
                <input
                  id="record-reference"
                  className="ws-input"
                  maxLength={120}
                  value={input.reference}
                  onChange={(event) => setInput({ ...input, reference: event.target.value })}
                />
              </FormField>
              <FormField
                label={t(employeePage ? 'common.hireDate' : 'common.date')}
                htmlFor="record-date"
              >
                <input
                  id="record-date"
                  className="ws-input"
                  type="date"
                  required
                  value={input.record_date}
                  onChange={(event) => setInput({ ...input, record_date: event.target.value })}
                />
              </FormField>
              {showAmount && !journal && module !== 'hr_payroll' && (
                <FormField
                  label={`${t(employeePage ? 'common.salary' : 'common.amount')} (${currency})`}
                  htmlFor="record-amount"
                >
                  <input
                    id="record-amount"
                    className="ws-input"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={input.amount}
                    onChange={(event) => setInput({ ...input, amount: Number(event.target.value) })}
                  />
                </FormField>
              )}
              {effectiveFields.map((field) => (
                <FormField
                  key={field.key}
                  label={fieldLabel(field) + (field.required ? ' *' : '')}
                  htmlFor={`record-${field.key}`}
                  className={field.type === 'textarea' ? 'sm:col-span-2' : ''}
                >
                  {field.key === 'employee_id' ? (
                    <select
                      id={`record-${field.key}`}
                      className="ws-input"
                      required={field.required}
                      value={String(input.data[field.key] || '')}
                      onChange={(event) => setData(field.key, event.target.value)}
                    >
                      <option value="">{t('common.employeeSelect')}</option>
                      {employees
                        .filter(
                          (employee) =>
                            employee.status === 'active' || employee.id === input.data[field.key],
                        )
                        .map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.title} · {employee.reference}
                          </option>
                        ))}
                    </select>
                  ) : field.type === 'select' ? (
                    <select
                      id={`record-${field.key}`}
                      className="ws-input"
                      required={field.required}
                      value={String(input.data[field.key] || '')}
                      onChange={(event) => setData(field.key, event.target.value)}
                    >
                      <option value="">{t('common.select')}</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {optionLabel(option)}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      id={`record-${field.key}`}
                      className="ws-input"
                      rows={4}
                      required={field.required}
                      value={String(input.data[field.key] ?? '')}
                      onChange={(event) => setData(field.key, event.target.value)}
                    />
                  ) : (
                    <input
                      id={`record-${field.key}`}
                      className="ws-input"
                      type={field.type || 'text'}
                      required={field.required}
                      min={field.min}
                      step={field.type === 'number' ? '0.01' : undefined}
                      value={String(input.data[field.key] ?? '')}
                      onChange={(event) =>
                        setData(
                          field.key,
                          field.type === 'number'
                            ? event.target.value === ''
                              ? ''
                              : Number(event.target.value)
                            : event.target.value,
                        )
                      }
                    />
                  )}
                </FormField>
              ))}
            </fieldset>
            {payrollNet !== undefined && (
              <p className="ws-inline-message">
                {t('common.netPay')}: <strong>{fmt.money(payrollNet)}</strong>
              </p>
            )}
            {journal && (
              <fieldset disabled={busy || locked} className="space-y-3">
                <legend className="mb-3 font-semibold">{t('common.journalLines')}</legend>
                {!accounts.length && (
                  <p className="ws-inline-message ws-warning">{t('common.accountsRequired')}</p>
                )}
                {lines.map((line, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2"
                  >
                    <FormField
                      label={t('common.fieldLine', {
                        field: t('common.account'),
                        line: fmt.number(index + 1),
                      })}
                    >
                      <select
                        aria-label={t('common.fieldLine', {
                          field: t('common.account'),
                          line: index + 1,
                        })}
                        className="ws-input"
                        required
                        value={line.account_id}
                        onChange={(event) => {
                          const account = accounts.find((item) => item.id === event.target.value);
                          changeLine(index, {
                            account_id: account?.id || '',
                            account_code: account?.account_code || '',
                            account_name: account?.account_name || '',
                          });
                        }}
                      >
                        <option value="">{t('common.chooseAccount')}</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.account_code} · {account.account_name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <div className="flex items-end justify-end">
                      <Button
                        disabled={lines.length <= 2}
                        onClick={() =>
                          setData(
                            'lines',
                            lines.filter((_, i) => i !== index),
                          )
                        }
                      >
                        {t('common.remove')}
                      </Button>
                    </div>
                    {(['debit', 'credit'] as const).map((key) => (
                      <FormField key={key} label={t(`common.${key}`)}>
                        <input
                          className="ws-input"
                          aria-label={t('common.fieldLine', {
                            field: t(`common.${key}`),
                            line: index + 1,
                          })}
                          type="number"
                          min="0"
                          step="0.01"
                          value={line[key]}
                          onChange={(event) =>
                            changeLine(index, { [key]: Number(event.target.value) })
                          }
                        />
                      </FormField>
                    ))}
                  </div>
                ))}
                <Button
                  onClick={() => setData('lines', [...lines, blankLine()])}
                  icon={<Plus size={15} />}
                >
                  {t('common.addLine')}
                </Button>
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    {t('common.debit')}: {fmt.money(debit)}
                  </span>
                  <span>
                    {t('common.credit')}: {fmt.money(credit)}
                  </span>
                  <StatusBadge
                    tone={toMinorUnits(debit) === toMinorUnits(credit) ? 'success' : 'warning'}
                  >
                    {t(
                      toMinorUnits(debit) === toMinorUnits(credit)
                        ? 'common.balanced'
                        : 'common.unbalanced',
                    )}
                  </StatusBadge>
                </div>
              </fieldset>
            )}
          </form>
        )}
      </DetailDrawer>
      <DetailDrawer
        open={
          !!paymentRecord &&
          paymentRecord.company_id === companyId &&
          paymentRecord.module === module
        }
        onClose={() => {
          if (!busy) setPaymentRecord(undefined);
        }}
        title={t('common.payment')}
        description={paymentRecord?.title}
        footer={
          <>
            <Button disabled={busy} onClick={() => setPaymentRecord(undefined)}>
              {t('common.cancel')}
            </Button>
            <Button form="business-payment-form" type="submit" variant="primary" loading={busy}>
              {t('common.recordPaid')}
            </Button>
          </>
        }
      >
        <form id="business-payment-form" onSubmit={settle} className="space-y-5">
          {paymentError && <ErrorState message={friendlyError(paymentError)} />}
          <p className="ws-inline-message">{t('common.paymentHint')}</p>
          {paymentRecord && (
            <p className="text-2xl font-semibold">{fmt.money(paymentRecord.amount)}</p>
          )}
          <FormField label={t('common.paymentReference')} htmlFor="business-payment-reference">
            <input
              id="business-payment-reference"
              className="ws-input"
              required
              maxLength={250}
              disabled={busy}
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
            />
          </FormField>
        </form>
      </DetailDrawer>
      <ConfirmDialog
        open={!!pending && pending.row.company_id === companyId && pending.row.module === module}
        onOpenChange={(value) => {
          if (!value && !busy) setPending(undefined);
        }}
        title={t('common.confirmTransition')}
        description={
          pending
            ? t('common.transitionHint', {
                name: pending.row.title,
                status: statusLabel(pending.status),
              })
            : ''
        }
        confirmLabel={pending ? actionLabel(pending.status) : t('common.confirm')}
        variant="primary"
        busy={busy}
        onConfirm={changeStatus}
      />
      <ConfirmDialog
        open={discard}
        onOpenChange={setDiscard}
        title={t('common.discardTitle')}
        description={t('common.discardHint')}
        confirmLabel={t('common.discard')}
        onConfirm={() => {
          setDiscard(false);
          setOpen(false);
          setEditing(false);
          auditGeneration.current++;
        }}
      />
    </section>
  );
}
