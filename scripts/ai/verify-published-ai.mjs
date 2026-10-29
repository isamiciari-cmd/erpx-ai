/**
 * Published AI acceptance for the separately provisioned, empty test company.
 * Default/--plan is offline. Root runs --run only after publication and fixture
 * provisioning. The fixed private receipt is the sole credentials source.
 * No HAR/trace/storageState, tokens, credentials, raw responses, or stacks saved.
 * Chat consumes one integration quota unit but cannot write financial records.
 *
 * node scripts/ai/verify-published-ai.mjs --plan
 * node scripts/ai/verify-published-ai.mjs --run
 * node --test scripts/ai/verify-published-ai.test.mjs
 */
import { readFile, mkdir, writeFile, lstat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_ORIGIN = 'https://code-isamiciari-5169s-projects.vercel.app';
export const API_ORIGIN = 'https://svxmlejmhlocsjjtftxd.supabase.co';
export const EXPECTED_MODEL = 'qwen3:1.7b';
export const FIXTURE_PATH = '.tmp/ai-runtime/acceptance.private.json';
export const AI_PATH = '/functions/v1/ai/chat';
export const AI_ROUTE = '/finance/ai-assistant';
export const QUESTION =
  'أجب بالعربية وبجملة قصيرة اعتماداً فقط على الملخص المرفق: كم عدد الفواتير الصادرة في هذه الشركة؟ اذكر الرقم، وإذا كان العدد صفراً فقل بوضوح إنه لا توجد فواتير صادرة ولا تخمّن أرقاماً.';
export const UI_QUESTION = `[Finance] ${QUESTION}`;
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outputDirectory = resolve(workspace, '.tmp/ai-runtime');
const reportPath = resolve(outputDirectory, 'published-ai-verification.json');
const screenshotPath = resolve(outputDirectory, 'published-ai-verification.masked.png');
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const financialTables = ['invoices', 'sales', 'payments', 'journal_entries'];
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const keysAre = (value, names) =>
  object(value) &&
  Object.keys(value).length === names.length &&
  names.every((name) => Object.hasOwn(value, name));

class VerificationError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
function ensure(condition, code) {
  if (!condition) throw new VerificationError(code);
}
// Attach rejection handlers immediately: another failed UI action must not leave
// a pending Playwright waiter printing an unhandled error or stack on shutdown.
function observe(promise) {
  return promise.then(
    (value) => ({ value }),
    () => ({ failed: true }),
  );
}
async function observed(promise, failure) {
  const result = await promise;
  ensure(!result.failed, failure);
  return result.value;
}
export function safeFailure(error) {
  return error instanceof VerificationError ? error.code : 'verification_runtime_failed';
}
export function validateFixture(config) {
  ensure(
    object(config) &&
      config.projectRef === 'svxmlejmhlocsjjtftxd' &&
      config.baseUrl === APP_ORIGIN &&
      config.supabaseUrl === API_ORIGIN,
    'fixture_endpoints_invalid',
  );
  const runId = config.metadata?.runId;
  ensure(
    typeof runId === 'string' &&
      /^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}$/.test(runId) &&
      config.metadata.state === 'ready' &&
      config.metadata.version === 1,
    'fixture_not_ready',
  );
  ensure(
    config.companyName === `ERPX RELEASE ACCEPTANCE ${runId}` &&
      /^[a-f0-9]{48}$/.test(config.metadata.marker || ''),
    'fixture_marker_invalid',
  );
  ensure(config.allowLiveMutations === true, 'fixture_permission_missing');
  ensure(
    ['companyId', 'branchId', 'warehouseId', 'customerId', 'tenantId'].every((key) =>
      uuid.test(config[key] || ''),
    ),
    'fixture_ids_invalid',
  );
  for (const name of ['admin', 'cashier']) {
    const user = config[name];
    ensure(
      object(user) &&
        uuid.test(user.userId || '') &&
        user.email === `erpx.acceptance.${runId.toLowerCase()}.${name}@example.test` &&
        typeof user.password === 'string' &&
        user.password.length >= 24,
      'fixture_identity_invalid',
    );
  }
  ensure(config.admin.userId !== config.cashier.userId, 'fixture_identities_not_distinct');
  const key = config.supabaseAnonKey;
  ensure(typeof key === 'string', 'publishable_key_required');
  if (key.startsWith('sb_publishable_')) ensure(key.length > 20, 'publishable_key_invalid');
  else {
    let claims;
    try {
      claims = JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString('utf8'));
    } catch {
      throw new VerificationError('publishable_key_invalid');
    }
    ensure(key.startsWith('eyJ') && claims?.role === 'anon', 'privileged_key_refused');
  }
  return config;
}

/** Browser mutation allowlist. Negative security probes use the fixed HTTP code below. */
export function allowedBrowserMutation({ url, method, body }, config) {
  let target;
  try {
    target = new URL(url);
  } catch {
    return false;
  }
  if (target.origin !== API_ORIGIN || method !== 'POST') return false;
  if (target.pathname === '/auth/v1/token' && target.search === '?grant_type=password') {
    if (
      !object(body) ||
      body.email !== config.admin.email ||
      body.password !== config.admin.password
    )
      return false;
    const fields = Object.keys(body);
    return (
      fields.every((key) => ['email', 'password', 'gotrue_meta_security'].includes(key)) &&
      (body.gotrue_meta_security === undefined ||
        (object(body.gotrue_meta_security) && Object.keys(body.gotrue_meta_security).length === 0))
    );
  }
  if (target.search) return false;
  if (
    ['/rest/v1/rpc/get_user_roles', '/rest/v1/rpc/get_user_permissions'].includes(target.pathname)
  )
    return keysAre(body, ['p_user_id']) && body.p_user_id === config.admin.userId;
  if (target.pathname !== AI_PATH) return false;
  return (
    (keysAre(body, ['action']) && body.action === 'status') ||
    (keysAre(body, ['message']) && body.message === UI_QUESTION)
  );
}

export function readyStatus(body) {
  return (
    object(body) &&
    body.ok === true &&
    body.provider === 'ollama' &&
    body.model === EXPECTED_MODEL &&
    body.configured === true &&
    body.available === true &&
    body.readOnly === true &&
    body.mode === 'generative' &&
    body.deploymentMode === 'local_gateway' &&
    body.healthChecked === true &&
    body.healthScope === 'gateway' &&
    body.inferenceVerified === false &&
    typeof body.dataScope === 'string' &&
    body.dataScope.length > 0 &&
    body.limits?.invoiceLimit === 1000 &&
    body.limits?.messageCharacters === 4000 &&
    body.limits?.responseTokens === 512
  );
}

/** Deliberately reports only text checks, never the generated response itself. */
export function zeroAnswerChecks(text) {
  const normalized =
    typeof text === 'string'
      ? text.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
      : '';
  const arabic = (normalized.match(/\p{Script=Arabic}/gu) || []).length >= 8;
  const invoices = /فاتور|فواتير/.test(normalized);
  const explicitZero =
    /(?:^|[^\d])0(?:[^\d]|$)|صفر|لا\s+(?:توجد|يوجد|تتوفر)|لا\s+تحتوي|ليس\s+هناك|عدم\s+وجود/.test(
      normalized,
    );
  const positiveInvoiceCount =
    /(?:عدد|يوجد|توجد|هناك)[^.!؟\n]{0,35}\b[1-9]\d*\b[^.!؟\n]{0,20}(?:فاتور|فواتير)|\b[1-9]\d*\b\s+(?:فاتور|فواتير)|(?:الفواتير|فواتير|فاتورة)\s*(?:الصادرة)?\s*(?:هو|هي|:|يبلغ|يساوي)?\s*[1-9]\d*\b/.test(
      normalized,
    );
  return {
    arabic,
    referencesInvoices: invoices,
    explicitZeroOrNoInvoices: explicitZero,
    noPositiveNumericInvoiceCount: !positiveInvoiceCount,
  };
}

function endpointKind(url) {
  try {
    const target = new URL(url);
    if (target.origin === APP_ORIGIN) return 'published_site';
    if (target.origin !== API_ORIGIN) return 'external_origin';
    if (target.pathname === AI_PATH) return 'ai';
    if (target.pathname.startsWith('/auth/')) return 'authentication';
    if (target.pathname.startsWith('/rest/')) return 'database';
    return 'configured_api';
  } catch {
    return 'unknown';
  }
}
async function jsonResponse(response) {
  ensure(response.status < 300 || response.status >= 400, 'unexpected_http_redirect');
  const reader = response.body?.getReader();
  ensure(reader, 'http_body_missing');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      ensure(size <= 262144, 'http_body_too_large');
      chunks.push(Buffer.from(item.value));
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new VerificationError('http_json_invalid');
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* No raw transport errors. */
    }
  }
}

async function execute() {
  await mkdir(outputDirectory, { recursive: true });
  const report = {
    format: 'erpx_published_ai_verification_v1',
    status: 'running',
    startedAt: new Date().toISOString(),
    baseUrl: APP_ORIGIN,
    expectedProvider: 'ollama',
    expectedModel: EXPECTED_MODEL,
    steps: [],
    browserErrors: { page: 0, console: 0, failedRequests: 0, http: 0 },
    blockedRequests: [],
    evidence: {},
    privacy: {
      credentialsLogged: false,
      tokensPersisted: false,
      rawHttpPayloadsSaved: false,
      promptOrReplyTextLogged: false,
      renderedSyntheticReplyInMaskedScreenshot: false,
      tracesSaved: false,
      screenshotsMasked: true,
    },
    limitations: [
      'One synthetic empty-company question; text checks do not establish accuracy for real financial decisions.',
      'Gateway health is not model inference proof; only the successful actual answer verifies generation.',
      'No email, payment, ZATCA, original-company action or financial mutation is permitted. One chat uses integration quota.',
    ],
  };
  let browser,
    context,
    page,
    config,
    chatCount = 0;
  const step = async (name, work) => {
    const entry = { name, status: 'running', startedAt: new Date().toISOString() };
    report.steps.push(entry);
    try {
      await work();
      entry.status = 'passed';
      console.log(`PASS ${name}`);
    } catch (error) {
      entry.status = 'failed';
      entry.failure = safeFailure(error);
      throw error;
    } finally {
      entry.finishedAt = new Date().toISOString();
    }
  };
  try {
    await step('private_fixture', async () => {
      execFileSync('git', ['check-ignore', '--quiet', '--', FIXTURE_PATH], {
        cwd: workspace,
        stdio: 'ignore',
      });
      const file = resolve(workspace, FIXTURE_PATH);
      ensure(!(await lstat(file)).isSymbolicLink(), 'fixture_symlink_refused');
      config = validateFixture(JSON.parse(await readFile(file, 'utf8')));
      report.fixtureRunId = config.metadata.runId;
    });
    const request = async (
      path,
      { token, body, method = body === undefined ? 'GET' : 'POST', timeout = 30000 } = {},
    ) => {
      ensure(path.startsWith('/') && !path.startsWith('//'), 'http_path_invalid');
      const response = await fetch(API_ORIGIN + path, {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(timeout),
        headers: {
          apikey: config.supabaseAnonKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await jsonResponse(response) };
    };
    const signIn = async (name) => {
      const identity = config[name];
      const result = await request('/auth/v1/token?grant_type=password', {
        body: { email: identity.email, password: identity.password },
      });
      ensure(
        result.status === 200 &&
          result.body.user?.id === identity.userId &&
          result.body.user?.email === identity.email &&
          typeof result.body.access_token === 'string',
        'fixture_sign_in_failed',
      );
      const ownership = result.body.user?.app_metadata?.erpx_release_acceptance;
      ensure(
        ownership?.run_id === config.metadata.runId && ownership?.marker === config.metadata.marker,
        'fixture_auth_ownership_mismatch',
      );
      return result.body.access_token;
    };
    const read = async (token, table, filters, columns) => {
      const query = new URLSearchParams({
        select: columns,
        ...Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, `eq.${value}`])),
      });
      const result = await request(`/rest/v1/${table}?${query}`, { token });
      ensure(
        result.status === 200 && Array.isArray(result.body),
        'authenticated_fixture_read_failed',
      );
      return result.body;
    };
    const verifyIdentity = async (token, name) => {
      const users = await read(
        token,
        'users',
        { id: config[name].userId },
        'id,company_id,branch_id,role_id,status,email',
      );
      ensure(
        users.length === 1 &&
          users[0].id === config[name].userId &&
          users[0].company_id === config.companyId &&
          users[0].branch_id === config.branchId &&
          users[0].status === 'active' &&
          users[0].email === config[name].email,
        'fixture_membership_mismatch',
      );
      const roles = await read(
        token,
        'roles',
        { id: users[0].role_id },
        'id,company_id,name,status',
      );
      ensure(
        roles.length === 1 &&
          roles[0].name === name &&
          roles[0].status === 'active' &&
          [null, config.companyId].includes(roles[0].company_id),
        'fixture_role_mismatch',
      );
    };
    const emptyFinancials = async (token) => {
      const empty = {};
      for (const table of financialTables) {
        const query = new URLSearchParams({
          select: 'id',
          company_id: `eq.${config.companyId}`,
          limit: '1',
        });
        const result = await request(`/rest/v1/${table}?${query}`, { token });
        ensure(result.status === 200 && Array.isArray(result.body), 'financial_read_failed');
        ensure(result.body.length === 0, 'fixture_financial_records_present');
        empty[table] = true;
      }
      return empty;
    };
    let adminToken, cashierToken;
    await step('fixture_ownership_and_empty_company', async () => {
      adminToken = await signIn('admin');
      cashierToken = await signIn('cashier');
      await verifyIdentity(adminToken, 'admin');
      await verifyIdentity(cashierToken, 'cashier');
      const companies = await read(
        adminToken,
        'companies',
        { id: config.companyId },
        'id,name,status,currency,onboarding_owner_id,settings',
      );
      const company = companies[0],
        marker = company?.settings?.erpx_release_acceptance;
      ensure(
        companies.length === 1 &&
          company.name === config.companyName &&
          company.status === 'active' &&
          company.currency === 'SAR' &&
          company.onboarding_owner_id === config.admin.userId &&
          marker?.run_id === config.metadata.runId &&
          marker?.marker === config.metadata.marker,
        'fixture_company_ownership_mismatch',
      );
      report.evidence.ownedFixtureVerified = true;
      report.evidence.financialRecordsEmptyBefore = await emptyFinancials(adminToken);
    });
    await step('anonymous_ai_denied', async () => {
      const result = await request(AI_PATH, { body: { action: 'status' } });
      report.evidence.anonymousStatus = result.status;
      ensure(result.status === 401, 'anonymous_ai_not_denied');
    });
    await step('cashier_ai_denied', async () => {
      const result = await request(AI_PATH, { token: cashierToken, body: { action: 'status' } });
      report.evidence.cashierStatus = result.status;
      ensure(result.status === 403, 'cashier_ai_not_denied');
    });
    await step('admin_local_model_status', async () => {
      const result = await request(AI_PATH, {
        token: adminToken,
        body: { action: 'status' },
        timeout: 15000,
      });
      report.evidence.adminStatus = {
        http: result.status,
        contractMatches: readyStatus(result.body),
      };
      ensure(result.status === 200 && readyStatus(result.body), 'admin_model_not_ready');
    });
    await step('client_overrides_denied', async () => {
      report.evidence.overrideStatuses = {};
      for (const [key, value] of [
        ['provider', 'openai'],
        ['model', 'untrusted-model'],
        ['company_id', '00000000-0000-4000-8000-000000000000'],
      ]) {
        const result = await request(AI_PATH, {
          token: adminToken,
          body: { action: 'status', [key]: value },
        });
        report.evidence.overrideStatuses[key] = result.status;
        ensure(
          result.status === 400 &&
            result.body?.ok === false &&
            result.body?.code === 'invalid_request',
          'client_override_not_denied',
        );
      }
    });
    await step('published_ui_sign_in_and_model_status', async () => {
      const { chromium } = await import('playwright');
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
        locale: 'ar-SA',
        timezoneId: 'Asia/Riyadh',
        serviceWorkers: 'block',
        acceptDownloads: false,
      });
      await context.addInitScript(() => {
        localStorage.setItem('language', 'ar');
        localStorage.setItem('i18nextLng', 'ar');
      });
      await context.route('**/*', async (route) => {
        const current = route.request(),
          target = new URL(current.url()),
          method = current.method();
        if (
          ['GET', 'HEAD'].includes(method) &&
          (target.origin === APP_ORIGIN ||
            (target.origin === API_ORIGIN &&
              (/^\/rest\/v1\/[a-z_]+$/.test(target.pathname) ||
                target.pathname === '/auth/v1/user')) ||
            ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(target.origin))
        )
          return route.continue();
        if (method === 'OPTIONS' && target.origin === API_ORIGIN) return route.continue();
        let body;
        try {
          body = current.postDataJSON();
        } catch {
          body = null;
        }
        let allowed = allowedBrowserMutation({ url: current.url(), method, body }, config);
        if (allowed && target.pathname === AI_PATH && Object.hasOwn(body, 'message')) {
          chatCount++;
          allowed = chatCount === 1;
        }
        if (allowed) return route.continue();
        report.blockedRequests.push({
          endpoint: endpointKind(current.url()),
          method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(method)
            ? method
            : 'other',
        });
        return route.abort('blockedbyclient');
      });
      page = await context.newPage();
      page.setDefaultTimeout(45000);
      page.on('pageerror', () => {
        report.browserErrors.page++;
      });
      page.on('console', (message) => {
        if (message.type() === 'error') report.browserErrors.console++;
      });
      page.on('requestfailed', () => {
        report.browserErrors.failedRequests++;
      });
      page.on('response', (response) => {
        if (response.status() >= 400) report.browserErrors.http++;
      });
      page.on('dialog', async (dialog) => {
        report.browserErrors.page++;
        await dialog.dismiss();
      });
      const navigation = await page.goto(APP_ORIGIN + '/login', { waitUntil: 'domcontentloaded' });
      ensure(navigation?.ok(), 'published_login_unavailable');
      await page.locator('#email').fill(config.admin.email);
      await page.locator('#password').fill(config.admin.password);
      const authentication = observe(
        page.waitForResponse(
          (response) =>
            new URL(response.url()).origin === API_ORIGIN &&
            new URL(response.url()).pathname === '/auth/v1/token' &&
            response.request().method() === 'POST',
        ),
      );
      await page.locator('form button[type="submit"]').click();
      ensure(
        (await observed(authentication, 'published_ui_auth_response_missing')).status() === 200,
        'published_ui_sign_in_failed',
      );
      await page.waitForURL(
        (url) => url.origin === APP_ORIGIN && !url.pathname.startsWith('/login'),
      );
      // Finish initial dashboard reads before navigation; do not count a deliberate
      // navigation cancellation as a production request failure.
      await page.waitForLoadState('networkidle');
      const statusResponse = observe(
        page.waitForResponse(
          (response) =>
            new URL(response.url()).origin === API_ORIGIN &&
            new URL(response.url()).pathname === AI_PATH &&
            response.request().postDataJSON()?.action === 'status',
        ),
      );
      const route = await page.goto(APP_ORIGIN + AI_ROUTE, { waitUntil: 'domcontentloaded' });
      ensure(
        route?.ok() && new URL(page.url()).pathname === AI_ROUTE,
        'published_assistant_route_unavailable',
      );
      const ready = await observed(statusResponse, 'published_ui_status_response_missing');
      ensure(
        ready.status() === 200 && readyStatus(await ready.json()),
        'published_ui_model_not_ready',
      );
      await page.getByText('نموذج محلي مجاني', { exact: true }).waitFor();
      await page.getByText('الخدمة المحلية متصلة', { exact: true }).waitFor();
      await page.waitForLoadState('networkidle');
      await page.locator('#assistant-message').waitFor({ state: 'visible' });
      ensure((await page.locator('[role="alert"]').count()) === 0, 'published_ui_status_alert');
      report.evidence.actualUiRouteVerified = true;
    });
    await step('actual_arabic_zero_invoice_answer', async () => {
      const responsePromise = observe(
        page.waitForResponse(
          (response) =>
            new URL(response.url()).origin === API_ORIGIN &&
            new URL(response.url()).pathname === AI_PATH &&
            response.request().postDataJSON()?.message === UI_QUESTION,
          { timeout: 125000 },
        ),
      );
      const refreshedStatusPromise = observe(
        page.waitForResponse(
          (response) =>
            new URL(response.url()).origin === API_ORIGIN &&
            new URL(response.url()).pathname === AI_PATH &&
            response.request().postDataJSON()?.action === 'status',
          { timeout: 125000 },
        ),
      );
      await page.locator('#assistant-message').fill(QUESTION);
      await page.getByRole('button', { name: 'اسأل المساعد', exact: true }).click();
      const response = await observed(responsePromise, 'actual_model_response_missing');
      ensure(response.status() === 200, 'actual_model_chat_failed');
      const body = await response.json();
      ensure(
        body?.ok === true &&
          body.provider === 'ollama' &&
          body.model === EXPECTED_MODEL &&
          body.readOnly === true &&
          body.mode === 'generative' &&
          typeof body.generatedAt === 'string' &&
          Number.isFinite(Date.parse(body.generatedAt)),
        'actual_model_reply_contract_invalid',
      );
      const checks = zeroAnswerChecks(body.message);
      report.evidence.answerChecks = checks;
      ensure(Object.values(checks).every(Boolean), 'actual_model_zero_answer_failed');
      const article = page.locator('article[aria-live="polite"]');
      await article.waitFor({ state: 'visible' });
      ensure(
        (await article.locator('div.whitespace-pre-wrap').innerText()) === body.message,
        'actual_reply_not_rendered',
      );
      ensure(
        (await article.innerText()).includes(EXPECTED_MODEL),
        'reply_model_identity_not_rendered',
      );
      const refreshedStatus = await observed(
        refreshedStatusPromise,
        'post_chat_status_response_missing',
      );
      ensure(
        refreshedStatus.status() === 200 && readyStatus(await refreshedStatus.json()),
        'post_chat_model_not_ready',
      );
      await page.getByText('الخدمة المحلية متصلة', { exact: true }).waitFor();
      await page.waitForLoadState('networkidle');
      ensure((await page.locator('[role="alert"]').count()) === 0, 'published_ui_chat_alert');
      report.evidence.actualGenerationVerified = true;
      const section = page.locator('section').filter({ has: page.locator('#assistant-message') });
      ensure((await section.count()) === 1, 'assistant_screenshot_scope_invalid');
      await section.screenshot({
        path: screenshotPath,
        animations: 'disabled',
        mask: [section.locator('textarea,input')],
        maskColor: '#111827',
      });
      report.evidence.maskedScreenshot = 'published-ai-verification.masked.png';
      report.privacy.renderedSyntheticReplyInMaskedScreenshot = true;
    });
    await step('read_only_invariants_after_chat', async () => {
      report.evidence.financialRecordsEmptyAfter = await emptyFinancials(adminToken);
      ensure(chatCount === 1, 'unexpected_chat_request_count');
      ensure(report.blockedRequests.length === 0, 'unexpected_browser_request_blocked');
      ensure(
        Object.values(report.browserErrors).every((count) => count === 0),
        'published_browser_errors_present',
      );
      report.evidence.businessMutationsObserved = 0;
    });
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.failure = safeFailure(error);
  } finally {
    if (context) {
      try {
        await context.close();
      } catch {
        /* Private runtime details withheld. */
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* Private runtime details withheld. */
      }
    }
    report.finishedAt = new Date().toISOString();
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  }
  console.log(
    JSON.stringify({
      status: report.status,
      report: '.tmp/ai-runtime/published-ai-verification.json',
      ...(report.failure ? { failure: report.failure } : {}),
    }),
  );
  if (report.status !== 'passed') process.exitCode = 1;
}

export async function main(args = process.argv.slice(2)) {
  if (args.length === 0 || (args.length === 1 && args[0] === '--plan')) {
    console.log(
      JSON.stringify({
        mode: 'offline_plan',
        baseUrl: APP_ORIGIN,
        privateFixture: FIXTURE_PATH,
        expectedProvider: 'ollama',
        expectedModel: EXPECTED_MODEL,
        createsCompanyOrUsers: false,
        financialWrites: false,
        chatRequests: 1,
        applied: false,
      }),
    );
    return;
  }
  ensure(args.length === 1 && args[0] === '--run', 'use_plan_or_run_only');
  await execute();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(JSON.stringify({ status: 'failed', failure: safeFailure(error) }));
    process.exitCode = 1;
  });
}
