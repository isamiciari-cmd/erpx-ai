/**
 * Production acceptance through the published UI, followed by authenticated,
 * read-only database assertions. Never provisions users, submits ZATCA, sends
 * email or calls a payment provider. Run only after the reviewed deployment.
 *
 * node scripts/live-workflow.mjs --config .tmp/release-acceptance/live-fixture.private.json --base-url https://REVIEWED-PRODUCTION-ORIGIN
 * Alternatively supply the same JSON using ERPX_LIVE_WORKFLOW_CONFIG_JSON.
 * No HAR, trace, storageState, response bodies or tokens are persisted.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const prefix = 'ERPX RELEASE ACCEPTANCE ';
// Resume only the catalog-only attempt: no posted record may be replayed.
const resumeUnpostedProduct = process.argv.includes('--resume-unposted-product');
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
const money = (value) => Math.round(Number(value) * 100);
class WorkflowError extends Error {
  constructor(code, safeDetails = {}) {
    super(code);
    this.code = code;
    this.safeDetails = safeDetails;
  }
}
function ensure(condition, code) {
  if (!condition) throw new WorkflowError(code);
}
function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}
function safeErrorKind(error) {
  return [
    'Error',
    'TypeError',
    'TimeoutError',
    'AssertionError',
    'SyntaxError',
    'RangeError',
  ].includes(error?.name)
    ? error.name
    : 'Error';
}
function safeRequestPath(target) {
  if (/^\/rest\/v1\/(?:rpc\/)?[a-z_][a-z0-9_]{0,79}$/.test(target.pathname)) return target.pathname;
  if (['/auth/v1/token', '/auth/v1/logout'].includes(target.pathname)) return target.pathname;
  if (target.pathname.startsWith('/functions/v1/')) return '/functions/v1/[redacted]';
  return '/[redacted]';
}

async function loadConfig() {
  let config;
  const configPath = argument('--config') || process.env.ERPX_LIVE_WORKFLOW_CONFIG;
  if (configPath) {
    const fullPath = resolve(workspace, configPath);
    const pathFromWorkspace = relative(workspace, fullPath);
    ensure(
      !isAbsolute(pathFromWorkspace) &&
        !pathFromWorkspace.startsWith(`..${sep}`) &&
        pathFromWorkspace.startsWith(`.tmp${sep}`),
      'config_must_be_in_gitignored_tmp',
    );
    try {
      execFileSync('git', ['check-ignore', '--quiet', '--', pathFromWorkspace], {
        cwd: workspace,
        stdio: 'ignore',
      });
    } catch {
      throw new WorkflowError('config_is_not_gitignored');
    }
    config = JSON.parse(await readFile(fullPath, 'utf8'));
  } else {
    ensure(Boolean(process.env.ERPX_LIVE_WORKFLOW_CONFIG_JSON), 'private_config_required');
    config = JSON.parse(process.env.ERPX_LIVE_WORKFLOW_CONFIG_JSON);
  }
  const reviewedUrl = argument('--base-url') || process.env.ERPX_LIVE_WORKFLOW_BASE_URL;
  ensure(Boolean(reviewedUrl), 'reviewed_production_origin_required');
  const base = new URL(reviewedUrl);
  ensure(
    base.protocol === 'https:' &&
      !base.username &&
      !base.password &&
      base.pathname === '/' &&
      !base.search &&
      !base.hash,
    'base_url_must_be_https_origin',
  );
  if (config.baseUrl)
    ensure(new URL(config.baseUrl).origin === base.origin, 'config_production_origin_mismatch');
  config.baseUrl = base.origin;
  const service = new URL(config.supabaseUrl);
  ensure(
    service.protocol === 'https:' &&
      !service.username &&
      !service.password &&
      service.pathname === '/' &&
      !service.search &&
      !service.hash,
    'invalid_supabase_origin',
  );
  config.supabaseUrl = service.origin;
  ensure(config.allowLiveMutations === true, 'explicit_live_mutation_flag_required');
  ensure(
    config.companyName?.startsWith(prefix) && config.companyName.length > prefix.length,
    'dedicated_acceptance_company_name_required',
  );
  ensure(
    ['companyId', 'branchId', 'warehouseId', 'customerId'].every((key) =>
      uuid.test(config[key] || ''),
    ),
    'fixture_ids_invalid',
  );
  ensure(
    config.admin && config.cashier && config.admin.userId !== config.cashier.userId,
    'distinct_test_identities_required',
  );
  for (const identity of [config.admin, config.cashier])
    ensure(
      uuid.test(identity.userId || '') &&
        typeof identity.email === 'string' &&
        typeof identity.password === 'string' &&
        identity.password.length >= 8,
      'fixture_credentials_invalid',
    );
  ensure(
    typeof config.supabaseAnonKey === 'string' && config.supabaseAnonKey.length > 15,
    'publishable_key_required',
  );
  // A service-role key must never enter a browser-workflow fixture.
  if (config.supabaseAnonKey.startsWith('eyJ')) {
    let payload;
    try {
      payload = JSON.parse(
        Buffer.from(config.supabaseAnonKey.split('.')[1], 'base64url').toString(),
      );
    } catch {
      throw new WorkflowError('invalid_publishable_key');
    }
    ensure(payload.role === 'anon', 'privileged_key_refused');
  } else ensure(config.supabaseAnonKey.startsWith('sb_publishable_'), 'privileged_key_refused');
  ensure(
    !['suspended', 'closed', 'cleaned'].includes(config.metadata?.state),
    'fixture_is_not_ready',
  );
  const runTag = String(config.metadata?.runId || '')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .slice(0, 42);
  ensure(runTag.length >= 6, 'fixture_run_id_required');
  return { ...config, runTag };
}

const state = {
  product: null,
  shift: null,
  sale: null,
  draft: null,
  pendingDialog: null,
  dialogFailure: false,
  blockedMutations: [],
};
const report = {
  format: 'erpx_live_acceptance_v1',
  status: 'running',
  startedAt: new Date().toISOString(),
  steps: [],
  evidence: {},
  screenshots: [],
  httpFailures: [],
  pageErrors: [],
  privacy: {
    credentialsLogged: false,
    responseBodiesSaved: false,
    privilegedKeyUsed: false,
    tracesSaved: false,
  },
  limitations: [
    'No external payment, email, ZATCA or original-company actions are performed.',
    'Inventory dispatch for standalone invoices remains a separate workflow; this scenario verifies it is not silently dispatched twice.',
  ],
};
let config,
  browser,
  adminContext,
  cashierContext,
  adminPage,
  cashierPage,
  activePage,
  outputDirectory,
  adminDb,
  cashierDb;

function readFailure(error, endpoint) {
  const code =
    typeof error?.code === 'string' && /^(?:[A-Z\d]{5}|PGRST\d{3})$/.test(error.code)
      ? error.code
      : 'unspecified';
  return new WorkflowError('authenticated_read_failed', { endpoint, code });
}
async function queryResult(query, endpoint) {
  const result = await query;
  if (result.error) throw readFailure(result.error, endpoint);
  return result.data;
}
async function eventually(read, predicate, code, timeout = 30000) {
  const expires = Date.now() + timeout;
  do {
    const value = await read();
    if (predicate(value)) return value;
    await delay(400);
  } while (Date.now() < expires);
  throw new WorkflowError(code);
}
async function screenshot(page, name) {
  if (!page || page.isClosed()) return;
  const filename = `${String(report.screenshots.length + 1).padStart(2, '0')}-${name}.png`;
  await page.screenshot({
    path: resolve(outputDirectory, filename),
    fullPage: true,
    animations: 'disabled',
    mask: [page.locator('input[type="password"],#password,input[type="email"],#email')],
  });
  report.screenshots.push(filename);
}
async function step(name, work, page) {
  activePage = page || activePage;
  const entry = { name, startedAt: new Date().toISOString(), status: 'running' };
  report.steps.push(entry);
  try {
    await work();
    ensure(!state.dialogFailure, 'unexpected_browser_dialog');
    ensure(!state.blockedMutations.length, 'unexpected_network_mutation_blocked');
    entry.status = 'passed';
    console.log(`PASS ${name}`);
  } catch (error) {
    entry.status = 'failed';
    entry.failure = error instanceof WorkflowError ? error.code : 'ui_or_runtime_step_failed';
    throw error;
  } finally {
    entry.finishedAt = new Date().toISOString();
  }
}
async function goto(page, path) {
  const result = await page.goto(new URL(path, config.baseUrl).href, {
    waitUntil: 'domcontentloaded',
  });
  ensure(
    result && result.status() < 400 && new URL(page.url()).origin === config.baseUrl,
    'published_route_unavailable',
  );
}
function bodyOf(request) {
  try {
    return request.postDataJSON();
  } catch {
    return null;
  }
}
function matchesItem(items, quantity) {
  return (
    Array.isArray(items) &&
    items.length === 1 &&
    items[0].product_id === state.product?.id &&
    Number(items[0].quantity) === quantity &&
    Number(items[0].discount_percentage || 0) === 0
  );
}
function allowedBusinessMutation(path, method, body) {
  if (method !== 'POST' || !body || typeof body !== 'object') return false;
  if (path === '/rest/v1/products')
    return (
      body.company_id === config.companyId &&
      body.sku === `REL-${config.runTag}` &&
      body.created_by === config.admin.userId
    );
  if (path === '/rest/v1/shifts')
    return (
      body.company_id === config.companyId &&
      body.branch_id === config.branchId &&
      body.cashier_id === config.cashier.userId &&
      Number(body.opening_cash) === 0
    );
  const rpc = path.replace('/rest/v1/rpc/', '');
  if (rpc === 'receive_stock')
    return (
      body.p_company_id === config.companyId &&
      body.p_product_id === state.product?.id &&
      body.p_warehouse_id === config.warehouseId &&
      Number(body.p_quantity) === 10 &&
      body.p_reference === `REL-${config.runTag}-GRN`
    );
  if (rpc === 'complete_pos_sale')
    return (
      body.p_company_id === config.companyId &&
      body.p_branch_id === config.branchId &&
      body.p_cashier_id === config.cashier.userId &&
      body.p_shift_id === state.shift?.id &&
      body.p_payment_method === 'cash' &&
      body.p_customer_id == null &&
      matchesItem(body.p_items, 2)
    );
  if (rpc === 'save_invoice_draft')
    return (
      body.p_company_id === config.companyId &&
      body.p_customer_id === config.customerId &&
      matchesItem(body.p_items, 1) &&
      body.p_notes === `REL-${config.runTag}-DRAFT`
    );
  if (rpc === 'issue_invoice') return body.p_invoice_id === state.draft?.id;
  if (rpc === 'record_invoice_payment')
    return (
      body.p_invoice_id === state.draft?.id &&
      body.p_method === 'cash' &&
      [40, 75].includes(Number(body.p_amount)) &&
      [1, 2].some((index) => body.p_reference === `REL-${config.runTag}-RECEIPT-${index}`)
    );
  if (rpc === 'close_pos_shift')
    return body.p_shift_id === state.shift?.id && Number(body.p_closing_cash) === 230;
  return false;
}
async function protectContext(context, identity) {
  await context.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en');
  });
  await context.route('**/*', async (route) => {
    const request = route.request(),
      target = new URL(request.url()),
      method = request.method();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return route.continue();
    let allowed = false;
    if (target.origin === config.supabaseUrl) {
      if (
        target.pathname === '/auth/v1/token' &&
        target.searchParams.get('grant_type') === 'password'
      ) {
        const body = bodyOf(request);
        allowed = [config.admin, config.cashier].some(
          (identity) => body?.email === identity.email && body?.password === identity.password,
        );
      } else if (
        target.pathname === '/auth/v1/token' &&
        target.searchParams.get('grant_type') === 'refresh_token'
      )
        allowed = true;
      else if (target.pathname === '/auth/v1/logout') allowed = true;
      else if (['/rest/v1/rpc/get_user_roles', '/rest/v1/rpc/get_user_permissions'].includes(target.pathname)) {
        const body = bodyOf(request);
        allowed = method === 'POST' && body && Object.keys(body).length === 1 && body.p_user_id === identity.userId;
      }
      else allowed = allowedBusinessMutation(target.pathname, method, bodyOf(request));
    }
    if (allowed) return route.continue();
    state.blockedMutations.push({
      origin:
        target.origin === config.baseUrl
          ? 'published_site'
          : target.origin === config.supabaseUrl
            ? 'configured_supabase'
            : 'other_origin',
      path: safeRequestPath(target),
      method,
    });
    return route.abort('blockedbyclient');
  });
}
function watchPage(page) {
  page.on('pageerror', (error) => report.pageErrors.push({ kind: safeErrorKind(error) }));
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const target = new URL(response.url());
    // No query parameters, headers, response bodies, console text or auth tokens.
    report.httpFailures.push({
      status: response.status(),
      path: safeRequestPath(target),
      origin:
        target.origin === config.supabaseUrl
          ? 'configured_supabase'
          : target.origin === config.baseUrl
            ? 'published_site'
            : 'other_origin',
    });
  });
  page.on('dialog', async (dialog) => {
    const pending = state.pendingDialog;
    if (
      dialog.type() === 'prompt' &&
      pending === 'open_shift' &&
      /Opening cash/i.test(dialog.message())
    )
      return dialog.accept('0');
    if (
      dialog.type() === 'prompt' &&
      pending === 'close_shift' &&
      /Counted cash/i.test(dialog.message())
    )
      return dialog.accept('230');
    if (
      dialog.type() === 'alert' &&
      pending === 'checkout' &&
      /^Sale completed successfully/.test(dialog.message())
    ) {
      state.pendingDialog = null;
      return dialog.accept();
    }
    if (
      dialog.type() === 'alert' &&
      pending === 'close_shift' &&
      /^Shift closed/.test(dialog.message())
    ) {
      state.pendingDialog = null;
      return dialog.accept();
    }
    state.dialogFailure = true;
    await dialog.dismiss();
  });
}
async function login(page, identity, route) {
  await goto(page, '/login');
  await page.locator('#email').fill(identity.email);
  await page.locator('#password').fill(identity.password);
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).origin === config.supabaseUrl &&
      new URL(r.url()).pathname === '/auth/v1/token' &&
      r.request().method() === 'POST',
  );
  await page.locator('form button[type="submit"]').click();
  ensure((await response).ok(), 'ui_sign_in_failed');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 45000 });
  await goto(page, route);
}
async function mutation(page, endpoint, action) {
  const response = page.waitForResponse(
    (r) =>
      new URL(r.url()).origin === config.supabaseUrl &&
      new URL(r.url()).pathname === endpoint &&
      r.request().method() === 'POST',
    { timeout: 45000 },
  );
  await action();
  ensure((await response).ok(), 'ui_business_request_failed');
}
async function scopedInvoice(id) {
  return queryResult(
    adminDb
      .from('invoices')
      .select(
        'id,company_id,invoice_number,customer_id,status,subtotal,vat_amount,total_amount,amount_paid,amount_due,currency_code',
      )
      .eq('company_id', config.companyId)
      .eq('id', id)
      .single(),
    'invoices',
  );
}
async function stock() {
  const rows = await queryResult(
    adminDb
      .from('inventory')
      .select('quantity_available,quantity_reserved')
      .eq('product_id', state.product.id)
      .eq('warehouse_id', config.warehouseId),
    'inventory',
  );
  ensure(rows.length === 1, 'one_fixture_inventory_row_required');
  return {
    onHand: Number(rows[0].quantity_available),
    reserved: Number(rows[0].quantity_reserved),
  };
}
async function balancedJournal(id, expectedDebit) {
  const journal = await queryResult(
    adminDb
      .from('journal_entries')
      .select('id,company_id,status,entry_number')
      .eq('company_id', config.companyId)
      .eq('id', id)
      .single(),
    'journal_entries',
  );
  ensure(journal.status === 'posted', 'journal_must_be_posted');
  const lines = await queryResult(
    adminDb
      .from('journal_entry_lines')
      .select(
        'account_id,debit_amount,credit_amount,account:chart_of_accounts(company_id,account_code)',
      )
      .eq('journal_entry_id', id),
    'journal_entry_lines',
  );
  ensure(
    lines.length >= 2 && lines.every((line) => line.account?.company_id === config.companyId),
    'journal_account_scope_mismatch',
  );
  const debit = lines.reduce((sum, line) => sum + money(line.debit_amount), 0),
    credit = lines.reduce((sum, line) => sum + money(line.credit_amount), 0);
  ensure(debit === credit && debit === money(expectedDebit), 'journal_not_balanced_or_wrong_value');
  return {
    id: journal.id,
    posted: true,
    debit: debit / 100,
    credit: credit / 100,
    lineCount: lines.length,
  };
}

try {
  config = await loadConfig();
  outputDirectory = resolve(workspace, '.tmp', 'release-acceptance', config.runTag);
  await mkdir(outputDirectory, { recursive: true });
  Object.assign(report, {
    productionOrigin: config.baseUrl,
    runId: config.runTag,
    fixtureCompanyId: config.companyId,
  });
  await step('verify dedicated acceptance fixture before UI writes', async () => {
    const clients = [];
    for (const identity of [config.admin, config.cashier]) {
      const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await client.auth.signInWithPassword({
        email: identity.email,
        password: identity.password,
      });
      ensure(!error && data.user?.id === identity.userId, 'fixture_sign_in_or_identity_mismatch');
      const profile = await queryResult(
        client
          .from('users')
          .select('id,company_id,branch_id,role_id,status')
          .eq('id', identity.userId)
          .single(),
        'users',
      );
      ensure(
        profile.company_id === config.companyId &&
          profile.branch_id === config.branchId &&
          profile.status === 'active',
        'fixture_company_membership_mismatch',
      );
      const role = await queryResult(
        client.from('roles').select('name,company_id').eq('id', profile.role_id).single(),
        'roles',
      );
      ensure(
        role.company_id == null || role.company_id === config.companyId,
        'fixture_role_company_mismatch',
      );
      ensure(
        identity === config.admin
          ? ['admin', 'super_admin', 'owner', 'developer'].includes(role.name)
          : role.name === 'cashier',
        'fixture_role_mismatch',
      );
      clients.push(client);
    }
    [adminDb, cashierDb] = clients;
    const company = await queryResult(
      adminDb
        .from('companies')
        .select('id,name,status,currency')
        .eq('id', config.companyId)
        .single(),
      'companies',
    );
    ensure(
      company.name === config.companyName &&
        company.name.startsWith(prefix) &&
        company.status === 'active' &&
        company.currency === 'SAR',
      'dedicated_fixture_company_guard_failed',
    );
    const warehouses = await queryResult(
      adminDb
        .from('warehouses')
        .select('id,branch_id,is_active')
        .eq('company_id', config.companyId)
        .eq('branch_id', config.branchId)
        .eq('is_active', true),
      'warehouses',
    );
    ensure(
      warehouses.length === 1 && warehouses[0].id === config.warehouseId,
      'fixture_requires_one_active_branch_warehouse',
    );
    const customer = await queryResult(
      adminDb
        .from('customers')
        .select('id,status')
        .eq('company_id', config.companyId)
        .eq('id', config.customerId)
        .single(),
      'customers',
    );
    ensure(customer.status === 'active', 'fixture_customer_not_active');
    for (const table of ['products', 'sales', 'invoices', 'journal_entries', 'shifts']) {
      const result = await adminDb
        .from(table)
        .select('id', { head: true, count: 'exact' })
        .eq('company_id', config.companyId);
      if (result.error) throw readFailure(result.error, table);
      ensure(
        result.count === (table === 'products' && resumeUnpostedProduct ? 1 : 0),
        'fixture_must_be_fresh_do_not_reuse_posted_test_data',
      );
    }
    if (resumeUnpostedProduct) {
      const previous = JSON.parse(await readFile(resolve(outputDirectory, 'report.json'), 'utf8'));
      ensure(
        previous.format === report.format && previous.status === 'failed' &&
          previous.runId === config.runTag && previous.fixtureCompanyId === config.companyId &&
          previous.productionOrigin === config.baseUrl &&
          previous.steps.at(-1)?.name === 'receive stock through UI and verify inventory plus ledger' &&
          previous.steps.some((item) => item.name === 'create tagged product through the actual UI' && item.status === 'passed') &&
          uuid.test(previous.evidence?.product?.id || ''),
        'resume_requires_prior_catalog_only_acceptance_evidence',
      );
      const product = await queryResult(
        adminDb.from('products')
          .select('id,company_id,sku,product_name,unit_price,cost_price,vat_rate,is_active,track_inventory,product_type')
          .eq('company_id', config.companyId).eq('id', previous.evidence.product.id).single(),
        'products',
      );
      ensure(
        product.sku === `REL-${config.runTag}` &&
          product.product_name === `Release acceptance ${config.runTag}` &&
          money(product.unit_price) === 10000 && money(product.cost_price) === 3000 &&
          Number(product.vat_rate) === 15 && product.is_active === true &&
          product.track_inventory === true && product.product_type === 'GOODS',
        'resumed_product_must_match_exact_catalog_fixture',
      );
      for (const table of ['inventory', 'inventory_movements']) {
        const result = await adminDb.from(table).select('id', { head: true, count: 'exact' })
          .eq('product_id', product.id);
        if (result.error) throw readFailure(result.error, table);
        ensure(result.count === 0, 'resume_refuses_any_existing_stock_or_movement');
      }
      state.product = product;
      report.evidence.resumedCatalogOnlyAttempt = {
        previousStartedAt: previous.startedAt,
        productPreviouslyCreatedThroughPublishedUI: true,
        postedRecordsBeforeResume: 0,
      };
    }
    report.evidence.fixtureVerified = {
      dedicated: true,
      originalCompanyRowsRead: false,
      originalCompanyRowsChanged: false,
      activeBranchWarehouseCount: 1,
      baselineBusinessRecords: resumeUnpostedProduct ? 1 : 0,
    };
  });
  browser = await chromium.launch({
    headless: true,
    ...(config.browserExecutablePath ? { executablePath: config.browserExecutablePath } : {}),
  });
  adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'en-US',
  });
  cashierContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'en-US',
  });
  await protectContext(adminContext, config.admin);
  await protectContext(cashierContext, config.cashier);
  adminPage = await adminContext.newPage();
  cashierPage = await cashierContext.newPage();
  for (const page of [adminPage, cashierPage]) {
    page.setDefaultTimeout(30000);
    watchPage(page);
  }
  await step(
    'administrator signs in on the published site',
    async () => {
      await login(adminPage, config.admin, '/inventory');
      await adminPage
        .getByRole('heading', { name: 'Products and inventory', exact: true })
        .waitFor();
      await screenshot(adminPage, 'published-admin-inventory');
    },
    adminPage,
  );
  const productName = `Release acceptance ${config.runTag}`;
  await step(
    'create tagged product through the actual UI',
    async () => {
      if (resumeUnpostedProduct) {
        await adminPage.getByRole('row').filter({ hasText: `REL-${config.runTag}` }).waitFor();
        report.evidence.product = { id: state.product.id, price: 100, cost: 30, vatRate: 15,
          reusedFromPriorPublishedUICreation: true };
        await screenshot(adminPage, 'verified-existing-test-product');
        return;
      }
      await adminPage.getByRole('button', { name: 'New product', exact: true }).click();
      const dialog = adminPage.getByRole('dialog', { name: 'New product', exact: true });
      for (const [label, value] of [
        ['sku', `REL-${config.runTag}`],
        ['product name', productName],
        ['unit price', '100'],
        ['cost price', '30'],
        ['vat rate', '15'],
        ['min stock level', '0'],
      ])
        await dialog.getByLabel(label, { exact: true }).fill(value);
      await dialog
        .getByLabel('Description', { exact: true })
        .fill(`Isolated release acceptance ${config.runTag}; no original company data.`);
      await mutation(adminPage, '/rest/v1/products', () =>
        dialog.getByRole('button', { name: 'Save product', exact: true }).click(),
      );
      await dialog.waitFor({ state: 'hidden' });
      state.product = await eventually(
        () =>
          queryResult(
            adminDb
              .from('products')
              .select('id,company_id,sku,unit_price,cost_price,vat_rate,is_active')
              .eq('company_id', config.companyId)
              .eq('sku', `REL-${config.runTag}`)
              .maybeSingle(),
            'products',
          ),
        (row) => Boolean(row),
        'product_not_persisted',
      );
      ensure(
        money(state.product.unit_price) === 10000 &&
          money(state.product.cost_price) === 3000 &&
          Number(state.product.vat_rate) === 15,
        'product_price_snapshot_mismatch',
      );
      report.evidence.product = { id: state.product.id, price: 100, cost: 30, vatRate: 15 };
      await screenshot(adminPage, 'created-test-product');
    },
    adminPage,
  );
  await step(
    'receive stock through UI and verify inventory plus ledger',
    async () => {
      const row = adminPage.getByRole('row').filter({ hasText: `REL-${config.runTag}` });
      await row.getByRole('button', { name: 'Receive stock', exact: true }).click();
      const dialog = adminPage.getByRole('dialog', { name: `Receive ${productName}`, exact: true });
      await dialog.getByRole('combobox', { name: 'Warehouse', exact: true }).selectOption(config.warehouseId);
      await dialog.getByLabel('Quantity', { exact: true }).fill('10');
      await dialog
        .getByLabel('Supplier delivery / receipt reference', { exact: true })
        .fill(`REL-${config.runTag}-GRN`);
      await mutation(adminPage, '/rest/v1/rpc/receive_stock', () =>
        dialog.getByRole('button', { name: 'Receive and post', exact: true }).click(),
      );
      await dialog.waitFor({ state: 'hidden' });
      const received = await stock();
      ensure(received.onHand === 10 && received.reserved === 0, 'goods_receipt_stock_mismatch');
      const movements = await queryResult(
        adminDb
          .from('inventory_movements')
          .select('id,reference_id,quantity')
          .eq('company_id', config.companyId)
          .eq('product_id', state.product.id)
          .eq('reference_type', 'goods_receipt'),
        'inventory_movements',
      );
      ensure(
        movements.length === 1 && Number(movements[0].quantity) === 10,
        'goods_receipt_audit_mismatch',
      );
      const journal = await queryResult(
        adminDb
          .from('journal_entries')
          .select('id')
          .eq('company_id', config.companyId)
          .eq('entry_number', `REC-${movements[0].reference_id}`)
          .single(),
        'journal_entries',
      );
      report.evidence.goodsReceipt = {
        quantity: 10,
        onHand: received.onHand,
        movementCount: movements.length,
        ledger: await balancedJournal(journal.id, 300),
      };
      await screenshot(adminPage, 'received-stock');
    },
    adminPage,
  );
  await step(
    'cashier signs in and opens a real shift',
    async () => {
      await login(cashierPage, config.cashier, '/cashier/pos');
      state.pendingDialog = 'open_shift';
      await mutation(cashierPage, '/rest/v1/shifts', () =>
        cashierPage.getByRole('button', { name: 'Open Shift', exact: true }).click(),
      );
      await cashierPage.getByRole('button', { name: 'Close Shift', exact: true }).waitFor();
      state.pendingDialog = null;
      state.shift = await queryResult(
        adminDb
          .from('shifts')
          .select('id,status,opening_cash')
          .eq('company_id', config.companyId)
          .eq('cashier_id', config.cashier.userId)
          .eq('status', 'open')
          .single(),
        'shifts',
      );
      ensure(Number(state.shift.opening_cash) === 0, 'shift_opening_balance_mismatch');
      report.evidence.shift = { id: state.shift.id, openingCash: 0 };
      await screenshot(cashierPage, 'cashier-open-shift');
    },
    cashierPage,
  );
  await step(
    'cashier completes a cash sale through the actual UI',
    async () => {
      await cashierPage.getByPlaceholder('Search products by name or barcode...').fill(productName);
      const productButton = cashierPage
        .getByRole('button')
        .filter({ has: cashierPage.getByRole('heading', { name: productName, exact: true }) });
      await productButton.click();
      await productButton.click();
      await cashierPage.getByRole('button', { name: 'Cash', exact: true }).click();
      state.pendingDialog = 'checkout';
      await mutation(cashierPage, '/rest/v1/rpc/complete_pos_sale', () =>
        cashierPage.getByRole('button', { name: 'Complete Payment', exact: true }).click(),
      );
      await eventually(
        async () => state.pendingDialog,
        (value) => value === null,
        'checkout_success_dialog_not_observed',
      );
      const sales = await queryResult(
        adminDb
          .from('sales')
          .select(
            'id,company_id,invoice_id,journal_entry_id,shift_id,items,total_amount,vat_amount,status',
          )
          .eq('company_id', config.companyId)
          .eq('cashier_id', config.cashier.userId),
        'sales',
      );
      ensure(sales.length === 1, 'cashier_sale_count_mismatch');
      state.sale = sales[0];
      ensure(
        state.sale.status === 'completed' &&
          state.sale.shift_id === state.shift.id &&
          matchesItem(state.sale.items, 2) &&
          money(state.sale.total_amount) === 23000 &&
          money(state.sale.vat_amount) === 3000,
        'cashier_sale_values_mismatch',
      );
      const invoice = await scopedInvoice(state.sale.invoice_id);
      ensure(
        invoice.status === 'paid' &&
          money(invoice.amount_paid) === 23000 &&
          money(invoice.amount_due) === 0,
        'pos_invoice_settlement_mismatch',
      );
      const payments = await queryResult(
        adminDb
          .from('payments')
          .select('id,invoice_id,amount,payment_method,status')
          .eq('company_id', config.companyId)
          .eq('sale_id', state.sale.id),
        'payments',
      );
      ensure(
        payments.length === 1 &&
          payments[0].invoice_id === invoice.id &&
          payments[0].status === 'completed' &&
          payments[0].payment_method === 'cash' &&
          money(payments[0].amount) === 23000,
        'pos_payment_mismatch',
      );
      const remaining = await stock();
      ensure(
        remaining.onHand === 8 && remaining.reserved === 0,
        'sale_did_not_decrease_stock_once',
      );
      report.evidence.pos = {
        saleId: state.sale.id,
        invoiceId: invoice.id,
        saleCount: 1,
        paymentCount: 1,
        total: 230,
        vat: 30,
        onHand: 8,
        ledger: await balancedJournal(state.sale.journal_entry_id, 290),
      };
      await screenshot(cashierPage, 'completed-pos-sale');
    },
    cashierPage,
  );
  await step(
    'administrator creates a standalone invoice draft in the published UI',
    async () => {
      await goto(adminPage, '/finance/invoicing');
      await adminPage.getByRole('button', { name: 'New draft', exact: true }).click();
      await adminPage.getByRole('combobox', { name: 'Customer', exact: true }).selectOption(config.customerId);
      await adminPage
        .getByLabel('Due date', { exact: true })
        .fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
      await adminPage.getByLabel('Product 1', { exact: true }).selectOption(state.product.id);
      await adminPage.getByLabel('Quantity', { exact: true }).fill('1');
      await adminPage.getByLabel('Discount %', { exact: true }).fill('0');
      await adminPage.getByLabel('Notes', { exact: true }).fill(`REL-${config.runTag}-DRAFT`);
      await mutation(adminPage, '/rest/v1/rpc/save_invoice_draft', () =>
        adminPage.getByRole('button', { name: 'Save draft', exact: true }).click(),
      );
      state.draft = await eventually(
        () =>
          queryResult(
            adminDb
              .from('invoices')
              .select('id,invoice_number,status,total_amount,amount_due')
              .eq('company_id', config.companyId)
              .eq('notes', `REL-${config.runTag}-DRAFT`)
              .maybeSingle(),
            'invoices',
          ),
        (row) => Boolean(row),
        'standalone_draft_not_persisted',
      );
      ensure(
        state.draft.status === 'draft' && money(state.draft.total_amount) === 11500,
        'draft_calculation_mismatch',
      );
      ensure((await stock()).onHand === 8, 'draft_unexpectedly_changed_stock');
      await screenshot(adminPage, 'standalone-draft');
    },
    adminPage,
  );
  await step(
    'issue the standalone invoice and verify native receivable posting',
    async () => {
      await goto(adminPage, '/finance/accounts-receivable');
      await adminPage
        .getByRole('textbox', { name: 'Search invoices', exact: true })
        .fill(state.draft.invoice_number);
      const row = adminPage.getByRole('row').filter({ hasText: state.draft.invoice_number });
      await mutation(adminPage, '/rest/v1/rpc/issue_invoice', () =>
        row.getByRole('button', { name: 'Issue and post', exact: true }).click(),
      );
      const issued = await eventually(
        () => scopedInvoice(state.draft.id),
        (invoice) => invoice.status === 'issued',
        'invoice_not_issued',
      );
      ensure(
        money(issued.amount_due) === 11500 && (await stock()).onHand === 8,
        'standalone_issue_balance_or_stock_mismatch',
      );
      const journal = await queryResult(
        adminDb
          .from('journal_entries')
          .select('id')
          .eq('company_id', config.companyId)
          .eq('entry_number', `INV-${state.draft.id}`)
          .single(),
        'journal_entries',
      );
      report.evidence.standaloneInvoice = {
        id: state.draft.id,
        total: 115,
        stockDispatchPerformed: false,
        ledger: await balancedJournal(journal.id, 115),
        receipts: [],
      };
      await screenshot(adminPage, 'issued-invoice');
    },
    adminPage,
  );
  for (const [index, amount, due, status] of [
    [1, 40, 75, 'partial'],
    [2, 75, 0, 'paid'],
  ]) {
    await step(
      `record standalone invoice cash receipt ${index} in the UI`,
      async () => {
        const row = adminPage.getByRole('row').filter({ hasText: state.draft.invoice_number });
        await row.getByRole('button', { name: 'Statement / receipt', exact: true }).click();
        const dialog = adminPage.getByRole('dialog', {
          name: `${state.draft.invoice_number} statement`,
          exact: true,
        });
        await dialog.getByLabel('Amount', { exact: true }).fill(String(amount));
        await dialog.getByRole('combobox', { name: 'Method', exact: true }).selectOption('cash');
        await dialog
          .getByLabel('Bank / card reference', { exact: true })
          .fill(`REL-${config.runTag}-RECEIPT-${index}`);
        await mutation(adminPage, '/rest/v1/rpc/record_invoice_payment', () =>
          dialog.getByRole('button', { name: 'Save receipt', exact: true }).click(),
        );
        await dialog.waitFor({ state: 'hidden' });
        const invoice = await eventually(
          () => scopedInvoice(state.draft.id),
          (value) => value.status === status,
          'receipt_settlement_status_mismatch',
        );
        ensure(
          money(invoice.amount_due) === money(due) &&
            money(invoice.amount_paid) === money(115 - due),
          'receipt_settlement_amount_mismatch',
        );
        const payments = await queryResult(
          adminDb
            .from('payments')
            .select('id,payment_number,amount,status')
            .eq('company_id', config.companyId)
            .eq('invoice_id', state.draft.id),
          'payments',
        );
        ensure(
          payments.length === index && payments.every((payment) => payment.status === 'completed'),
          'standalone_receipt_count_mismatch',
        );
        const payment = payments.find((payment) => money(payment.amount) === money(amount));
        ensure(Boolean(payment), 'receipt_amount_not_found');
        const journal = await queryResult(
          adminDb
            .from('journal_entries')
            .select('id')
            .eq('company_id', config.companyId)
            .eq('entry_number', payment.payment_number)
            .single(),
          'journal_entries',
        );
        report.evidence.standaloneInvoice.receipts.push({
          amount,
          due,
          status,
          ledger: await balancedJournal(journal.id, amount),
        });
        await screenshot(adminPage, `receipt-${index}-${status}`);
      },
      adminPage,
    );
  }
  await step(
    'verify the native ledger UI and close the cashier shift',
    async () => {
      await goto(adminPage, '/finance/general-ledger');
      await adminPage.getByRole('heading', { name: 'General ledger', exact: true }).waitFor();
      await adminPage
        .getByRole('cell', { name: `INV-${state.draft.id}`, exact: false })
        .first()
        .waitFor();
      await screenshot(adminPage, 'native-general-ledger');
      state.pendingDialog = 'close_shift';
      await mutation(cashierPage, '/rest/v1/rpc/close_pos_shift', () =>
        cashierPage.getByRole('button', { name: 'Close Shift', exact: true }).click(),
      );
      await cashierPage.getByRole('button', { name: 'Open Shift', exact: true }).waitFor();
      const shift = await queryResult(
        adminDb
          .from('shifts')
          .select('status,closing_cash,expected_cash,cash_difference')
          .eq('company_id', config.companyId)
          .eq('id', state.shift.id)
          .single(),
        'shifts',
      );
      ensure(
        shift.status === 'closed' &&
          money(shift.expected_cash) === 23000 &&
          money(shift.closing_cash) === 23000 &&
          money(shift.cash_difference) === 0,
        'closed_shift_totals_mismatch',
      );
      report.evidence.closedShift = { expectedCash: 230, countedCash: 230, difference: 0 };
    },
    adminPage,
  );
  ensure(report.pageErrors.length === 0, 'browser_runtime_errors_observed');
  ensure(report.httpFailures.length === 0, 'http_failures_observed');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure =
    error instanceof WorkflowError
      ? { code: error.code, ...error.safeDetails }
      : { code: 'ui_or_runtime_failure', kind: safeErrorKind(error) };
  // Deliberately omit raw error.message/stack: browser call logs can contain fill values.
  console.error(
    `FAIL ${report.steps.at(-1)?.name || 'private config validation'}: ${report.failure.code}`,
  );
  process.exitCode = 1;
  if (outputDirectory) {
    try {
      await screenshot(activePage, 'failure-redacted');
    } catch {
      /* No raw browser error is persisted. */
    }
  }
} finally {
  for (const client of [adminDb, cashierDb]) {
    try {
      await client?.auth.signOut({ scope: 'local' });
    } catch {
      /* Fixture suspension is performed separately by root. */
    }
  }
  try {
    await browser?.close();
  } catch {
    /* Do not expose browser internals. */
  }
  report.finishedAt = new Date().toISOString();
  report.blockedMutations = state.blockedMutations;
  if (outputDirectory) {
    await writeFile(
      resolve(outputDirectory, 'report.json'),
      JSON.stringify(report, null, 2) + '\n',
      { mode: 0o600 },
    );
    console.log(`Acceptance report: .tmp/release-acceptance/${config.runTag}/report.json`);
  }
}
