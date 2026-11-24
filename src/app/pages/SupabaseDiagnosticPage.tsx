import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Circle,
  Database,
  Loader2,
  Play,
  ShieldCheck,
  SkipForward,
  XCircle,
} from 'lucide-react';
import { supabase, hasSupabaseConfig, isDemoMode } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Button,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
  useWorkspaceFormat,
} from '../components/erp/WorkspaceUI';

export type DiagnosticStatus = 'idle' | 'running' | 'pass' | 'fail' | 'skipped';
type TestId = 'connection' | 'authentication' | 'read' | 'create' | 'update' | 'delete';
export type DiagnosticResult = {
  id: TestId;
  status: DiagnosticStatus;
  detail: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  logs: { at: string; key: string }[];
};
export type OwnedDiagnosticRecord = {
  id: string;
  companyId: string;
  userId: string;
  sku: string;
  name: string;
  runId: string;
};
export type DiagnosticEnvironment = {
  development: boolean;
  appOrigin: string;
  serviceUrl: string;
  enabled: boolean;
  companyId: string;
  userId: string;
};
type SuiteOptions = DiagnosticEnvironment & { runId: string };
export type DiagnosticAdapter = {
  connection: () => Promise<void>;
  authenticate: () => Promise<{ id: string } | null>;
  read: (companyId: string) => Promise<void>;
  create: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (record: OwnedDiagnosticRecord) => Promise<void>;
  remove: (record: OwnedDiagnosticRecord) => Promise<void>;
};
const ids: TestId[] = ['connection', 'authentication', 'read', 'create', 'update', 'delete'];
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const initialResults = (): DiagnosticResult[] =>
  ids.map((id) => ({ id, status: 'idle', detail: 'health.notRun', logs: [] }));
function loopback(value: string) {
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
/** A local Vite page pointing at the hosted project is still a production DB. */
export function canRunDiagnosticWrites(environment: DiagnosticEnvironment) {
  return (
    environment.development &&
    environment.enabled &&
    loopback(environment.appOrigin) &&
    loopback(environment.serviceUrl) &&
    uuid.test(environment.companyId) &&
    uuid.test(environment.userId)
  );
}
function failureKey(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  return ['42501', '401', '403', 'PGRST301'].includes(code)
    ? 'health.permission'
    : 'health.failure';
}
function ownedProduct(
  row: Record<string, unknown>,
  options: SuiteOptions,
): OwnedDiagnosticRecord | null {
  const sku = `DIAG-${options.runId}`;
  const name = `ERPX diagnostic ${options.runId}`;
  const attributes = row.attributes as Record<string, unknown> | null;
  if (
    typeof row.id !== 'string' ||
    !uuid.test(row.id) ||
    row.company_id !== options.companyId ||
    row.created_by !== options.userId ||
    row.sku !== sku ||
    row.product_name !== name ||
    attributes?.erpx_diagnostic_run !== options.runId
  )
    return null;
  return {
    id: row.id,
    companyId: options.companyId,
    userId: options.userId,
    sku,
    name,
    runId: options.runId,
  };
}

/** Run only on an explicit action. All details are fixed translation keys. */
export async function runDiagnosticSuite(
  options: SuiteOptions,
  adapter: DiagnosticAdapter,
  onProgress: (results: DiagnosticResult[]) => void = () => undefined,
) {
  const results = initialResults();
  let owned: OwnedDiagnosticRecord | null = null;
  const emit = () => onProgress(results.map((result) => ({ ...result, logs: [...result.logs] })));
  const skip = (id: TestId, detail: string) => {
    const result = results.find((item) => item.id === id)!;
    Object.assign(result, { status: 'skipped', detail, finishedAt: new Date().toISOString() });
    result.logs.push({ at: result.finishedAt!, key: detail });
    emit();
  };
  const check = async (id: TestId, work: () => Promise<void>) => {
    const result = results.find((item) => item.id === id)!;
    const started = Date.now();
    Object.assign(result, { status: 'running', startedAt: new Date(started).toISOString() });
    emit();
    try {
      await work();
      result.status = 'pass';
      result.detail = `health.${id === 'authentication' ? 'auth' : id}Pass`;
    } catch (cause) {
      result.status = 'fail';
      result.detail = failureKey(cause);
    } finally {
      result.finishedAt = new Date().toISOString();
      result.duration = Date.now() - started;
      result.logs.push({ at: result.finishedAt, key: result.detail });
      emit();
    }
    return result.status === 'pass';
  };
  const connected = await check('connection', adapter.connection);
  const authenticated = connected
    ? await check('authentication', async () => {
        const identity = await adapter.authenticate();
        if (
          !uuid.test(options.userId) ||
          !uuid.test(options.companyId) ||
          identity?.id !== options.userId
        )
          throw new Error('identity_mismatch');
      })
    : (skip('authentication', 'health.dependency'), false);
  const readable = authenticated
    ? await check('read', () => adapter.read(options.companyId))
    : (skip('read', 'health.dependency'), false);
  if (!readable || !canRunDiagnosticWrites(options) || !uuid.test(options.runId)) {
    for (const id of ['create', 'update', 'delete'] as TestId[])
      skip(id, readable ? 'health.writesDisabled' : 'health.dependency');
    return { results, cleanup: null };
  }
  const created = await check('create', async () => {
    const row = await adapter.create({
      company_id: options.companyId,
      created_by: options.userId,
      category_id: null,
      sku: `DIAG-${options.runId}`,
      product_name: `ERPX diagnostic ${options.runId}`,
      product_type: 'SERVICE',
      tracking_method: 'NONE',
      track_inventory: false,
      unit_price: 0,
      cost_price: 0,
      vat_rate: 0,
      min_stock_level: 0,
      is_active: false,
      attributes: { erpx_diagnostic_run: options.runId },
    });
    owned = ownedProduct(row, options);
    if (!owned) throw new Error('ownership_mismatch');
  });
  if (!created || !owned) {
    skip('update', 'health.createFailed');
    skip('delete', 'health.createFailed');
    return { results, cleanup: null };
  }
  // Cleanup is attempted even if the update fails. Never use a global window ID,
  // a product from a previous run, or an unscoped delete as a fallback.
  await check('update', () => adapter.update(owned!));
  const removed = await check('delete', () => adapter.remove(owned!));
  if (!removed) {
    const result = results.find((item) => item.id === 'delete')!;
    result.detail = 'health.cleanupRequired';
    result.logs.push({ at: new Date().toISOString(), key: result.detail });
    emit();
  }
  return { results, cleanup: removed ? null : owned };
}

function productScope(query: any, record: OwnedDiagnosticRecord) {
  return query
    .eq('id', record.id)
    .eq('company_id', record.companyId)
    .eq('created_by', record.userId)
    .eq('sku', record.sku)
    .eq('product_name', record.name)
    .eq('attributes->>erpx_diagnostic_run', record.runId);
}
function createAdapter(): DiagnosticAdapter {
  return {
    connection: async () => {
      if (!hasSupabaseConfig || isDemoMode) throw new Error();
      const url = new URL('/auth/v1/health', import.meta.env.VITE_SUPABASE_URL);
      const response = await fetch(url, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error();
      await response.body?.cancel();
    },
    authenticate: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ? { id: data.user.id } : null;
    },
    read: async (companyId) => {
      const { error } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', companyId)
        .limit(1);
      if (error) throw error;
    },
    create: async (payload) => {
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select('id,company_id,created_by,sku,product_name,attributes')
        .single();
      if (error) throw error;
      if (!data) throw new Error();
      return data;
    },
    update: async (record) => {
      const { data, error } = await productScope(
        supabase.from('products').update({ unit_price: 0.01 }),
        record,
      )
        .select('id,unit_price')
        .single();
      if (error) throw error;
      if (data?.id !== record.id || Number(data.unit_price) !== 0.01) throw new Error();
    },
    remove: async (record) => {
      const { data, error } = await productScope(supabase.from('products').delete(), record).select(
        'id',
      );
      if (error) throw error;
      if (data?.length !== 1 || data[0].id !== record.id) throw new Error();
    },
  };
}

export default function SupabaseDiagnosticPage() {
  const { t } = useTranslation('administration');
  const { isRtl, number, date } = useWorkspaceFormat();
  const { user } = useAuth();
  const [tests, setTests] = useState<DiagnosticResult[]>(initialResults);
  const [running, setRunning] = useState(false);
  const [enableWrites, setEnableWrites] = useState(false);
  const [cleanup, setCleanup] = useState<OwnedDiagnosticRecord | null>(null);
  const [cleanupFailed, setCleanupFailed] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const environment: DiagnosticEnvironment = {
    development: import.meta.env.DEV,
    appOrigin: typeof window !== 'undefined' ? window.location.origin : '',
    serviceUrl: import.meta.env.VITE_SUPABASE_URL || '',
    companyId: user?.company_id || '',
    userId: user?.id || '',
    enabled: true,
  };
  const localWritesAllowed = canRunDiagnosticWrites(environment);
  useEffect(() => {
    generation.current++;
    setTests(initialResults());
    setCleanup(null);
    setEnableWrites(false);
    setCleanupFailed(false);
    return () => {
      generation.current++;
    };
  }, [user?.id, user?.company_id]);
  const run = async () => {
    if (lock.current || cleanup) return;
    lock.current = true;
    setRunning(true);
    setCleanupFailed(false);
    const request = generation.current;
    try {
      const result = await runDiagnosticSuite(
        { ...environment, enabled: enableWrites, runId: crypto.randomUUID() },
        createAdapter(),
        (results) => {
          if (request === generation.current) setTests(results);
        },
      );
      if (request === generation.current) {
        setTests(result.results);
        setCleanup(result.cleanup);
      }
    } finally {
      lock.current = false;
      setRunning(false);
    }
  };
  const retryCleanup = async () => {
    if (
      !cleanup ||
      lock.current ||
      !localWritesAllowed ||
      cleanup.companyId !== user?.company_id ||
      cleanup.userId !== user.id
    )
      return;
    lock.current = true;
    setRunning(true);
    setCleanupFailed(false);
    try {
      await createAdapter().remove(cleanup);
      setCleanup(null);
      setTests((previous) =>
        previous.map((result) =>
          result.id === 'delete'
            ? {
                ...result,
                status: 'pass',
                detail: 'health.cleanupDone',
                finishedAt: new Date().toISOString(),
                logs: [...result.logs, { at: new Date().toISOString(), key: 'health.cleanupDone' }],
              }
            : result,
        ),
      );
    } catch {
      setCleanupFailed(true);
    } finally {
      lock.current = false;
      setRunning(false);
    }
  };
  const checked = tests.some((test) => test.status !== 'idle');
  const hasFailure = tests.some((test) => test.status === 'fail');
  const summaryKey = !checked
    ? 'health.notRun'
    : running
      ? 'health.running'
      : tests[0].status === 'fail'
        ? 'health.connectionFailed'
        : hasFailure
          ? 'health.issues'
          : 'health.complete';
  const label = (status: DiagnosticStatus) =>
    t(
      `health.${status === 'idle' ? 'notRun' : status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : status}`,
    );
  const icon = (status: DiagnosticStatus) =>
    status === 'pass' ? (
      <CheckCircle2 size={20} className="text-emerald-600" />
    ) : status === 'fail' ? (
      <XCircle size={20} className="text-red-600" />
    ) : status === 'running' ? (
      <Loader2 size={20} className="animate-spin" />
    ) : status === 'skipped' ? (
      <SkipForward size={20} className="ws-muted" />
    ) : (
      <Circle size={20} className="ws-muted" />
    );

  return (
    <section className="ws-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <PageHeader
        eyebrow={t('common.administration')}
        title={t('health.title')}
        description={t('health.description')}
        actions={
          <Button
            variant="primary"
            onClick={() => void run()}
            loading={running}
            disabled={!!cleanup}
            icon={<Play size={16} />}
          >
            {t('health.run')}
          </Button>
        }
      />
      <div className="ws-stats">
        <StatCard
          label={t('health.title')}
          value={t(summaryKey)}
          icon={<Database size={19} />}
          tone={!checked || running ? 'neutral' : hasFailure ? 'warning' : 'success'}
        />
        <StatCard
          label={t('health.passed')}
          value={checked ? number(tests.filter((test) => test.status === 'pass').length) : '—'}
        />
        <StatCard
          label={t('health.failed')}
          value={checked ? number(tests.filter((test) => test.status === 'fail').length) : '—'}
        />
        <StatCard
          label={t('health.skipped')}
          value={checked ? number(tests.filter((test) => test.status === 'skipped').length) : '—'}
        />
      </div>
      <Panel
        title={t(checked ? summaryKey : 'health.readonly')}
        description={t(checked ? 'health.completeHint' : 'health.initialHint')}
        actions={
          <StatusBadge tone={enableWrites && localWritesAllowed ? 'warning' : 'neutral'}>
            {t(enableWrites && localWritesAllowed ? 'health.localWrite' : 'health.readonly')}
          </StatusBadge>
        }
      >
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[#111827]"
            checked={enableWrites}
            disabled={!localWritesAllowed || running || !!cleanup}
            onChange={(event) => setEnableWrites(event.target.checked)}
          />
          <span>
            <span className="block font-medium">{t('health.enableWrites')}</span>
            <span className="ws-muted mt-1 block">{t('health.writesHint')}</span>
          </span>
        </label>
        {cleanup && (
          <div role="alert" className="ws-inline-message ws-warning mt-4">
            <p>{t('health.cleanupRequired')}</p>
            <Button
              className="mt-3"
              variant="secondary"
              disabled={running || !localWritesAllowed}
              onClick={() => void retryCleanup()}
            >
              {t('health.retryCleanup')}
            </Button>
            {cleanupFailed && <p className="mt-2">{t('health.failure')}</p>}
          </div>
        )}
      </Panel>
      <div className="space-y-3" aria-live="polite">
        {tests.map((test) => (
          <Panel key={test.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                {icon(test.status)}
                <div>
                  <h2 className="font-semibold">{t(`health.${test.id}`)}</h2>
                  <p className="ws-muted mt-1 text-sm">{t(`health.${test.id}Hint`)}</p>
                  <p className="mt-3 text-sm">{t(test.detail)}</p>
                </div>
              </div>
              <StatusBadge
                tone={
                  test.status === 'pass' ? 'success' : test.status === 'fail' ? 'danger' : 'neutral'
                }
              >
                {label(test.status)}
              </StatusBadge>
            </div>
            {test.logs.length > 0 && (
              <details className="mt-4 rounded-lg border border-[var(--app-border)] p-3 text-sm">
                <summary className="cursor-pointer font-medium">
                  {t('health.history')}
                  {test.duration !== undefined && (
                    <span className="ws-muted ms-2 font-normal">
                      {t('health.duration', { duration: number(test.duration) })}
                    </span>
                  )}
                </summary>
                <dl className="ws-muted mt-3 flex flex-wrap gap-4 text-xs">
                  {test.startedAt && (
                    <div>
                      <dt>{t('health.started')}</dt>
                      <dd>
                        <time dateTime={test.startedAt}>
                          {date(test.startedAt, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </time>
                      </dd>
                    </div>
                  )}
                  {test.finishedAt && (
                    <div>
                      <dt>{t('health.finished')}</dt>
                      <dd>
                        <time dateTime={test.finishedAt}>
                          {date(test.finishedAt, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </time>
                      </dd>
                    </div>
                  )}
                </dl>
                <ol className="mt-3 space-y-2">
                  {test.logs.map((entry, index) => (
                    <li key={index} className="flex flex-wrap gap-3">
                      <time className="ws-muted text-xs" dateTime={entry.at}>
                        {date(entry.at, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </time>
                      <span>{t(entry.key)}</span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </Panel>
        ))}
      </div>
      <Panel title={t('common.readonly')} actions={<ShieldCheck size={20} className="ws-muted" />}>
        <p className="ws-muted text-sm">{t('health.safety')}</p>
        <p className="ws-muted mt-3 text-sm">{t('health.uuidFix')}</p>
      </Panel>
    </section>
  );
}
