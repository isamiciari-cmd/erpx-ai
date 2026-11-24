import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, FileText, Printer, RefreshCw, Scale, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { buildTrialBalance, recordsToCsv, toMinorUnits } from '../../../services/businessRules';
import {
  listBusinessLedger,
  downloadBusinessCsv,
  type LedgerJournal,
} from '../../../services/businessRecordsService';
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

export interface AccountPeriodBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  opening: number;
  debit: number;
  credit: number;
  balance: number;
  closing: number;
}
export interface LedgerDetail {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
}
/** Uses complete posted journals, never the current table page, for accounting. */
export function buildLedgerReport(journals: LedgerJournal[], from = '', to = '') {
  if (from && to && from > to) throw new Error('invalid_period');
  const posted = journals.filter(
    (journal) => journal.status === 'posted' && (!to || journal.entry_date <= to),
  );
  const before = from ? posted.filter((journal) => journal.entry_date < from) : [];
  const period = posted.filter((journal) => !from || journal.entry_date >= from);
  const aggregate = (entries: LedgerJournal[]) =>
    buildTrialBalance(
      entries.map((journal) => ({
        status: journal.status,
        data: {
          lines: journal.lines.map((line) => ({
            account_id: line.account_id,
            account_code: line.account?.account_code || line.account_id,
            account_name: line.account?.account_name || line.account_id,
            debit: Number(line.debit_amount),
            credit: Number(line.credit_amount),
          })),
        },
      })),
    );
  const all = aggregate(posted);
  const opening = new Map(
    aggregate(before).map((account) => [account.account_id, account.balance]),
  );
  const movement = new Map(aggregate(period).map((account) => [account.account_id, account]));
  const types = new Map(
    posted.flatMap((journal) =>
      journal.lines.map((line) => [line.account_id, line.account?.account_type || ''] as const),
    ),
  );
  const balances: AccountPeriodBalance[] = all.map((account) => {
    const current = movement.get(account.account_id);
    const start = opening.get(account.account_id) || 0;
    const debit = current?.debit || 0;
    const credit = current?.credit || 0;
    const balance = (toMinorUnits(debit) - toMinorUnits(credit)) / 100;
    return {
      account_id: account.account_id,
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: types.get(account.account_id) || '',
      opening: start,
      debit,
      credit,
      balance,
      closing: (toMinorUnits(start) + toMinorUnits(balance)) / 100,
    };
  });
  const details: LedgerDetail[] = [...period]
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date) || a.id.localeCompare(b.id))
    .flatMap((journal) =>
      journal.lines.map((line, index) => ({
        id: `${journal.id}:${index}`,
        accountId: line.account_id,
        accountCode: line.account?.account_code || line.account_id,
        accountName: line.account?.account_name || line.account_id,
        date: journal.entry_date,
        reference: journal.entry_number,
        description: journal.description,
        debit: Number(line.debit_amount),
        credit: Number(line.credit_amount),
      })),
    );
  return { balances, details, journalCount: period.length };
}

export default function BusinessLedgerPage({
  mode = 'ledger',
}: {
  mode?: 'ledger' | 'trial' | 'reports' | 'cash' | 'dashboard';
}) {
  const { user } = useAuth();
  const { t } = useTranslation('finance');
  const fmt = useWorkspaceFormat();
  const access = useBusinessAccess('finance_journal');
  const [params] = useSearchParams();
  const companyId = user?.company_id || '';
  const [journals, setJournals] = useState<LedgerJournal[]>([]);
  const [loadedCompany, setLoadedCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [account, setAccount] = useState(params.get('account') || 'all');
  const [view, setView] = useState<'entries' | 'balances'>(
    mode === 'ledger' ? 'entries' : 'balances',
  );
  const [selected, setSelected] = useState<string>();
  const generation = useRef(0);
  const load = useCallback(async () => {
    const id = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const result = await listBusinessLedger(companyId);
      if (id === generation.current) {
        setJournals(result);
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
    };
  }, [load]);
  useEffect(() => {
    setSelected(undefined);
    setSearch('');
    setFrom('');
    setTo('');
    setAccount(params.get('account') || 'all');
  }, [companyId, params]);
  const source = loadedCompany === companyId ? journals : [];
  const report = useMemo(() => {
    try {
      return { ...buildLedgerReport(source, from, to), error: '' };
    } catch (err) {
      return {
        balances: [] as AccountPeriodBalance[],
        details: [] as LedgerDetail[],
        journalCount: 0,
        error:
          err instanceof Error && err.message === 'invalid_period'
            ? 'common.dateRange'
            : 'ledger.invalid',
      };
    }
  }, [source, from, to]);
  const isCash = (value: string) => /cash|bank|card|نقد|بنك|مصرف|بطاق/i.test(value);
  const matches = (id: string, code: string, name: string) =>
    (account === 'all' || id === account) &&
    `${code} ${name}`.toLowerCase().includes(search.toLowerCase()) &&
    (mode !== 'cash' || isCash(code + name));
  const balances = report.balances.filter((row) =>
    matches(row.account_id, row.account_code, row.account_name),
  );
  const details = report.details.filter((row) =>
    matches(row.accountId, row.accountCode, row.accountName),
  );
  const sum = (key: 'opening' | 'debit' | 'credit' | 'balance' | 'closing') =>
    balances.reduce((total, row) => total + toMinorUnits(row[key]), 0) / 100;
  const periodResult =
    balances
      .filter((row) => ['revenue', 'income', 'expense'].includes(row.account_type))
      .reduce((total, row) => total - toMinorUnits(row.balance), 0) / 100;
  const error = !!loadError || !!report.error;
  const selectedBalance = report.balances.find((row) => row.account_id === selected);
  const selectedLines = report.details.filter((row) => row.accountId === selected);
  const balanceColumns: TableColumn<AccountPeriodBalance>[] = [
    {
      key: 'code',
      label: t('accounts.code'),
      sortValue: (row) => row.account_code,
      render: (row) => <bdi className="font-mono text-xs">{row.account_code}</bdi>,
    },
    {
      key: 'name',
      label: t('common.account'),
      sortValue: (row) => row.account_name,
      render: (row) => (
        <button
          className="text-start font-semibold hover:underline"
          onClick={() => setSelected(row.account_id)}
        >
          {row.account_name}
        </button>
      ),
    },
    ...(['opening', 'debit', 'credit', 'balance', 'closing'] as const).map((key) => ({
      key,
      label: t(`ledger.${key === 'balance' ? 'net' : key}`),
      className: 'tabular-nums',
      sortValue: (row: AccountPeriodBalance) => row[key],
      render: (row: AccountPeriodBalance) => fmt.money(row[key]),
    })),
  ];
  const detailColumns: TableColumn<LedgerDetail>[] = [
    {
      key: 'date',
      label: t('common.date'),
      sortValue: (row) => row.date,
      render: (row) => fmt.date(row.date),
    },
    {
      key: 'journal',
      label: t('ledger.journal'),
      sortValue: (row) => row.reference,
      render: (row) => (
        <div>
          <bdi className="font-medium">{row.reference}</bdi>
          <p className="ws-muted text-xs">{row.description}</p>
        </div>
      ),
    },
    {
      key: 'account',
      label: t('common.account'),
      sortValue: (row) => row.accountCode,
      render: (row) => (
        <button className="text-start hover:underline" onClick={() => setSelected(row.accountId)}>
          <bdi>{row.accountCode}</bdi> · {row.accountName}
        </button>
      ),
    },
    {
      key: 'debit',
      label: t('common.debit'),
      sortValue: (row) => row.debit,
      className: 'tabular-nums',
      render: (row) => fmt.money(row.debit),
    },
    {
      key: 'credit',
      label: t('common.credit'),
      sortValue: (row) => row.credit,
      className: 'tabular-nums',
      render: (row) => fmt.money(row.credit),
    },
  ];
  function exportCsv() {
    const headers =
      view === 'entries'
        ? [
            t('common.date'),
            t('ledger.journal'),
            t('ledger.descriptionColumn'),
            t('accounts.code'),
            t('common.account'),
            t('common.debit'),
            t('common.credit'),
          ]
        : [
            t('accounts.code'),
            t('common.account'),
            ...['opening', 'debit', 'credit', 'net', 'closing'].map((key) => t(`ledger.${key}`)),
          ];
    const rows =
      view === 'entries'
        ? details.map((row) => [
            row.date,
            row.reference,
            row.description,
            row.accountCode,
            row.accountName,
            row.debit,
            row.credit,
          ])
        : balances.map((row) => [
            row.account_code,
            row.account_name,
            row.opening,
            row.debit,
            row.credit,
            row.balance,
            row.closing,
          ]);
    downloadBusinessCsv(
      `${mode}-${new Date().toISOString().slice(0, 10)}.csv`,
      recordsToCsv(headers, rows),
    );
  }
  return (
    <section className="ws-page">
      <PageHeader
        title={t(`ledger.${mode}`)}
        description={t('ledger.description')}
        eyebrow={t('common.finance')}
        actions={
          <>
            <Button icon={<RefreshCw size={16} />} onClick={() => void load()} disabled={loading}>
              {t('common.refresh')}
            </Button>
            {access.canExport && (
              <>
                <Button
                  icon={<Printer size={16} />}
                  onClick={() => window.print()}
                  disabled={error || loading}
                >
                  {t('common.print')}
                </Button>
                <Button
                  icon={<Download size={16} />}
                  variant="primary"
                  disabled={error || loading || !(view === 'entries' ? details : balances).length}
                  onClick={exportCsv}
                >
                  {t('common.export')}
                </Button>
              </>
            )}
          </>
        }
      />
      <nav className="flex flex-wrap gap-2">
        {[
          ['ledger.journalEntries', '/finance/journal-entries'],
          ['accounts.title', '/finance/accounting'],
          ['ledger.receivables', '/finance/accounts-receivable'],
          ['ledger.payables', '/finance/accounts-payable'],
        ].map(([key, href]) => (
          <Link className="ws-btn ws-btn-secondary" key={href} to={href}>
            {t(key)}
          </Link>
        ))}
      </nav>
      {loadError && (
        <ErrorState
          message={t(
            /permission|denied/i.test(loadError)
              ? 'common.permissionError'
              : 'common.connectionError',
          )}
          onRetry={() => void load()}
        />
      )}
      {report.error && <ErrorState message={t(report.error)} />}
      <div className="ws-stats">
        <StatCard
          label={t('ledger.postedCount')}
          value={
            error || (loading && !source.length)
              ? '—'
              : fmt.number(new Set(details.map((row) => row.id.split(':')[0])).size)
          }
          icon={<FileText size={20} />}
        />
        <StatCard
          label={t('ledger.debit')}
          value={error || (loading && !source.length) ? '—' : fmt.money(sum('debit'))}
        />
        <StatCard
          label={t('ledger.credit')}
          value={error || (loading && !source.length) ? '—' : fmt.money(sum('credit'))}
          icon={<Scale size={20} />}
        />
        <StatCard
          label={t('ledger.result')}
          value={error || (loading && !source.length) ? '—' : fmt.money(periodResult)}
          hint={t('ledger.resultHint')}
          icon={<Wallet size={20} />}
        />
      </div>
      <Panel
        title={t(view === 'entries' ? 'ledger.entries' : 'ledger.balances')}
        description={t('ledger.periodScope')}
        actions={
          <>
            <Button
              variant={view === 'entries' ? 'primary' : 'ghost'}
              onClick={() => setView('entries')}
            >
              {t('ledger.entries')}
            </Button>
            <Button
              variant={view === 'balances' ? 'primary' : 'ghost'}
              onClick={() => setView('balances')}
            >
              {t('ledger.balances')}
            </Button>
          </>
        }
      >
        <FilterBar>
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
          <FormField label={t('common.account')}>
            <select
              className="ws-input"
              aria-label={t('common.account')}
              value={account}
              onChange={(event) => setAccount(event.target.value)}
            >
              <option value="all">{t('common.allAccounts')}</option>
              {report.balances.map((row) => (
                <option key={row.account_id} value={row.account_id}>
                  {row.account_code} · {row.account_name}
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
              placeholder={t('common.account')}
            />
          </FormField>
          <Button
            variant="ghost"
            onClick={() => {
              setFrom('');
              setTo('');
              setSearch('');
              setAccount('all');
            }}
          >
            {t('common.clearFilters')}
          </Button>
        </FilterBar>
        {loading && !source.length ? (
          <LoadingSkeleton rows={6} />
        ) : (
          !error &&
          (view === 'entries' ? (
            <DataTable
              columns={detailColumns}
              rows={details}
              getRowKey={(row) => row.id}
              caption={t('ledger.entries')}
              emptyTitle={t('ledger.empty')}
              emptyDescription={t('ledger.emptyHint')}
            />
          ) : (
            <DataTable
              columns={balanceColumns}
              rows={balances}
              getRowKey={(row) => row.account_id}
              caption={t('ledger.balances')}
              emptyTitle={t('ledger.empty')}
              emptyDescription={t('ledger.emptyHint')}
            />
          ))
        )}
        {!error && (
          <div className="flex flex-wrap gap-5 border-t p-4 text-sm">
            <strong>{t('ledger.totals')}</strong>
            <span>
              {t('ledger.debit')}: {fmt.money(sum('debit'))}
            </span>
            <span>
              {t('ledger.credit')}: {fmt.money(sum('credit'))}
            </span>
            <span>
              {t('ledger.net')}: {fmt.money(sum('balance'))}
            </span>
          </div>
        )}
      </Panel>
      <p className="ws-muted text-sm">
        {t('ledger.balanceHint')} {t('ledger.legacyScope')}{' '}
        {mode === 'cash' && t('ledger.cashScope')}
      </p>
      <DetailDrawer
        open={!!selectedBalance}
        onClose={() => setSelected(undefined)}
        title={selectedBalance?.account_name || t('ledger.accountDetail')}
        description={selectedBalance?.account_code}
        wide
      >
        {selectedBalance && (
          <>
            <StatusBadge status="posted">{t('status.posted')}</StatusBadge>
            <div className="my-5 grid gap-4 sm:grid-cols-2">
              {(['opening', 'debit', 'credit', 'closing'] as const).map((key) => (
                <StatCard
                  key={key}
                  label={t(`ledger.${key}`)}
                  value={fmt.money(selectedBalance[key])}
                />
              ))}
            </div>
            <p className="mb-4 ws-muted text-sm">{t('ledger.balanceHint')}</p>
            <DataTable
              columns={detailColumns.filter((column) => column.key !== 'account')}
              rows={selectedLines}
              getRowKey={(row) => row.id}
              caption={t('ledger.accountDetail')}
              emptyTitle={t('ledger.empty')}
            />
          </>
        )}
      </DetailDrawer>
    </section>
  );
}
