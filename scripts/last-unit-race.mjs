import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = fileURLToPath(new URL('../', import.meta.url));
const currentProject = 'svxmlejmhlocsjjtftxd';
const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

class RaceError extends Error {}
function requireCheck(ok, message) {
  if (!ok) throw new RaceError(message);
}

async function loadConfig() {
  const [flag, path, ...extra] = process.argv.slice(2);
  const allowCurrentQa = extra.length === 1 && extra[0] === '--allow-current-project-qa';
  requireCheck(flag === '--config' && path && (!extra.length || allowCurrentQa),
    'Usage: node scripts/last-unit-race.mjs --config <private-file> [--allow-current-project-qa]');
  let file;
  let config;
  try {
    file = await realpath(path);
    const name = relative(root, file);
    requireCheck(name.startsWith(`.tmp${sep}`), 'Use a private configuration under .tmp/.');
    execFileSync('git', ['check-ignore', '--quiet', '--', name], { cwd: root, stdio: 'ignore' });
    config = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error instanceof RaceError) throw error;
    throw new RaceError('Private configuration is missing, invalid JSON, or not Git-ignored.');
  }
  requireCheck(config && typeof config === 'object', 'Invalid configuration object.');
  const { supabaseUrl, supabaseAnonKey, companyName, admin } = config;
  let url;
  try { url = new URL(supabaseUrl); } catch { throw new RaceError('Invalid supabaseUrl.'); }
  const targetsCurrent = [config.expectedProjectRef, config.projectRef].includes(currentProject) ||
    url.hostname === `${currentProject}.supabase.co`;
  requireCheck(!targetsCurrent || allowCurrentQa,
    'Refusing the current ERPX-AI Supabase project.');
  const expectedProjectRef = allowCurrentQa ? config.projectRef : config.expectedProjectRef;
  const cashiers = allowCurrentQa ? [config.cashier, config.cashier2] : config.cashiers;
  if (allowCurrentQa) {
    requireCheck(expectedProjectRef === currentProject && config.metadata?.qaKind === 'race' &&
      config.metadata.state === 'ready' && /^[a-f0-9]{48}$/.test(config.metadata.marker) &&
      /^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}$/.test(config.metadata.runId) &&
      companyName === `ERPX RELEASE ACCEPTANCE ${config.metadata.runId}`,
    'Current-project mode requires a ready, dedicated race receipt.');
  }
  requireCheck(typeof expectedProjectRef === 'string' && /^[a-z0-9]{20}$/.test(expectedProjectRef) &&
    [`https://${expectedProjectRef}.supabase.co`, `https://${expectedProjectRef}.supabase.co/`].includes(supabaseUrl),
  'supabaseUrl must be the HTTPS hosted origin for expectedProjectRef.');
  requireCheck(allowCurrentQa ? config.allowLiveMutations === true : config.allowStagingWrites === true,
    'Explicit file permission for the reviewed test target is required.');
  requireCheck(typeof supabaseAnonKey === 'string', 'A publishable or anon key is required.');
  if (!supabaseAnonKey.startsWith('sb_publishable_')) {
    let claims;
    try { claims = JSON.parse(Buffer.from(supabaseAnonKey.split('.')[1], 'base64url')); } catch {}
    requireCheck(claims?.role === 'anon' && claims.ref === expectedProjectRef,
      'Use the staging publishable key or its project-scoped anon key.');
  }
  requireCheck(['companyId', 'branchId', 'warehouseId'].every((field) => uuid.test(config[field])) &&
    typeof companyName === 'string' && /^ERPX RELEASE ACCEPTANCE \S/.test(companyName),
  'Provide IDs and the name of a dedicated ERPX RELEASE ACCEPTANCE company.');
  requireCheck(Array.isArray(cashiers) && cashiers.length === 2, 'Provide exactly two cashier accounts.');
  const accounts = [admin, ...cashiers];
  requireCheck(accounts.every((account) => account && uuid.test(account.userId) &&
    typeof account.email === 'string' && account.email.length &&
    typeof account.password === 'string' && account.password.length) &&
    new Set(accounts.map(({ userId }) => userId.toLowerCase())).size === 3,
  'Provide a distinct administrator and two cashier accounts.');
  return { ...config, cashiers, allowCurrentQa, supabaseUrl: url.origin };
}

function hasQaMarker(value, config) {
  return value?.run_id === config.metadata.runId && value.marker === config.metadata.marker;
}

async function checked(request, label) {
  const { data, error, count } = await request;
  requireCheck(!error, `${label} failed.`);
  return { data, count };
}

async function signIn(config, account, allowedRoles, label) {
  const db = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data } = await checked(db.auth.signInWithPassword({
    email: account.email, password: account.password,
  }), `${label} sign-in`);
  requireCheck(data.session && data.user?.id === account.userId, `${label} identity mismatch.`);
  if (config.allowCurrentQa) {
    requireCheck(data.user.email === account.email && account.email.endsWith('@example.test') &&
      hasQaMarker(data.user.app_metadata?.erpx_release_acceptance, config),
    `${label} is not a marked Auth identity for this run.`);
  }
  const { data: profile } = await checked(db.from('users').select('company_id,branch_id,status,role_id')
    .eq('id', account.userId).single(), `${label} profile lookup`);
  requireCheck(profile?.company_id === config.companyId && profile?.branch_id === config.branchId &&
    profile?.status === 'active', `${label} must be active in the test company and branch.`);
  const { data: role } = await checked(db.from('roles').select('name,company_id,permissions')
    .eq('id', profile.role_id).single(), `${label} role lookup`);
  requireCheck(allowedRoles.includes(role?.name) && (role.company_id == null || role.company_id === config.companyId),
    `${label} role mismatch.`);
  if (role.name === 'cashier') {
    requireCheck(role.permissions?.all !== true && role.permissions?.admin !== true,
      `${label} must use an ordinary cashier role.`);
    const { data: allowed } = await checked(db.rpc('user_has_permission', { perm: 'pos_access' }),
      `${label} POS permission check`);
    requireCheck(allowed === true, `${label} lacks POS permission.`);
  }
  return { db, userId: account.userId };
}

async function verifyCashierMessage(config, account, attempt, productId, productName) {
  const [{ createServer }, { chromium }] = await Promise.all([import('vite'), import('playwright')]);
  const server = await createServer({
    root, configLoader: 'runner', envDir: false, logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(config.supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(config.supabaseAnonKey),
      'import.meta.env.VITE_DEMO_MODE': 'false',
    },
  });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ serviceWorkers: 'block', locale: 'en-US' });
    await context.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
    await context.route('**/*', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin === origin && req.method() === 'GET') return route.continue();
      if (url.origin !== config.supabaseUrl) return route.abort();
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return route.continue();
      if (req.method() !== 'POST') return route.abort();
      const body = req.postDataJSON();
      if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password' &&
        body?.email === account.email && body.password === account.password) return route.continue();
      if (['/rest/v1/rpc/get_user_roles', '/rest/v1/rpc/get_user_permissions'].includes(url.pathname) &&
        body?.p_user_id === attempt.userId) return route.continue();
      if (url.pathname === '/rest/v1/rpc/complete_pos_sale' && body?.p_company_id === config.companyId &&
        body.p_cashier_id === attempt.userId && body.p_branch_id === config.branchId &&
        body.p_shift_id === attempt.shiftId && body.p_payment_method === 'cash' &&
        body.p_customer_id == null && body.p_items?.length === 1 && body.p_items[0].product_id === productId &&
        body.p_items[0].quantity === 1 && !body.p_items[0].discount_percentage && !body.p_discount_amount &&
        (body.p_warehouse_id == null || body.p_warehouse_id === config.warehouseId) &&
        uuid.test(body.p_idempotency_key)) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(origin + '/cashier/pos');
    await page.locator('#email').fill(account.email);
    await page.locator('#password').fill(account.password);
    await page.locator('form button[type=submit]').click();
    await page.getByRole('button').filter({
      has: page.getByRole('heading', { name: productName, exact: true }),
    }).click();
    await page.getByRole('button', { name: 'Cash', exact: true }).click();
    const reply = page.waitForResponse((response) =>
      response.url() === config.supabaseUrl + '/rest/v1/rpc/complete_pos_sale' &&
      response.request().method() === 'POST');
    const alert = page.waitForEvent('dialog').then(async (dialog) => {
      const message = dialog.message();
      await dialog.accept();
      return message;
    });
    const [response, message] = await Promise.all([reply, alert,
      page.getByRole('button', { name: 'Complete Payment', exact: true }).click()]);
    requireCheck(response.status() >= 400 && /^Checkout failed: Insufficient available stock\b/i.test(message),
      'The cashier did not show the server stock rejection.');
  } catch (error) {
    if (error instanceof RaceError) throw error;
    throw new RaceError('Independent cashier browser verification could not complete.');
  } finally {
    await browser?.close();
    await server.close();
  }
}

async function run(config) {
  const { companyId, branchId, warehouseId } = config;
  const [{ db: admin }, ...cashiers] = await Promise.all([
    signIn(config, config.admin, ['admin', 'owner', 'super_admin'], 'Administrator'),
    ...config.cashiers.map((account, index) => signIn(config, account, ['cashier'], `Cashier ${index + 1}`)),
  ]);
  const { data: company } = await checked(admin.from('companies')
    .select(config.allowCurrentQa ? 'name,status,onboarding_owner_id,settings' : 'name,status')
    .eq('id', companyId).single(), 'Company lookup');
  requireCheck(company?.name === config.companyName && company?.status === 'active', 'Test company identity mismatch.');
  if (config.allowCurrentQa) {
    requireCheck(company.onboarding_owner_id === config.admin.userId &&
      hasQaMarker(company.settings?.erpx_release_acceptance, config),
    'Company owner or QA marker does not match this run.');
  }
  const { data: branch } = await checked(admin.from('branches').select('id').eq('id', branchId)
    .eq('company_id', companyId).eq('status', 'active').single(), 'Branch lookup');
  const { data: warehouse } = await checked(admin.from('warehouses').select('id').eq('id', warehouseId)
    .eq('company_id', companyId).eq('branch_id', branchId).eq('is_active', true).single(), 'Warehouse lookup');
  requireCheck(branch?.id === branchId && warehouse?.id === warehouseId, 'Test branch or warehouse identity mismatch.');

  const tables = ['sales', 'invoices', 'payments', 'inventory_movements', 'journal_entries', 'shifts'];
  const counts = () => Promise.all(tables.map(async (table) => {
    const { count } = await checked(admin.from(table).select('id', { count: 'exact', head: true })
      .eq('company_id', companyId), `Count ${table}`);
    requireCheck(Number.isInteger(count), `Missing count for ${table}.`);
    return count;
  }));
  requireCheck((await counts()).every((count) => count === 0), 'Use a fresh test company without prior transactions or shifts.');

  const runId = randomUUID();
  console.log(`Starting isolated QA RPC race ${runId}.`);
  const productName = `Last unit ${runId}`;
  const { data: product } = await checked(admin.from('products').insert({
    company_id: companyId, sku: `RACE-${runId}`, product_name: productName,
    unit_price: 100, cost_price: 30, vat_rate: 15, is_active: true,
  }).select('id').single(), 'Create test product');
  await checked(admin.rpc('receive_stock', {
    p_company_id: companyId, p_product_id: product.id, p_warehouse_id: warehouseId, p_quantity: 1,
    p_reference: `RACE-${runId}`, p_request_id: randomUUID(),
  }), 'Receive one test unit');
  const readStock = async () => {
    const { data } = await checked(admin.from('inventory').select('quantity_available,quantity_reserved')
      .eq('product_id', product.id).eq('warehouse_id', warehouseId).single(), 'Read stock');
    requireCheck(data?.quantity_available != null && data?.quantity_reserved != null &&
      Number(data.quantity_reserved) === 0, 'Missing stock balance or unexpected reservation.');
    return Number(data.quantity_available);
  };
  requireCheck(await readStock() === 1, 'Expected exactly one available unit before checkout.');

  const attempts = await Promise.all(cashiers.map(async ({ db, userId }, index) => {
    const { data: shift } = await checked(db.from('shifts').insert({
      company_id: companyId, branch_id: branchId, cashier_id: userId,
      shift_number: `RACE-${runId}-${index + 1}`, opening_cash: 0, status: 'open',
    }).select('id').single(), `Open cashier ${index + 1} shift`);
    return { db, userId, shiftId: shift.id, requestId: randomUUID() };
  }));
  const before = await counts();
  requireCheck(before.join(',') === '0,0,0,1,1,2', 'Unexpected fixture counts before checkout.');

  // Promise assimilation starts both independent authenticated requests without awaiting either result.
  const outcomes = await Promise.all(attempts.map(({ db, userId, shiftId, requestId }) =>
    db.rpc('complete_pos_sale', {
      p_company_id: companyId, p_branch_id: branchId, p_cashier_id: userId, p_shift_id: shiftId,
      p_payment_method: 'cash', p_customer_id: null, p_items: [{ product_id: product.id, quantity: 1 }],
      p_discount_amount: 0, p_notes: null, p_idempotency_key: requestId, p_warehouse_id: warehouseId,
    })));
  const winner = outcomes.findIndex(({ data, error }) => !error && data?.success === true);
  requireCheck(winner !== -1, 'Neither checkout returned a confirmed sale.');
  const loser = outcomes[1 - winner];
  requireCheck(loser.error?.code === 'P0001' && /^Insufficient available stock\b/i.test(loser.error.message),
    'Expected the other cashier to be rejected specifically for insufficient stock.');
  const sale = outcomes[winner].data;
  requireCheck([sale.sale_id, sale.payment_id, sale.invoice_id, sale.journal_entry_id].every((id) => uuid.test(id)),
    'Checkout did not return its linked document IDs.');
  const finalStock = await readStock();
  requireCheck(finalStock === 0, 'Expected zero stock after checkout.');
  const after = await counts();
  requireCheck(after.map((count, index) => count - before[index]).join(',') === '1,1,1,1,1,0',
    'Expected exactly one additional sale, invoice, payment, movement and journal in the test company.');

  const { data: saleRow } = await checked(admin.from('sales').select('id,cashier_id,idempotency_key,invoice_id,journal_entry_id')
    .eq('company_id', companyId).single(), 'Verify the only sale belongs to the winner');
  const { data: payment } = await checked(admin.from('payments').select('sale_id,invoice_id,created_by')
    .eq('company_id', companyId).eq('id', sale.payment_id).single(), 'Verify payment link');
  const { data: movement } = await checked(admin.from('inventory_movements').select('reference_id,quantity,performed_by')
    .eq('company_id', companyId).eq('product_id', product.id).eq('warehouse_id', warehouseId)
    .eq('reference_type', 'SALE').single(), 'Verify stock movement link');
  const { data: journal } = await checked(admin.from('journal_entries').select('created_by,status')
    .eq('company_id', companyId).eq('id', sale.journal_entry_id).single(), 'Verify journal link');
  requireCheck(saleRow.id === sale.sale_id && saleRow.cashier_id === attempts[winner].userId &&
    saleRow.idempotency_key === attempts[winner].requestId && saleRow.invoice_id === sale.invoice_id &&
    saleRow.journal_entry_id === sale.journal_entry_id && payment.sale_id === sale.sale_id &&
    payment.invoice_id === sale.invoice_id && payment.created_by === saleRow.cashier_id &&
    movement.reference_id === sale.sale_id && Number(movement.quantity) === 1 &&
    movement.performed_by === saleRow.cashier_id && journal.created_by === saleRow.cashier_id &&
    journal.status === 'posted', 'A checkout record is missing or belongs to the wrong attempt.');
  console.log(JSON.stringify({
    status: 'passed', runId, scenario: 'last-unit race', transport: 'direct Supabase RPC', attempts: 2, successfulSales: 1,
    rejectedForInsufficientStock: 1, finalStock, addedPayments: 1, addedMovements: 1, addedJournals: 1,
    rejectedAttemptEffects: 0,
  }));
  if (config.allowCurrentQa) {
    await verifyCashierMessage(config, config.cashiers[1 - winner], attempts[1 - winner], product.id, productName);
    requireCheck((await counts()).join(',') === after.join(',') && await readStock() === 0,
      'The independent browser rejection changed fixture records.');
    console.log(JSON.stringify({ scenario: 'cashier stock message', status: 'passed', browserAttempts: 1 }));
  }
}

try {
  await run(await loadConfig());
} catch (error) {
  console.error(error instanceof RaceError ? error.message : 'Unexpected race runner failure.');
  process.exitCode = 1;
}
