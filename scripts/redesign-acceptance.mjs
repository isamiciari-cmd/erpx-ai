/** Local UI acceptance only. Real app/services, synthetic HTTP fixtures.
 * Does not load .env files, credentials, private receipts or production data.
 * Every non-loopback request is mocked or denied. No live writes/inference.
 * node scripts/redesign-acceptance.mjs
 * Optional --quick checks the same routes in EN/AR at 390/1440 only.
 * Optional --recovery-only exercises the two lost-response scenarios.
 * Optional --visual captures every declared route at 390/1440 in EN/AR.
 * Combine --visual --quick to also run the workflow assertions.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const finalReview = process.argv.includes('--final');
const visualOnly = finalReview || process.argv.includes('--visual');
const skipInteractions = visualOnly && !process.argv.includes('--quick');
const output = resolve(root, finalReview ? '.tmp/ui-final-review' : visualOnly ? '.tmp/ui-visual-review' : '.tmp/ui-redesign');
const API = 'https://erpx-ui-test.supabase.co';
const uuid = (index) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, '0')}`;
const companyId = uuid(1),
  userId = uuid(2),
  adminRoleId = uuid(3),
  viewerRoleId = uuid(4),
  branchId = uuid(5),
  warehouseId = uuid(6),
  customerId = uuid(7);
const now = new Date(),
  date = now.toISOString().slice(0, 10);
const cashierRoleId = uuid(9);
const recoveryShiftId = uuid(10);
const ownerRoleId = uuid(11);
const developerRoleId = uuid(12);
const day = (offset) => new Date(now.getTime() + offset * 86400000).toISOString().slice(0, 10);
const routes = [
  '/dashboard',
  '/reports',
  '/finance/invoicing',
  '/purchase',
  '/inventory',
  '/finance/accounting',
  '/hr/employees',
  '/ai/predictions',
  '/ai/recommendations',
  '/ai/alerts',
  '/system/users',
  '/admin/roles',
  '/admin/permissions-matrix',
  '/settings',
  '/admin/supabase-diagnostic',
];
const widths = process.argv.includes('--quick') ? [390, 1440] : [360, 390, 768, 1024, 1440, 1920];
const recoveryOnly = process.argv.includes('--recovery-only');
const grants = [
  'dashboard',
  'users',
  'finance',
  'hr',
  'inventory',
  'sales',
  'purchases',
  'pos',
  'reports',
  'settings',
  'audit',
].flatMap((category) =>
  ['view', 'create', 'update', 'delete', 'export'].map((action) => ({
    permission_key: `${category}.${action}`,
    permission_name: `${category} ${action}`,
    category,
  })),
);
const company = {
  id: companyId,
  tenant_id: uuid(8),
  name: 'ERPX-AI UI TEST COMPANY',
  legal_name: 'Synthetic UI fixture only',
  tax_id: '',
  currency: 'SAR',
  timezone: 'Asia/Riyadh',
  status: 'active',
  country: 'SA',
  city: 'Synthetic city',
  address: 'Synthetic UI address',
  email: 'company@ui-test.invalid',
  phone: '',
  website: '',
  logo_url: null,
};
const roles = [
  {
    id: developerRoleId,
    company_id: null,
    name: 'developer',
    display_name: 'UI Test Developer',
    level: 900,
    status: 'active',
    permissions: { all: true },
    is_system_role: true,
  },
  {
    id: ownerRoleId,
    company_id: null,
    name: 'owner',
    display_name: 'UI Test Owner',
    level: 1000,
    status: 'active',
    permissions: { all: true },
    is_system_role: true,
  },
  {
    id: adminRoleId,
    company_id: null,
    name: 'admin',
    display_name: 'UI Test Admin',
    level: 700,
    status: 'active',
    permissions: { all: true },
    is_system_role: true,
  },
  {
    id: viewerRoleId,
    company_id: companyId,
    name: 'viewer',
    display_name: 'UI Test Viewer',
    level: 100,
    status: 'active',
    permissions: { read: true },
    is_system_role: false,
  },
  {
    id: cashierRoleId,
    company_id: companyId,
    name: 'cashier',
    display_name: 'UI Test Cashier',
    level: 200,
    status: 'active',
    permissions: { pos_access: true },
    is_system_role: false,
  },
];
const client = {
  id: customerId,
  company_id: companyId,
  company_name: 'SYNTHETIC CUSTOMER',
  customer_code: 'UI-CUSTOMER',
  status: 'active',
  contact_name: 'Synthetic contact',
  phone: '',
  email: 'customer@ui-test.invalid',
  address: '',
  created_at: now.toISOString(),
};
const products = Array.from({ length: 16 }, (_, index) => ({
  id: uuid(100 + index),
  company_id: companyId,
  sku: `UI-${String(index + 1).padStart(3, '0')}`,
  item_code: `UI-ITEM-${index + 1}`,
  barcode: `UI-BARCODE-${index + 1}`,
  product_name: `SYNTHETIC PRODUCT ${String(index + 1).padStart(2, '0')}`,
  description: 'Synthetic UI fixture, not production inventory.',
  category_id: index % 3 === 0 ? uuid(15) : null,
  unit_of_measure: 'PCS',
  product_type: 'GOODS',
  tracking_method: 'NONE',
  unit_price: 100 + index,
  cost_price: 30,
  vat_rate: 15,
  min_stock_level: 3,
  max_stock_level: null,
  reorder_point: 3,
  track_inventory: true,
  is_active: index !== 15,
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
  attributes: {},
  images: [],
}));
const accounts = [
  {
    id: uuid(400),
    company_id: companyId,
    account_code: '1000',
    account_name: 'Synthetic assets',
    account_type: 'asset',
    parent_account_id: null,
    current_balance: 0,
    is_active: true,
  },
  {
    id: uuid(401),
    company_id: companyId,
    account_code: '1100',
    account_name: 'Synthetic cash',
    account_type: 'asset',
    parent_account_id: uuid(400),
    current_balance: 115,
    is_active: true,
  },
  {
    id: uuid(402),
    company_id: companyId,
    account_code: '4000',
    account_name: 'Synthetic sales',
    account_type: 'revenue',
    parent_account_id: null,
    current_balance: 100,
    is_active: true,
  },
  {
    id: uuid(403),
    company_id: companyId,
    account_code: '2100',
    account_name: 'Synthetic VAT',
    account_type: 'liability',
    parent_account_id: null,
    current_balance: 15,
    is_active: true,
  },
];
const invoiceLine = {
  id: uuid(801),
  invoice_id: uuid(200),
  product_id: products[0].id,
  description: products[0].product_name,
  quantity: 1,
  unit_price: 100,
  line_total: 100,
  discount_amount: 0,
  vat_rate: 15,
  vat_amount: 15,
  line_number: 1,
};
const invoices = Array.from({ length: 16 }, (_, index) => {
  const status = ['partial', 'paid', 'draft', 'issued'][index % 4];
  return {
    id: uuid(200 + index),
    company_id: companyId,
    branch_id: branchId,
    customer_id: customerId,
    customer: client,
    invoice_number: `UI-INV-${String(index + 1).padStart(3, '0')}`,
    issue_date: day(-index),
    due_date: day(index % 2 ? 7 : -2),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    currency_code: index === 14 ? 'USD' : 'SAR',
    invoice_type_code: '388',
    status,
    payment_status: status === 'paid' ? 'paid' : status === 'partial' ? 'partial' : 'unpaid',
    subtotal: 100,
    discount_amount: 0,
    taxable_amount: 100,
    vat_amount: 15,
    total_amount: 115,
    amount_paid: status === 'paid' ? 115 : status === 'partial' ? 40 : 0,
    amount_due: status === 'paid' ? 0 : status === 'partial' ? 75 : 115,
    notes: 'SYNTHETIC UI DOCUMENT ONLY',
    reference_number: 'UI-REFERENCE',
    reporting_status: 'not_submitted',
    clearance_status: 'not_submitted',
    lines: [{ ...invoiceLine, id: uuid(800 + index), invoice_id: uuid(200 + index) }],
  };
});
const business = [
  ...Array.from({ length: 14 }, (_, index) => ({
    id: uuid(500 + index),
    company_id: companyId,
    module: 'purchases',
    title: `SYNTHETIC PURCHASE ${index + 1}`,
    reference: `UI-PR-${index + 1}`,
    status: ['draft', 'submitted', 'approved'][index % 3],
    record_date: date,
    amount: 100 + index,
    version: 1,
    data: {
      supplier: 'SYNTHETIC SUPPLIER',
      requested_by: 'UI test user',
      description: 'Synthetic purchase fixture only',
      priority: 'normal',
    },
    created_by: userId,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  })),
  ...Array.from({ length: 14 }, (_, index) => ({
    id: uuid(600 + index),
    company_id: companyId,
    module: 'hr_employees',
    title: `SYNTHETIC EMPLOYEE ${index + 1}`,
    reference: `UI-EMP-${index + 1}`,
    status: index === 13 ? 'inactive' : 'active',
    record_date: day(-30),
    amount: 0,
    version: 1,
    data: {
      employee_number: `UI-EMP-${index + 1}`,
      department: index % 2 ? 'Operations' : 'Finance',
      job_title: 'Synthetic test role',
      start_date: day(-30),
      email: `employee${index + 1}@ui-test.invalid`,
      phone: '',
      base_salary: 1000,
    },
    created_by: userId,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  })),
];
const journal = {
  id: uuid(700),
  company_id: companyId,
  entry_number: 'UI-JOURNAL-001',
  entry_date: date,
  description: 'Synthetic posted transaction only',
  status: 'posted',
  lines: [
    { account_id: accounts[1].id, debit_amount: 115, credit_amount: 0, account: accounts[1] },
    { account_id: accounts[2].id, debit_amount: 0, credit_amount: 100, account: accounts[2] },
    { account_id: accounts[3].id, debit_amount: 0, credit_amount: 15, account: accounts[3] },
  ],
};
const aiBase = {
  ok: true,
  provider: 'ollama',
  model: 'UI-test-model',
  readOnly: true,
  mode: 'generative',
  dataScope: 'Synthetic local UI fixtures only. No live data or inference.',
  limits: { invoiceLimit: 1000, messageCharacters: 4000, responseTokens: 512 },
};
const aiStatus = {
  ...aiBase,
  available: true,
  configured: true,
  deploymentMode: 'local_gateway',
  healthChecked: true,
  healthScope: 'gateway',
  inferenceVerified: false,
};

class AcceptanceError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
function ensure(value, code) {
  if (!value) throw new AcceptanceError(code);
}
function fixtureState(variant = 'normal') {
  const roleId = {
    viewer: viewerRoleId, 'sale-recovery': cashierRoleId, owner: ownerRoleId, developer: developerRoleId,
  }[variant] ?? adminRoleId;
  const profile = {
    id: userId,
    company_id: companyId,
    branch_id: branchId,
    role_id: roleId,
    first_name: 'Synthetic',
    last_name: 'UI tester',
    email: 'tester@ui-test.invalid',
    status: 'active',
    created_at: now.toISOString(),
  };
  const users = Array.from({ length: 14 }, (_, index) => ({
    ...profile,
    id: index ? uuid(900 + index) : userId,
    first_name: 'Synthetic',
    last_name: `member ${index + 1}`,
    email: `member${index + 1}@ui-test.invalid`,
    role_id: index ? viewerRoleId : profile.role_id,
  }));
  users[0] = profile;
  const tables = {
    users,
    profiles: [{ ...profile, full_name: 'Synthetic UI tester' }],
    companies: [company],
    roles,
    branches: [{ id: branchId, company_id: companyId, name: 'SYNTHETIC BRANCH', status: 'active' }],
    warehouses: [
      {
        id: warehouseId,
        company_id: companyId,
        branch_id: branchId,
        name: 'SYNTHETIC WAREHOUSE',
        is_active: true,
      },
    ],
    customers: [client],
    products,
    inventory: products.map((product, index) => ({
      id: uuid(300 + index),
      product_id: product.id,
      warehouse_id: warehouseId,
      quantity_available: index < 2 ? 3 : 10,
      quantity_reserved: 2,
      product: { ...product },
      warehouse: { name: 'SYNTHETIC WAREHOUSE' },
      updated_at: now.toISOString(),
    })),
    invoices,
    payments: [
      {
        id: uuid(850),
        company_id: companyId,
        invoice_id: invoices[0].id,
        payment_number: 'UI-RECEIPT-001',
        payment_date: date,
        payment_method: 'cash',
        amount: 40,
        reference_number: 'UI-CASH',
        status: 'completed',
      },
    ],
    business_records: business,
    business_record_events: [],
    chart_of_accounts: accounts,
    journal_entries: [journal],
    journal_entry_lines: journal.lines.map((line, index) => ({
      ...line,
      id: uuid(750 + index),
      journal_entry_id: journal.id,
      entry: journal,
      journal_entry: journal,
    })),
    permissions: [
      ...grants,
      {
        permission_key: 'custom.review',
        permission_name: 'Synthetic custom review',
        category: 'custom',
      },
    ],
    role_permissions: [
      {
        role_id: adminRoleId,
        permission: {
          permission_key: 'custom.review',
          permission_name: 'Synthetic custom review',
          category: 'custom',
        },
      },
    ],
    audit_logs: [],
    developer_access_logs: [],
    emergency_access_logs: [],
    profiles: [],
    notifications: [],
    sales: [],
    shifts: variant === 'sale-recovery' ? [{
      id: recoveryShiftId, company_id: companyId, branch_id: branchId, cashier_id: userId,
      status: 'open', opening_cash: 0, total_sales: 0, opened_at: now.toISOString(),
    }] : [],
  };
  if (variant === 'empty')
    for (const table of [
      'products',
      'inventory',
      'invoices',
      'payments',
      'business_records',
      'chart_of_accounts',
      'journal_entries',
      'journal_entry_lines',
    ])
      tables[table] = [];
  return {
    tables: structuredClone(tables),
    profile,
    variant,
    writeAttempts: [],
    blocked: [],
    expectedRemoteBlocks: 0,
    reads: [],
    aiChats: 0,
    failNextChat: false,
    expectedFailures: 0,
    mutated: false,
    recovery: { attempts: [], committed: null },
    pageErrors: [],
  };
}
function field(row, name) {
  return name.split('.').reduce((value, part) => value?.[part], row);
}
function filterRows(rows, query) {
  let result = rows;
  for (const [key, condition] of query) {
    if (['select', 'order', 'limit', 'offset', 'or', 'and'].includes(key)) continue;
    const dot = condition.indexOf('.'),
      operator = condition.slice(0, dot),
      expected = condition.slice(dot + 1);
    if (dot < 0) continue;
    if (operator === 'eq') result = result.filter((row) => String(field(row, key)) === expected);
    if (operator === 'is')
      result = result.filter((row) =>
        expected === 'null' ? field(row, key) == null : String(field(row, key)) === expected,
      );
    if (['gt', 'gte', 'lt', 'lte'].includes(operator))
      result = result.filter((row) =>
        operator === 'gt'
          ? Number(field(row, key)) > Number(expected)
          : operator === 'gte'
            ? Number(field(row, key)) >= Number(expected)
            : operator === 'lt'
              ? Number(field(row, key)) < Number(expected)
              : Number(field(row, key)) <= Number(expected),
      );
    if (operator === 'in') {
      const values = expected.replace(/^\(|\)$/g, '').split(',');
      result = result.filter((row) => values.includes(String(field(row, key))));
    }
  }
  return result;
}
function syntheticSession(viewer = false) {
  const claims = {
    sub: userId,
    aud: 'authenticated',
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.SYNTHETIC-NOT-A-REAL-TOKEN`;
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'SYNTHETIC-LOCAL-ONLY',
    user: {
      id: userId,
      email: 'tester@ui-test.invalid',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: now.toISOString(),
    },
    viewer,
  };
}
async function mockContext(browser, base, language, variant = 'normal', dark = false) {
  const state = fixtureState(variant);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: language === 'ar' ? 'ar-SA' : 'en-GB',
    timezoneId: 'Asia/Riyadh',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    acceptDownloads: true,
  });
  await context.addInitScript(
    ({ session, language, dark }) => {
      if (session) localStorage.setItem('sb-erpx-ui-test-auth-token', JSON.stringify(session));
      if (location.pathname === '/registration-success') {
        history.replaceState({ ...history.state, usr: {
          email: 'tester@ui-test.invalid', companyName: 'ERPX-AI UI Test Company',
        } }, '');
      }
      localStorage.setItem('language', language);
      localStorage.setItem('i18nextLng', language);
      localStorage.setItem('erpx-theme', dark ? 'dark' : 'light');
      localStorage.setItem('theme', dark ? 'dark' : 'light');
      if (dark) document.documentElement?.classList.add('dark');
    },
    { session: variant === 'public' ? null : syntheticSession(variant === 'viewer'), language, dark },
  );
  await context.route('**/*', async (route) => {
    const request = route.request(),
      target = new URL(request.url()),
      method = request.method();
    if (target.origin === base && ['GET', 'HEAD'].includes(method)) return route.continue();
    if (
      ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(target.hostname) ||
      (request.resourceType() === 'image' && target.hostname === 'images.unsplash.com')
    ) {
      state.expectedRemoteBlocks++;
      return route.abort('blockedbyclient');
    }
    if (target.origin !== API) {
      state.blocked.push({ reason: 'unknown_remote', method, host: target.host });
      return route.abort('blockedbyclient');
    }
    const reply = (body, status = 200, extra = {}) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
          'x-erpx-ui-fixture': 'synthetic-local-only',
          ...extra,
        },
        body: method === 'HEAD' ? '' : JSON.stringify(body),
      });
    if (method === 'OPTIONS') return reply(null, 204);
    if (target.pathname === '/auth/v1/user') return reply(syntheticSession().user);
    if (target.pathname === '/auth/v1/health') return reply({ name: 'Synthetic UI health' });
    if (target.pathname === '/auth/v1/logout' && method === 'POST') return reply({});
    if (finalReview && target.pathname === '/auth/v1/recover' && method === 'POST') {
      await new Promise(resolve => setTimeout(resolve, 500));
      return reply({ message: 'Synthetic recovery failure' }, 422);
    }
    let body;
    try {
      body = request.postDataJSON();
    } catch {
      body = null;
    }
    if (
      target.pathname === '/auth/v1/token' &&
      method === 'POST' &&
      ['refresh_token', 'password'].includes(target.searchParams.get('grant_type'))
    )
      return reply(syntheticSession());
    if (target.pathname.startsWith('/rest/v1/rpc/') && method === 'POST') {
      const rpc = target.pathname.split('/').at(-1);
      const saleRecovery = variant === 'sale-recovery' && rpc === 'complete_pos_sale';
      const receiptRecovery = variant === 'receipt-recovery' && rpc === 'record_invoice_payment';
      if (saleRecovery || receiptRecovery) {
        const key = saleRecovery ? body?.p_idempotency_key : body?.p_request_id;
        const invoice = state.tables.invoices[0];
        const valid = saleRecovery
          ? body?.p_company_id === companyId && body.p_branch_id === branchId &&
            body.p_cashier_id === userId && body.p_shift_id === recoveryShiftId &&
            body.p_payment_method === 'cash' && body.p_items?.length === 1 &&
            body.p_items[0].product_id === products[0].id && body.p_items[0].quantity === 2
          : body?.p_invoice_id === invoice.id && body.p_amount === 75 && body.p_method === 'cash';
        if (!valid || !/^[\da-f-]{36}$/i.test(key ?? '')) {
          state.writeAttempts.push({ endpoint: rpc, blocked: true });
          return reply({ message: 'Unexpected synthetic operation' }, 400);
        }
        const recovery = state.recovery;
        recovery.attempts.push(body);
        if (recovery.committed) {
          if (JSON.stringify(body) !== JSON.stringify(recovery.attempts[0])) {
            state.writeAttempts.push({ endpoint: rpc, blocked: true });
            return reply({ message: 'Synthetic retry changed the request' }, 409);
          }
          return reply(recovery.committed);
        }
        if (saleRecovery) {
          recovery.committed = {
            success: true, sale_id: uuid(190), sale_number: 'UI-POS-RECOVERY',
            invoice_id: uuid(191), invoice_number: 'UI-POS-INVOICE', total_amount: 230,
          };
          state.tables.sales.push(recovery.committed);
        } else {
          Object.assign(invoice, { amount_paid: 115, amount_due: 0, status: 'paid', payment_status: 'paid' });
          state.tables.payments.push({
            id: uuid(851), company_id: companyId, invoice_id: invoice.id, payment_number: 'UI-RECEIPT-RECOVERED',
            payment_date: date, payment_method: 'cash', amount: 75, status: 'completed',
          });
          recovery.committed = invoice;
        }
        // The fixture applies the operation before the browser loses its response.
        return route.abort('failed');
      }
      if (['get_user_roles', 'get_user_permissions'].includes(rpc)) {
        if (body?.p_user_id !== userId || Object.keys(body).length !== 1) {
          state.blocked.push({ reason: 'identity_override', method });
          return reply({ message: 'Synthetic identity mismatch' }, 403);
        }
        const role = roles.find(({ id }) => id === state.profile.role_id);
        return reply(
          rpc === 'get_user_roles'
            ? [
                {
                  role_name: role.name,
                  display_name: role.display_name,
                  level: role.level,
                },
              ]
            : variant === 'viewer'
              ? grants.filter((permission) => permission.permission_key.endsWith('.view'))
              : grants,
        );
      }
      if (
        rpc === 'can_access_tenant' &&
        body?.p_user_id === userId &&
        [companyId, company.tenant_id].includes(body.p_tenant_id)
      )
        return reply(true);
      state.writeAttempts.push({ endpoint: rpc, blocked: true });
      return reply(
        { code: '42501', message: 'Writes are blocked by the synthetic UI acceptance harness.' },
        403,
      );
    }
    if (target.pathname === '/functions/v1/ai/chat' && method === 'POST') {
      if (body?.action === 'status' && Object.keys(body).length === 1) return reply(aiStatus);
      if (typeof body?.message === 'string' && Object.keys(body).length === 1) {
        state.aiChats++;
        if (state.failNextChat) {
          state.failNextChat = false;
          state.expectedFailures++;
          return reply(
            { ok: false, code: 'provider_unavailable', error: 'Synthetic offline test only.' },
            503,
          );
        }
        return reply({
          ...aiBase,
          message:
            'استجابة اختبار محلية مصطنعة فقط، وليست توليداً من نموذج أو بيانات إنتاج. Synthetic UI fixture response only; no real inference or business action.',
          generatedAt: now.toISOString(),
        });
      }
      state.blocked.push({ reason: 'ai_override', method });
      return reply({ ok: false }, 400);
    }
    const tableMatch = /^\/rest\/v1\/([a-z_]+)$/.exec(target.pathname);
    if (tableMatch && ['GET', 'HEAD'].includes(method)) {
      const table = tableMatch[1];
      state.reads.push(table);
      if (variant === 'error' && ['invoices', 'products', 'business_records'].includes(table)) {
        state.expectedFailures++;
        return reply({ message: 'Synthetic read failure', code: 'UI_TEST_FAILURE' }, 503);
      }
      if (!(table in state.tables)) {
        state.blocked.push({ reason: 'unknown_table', table, method });
        return reply({ message: 'Unknown synthetic table', code: '42P01' }, 404);
      }
      let rows = filterRows(state.tables[table], target.searchParams);
      const total = rows.length,
        offset = Number(target.searchParams.get('offset') || 0),
        limit = Number(target.searchParams.get('limit') || 1000);
      rows = rows.slice(offset, offset + limit);
      const extra = {
        'content-range': rows.length
          ? `${offset}-${offset + rows.length - 1}/${total}`
          : `*/${total}`,
      };
      if ((request.headers().accept || '').includes('application/vnd.pgrst.object+json'))
        return rows.length
          ? reply(rows[0], 200, extra)
          : reply({ code: 'PGRST116', details: 'The result contains 0 rows' }, 406, extra);
      return reply(rows, 200, extra);
    }
    state.writeAttempts.push({ endpoint: 'unapproved_request', method, blocked: true });
    return reply({ message: 'Unapproved operation in synthetic UI harness' }, 403);
  });
  if (context.routeWebSocket)
    await context.routeWebSocket('**/*', (socket) => {
      const target = new URL(socket.url());
      if (
        ['127.0.0.1', 'localhost'].includes(target.hostname) &&
        target.port === new URL(base).port
      )
        socket.connectToServer();
      else if (
        target.protocol === 'wss:' &&
        target.host === new URL(API).host && target.pathname === '/realtime/v1/websocket'
      )
        socket.close();
      else {
        state.blocked.push({ reason: 'unknown_websocket', host: target.host });
        socket.close();
      }
    });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => state.pageErrors.push({ kind: error.name || 'Error' }));
  return { context, page, state };
}

const report = {
  format: 'erpx_ui_redesign_acceptance_v1',
  mode: 'local_actual_app_mocked_http',
  startedAt: new Date().toISOString(),
  status: 'running',
  productionContacted: false,
  envFilesLoaded: false,
  credentialsRead: false,
  actualModelCalled: false,
  viewports: widths,
  routes,
  cases: [],
  interactions: [],
  screenshots: [],
  unexpectedRemoteRequests: [],
  unexpectedWrites: [],
  pageErrors: [],
  limitations: [
    'All records/auth/provider replies are synthetic HTTP fixtures. This validates the real local UI, not a live database or LLM.',
    'No external payment, invitation, tax submission, production request or database mutation is permitted.',
  ],
};
let server, browser, base;
async function record(name, work, target = report.interactions) {
  const item = { name, status: 'running' };
  target.push(item);
  try {
    await work(item);
    item.status = 'passed';
  } catch (error) {
    item.status = 'failed';
    item.failure =
      error instanceof AcceptanceError
        ? error.code
        : error?.name === 'TimeoutError'
          ? 'ui_timeout'
          : 'ui_assertion_failed';
  }
  return item;
}
async function ready(page, path) {
  const result = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  ensure(result?.ok(), 'local_route_http_error');
  await page.locator('h1').first().waitFor();
  await page.waitForLoadState('networkidle');
  ensure(new URL(page.url()).pathname === path.split('?')[0], 'unexpected_route_redirect');
  const heading = (await page.locator('h1').first().innerText()).trim();
  ensure(
    heading.length > 1 &&
      !/^(?:nav|common|health|users|company|overview|inventory|invoices)\.[a-zA-Z]/.test(heading),
    'missing_translated_heading',
  );
}
async function noOverflow(page) {
  const size = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    width: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  ensure(
    size.width <= size.viewport + 1 && size.body <= size.viewport + 1,
    'page_horizontal_overflow',
  );
}
async function screenshot(page, name) {
  const filename = `${name.replace(/[^a-zA-Z0-9_-]/g, '-')}.png`;
  await page.screenshot({
    path: resolve(output, filename),
    fullPage: true,
    animations: 'disabled',
    mask: [page.locator('input[type="password"]:not(:placeholder-shown)')],
  });
  report.screenshots.push(filename);
}
function collect(state) {
  report.unexpectedRemoteRequests.push(...state.blocked);
  report.unexpectedWrites.push(...state.writeAttempts);
  report.pageErrors.push(...state.pageErrors);
}

async function auditRoutes() {
  const source = await readFile(resolve(root, 'src/app/App.tsx'), 'utf8');
  const publicRoutes = new Set([...source.matchAll(/path="(\/[^"*]*)"/g)].map((match) => match[1]));
  const workspaceRoutes = [...source.matchAll(/path="([^\/"*][^"]*)"/g)]
    .map((match) => '/' + match[1]);
  const targets = finalReview ? [
    '/login', '/register', '/registration-success', '/forgot-password', '/reset-password', '/oauth/consent',
    '/dashboard', '/finance/invoicing', '/cashier/pos', '/admin/auth-docs', '/admin/audit-logs',
    '/admin/developer-mode', '/admin/emergency-access',
  ] : [...publicRoutes, ...new Set(['/cashier/pos', ...workspaceRoutes])];
  const widths = [390, 1440];
  await Promise.all(['en', 'ar'].flatMap((language) => widths.map(async (width) => {
    const sessions = {
      public: await mockContext(browser, base, language, 'public', true),
      workspace: await mockContext(browser, base, language, 'normal', true),
      cashier: await mockContext(browser, base, language, 'sale-recovery', true),
      owner: await mockContext(browser, base, language, 'owner', true),
      developer: await mockContext(browser, base, language, 'developer', true),
    };
    try {
      for (const { page } of Object.values(sessions)) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      }
      for (const path of targets) {
        const ownerRoutes = ['/admin/audit-logs', '/admin/emergency-access'];
        const session = publicRoutes.has(path) ? 'public'
          : path === '/cashier/pos' ? 'cashier'
          : path === '/admin/developer-mode' ? 'developer'
          : ownerRoutes.includes(path) ? 'owner'
          : 'workspace';
        const { page, state } = sessions[session];
        await record(`${language}-${width}-${path}`, async (item) => {
          const startErrors = state.pageErrors.length;
          const response = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
          ensure(response?.ok(), 'local_route_http_error');
          await page.waitForLoadState('networkidle');
          await page.locator('#root > *').first().waitFor({ timeout: 4000 });
          if (session === 'owner' || session === 'developer')
            await page.locator('.erpx-content h1').first().waitFor({ timeout: 4000 });
          await screenshot(page, `${language}-${width}-${path}`);
          item.url = new URL(page.url()).pathname;
          item.heading = await page.locator('h1').first().textContent({ timeout: 300 }).catch(() => null);
          ensure(item.url === path, 'route_redirected');
          ensure(state.pageErrors.length === startErrors, 'uncaught_page_error');
          item.direction = await page.locator('html').getAttribute('dir');
          ensure(item.direction === (language === 'ar' ? 'rtl' : 'ltr'), 'document_direction_incorrect');
          await noOverflow(page);
        }, report.cases);
      }
      await record(`invoice-detail-${language}-${width}`, async () => {
        const { page } = sessions.workspace;
        await ready(page, '/finance/invoicing');
        await page.getByRole('button', { name: 'UI-INV-001', exact: true }).click();
        await page.locator('.ws-invoice-balance').waitFor();
        ensure(await page.locator('[role="dialog"] bdi[dir="ltr"]').first().textContent() === 'UI-INV-001', 'invoice_id_direction_or_value');
        ensure(await page.locator('.ws-invoice-balance [data-highlight="true"]').count() === 3, 'invoice_balances_missing');
        await page.locator('.ws-invoice-balance').scrollIntoViewIfNeeded();
        if (finalReview && width === 390) {
          const filename = `${language}-${width}-invoice-detail.png`;
          await page.getByRole('dialog').screenshot({ path: resolve(output, filename), animations: 'disabled' });
          report.screenshots.push(filename);
        } else {
          await screenshot(page, `${language}-${width}-invoice-detail`);
        }
      });
      if (finalReview && width === 390) await record(`cart-${language}-${width}`, async () => {
        const { page } = sessions.cashier;
        await page.locator('.erpx-pos-product').first().click();
        const cart = page.locator('#pos-cart');
        await page.locator('.erpx-pos-cart-link').click();
        await cart.getByRole('button', { name: language === 'ar' ? 'إتمام الدفع' : 'Complete Payment' }).waitFor();
        ensure(await cart.locator('.erpx-pos-checkout').isEnabled(), 'cart_checkout_disabled');
        await noOverflow(page);
        await cart.screenshot({ path: resolve(output, `${language}-390-cart.png`), animations: 'disabled' });
        report.screenshots.push(`${language}-390-cart.png`);
      });
      const { page } = sessions.public;
      if (finalReview && language === 'ar') await record(`localized-auth-states-${width}`, async () => {
        await page.goto(base + '/register');
        const title = await page.locator('h1').boundingBox();
        const languageButton = await page.locator('.erpx-auth-language button').boundingBox();
        ensure(title && languageButton && title.y >= languageButton.y + languageButton.height, 'registration_language_overlaps_heading');
        await page.getByRole('button', { name: 'التالي', exact: true }).click();
        await page.getByText('أدخل حرفين على الأقل في اسم الشركة', { exact: true }).waitFor();
        await page.goto(base + '/forgot-password');
        await page.locator('#email').fill('tester@ui-test.invalid');
        await page.getByRole('button', { name: 'إرسال رابط الاستعادة' }).click();
        await page.getByRole('button', { name: 'جارٍ الإرسال…' }).waitFor();
        await page.getByRole('alert').getByText('تعذر إرسال رابط الاستعادة').waitFor();
        await page.getByRole('button', { name: 'EN', exact: true }).click();
        await page.getByRole('alert').getByText('Failed to send reset email').waitFor();
      });
      await record(`login-keyboard-${language}-${width}`, async () => {
        await ready(page, '/login');
        const email = page.locator('#email');
        await email.focus();
        await page.keyboard.press('Tab');
        ensure(await page.locator('#password').evaluate(element => document.activeElement === element), 'password_keyboard_order');
        const outline = await page.locator('#password').evaluate(element => getComputedStyle(element).outlineStyle);
        ensure(outline !== 'none', 'password_focus_not_visible');
        await page.getByRole('button', { name: language === 'ar' ? 'EN' : 'ع', exact: true }).click();
        await page.waitForFunction((dir) => document.documentElement.dir === dir, language === 'ar' ? 'ltr' : 'rtl');
        await page.locator('#email').fill('tester@ui-test.invalid');
        await page.locator('#password').fill('synthetic-local-password');
        await page.locator('form button[type="submit"]').click();
        await page.waitForURL('**/dashboard');
      });
    } finally {
      for (const { context, state } of Object.values(sessions)) {
        collect(state);
        await context.close();
      }
    }
  })));
}

try {
  await mkdir(output, { recursive: true });
  const fixtureBuild = resolve(output, 'build');
  await build({
    root,
    configLoader: 'runner',
    envDir: false,
    logLevel: 'error',
    build: { outDir: fixtureBuild },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(API),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        'synthetic-public-ui-key-not-a-real-credential',
      ),
      'import.meta.env.VITE_DEMO_MODE': JSON.stringify('false'),
      'import.meta.env.VITE_ENABLE_DIAGNOSTIC_WRITES': JSON.stringify('false'),
    },
  });
  server = await preview({
    root,
    configLoader: 'runner',
    envDir: false,
    logLevel: 'error',
    build: { outDir: fixtureBuild },
    preview: { host: '127.0.0.1', port: 0 },
  });
  base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true });
  if (visualOnly) await auditRoutes();
  for (const variant of skipInteractions ? [] : ['sale-recovery', 'receipt-recovery']) {
    const { context, page, state } = await mockContext(browser, base, 'en', variant);
    await record(variant, async () => {
      if (variant === 'sale-recovery') {
        await page.goto(base + '/cashier/pos');
        const product = page.getByRole('button').filter({
          has: page.getByRole('heading', { name: products[0].product_name, exact: true }),
        });
        await product.click();
        await product.click();
        await page.getByRole('button', { name: 'Cash', exact: true }).click();
        const checkout = page.getByRole('button', { name: 'Complete Payment', exact: true });
        const submit = async () => {
          const result = page.waitForEvent('dialog').then(async (dialog) => {
            const message = dialog.message();
            await dialog.accept();
            return message;
          });
          const [message] = await Promise.all([result, checkout.click()]);
          return message;
        };
        ensure((await submit()).startsWith('Checkout failed'), 'missing_checkout_error');
        ensure(state.recovery.attempts.length === 1 && state.tables.sales.length === 1, 'sale_not_applied_before_retry');
        ensure((await submit()).includes('UI-POS-RECOVERY'), 'missing_replayed_sale_confirmation');
        ensure(state.tables.sales.length === 1, 'duplicate_synthetic_sale');
      } else {
        await ready(page, '/finance/invoicing');
        await page.getByRole('button', { name: 'UI-INV-001', exact: true }).click();
        const drawer = page.getByRole('dialog');
        await drawer.getByRole('button', { name: 'Record receipt', exact: true }).click();
        await drawer.locator('#receipt-method').selectOption('cash');
        const save = drawer.getByRole('button', { name: 'Save receipt', exact: true });
        await save.click();
        await drawer.getByRole('alert').waitFor();
        ensure(state.recovery.attempts.length === 1 && state.tables.invoices[0].amount_due === 0, 'receipt_not_applied_before_retry');
        ensure(await drawer.locator('#receipt-amount').inputValue() === '75', 'receipt_amount_lost');
        await save.click();
        await drawer.getByText('UI-RECEIPT-RECOVERED', { exact: true }).waitFor();
        ensure(state.tables.payments.length === 2, 'duplicate_synthetic_receipt');
      }
      assert.equal(state.recovery.attempts.length, 2);
      assert.deepEqual(state.recovery.attempts[0], state.recovery.attempts[1]);
    });
    collect(state);
    await context.close();
  }
  for (const language of recoveryOnly || skipInteractions ? [] : ['en', 'ar']) {
    const { context, page, state } = await mockContext(browser, base, language, 'normal', visualOnly);
    const preflight = await record(`auth-preflight-${language}`, async () => {
      await ready(page, '/dashboard');
      ensure(
        state.reads.includes('users') && state.reads.includes('companies'),
        'actual_auth_flow_not_exercised',
      );
      ensure(
        !state.blocked.length && !state.writeAttempts.length,
        'preflight_network_guard_failed',
      );
    });
    if (preflight.status === 'failed') {
      await screenshot(page, `preflight-failed-${language}`);
      collect(state);
      await context.close();
      throw new AcceptanceError('synthetic_auth_preflight_failed');
    }
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of routes) {
        const item = await record(
          `${language}-${width}-${path}`,
          async (result) => {
            await ready(page, path);
            await noOverflow(page);
            result.heading = (await page.locator('h1').first().innerText()).trim();
            result.direction = await page.locator('html').getAttribute('dir');
            ensure(
              result.direction === (language === 'ar' ? 'rtl' : 'ltr'),
              'document_direction_incorrect',
            );
            if (
              width === 1440 ||
              (width === 360 &&
                ['/dashboard', '/finance/invoicing', '/inventory'].includes(path)) ||
              (width === 1920 && path === '/dashboard')
            )
              await screenshot(page, `${language}-${width}-${path}`);
          },
          report.cases,
        );
        if (item.status === 'failed') await screenshot(page, `failed-${language}-${width}-${path}`);
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await record(`invoice-search-drawer-pagination-export-${language}`, async () => {
      await ready(page, '/finance/invoicing');
      await page.locator('#invoice-search').fill('UI-INV-001');
      ensure(
        (await page.getByRole('button', { name: 'UI-INV-001', exact: true }).count()) === 1,
        'invoice_search_not_filtered',
      );
      ensure(
        (await page.getByRole('button', { name: 'UI-INV-002', exact: true }).count()) === 0,
        'invoice_search_extra_rows',
      );
      await page.getByRole('button', { name: 'UI-INV-001', exact: true }).click();
      await page.getByRole('dialog').waitFor();
      await page.getByRole('dialog').getByText('UI-RECEIPT-001', { exact: true }).waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.locator('#invoice-search').fill('');
      const next = page
        .getByRole('button', {
          name: language === 'ar' ? 'الصفحة التالية' : 'Next page',
          exact: true,
        })
        .first();
      await next.click();
      ensure(
        (await page.getByRole('button', { name: 'UI-INV-011', exact: true }).count()) === 1,
        'invoice_pagination_failed',
      );
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: /CSV/ }).first().click();
      const file = await download;
      ensure(file.suggestedFilename().endsWith('.csv'), 'table_export_not_csv');
    });
    await record(`inventory-filter-drawer-keyboard-${language}`, async () => {
      await ready(page, '/inventory');
      await page.locator('#inventory-search').fill('UI-001');
      const product = page.getByRole('button', { name: /SYNTHETIC PRODUCT 01/ }).first();
      await product.click();
      await page.getByRole('dialog').waitFor();
      await noOverflow(page);
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      ensure(
        await product.evaluate((element) => document.activeElement === element),
        'drawer_focus_not_restored',
      );
      await page.locator('#inventory-search').fill('');
      await page.locator('#inventory-status').selectOption('archived');
      ensure(
        (await page.getByText('SYNTHETIC PRODUCT 16', { exact: true }).count()) === 1,
        'inventory_status_filter_failed',
      );
    });
    await record(`assistant-retains-question-and-retries-${language}`, async () => {
      await ready(page, '/ai/recommendations');
      const input = page.locator('#assistant-message');
      const question =
        language === 'ar' ? 'سؤال اختبار واجهة مصطنع فقط' : 'Synthetic UI acceptance question only';
      await input.fill(question);
      state.failNextChat = true;
      await input
        .locator('xpath=ancestor::form')
        .getByRole('button', { name: language === 'ar' ? /اسأل|إرسال|تحليل/ : /Ask|Send|Analyze/ })
        .click();
      await page.locator('[role="alert"]').waitFor();
      ensure((await input.inputValue()) === question, 'assistant_question_lost_after_error');
      await input
        .locator('xpath=ancestor::form')
        .getByRole('button', {
          name: language === 'ar' ? 'إعادة إرسال السؤال' : 'Retry question',
          exact: true,
        })
        .click();
      await page.locator('.ws-assistant-reply-text').waitFor();
      ensure(
        (await page.locator('.ws-assistant-reply-text').innerText()).includes(
          'Synthetic UI fixture response only',
        ),
        'synthetic_reply_not_rendered',
      );
      ensure(state.aiChats === 2, 'assistant_retry_request_count');
    });
    await record(`diagnostic-idle-and-read-only-${language}`, async () => {
      const before = state.writeAttempts.length;
      await ready(page, '/admin/supabase-diagnostic');
      ensure(
        (await page.locator('input[type="checkbox"]:checked').count()) === 0,
        'diagnostic_write_optin_default_on',
      );
      ensure(state.writeAttempts.length === before, 'diagnostic_writes_on_mount');
    });
    await record(`roles-and-matrix-read-only-${language}`, async () => {
      for (const path of ['/admin/roles', '/admin/permissions-matrix']) {
        await ready(page, path);
        ensure(
          (await page.locator('input[type="checkbox"]:not(:disabled)').count()) === 0,
          'permission_grants_editable',
        );
        ensure(
          (await page
            .getByRole('button', { name: language === 'ar' ? /^حفظ/ : /^Save/ })
            .count()) === 0,
          'unsupported_role_save_action',
        );
      }
    });
    await record(`settings-unsaved-guard-${language}`, async () => {
      await ready(page, '/settings');
      const input = page.locator('form input').first();
      await input.waitFor();
      await input.fill('SYNTHETIC UNSAVED UI CHANGE');
      const guarded = await page.evaluate(() => {
        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      });
      ensure(guarded, 'settings_beforeunload_not_guarded');
      const overview = page
        .getByRole('link', { name: language === 'ar' ? /النظرة العامة/ : /^Overview$/ })
        .first();
      const dismiss = page.waitForEvent('dialog').then(async (dialog) => {
        ensure(dialog.type() === 'confirm', 'settings_expected_discard_confirmation');
        await dialog.dismiss();
      });
      await Promise.all([dismiss, overview.click()]);
      ensure(new URL(page.url()).pathname === '/settings', 'settings_dirty_navigation_not_blocked');
      ensure(await input.inputValue() === 'SYNTHETIC UNSAVED UI CHANGE', 'settings_draft_lost_after_cancel');
      const accept = page.waitForEvent('dialog').then((dialog) => dialog.accept());
      await Promise.all([accept, overview.click(), page.waitForURL('**/dashboard')]);
    });
    collect(state);
    await context.close();
  }
  for (const variant of recoveryOnly || skipInteractions ? [] : ['empty', 'error', 'viewer']) {
    const { context, page, state } = await mockContext(browser, base, 'en', variant);
    await record(`state-${variant}`, async () => {
      if (variant === 'viewer') {
        await page.goto(base + '/system/users', { waitUntil: 'domcontentloaded' });
        await page.locator('[role="alert"]').waitFor();
        ensure(
          (await page.getByRole('button', { name: /Invite|Create user|New user/ }).count()) === 0,
          'unauthorized_admin_action_visible',
        );
        await ready(page, '/inventory');
        ensure(
          (await page.getByRole('button', { name: 'New product', exact: true }).count()) === 0,
          'viewer_product_create_visible',
        );
      } else
        for (const path of ['/dashboard', '/finance/invoicing', '/inventory', '/purchase']) {
          await ready(page, path);
          if (variant === 'error')
            await page.getByRole('alert').first().waitFor();
          else ensure((await page.locator('.ws-empty').count()) > 0, 'missing_empty_state');
          await screenshot(page, `${variant}-${path}`);
        }
      await noOverflow(page);
    });
    collect(state);
    await context.close();
  }
  for (const language of recoveryOnly || skipInteractions ? [] : ['en', 'ar']) {
    const { context, page, state } = await mockContext(browser, base, language, 'normal', true);
    await record(`dark-mode-${language}`, async () => {
      await ready(page, '/dashboard');
      ensure(
        await page
          .locator('html')
          .evaluate(
            (element) => element.classList.contains('dark') || element.dataset.theme === 'dark',
          ),
        'dark_preference_not_applied',
      );
      await noOverflow(page);
      await screenshot(page, `dark-${language}-dashboard`);
    });
    collect(state);
    await context.close();
  }
  report.status =
    [...report.cases, ...report.interactions].every((item) => item.status === 'passed') &&
    !report.unexpectedRemoteRequests.length &&
    !report.unexpectedWrites.length &&
    !report.pageErrors.length
      ? 'passed'
      : 'failed';
} catch (error) {
  report.status = 'failed';
  report.failure =
    error instanceof AcceptanceError ? error.code : 'local_acceptance_runtime_failed';
} finally {
  try {
    await browser?.close();
  } catch {
    /* Only synthetic fixture state exists. */
  }
  try {
    await server?.close();
  } catch {
    /* No raw runtime stacks in reports. */
  }
  report.finishedAt = new Date().toISOString();
  report.counts = {
    routeCases: report.cases.length,
    routePassed: report.cases.filter((item) => item.status === 'passed').length,
    interactions: report.interactions.length,
    interactionsPassed: report.interactions.filter((item) => item.status === 'passed').length,
    screenshots: report.screenshots.length,
    blockedUnknownRequests: report.unexpectedRemoteRequests.length,
    unexpectedWrites: report.unexpectedWrites.length,
    pageErrors: report.pageErrors.length,
  };
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({
      status: report.status,
      report: finalReview ? '.tmp/ui-final-review/report.json' : visualOnly ? '.tmp/ui-visual-review/report.json' : '.tmp/ui-redesign/report.json',
      ...report.counts,
    }),
  );
  if (report.status !== 'passed') process.exitCode = 1;
}
