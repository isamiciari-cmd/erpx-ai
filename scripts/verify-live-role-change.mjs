// Run only after the reviewed migration, using the dedicated roles QA fixture.
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = 'https://svxmlejmhlocsjjtftxd.supabase.co';
const check = (condition, message) => { if (!condition) throw new Error(message); };
const io = async (request, name) => {
  const { data, error } = await request;
  check(!error, name + ' failed');
  return data;
};
let stage = 'check dedicated roles QA receipt';
let browser;
let server;
try {
  const f = JSON.parse(await readFile('.tmp/release-acceptance/qa-roles.private.json', 'utf8'));
  const { admin, roleSubject, cashier, companyId, branchId, warehouseId, metadata } = f;
  check(f.supabaseUrl === url && f.projectRef === 'svxmlejmhlocsjjtftxd' && f.allowLiveMutations === true &&
    metadata.qaKind === 'roles' && metadata.state === 'ready' && admin.userId !== roleSubject.userId &&
    cashier.userId !== roleSubject.userId, 'Invalid roles QA receipt');
  const signIn = async (identity) => {
    const db = createClient(url, f.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { user, session } = await io(db.auth.signInWithPassword({ email: identity.email, password: identity.password }), 'Sign in');
    const marker = user.app_metadata?.erpx_release_acceptance;
    check(user.id === identity.userId && user.email === identity.email && user.email.endsWith('@example.test') &&
      marker?.marker === metadata.marker && marker.run_id === metadata.runId, 'Unexpected QA identity');
    return { db, session };
  };
  const { db: operator } = await signIn(admin);
  const { db: open, session: originalSession } = await signIn(roleSubject);
  const { db: cashierAccount } = await signIn(cashier);
  const profile = (db, id) => io(db.from('users').select('company_id,branch_id,role_id,status,first_name,last_name').eq('id', id).single(), 'Read own ERP profile');
  const roles = (db, id) => io(db.rpc('get_user_roles', { p_user_id: id }), 'Read effective roles');
  const [company, actorProfile, before, cashierProfile, initialRoles, warehouse] = await Promise.all([
    io(operator.from('companies').select('name,settings,onboarding_owner_id,status').eq('id', companyId).single(), 'Verify QA company'),
    profile(operator, admin.userId), profile(open, roleSubject.userId), profile(cashierAccount, cashier.userId),
    roles(open, roleSubject.userId),
    io(operator.from('warehouses').select('id').eq('id', warehouseId).eq('company_id', companyId)
      .eq('branch_id', branchId).eq('is_active', true).single(), 'Verify QA warehouse'),
  ]);
  const marker = company.settings?.erpx_release_acceptance;
  check(company.name === f.companyName && company.status === 'active' && company.onboarding_owner_id === admin.userId &&
    marker?.marker === metadata.marker && marker.run_id === metadata.runId && warehouse.id === warehouseId &&
    [actorProfile, before, cashierProfile].every(p => p.company_id === companyId && p.branch_id === branchId && p.status === 'active') &&
    initialRoles.some(r => r.role_name === 'admin') && initialRoles.some(r => r.role_name === 'accountant') &&
    (await roles(cashierAccount, cashier.userId)).some(r => r.role_name === 'cashier'), 'QA fixture identity or roles do not match');
  const mirrors = await io(open.from('user_roles').select('role_id').eq('user_id', roleSubject.userId), 'Verify old role mirror');
  check(mirrors.some(r => r.role_id === before.role_id), 'The fresh fixture must include its old admin role mirror');

  stage = 'open administrator UI with the original test session';
  const [{ createServer }, { chromium }] = await Promise.all([import('vite'), import('playwright')]);
  server = await createServer({
    configLoader: 'runner', envDir: false, logLevel: 'error',
    server: { host: '127.0.0.1', port: 0 },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(f.supabaseAnonKey),
      'import.meta.env.VITE_DEMO_MODE': 'false',
    },
  });
  await server.listen();
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block' });
  await context.addInitScript(session => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('sb-svxmlejmhlocsjjtftxd-auth-token', JSON.stringify(session));
  }, originalSession);
  await context.route('**/*', route => {
    const request = route.request();
    const target = new URL(request.url());
    if ([url, origin].includes(target.origin) && ['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
      return route.continue();
    if (target.origin === url && request.method() === 'POST' &&
      ['/rest/v1/rpc/get_user_roles', '/rest/v1/rpc/get_user_permissions'].includes(target.pathname) &&
      request.postDataJSON()?.p_user_id === roleSubject.userId) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  await page.goto(origin + '/admin/users');
  const adminHeading = page.getByRole('heading', { name: 'User management', exact: true });
  await adminHeading.waitFor();

  stage = 'create a synthetic product and verify administrator operation';
  const id = randomUUID();
  const product = await io(operator.from('products').insert({
    company_id: companyId, sku: 'ROLE-' + id, product_name: 'Role QA ' + id, unit_price: 100, cost_price: 30,
    vat_rate: 15, is_active: true,
  }).select('id').single(), 'Create QA product');
  const receive = db => db.rpc('receive_stock', {
    p_company_id: companyId, p_product_id: product.id, p_warehouse_id: warehouseId, p_quantity: 2,
    p_reference: 'Role QA receipt', p_request_id: randomUUID(),
  });
  await io(receive(open), 'Receive stock as administrator');

  stage = 'change primary role through the normal administration endpoint';
  const change = await io(operator.functions.invoke('manage-users', { body: {
    action: 'update', user_id: roleSubject.userId, email: roleSubject.email,
    first_name: before.first_name, last_name: before.last_name, status: 'active',
    role_id: cashierProfile.role_id, branch_id: branchId,
  } }), 'Assign cashier role');
  check(change?.ok, 'Administration endpoint did not confirm the update');
  const cachedAdminVisible = await adminHeading.isVisible();
  stage = 'refresh browser access snapshot';
  await page.reload();
  await page.waitForURL('**/cashier/pos');

  stage = 'verify cashier operations on the unchanged token and a new session';
  const { session: stillOpen } = await io(open.auth.getSession(), 'Read existing session');
  check(stillOpen.access_token === originalSession.access_token, 'Open-session check refreshed the original token');
  const { db: fresh } = await signIn(roleSubject);
  let shift;
  for (const db of [open, fresh]) {
    const current = await roles(db, roleSubject.userId);
    check(current.some(r => r.role_name === 'cashier') && current.some(r => r.role_name === 'accountant') &&
      !current.some(r => r.role_name === 'admin'), 'Unexpected effective role after change');
    const denied = await receive(db);
    check(denied.error?.code === '42501', 'Former administrator stock receipt was not denied');
    shift ??= await io(db.from('shifts').insert({
      company_id: companyId, branch_id: branchId, cashier_id: roleSubject.userId,
      status: 'open', shift_number: 'ROLE-' + id, opening_cash: 0,
    }).select('id').single(), 'Open a cashier shift');
    const sale = await io(db.rpc('complete_pos_sale', {
      p_company_id: companyId, p_branch_id: branchId, p_cashier_id: roleSubject.userId, p_shift_id: shift.id,
      p_payment_method: 'cash', p_customer_id: null, p_items: [{ product_id: product.id, quantity: 1 }],
      p_discount_amount: 0, p_notes: null, p_idempotency_key: randomUUID(), p_warehouse_id: warehouseId,
    }), 'Complete a cashier sale');
    check(sale?.success, 'Sale did not complete');
  }
  const stock = await io(operator.from('inventory').select('quantity_available')
    .eq('warehouse_id', warehouseId).eq('product_id', product.id).single(), 'Verify final stock');
  check(Number(stock.quantity_available) === 0, 'Unexpected final stock');
  stage = 'verify ambiguous global role change is refused';
  const { db: multi } = await signIn(f.cashier2);
  const old = await profile(multi, f.cashier2.userId);
  const accountantProfile = await profile(operator, f.accountant.userId);
  check(f.cashier2.userId !== roleSubject.userId && old.company_id === companyId && old.branch_id === branchId &&
    old.role_id === cashierProfile.role_id && accountantProfile.company_id === companyId &&
    accountantProfile.role_id !== old.role_id, 'Additional membership probe is outside the QA fixture');
  const refused = await operator.functions.invoke('manage-users', { body: {
    action: 'update', user_id: f.cashier2.userId, email: f.cashier2.email,
    first_name: old.first_name, last_name: old.last_name, status: 'active',
    role_id: accountantProfile.role_id, branch_id: branchId,
  } });
  check(refused.error?.context?.status === 409 &&
    (await profile(multi, f.cashier2.userId)).role_id === old.role_id, 'Ambiguous change was not refused atomically');
  console.log(JSON.stringify({ status: 'passed', unchangedToken: true, freshSession: true,
    cashierSales: 2, deniedAdministratorOperations: 2, finalStock: 0,
    independentGrantPreserved: true, ambiguousRoleChangeRefused: true,
    cachedAdminVisible, adminUiUnavailableAfterReload: true }));
} catch {
  console.error('Role change verification did not complete at stage: ' + stage + '. Inspect fixture state before retrying.');
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server?.close();
}
