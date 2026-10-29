import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_ORIGIN,
  API_ORIGIN,
  AI_PATH,
  EXPECTED_MODEL,
  UI_QUESTION,
  allowedBrowserMutation,
  readyStatus,
  zeroAnswerChecks,
  safeFailure,
  validateFixture,
} from './verify-published-ai.mjs';

function fixture() {
  const runId = '20261029T120000Z-abcdef123456';
  return {
    projectRef: 'svxmlejmhlocsjjtftxd',
    baseUrl: APP_ORIGIN,
    supabaseUrl: API_ORIGIN,
    supabaseAnonKey: 'sb_publishable_synthetic_test_key_only',
    companyName: `ERPX RELEASE ACCEPTANCE ${runId}`,
    companyId: '00000000-0000-4000-8000-000000000001',
    branchId: '00000000-0000-4000-8000-000000000002',
    warehouseId: '00000000-0000-4000-8000-000000000003',
    customerId: '00000000-0000-4000-8000-000000000004',
    tenantId: '00000000-0000-4000-8000-000000000005',
    admin: {
      userId: '00000000-0000-4000-8000-000000000006',
      email: `erpx.acceptance.${runId.toLowerCase()}.admin@example.test`,
      password: 'synthetic-fixture-password-admin',
    },
    cashier: {
      userId: '00000000-0000-4000-8000-000000000007',
      email: `erpx.acceptance.${runId.toLowerCase()}.cashier@example.test`,
      password: 'synthetic-fixture-password-cashier',
    },
    allowLiveMutations: true,
    metadata: { version: 1, runId, marker: 'a'.repeat(48), state: 'ready' },
  };
}
const ready = {
  ok: true,
  provider: 'ollama',
  model: EXPECTED_MODEL,
  configured: true,
  available: true,
  readOnly: true,
  mode: 'generative',
  deploymentMode: 'local_gateway',
  healthChecked: true,
  healthScope: 'gateway',
  inferenceVerified: false,
  dataScope: 'Synthetic invoice summary',
  limits: { invoiceLimit: 1000, messageCharacters: 4000, responseTokens: 512 },
};
function allowed(path, body, config = fixture(), method = 'POST', origin = API_ORIGIN) {
  return allowedBrowserMutation({ url: origin + path, method, body }, config);
}

test('accepts only the new, ready, pinned fixture identity contract', () => {
  const config = fixture();
  assert.equal(validateFixture(config), config);
  for (const change of [
    (value) => {
      value.baseUrl = 'https://other.example';
    },
    (value) => {
      value.metadata.state = 'finalized';
    },
    (value) => {
      value.companyName = 'Original business';
    },
    (value) => {
      value.admin.email = 'original@example.com';
    },
    (value) => {
      value.cashier.userId = value.admin.userId;
    },
    (value) => {
      value.allowLiveMutations = false;
    },
  ]) {
    const invalid = fixture();
    change(invalid);
    assert.throws(() => validateFixture(invalid));
  }
});
test('refuses privileged JWT keys without exposing their value', () => {
  const config = fixture();
  config.supabaseAnonKey =
    'eyJ0eXAiOiJKV1QifQ.' +
    Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') +
    '.synthetic';
  try {
    validateFixture(config);
    assert.fail('privileged key accepted');
  } catch (error) {
    assert.equal(safeFailure(error), 'privileged_key_refused');
    assert.doesNotMatch(safeFailure(error), /eyJ/);
  }
});
test('permits only the fixture administrator password sign-in in the browser', () => {
  const config = fixture(),
    body = { email: config.admin.email, password: config.admin.password, gotrue_meta_security: {} };
  assert.equal(allowed('/auth/v1/token?grant_type=password', body, config), true);
  assert.equal(
    allowed('/auth/v1/token?grant_type=password', { ...body, email: config.cashier.email }, config),
    false,
  );
  assert.equal(
    allowed('/auth/v1/token?grant_type=password', { ...body, password: 'wrong-password' }, config),
    false,
  );
  assert.equal(
    allowed(
      '/auth/v1/token?grant_type=password',
      { ...body, redirect_to: 'https://external.example' },
      config,
    ),
    false,
  );
  assert.equal(
    allowed('/auth/v1/token?grant_type=refresh_token', { refresh_token: 'synthetic' }, config),
    false,
  );
});
test('allows exactly two self-role read RPC shapes and denies changed identity/extra fields', () => {
  const config = fixture();
  for (const rpc of ['get_user_roles', 'get_user_permissions']) {
    assert.equal(allowed(`/rest/v1/rpc/${rpc}`, { p_user_id: config.admin.userId }, config), true);
    assert.equal(
      allowed(`/rest/v1/rpc/${rpc}`, { p_user_id: config.cashier.userId }, config),
      false,
    );
    assert.equal(
      allowed(
        `/rest/v1/rpc/${rpc}`,
        { p_user_id: config.admin.userId, company_id: config.companyId },
        config,
      ),
      false,
    );
  }
});
test('allows status and the one fixed UI question, never client overrides or arbitrary chat', () => {
  assert.equal(allowed(AI_PATH, { action: 'status' }), true);
  assert.equal(allowed(AI_PATH, { message: UI_QUESTION }), true);
  for (const body of [
    { action: 'status', provider: 'openai' },
    { action: 'status', company_id: fixture().companyId },
    { message: UI_QUESTION, model: 'other' },
    { message: 'arbitrary prompt' },
  ])
    assert.equal(allowed(AI_PATH, body), false);
  assert.equal(allowed(AI_PATH + '?extra=true', { action: 'status' }), false);
  assert.equal(
    allowed(AI_PATH, { action: 'status' }, fixture(), 'POST', 'https://external.example'),
    false,
  );
});
test('blocks every financial/admin/email mutation, including same-company payloads', () => {
  for (const path of [
    '/rest/v1/products',
    '/rest/v1/invoices',
    '/rest/v1/payments',
    '/rest/v1/rpc/issue_invoice',
    '/rest/v1/rpc/consume_integration_quota',
    '/functions/v1/zatca',
    '/functions/v1/manage-users',
    '/auth/v1/recover',
    '/auth/v1/signup',
    '/auth/v1/logout',
  ]) {
    for (const method of ['POST', 'PATCH', 'DELETE'])
      assert.equal(allowed(path, { company_id: fixture().companyId }, fixture(), method), false);
  }
});
test('requires the exact local model with read-only generative health contract', () => {
  assert.equal(readyStatus(ready), true);
  for (const change of [
    { model: 'other' },
    { provider: 'openai' },
    { readOnly: false },
    { available: false },
    { healthChecked: false },
    { healthScope: 'configuration' },
    { inferenceVerified: true },
    { mode: 'rules' },
  ])
    assert.equal(readyStatus({ ...ready, ...change }), false);
});
test('checks an Arabic zero answer without saving generated text', () => {
  assert.deepEqual(
    zeroAnswerChecks('عدد الفواتير الصادرة هو ٠، ولا توجد فواتير صادرة لهذه الشركة.'),
    {
      arabic: true,
      referencesInvoices: true,
      explicitZeroOrNoInvoices: true,
      noPositiveNumericInvoiceCount: true,
    },
  );
  assert.equal(
    Object.values(zeroAnswerChecks('لا توجد فواتير صادرة في هذه الشركة.')).every(Boolean),
    true,
  );
  assert.equal(zeroAnswerChecks('There are zero issued invoices.').arabic, false);
  assert.equal(
    zeroAnswerChecks('يوجد 12 فاتورة صادرة في هذه الشركة.').explicitZeroOrNoInvoices,
    false,
  );
  assert.equal(
    zeroAnswerChecks('لا توجد مشكلة؛ عدد الفواتير الصادرة هو 12.').noPositiveNumericInvoiceCount,
    false,
  );
});
test('never serializes arbitrary error messages, stacks or credential-like values', () => {
  const error = new Error('password=synthetic-private-value https://private.example');
  error.code = 'arbitrary-payload';
  assert.equal(safeFailure(error), 'verification_runtime_failed');
  assert.doesNotMatch(safeFailure(error), /password|private|payload|Error/);
});
