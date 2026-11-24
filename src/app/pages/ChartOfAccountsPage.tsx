import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Download, Plus, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { isDemoMode } from '../../lib/supabase';
import {
  listBusinessAccounts,
  saveBusinessAccount,
  downloadBusinessCsv,
  listBusinessLedger,
  type BusinessAccount,
  type LedgerJournal,
} from '../../services/businessRecordsService';
import { recordsToCsv } from '../../services/businessRules';
import { useBusinessAccess } from '../components/erp/BusinessRecordsPage';
import {
  Button,
  ConfirmDialog,
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
} from '../components/erp/WorkspaceUI';
const types = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const blank = { account_code: '', account_name: '', account_type: 'asset' };
export default function ChartOfAccountsPage() {
  const { user } = useAuth();
  const { t } = useTranslation('finance');
  const fmt = useWorkspaceFormat();
  const access = useBusinessAccess('finance_journal');
  const companyId = user?.company_id || '';
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [loadedCompany, setLoadedCompany] = useState('');
  const [form, setForm] = useState(blank);
  const [selected, setSelected] = useState<BusinessAccount>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [archiveTarget, setArchiveTarget] = useState<BusinessAccount>();
  const [discard, setDiscard] = useState(false);
  const [baseline, setBaseline] = useState('');
  const [ledger, setLedger] = useState<LedgerJournal[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const generation = useRef(0);
  const activityGeneration = useRef(0);
  const mutation = useRef(false);
  const load = useCallback(async () => {
    const id = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const result = await listBusinessAccounts(companyId);
      if (id === generation.current) {
        setAccounts(result);
        setLoadedCompany(companyId);
      }
    } catch (err) {
      if (id === generation.current) setError(err instanceof Error ? err.message : 'unavailable');
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, [companyId]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
      activityGeneration.current++;
    };
  }, [load]);
  useEffect(() => {
    setOpen(false);
    setSelected(undefined);
    setArchiveTarget(undefined);
    setNotice('');
    setSearch('');
    setType('all');
  }, [companyId]);
  const source = loadedCompany === companyId ? accounts : [];
  const filtered = source.filter(
    (account) =>
      (type === 'all' || account.account_type === type) &&
      `${account.account_code} ${account.account_name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const dirty = editing && JSON.stringify(form) !== baseline;
  const unavailable = (loading || !!error) && loadedCompany !== companyId;
  useUnsavedChanges(open && dirty, t('common.discardHint'), { title: t('accounts.title'), values: form, baseline });
  const close = () => {
    if (!busy) {
      if (dirty) setDiscard(true);
      else {
        setOpen(false);
        activityGeneration.current++;
      }
    }
  };
  function startNew() {
    setSelected(undefined);
    setForm(blank);
    setBaseline(JSON.stringify(blank));
    setEditing(true);
    setFormError('');
    setOpen(true);
  }
  async function view(account: BusinessAccount) {
    const id = ++activityGeneration.current;
    setSelected(account);
    const next = {
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
    };
    setForm(next);
    setBaseline(JSON.stringify(next));
    setEditing(false);
    setFormError('');
    setOpen(true);
    setLedger([]);
    setActivityError('');
    setActivityLoading(true);
    try {
      const result = await listBusinessLedger(companyId);
      if (id === activityGeneration.current) setLedger(result);
    } catch (err) {
      if (id === activityGeneration.current)
        setActivityError(err instanceof Error ? err.message : 'unavailable');
    } finally {
      if (id === activityGeneration.current) setActivityLoading(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (mutation.current || (selected ? !access.canUpdate : !access.canCreate)) return;
    mutation.current = true;
    setBusy(true);
    setFormError('');
    try {
      if (!form.account_code.trim() || !form.account_name.trim())
        throw new Error(t('common.invalid', { field: t('common.account') }));
      await saveBusinessAccount(companyId, { ...form, id: selected?.id });
      setOpen(false);
      setNotice(t('accounts.saved'));
      await load();
    } catch (err) {
      setFormError(
        t(
          /permission|denied|42501/i.test(err instanceof Error ? err.message : '')
            ? 'common.permissionError'
            : 'common.operationError',
        ),
      );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  async function archive() {
    if (!archiveTarget || mutation.current || !access.canUpdate) return;
    mutation.current = true;
    setBusy(true);
    try {
      await saveBusinessAccount(companyId, { ...archiveTarget, is_active: false });
      setArchiveTarget(undefined);
      setOpen(false);
      setNotice(t('accounts.archived'));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unavailable');
      setArchiveTarget(undefined);
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  const columns: TableColumn<BusinessAccount>[] = [
    {
      key: 'code',
      label: t('accounts.code'),
      sortValue: (account) => account.account_code,
      render: (account) => <bdi className="font-mono">{account.account_code}</bdi>,
    },
    {
      key: 'name',
      label: t('accounts.name'),
      sortValue: (account) => account.account_name,
      render: (account) => (
        <button
          className="text-start font-semibold hover:underline"
          onClick={() => void view(account)}
        >
          {account.account_name}
        </button>
      ),
    },
    {
      key: 'type',
      label: t('accounts.type'),
      sortValue: (account) => account.account_type,
      render: (account) =>
        t(`accounts.${account.account_type}`, { defaultValue: account.account_type }),
    },
    {
      key: 'status',
      label: t('common.status'),
      render: () => <StatusBadge status="active">{t('status.active')}</StatusBadge>,
    },
    {
      key: 'actions',
      label: t('common.actions'),
      render: (account) => (
        <Button variant="ghost" onClick={() => void view(account)}>
          {t('common.view')}
        </Button>
      ),
    },
  ];
  const activity = ledger.flatMap((journal) =>
    journal.lines
      .filter((line) => line.account_id === selected?.id)
      .map((line, index) => ({
        id: `${journal.id}:${index}`,
        date: journal.entry_date,
        reference: journal.entry_number,
        debit: Number(line.debit_amount),
        credit: Number(line.credit_amount),
      })),
  );
  return (
    <section className="ws-page">
      <PageHeader
        title={t('accounts.title')}
        description={t('accounts.description')}
        eyebrow={t('common.finance')}
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
                icon={<Download size={16} />}
                disabled={!filtered.length || loading || !!error}
                onClick={() =>
                  downloadBusinessCsv(
                    'chart-of-accounts.csv',
                    recordsToCsv(
                      [t('accounts.code'), t('accounts.name'), t('accounts.type')],
                      filtered.map((account) => [
                        account.account_code,
                        account.account_name,
                        t(`accounts.${account.account_type}`, {
                          defaultValue: account.account_type,
                        }),
                      ]),
                    ),
                  )
                }
              >
                {t('common.export')}
              </Button>
            )}
            {access.canCreate && !isDemoMode && (
              <Button
                variant="primary"
                icon={<Plus size={16} />}
                disabled={loading || !!error}
                onClick={startNew}
              >
                {t('accounts.new')}
              </Button>
            )}
          </>
        }
      />
      {error && (
        <ErrorState
          message={t(
            /permission|denied/i.test(error) ? 'common.permissionError' : 'common.operationError',
          )}
          onRetry={() => void load()}
        />
      )}
      {notice && (
        <p role="status" className="ws-inline-message ws-success">
          {notice}
        </p>
      )}
      <div className="ws-stats">
        <StatCard
          label={t('accounts.loaded')}
          value={(loading || !!error) && !source.length ? '—' : fmt.number(source.length)}
          icon={<BookOpen size={20} />}
          hint={t('accounts.loadedHint')}
        />
        <StatCard
          label={t('common.matching')}
          value={unavailable ? '—' : fmt.number(filtered.length)}
        />
        <StatCard
          label={t('accounts.types')}
          value={
            unavailable
              ? '—'
              : fmt.number(new Set(filtered.map((account) => account.account_type)).size)
          }
        />
      </div>
      <Panel title={t('accounts.title')} description={t('accounts.noTree')}>
        <FilterBar>
          <FormField label={t('common.search')}>
            <input
              className="ws-input"
              aria-label={t('common.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('accounts.code') + ' / ' + t('accounts.name')}
            />
          </FormField>
          <FormField label={t('accounts.type')}>
            <select
              className="ws-input"
              aria-label={t('accounts.type')}
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="all">{t('common.allTypes')}</option>
              {types.map((value) => (
                <option key={value} value={value}>
                  {t(`accounts.${value}`)}
                </option>
              ))}
            </select>
          </FormField>
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setType('all');
            }}
          >
            {t('common.clearFilters')}
          </Button>
        </FilterBar>
        {loading && !source.length ? (
          <LoadingSkeleton rows={5} />
        ) : error && !source.length ? (
          <p className="ws-muted p-5">{t('common.operationError')}</p>
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            getRowKey={(account) => account.id}
            caption={t('accounts.title')}
            emptyTitle={source.length ? t('common.noMatches') : t('accounts.empty')}
            emptyDescription={source.length ? t('common.noMatchesHint') : t('accounts.emptyHint')}
          />
        )}
      </Panel>
      <DetailDrawer
        open={open && loadedCompany === companyId}
        onClose={close}
        title={selected?.account_name || t('accounts.new')}
        description={selected?.account_code || t('accounts.description')}
        footer={
          <>
            <Button disabled={busy} onClick={close}>
              {t('common.close')}
            </Button>
            {editing ? (
              <Button variant="primary" type="submit" form="account-form" loading={busy}>
                {t('accounts.save')}
              </Button>
            ) : (
              selected &&
              access.canUpdate && (
                <>
                  <Button onClick={() => setEditing(true)}>{t('common.edit')}</Button>
                  <Button variant="danger" onClick={() => setArchiveTarget(selected)}>
                    {t('accounts.deactivate')}
                  </Button>
                </>
              )
            )}
          </>
        }
      >
        {editing ? (
          <form id="account-form" onSubmit={save} className="space-y-5">
            {formError && <ErrorState message={formError} />}
            <fieldset disabled={busy} className="space-y-5">
              <FormField label={t('accounts.code')} htmlFor="account-code">
                <input
                  id="account-code"
                  className="ws-input"
                  required
                  maxLength={50}
                  dir="ltr"
                  value={form.account_code}
                  onChange={(event) => setForm({ ...form, account_code: event.target.value })}
                />
              </FormField>
              <FormField label={t('accounts.name')} htmlFor="account-name">
                <input
                  id="account-name"
                  className="ws-input"
                  required
                  maxLength={255}
                  value={form.account_name}
                  onChange={(event) => setForm({ ...form, account_name: event.target.value })}
                />
              </FormField>
              <FormField label={t('accounts.type')} htmlFor="account-type">
                <select
                  id="account-type"
                  className="ws-input"
                  value={form.account_type}
                  onChange={(event) => setForm({ ...form, account_type: event.target.value })}
                >
                  {types.map((value) => (
                    <option key={value} value={value}>
                      {t(`accounts.${value}`)}
                    </option>
                  ))}
                </select>
              </FormField>
            </fieldset>
          </form>
        ) : (
          selected && (
            <div className="space-y-6">
              <StatusBadge status="active">{t('status.active')}</StatusBadge>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="ws-muted text-xs">{t('accounts.code')}</dt>
                  <dd className="mt-1">
                    <bdi>{selected.account_code}</bdi>
                  </dd>
                </div>
                <div>
                  <dt className="ws-muted text-xs">{t('accounts.type')}</dt>
                  <dd className="mt-1">
                    {t(`accounts.${selected.account_type}`, {
                      defaultValue: selected.account_type,
                    })}
                  </dd>
                </div>
              </dl>
              <Link
                className="ws-btn ws-btn-secondary"
                to={`/finance/general-ledger?account=${encodeURIComponent(selected.id)}`}
              >
                {t('accounts.activity')}
              </Link>
              <h3 className="font-semibold">{t('ledger.accountDetail')}</h3>
              {activityLoading ? (
                <LoadingSkeleton rows={3} />
              ) : activityError ? (
                <ErrorState
                  message={t(
                    /permission|denied|42501/i.test(activityError)
                      ? 'common.permissionError'
                      : 'common.connectionError',
                  )}
                />
              ) : (
                <DataTable
                  rows={activity}
                  getRowKey={(row) => row.id}
                  columns={[
                    { key: 'date', label: t('common.date'), render: (row) => fmt.date(row.date) },
                    {
                      key: 'reference',
                      label: t('ledger.journal'),
                      render: (row) => <bdi>{row.reference}</bdi>,
                    },
                    {
                      key: 'debit',
                      label: t('common.debit'),
                      render: (row) => fmt.money(row.debit),
                    },
                    {
                      key: 'credit',
                      label: t('common.credit'),
                      render: (row) => fmt.money(row.credit),
                    },
                  ]}
                  emptyTitle={t('ledger.empty')}
                />
              )}
            </div>
          )
        )}
      </DetailDrawer>
      <ConfirmDialog
        open={!!archiveTarget && loadedCompany === companyId}
        onOpenChange={(value) => {
          if (!value && !busy) setArchiveTarget(undefined);
        }}
        title={t('accounts.confirm')}
        description={t('accounts.confirmHint')}
        confirmLabel={t('accounts.deactivate')}
        busy={busy}
        onConfirm={archive}
      />
      <ConfirmDialog
        open={discard}
        onOpenChange={setDiscard}
        title={t('common.discardTitle')}
        description={t('common.discardHint')}
        confirmLabel={t('common.discard')}
        onConfirm={() => {
          setDiscard(false);
          setEditing(false);
          setOpen(false);
        }}
      />
    </section>
  );
}
