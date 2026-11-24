import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, RefreshCw, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  downloadBusinessCsv,
  listBusinessRecords,
  type BusinessRecord,
} from '../../../services/businessRecordsService';
import { recordsToCsv } from '../../../services/businessRules';
import { useBusinessAccess } from './BusinessRecordsPage';
import {
  Button,
  DataTable,
  DetailDrawer,
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
const modules = [
  ['hr_employees', '/hr/employees'],
  ['hr_attendance', '/hr/attendance'],
  ['hr_leave', '/hr/leaves'],
  ['hr_payroll', '/hr/payroll'],
  ['hr_recruitment', '/hr/recruitment'],
];
const sensitive = new Set(['salary', 'base_salary', 'allowances', 'deductions', 'net_salary']);
export default function BusinessHRReports({ dashboard = false }: { dashboard?: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslation('finance');
  const permissions = usePermissions();
  const fmt = useWorkspaceFormat();
  const companyId = user?.company_id || '';
  const [module, setModule] = useState('hr_employees');
  const access = useBusinessAccess(module);
  const [data, setData] = useState<Record<string, BusinessRecord[]>>({});
  const [loadedCompany, setLoadedCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BusinessRecord>();
  const generation = useRef(0);
  const privileged = [
    'admin',
    'owner',
    'developer',
    'super_admin',
    'manager',
    'hr_manager',
    'hr',
  ].some(permissions.hasRole);
  const allowed = modules.filter(
    ([key]) =>
      privileged ||
      ['hr', 'hr.view', 'hr.read', key, `${key}.view`, `${key}.read`].some(
        permissions.hasPermission,
      ),
  );
  const moduleKey = allowed.map(([key]) => key).join(',');
  const load = useCallback(async () => {
    const id = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const results = await Promise.all(
        moduleKey
          .split(',')
          .filter(Boolean)
          .map(async (key) => [key, await listBusinessRecords(companyId, key)] as const),
      );
      if (id === generation.current) {
        setData(Object.fromEntries(results));
        setLoadedCompany(companyId);
      }
    } catch (err) {
      if (id === generation.current) setError(err instanceof Error ? err.message : 'unavailable');
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, [companyId, moduleKey]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    setSelected(undefined);
    setSearch('');
    setFrom('');
    setTo('');
  }, [companyId]);
  useEffect(() => {
    setSelected(undefined);
  }, [module]);
  useEffect(() => {
    if (!moduleKey.split(',').includes(module) && moduleKey) setModule(moduleKey.split(',')[0]);
  }, [module, moduleKey]);
  const scoped = loadedCompany === companyId ? data : {};
  const invalidPeriod = !!from && !!to && from > to;
  const matches = (record: BusinessRecord) =>
    !invalidPeriod &&
    (!from || record.record_date >= from) &&
    (!to || record.record_date <= to) &&
    `${record.title} ${record.reference} ${String(record.data.department || '')} ${String(record.data.position || '')}`
      .toLowerCase()
      .includes(search.toLowerCase());
  const rows = useMemo(
    () => (moduleKey.split(',').includes(module) ? (scoped[module] || []).filter(matches) : []),
    [scoped, module, moduleKey, from, to, search, invalidPeriod],
  );
  const showAmount = access.canSeeSalary && ['hr_employees', 'hr_payroll'].includes(module);
  const label = (key: string) => t(`modules.${key}.title`);
  const statusLabel = (status: string) =>
    t(`status.${status}`, { defaultValue: status.replaceAll('_', ' ') });
  function exportCsv() {
    const keys = [...new Set(rows.flatMap((record) => Object.keys(record.data)))].filter(
      (key) => access.canSeeSalary || !sensitive.has(key),
    );
    downloadBusinessCsv(
      `${module}-${new Date().toISOString().slice(0, 10)}.csv`,
      recordsToCsv(
        [
          t('common.name'),
          t('common.reference'),
          t('common.date'),
          t('common.status'),
          ...(showAmount ? [t(module === 'hr_employees' ? 'common.salary' : 'common.netPay')] : []),
          ...keys.map((key) => t(`fields.${key}`, { defaultValue: key.replaceAll('_', ' ') })),
        ],
        rows.map((record) => [
          record.title,
          record.reference,
          record.record_date,
          statusLabel(record.status),
          ...(showAmount ? [record.amount] : []),
          ...keys.map((key) => record.data[key]),
        ]),
      ),
    );
  }
  const columns: TableColumn<BusinessRecord>[] = [
    {
      key: 'name',
      label: t('common.name'),
      sortValue: (record) => record.title,
      render: (record) => (
        <button
          className="text-start font-semibold hover:underline"
          onClick={() => setSelected(record)}
        >
          {record.title}
        </button>
      ),
    },
    {
      key: 'reference',
      label: t('common.reference'),
      sortValue: (record) => record.reference,
      render: (record) => <bdi>{record.reference || t('common.missing')}</bdi>,
    },
    ...(module === 'hr_employees'
      ? ['department', 'position'].map((key) => ({
          key,
          label: t(`fields.${key}`),
          sortValue: (record: BusinessRecord) => String(record.data[key] || ''),
          render: (record: BusinessRecord) => String(record.data[key] || t('common.missing')),
        }))
      : []),
    {
      key: 'date',
      label: t(module === 'hr_employees' ? 'common.hireDate' : 'common.date'),
      sortValue: (record) => record.record_date,
      render: (record) => fmt.date(record.record_date),
    },
    {
      key: 'status',
      label: t('common.status'),
      render: (record) => (
        <StatusBadge status={record.status}>{statusLabel(record.status)}</StatusBadge>
      ),
    },
    ...(showAmount
      ? [
          {
            key: 'amount',
            label: t(module === 'hr_employees' ? 'common.salary' : 'common.netPay'),
            sortValue: (record: BusinessRecord) => record.amount,
            render: (record: BusinessRecord) => fmt.money(record.amount),
          },
        ]
      : []),
  ];
  return (
    <section className="ws-page">
      <PageHeader
        title={t(dashboard ? 'hr.dashboard' : 'hr.reports')}
        description={t('hr.description')}
        eyebrow={t('common.hr')}
        actions={
          <>
            <Button icon={<RefreshCw size={16} />} disabled={loading} onClick={() => void load()}>
              {t('common.refresh')}
            </Button>
            {access.canExport && (
              <Button
                variant="primary"
                icon={<Download size={16} />}
                disabled={loading || !!error || invalidPeriod || !rows.length}
                onClick={exportCsv}
              >
                {t('common.export')}
              </Button>
            )}
          </>
        }
      />
      {error && (
        <ErrorState
          message={t(
            /permission|denied|42501/i.test(error)
              ? 'common.permissionError'
              : 'common.connectionError',
          )}
          onRetry={() => void load()}
        />
      )}
      {!moduleKey && !permissions.loading && <ErrorState message={t('common.permissionError')} />}
      <div className="ws-stats">
        {[
          ['hr_employees', 'hr.activeEmployees', 'active'],
          ['hr_leave', 'hr.leavePending', 'submitted'],
          ['hr_payroll', 'hr.payrollPending', 'submitted'],
        ]
          .filter(([key]) => moduleKey.split(',').includes(key))
          .map(([key, text, status]) => (
            <StatCard
              key={key}
              label={t(text)}
              value={
                (loading || !!error) && !Object.keys(scoped).length
                  ? '—'
                  : fmt.number(
                      (scoped[key] || [])
                        .filter(matches)
                        .filter((record) => record.status === status).length,
                    )
              }
              hint={t('common.scope')}
              icon={<Users size={19} />}
            />
          ))}
      </div>
      <nav className="flex flex-wrap gap-2">
        {allowed.map(([key, href]) => (
          <Link key={key} to={href} className="ws-btn ws-btn-secondary">
            {label(key)}
          </Link>
        ))}
      </nav>
      <Panel title={label(module)} description={t('hr.amountScope')}>
        <FilterBar>
          <FormField label={t('hr.module')}>
            <select
              className="ws-input"
              aria-label={t('hr.module')}
              value={module}
              onChange={(event) => setModule(event.target.value)}
            >
              {allowed.map(([key]) => (
                <option key={key} value={key}>
                  {label(key)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('common.search')}>
            <input
              className="ws-input"
              aria-label={t('common.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('common.searchHint')}
            />
          </FormField>
          <FormField label={t('common.from')}>
            <input
              className="ws-input"
              aria-label={t('common.from')}
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </FormField>
          <FormField label={t('common.to')}>
            <input
              className="ws-input"
              aria-label={t('common.to')}
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </FormField>
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
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
        {loading && !Object.keys(scoped).length ? (
          <LoadingSkeleton rows={5} />
        ) : error && !Object.keys(scoped).length ? (
          <p className="ws-muted p-5">{t('common.operationError')}</p>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(record) => record.id}
            caption={label(module)}
            emptyTitle={t('common.noMatches')}
            emptyDescription={t('common.noMatchesHint')}
          />
        )}
      </Panel>
      <DetailDrawer
        open={!!selected && loadedCompany === companyId && selected.module === module}
        onClose={() => setSelected(undefined)}
        title={selected?.title || t('hr.detail')}
        description={label(module)}
      >
        {selected && (
          <>
            <StatusBadge status={selected.status}>{statusLabel(selected.status)}</StatusBadge>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              {[
                [t('common.reference'), selected.reference || t('common.missing')],
                [t('common.date'), fmt.date(selected.record_date)],
                ...(showAmount
                  ? [
                      [
                        t(module === 'hr_employees' ? 'common.salary' : 'common.netPay'),
                        fmt.money(selected.amount),
                      ],
                    ]
                  : []),
                ...Object.entries(selected.data)
                  .filter(([key]) => access.canSeeSalary || !sensitive.has(key))
                  .map(([key, value]) => [
                    t(`fields.${key}`, { defaultValue: key.replaceAll('_', ' ') }),
                    typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value ?? t('common.missing')),
                  ]),
              ].map(([key, value]) => (
                <div key={key}>
                  <dt className="ws-muted text-xs">{key}</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words" dir="auto">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </DetailDrawer>
    </section>
  );
}
