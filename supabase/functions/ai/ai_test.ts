import { HttpError } from '../_shared/auth.ts';
import { AIError, AI_LIMITS, ConfiguredProvider, gatewayOrigin, resolveProvider } from './config.ts';
import { createAIHandler } from './handler.ts';
import { gatewayHealth, generateAnswer } from './provider.ts';
import { AIDatabase, invoiceSnapshot, ISSUED_STATUSES, loadInvoiceSnapshot, moneyCents } from './snapshot.ts';

function assert(value: unknown, message = 'Assertion failed'): asserts value { if (!value) throw new Error(message); }
function equal(actual: unknown, expected: unknown) {
  const encode = (value: unknown) => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item);
  assert(encode(actual) === encode(expected), `Unexpected value: ${encode(actual)} != ${encode(expected)}`);
}
async function rejects(action: () => unknown | Promise<unknown>, status?: number) {
  try { await action(); } catch (error) {
    assert(error instanceof AIError);
    if (status) equal(error.status, status);
    return error;
  }
  throw new Error('Expected an AI error');
}
const token = 'OFFLINE_TEST_GATEWAY_TOKEN_NOT_REAL_1234567890';
const environment: Record<string, string> = { OLLAMA_BASE_URL: 'https://reviewed-gateway.example.test', OLLAMA_API_KEY: token, OLLAMA_MODEL: 'qwen3:1.7b' };
const env = (values = environment) => (name: string) => values[name];
function configured(values = environment): ConfiguredProvider {
  const config = resolveProvider(env(values));
  assert(config.configured); return config;
}
function invoice(overrides: Record<string, unknown> = {}) {
  return { status: 'paid', invoice_type_code: '388', currency_code: 'SAR', subtotal: '100.00', vat_amount: '15.00', total_amount: '115.00', amount_paid: '115.00', ...overrides };
}
function database(rows: unknown[] = [invoice()], eligibleCount: number | null = rows.length) {
  const calls: unknown[][] = []; let quotaError: unknown = null; let dataError: unknown = null;
  const query = {
    eq: (column: string, value: string) => { calls.push(['eq', column, value]); return query; },
    in: (column: string, values: string[]) => { calls.push(['in', column, values]); return query; },
    order: (column: string, options: unknown) => { calls.push(['order', column, options]); return query; },
    limit: async (count: number) => { calls.push(['limit', count]); return { data: rows, error: dataError, count: eligibleCount }; },
  };
  const db: AIDatabase = {
    rpc: async (name, values) => { calls.push(['rpc', name, values]); return { error: quotaError }; },
    from: (table) => { calls.push(['from', table]); return { select: (columns, options) => { calls.push(['select', columns, options]); return query; } }; },
  };
  return { db, calls, quotaFailure: () => { quotaError = { privateMessage: 'NEVER_EXPOSE_DATABASE_ERROR' }; }, dataFailure: () => { dataError = { privateMessage: 'NEVER_EXPOSE_DATABASE_ERROR' }; } };
}
const request = (body: unknown) => new Request('https://edge.example.test/ai', { method: 'POST', headers: { Authorization: 'Bearer OFFLINE_SESSION', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const assistant = (message = 'تحليل يعتمد على الفواتير فقط.') => ({ model: environment.OLLAMA_MODEL, done: true, message: { role: 'assistant', content: message } });
function fixture(options: { values?: Record<string, string>; rows?: unknown[]; fetch?: typeof fetch; denied?: number } = {}) {
  const store = database(options.rows);
  const calls: unknown[][] = [];
  const handler = createAIHandler({
    authenticate: async (_request, roles) => { calls.push(['authenticate', roles]); if (options.denied) throw new HttpError(options.denied, 'Sign in with an active company role.'); return { db: store.db, profile: { company_id: 'TRUSTED_COMPANY_ONLY' } }; },
    env: env(options.values), fetch: options.fetch || (async () => response(assistant())), now: () => new Date('2026-10-28T12:00:00Z'),
  });
  return { ...store, calls: store.calls, authCalls: calls, handler };
}

Deno.test('default provider is local Ollama and never implicit OpenAI', () => {
  equal(configured().provider, 'ollama');
  const onlyPaid = { OPENAI_API_KEY: 'OFFLINE_OPENAI_KEY_NOT_REAL_123456', OPENAI_MODEL: 'future-model', AI_ALLOW_PAID_PROVIDER: 'true' };
  equal(resolveProvider(env(onlyPaid)).provider, 'unconfigured');
  equal(resolveProvider(env({ ...environment, AI_PROVIDER: 'unknown' })).provider, 'unconfigured');
});
Deno.test('paid provider requires both explicit selection and exact paid opt-in', () => {
  const paid = { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'OFFLINE_OPENAI_KEY_NOT_REAL_123456', OPENAI_MODEL: 'future-model' };
  equal(resolveProvider(env(paid)).configured, false);
  equal(resolveProvider(env({ ...paid, AI_ALLOW_PAID_PROVIDER: 'TRUE' })).configured, false);
  equal(configured({ ...paid, AI_ALLOW_PAID_PROVIDER: 'true' }).provider, 'openai');
});
Deno.test('gateway configuration rejects arbitrary paths credentials query non-HTTPS and local origins', async () => {
  for (const url of ['http://gateway.example.test', 'https://user:pass@gateway.example.test', 'https://gateway.example.test/path', 'https://gateway.example.test?x=y', 'https://gateway.example.test?', 'https://gateway.example.test#', 'https://127.0.0.1', 'https://[::1]', 'https://localhost', 'https://host.local', 'https://gateway.example.test:8443']) {
    await rejects(() => gatewayOrigin(url), 503);
    equal(resolveProvider(env({ ...environment, OLLAMA_BASE_URL: url })).configured, false);
  }
  equal(gatewayOrigin('https://reviewed-gateway.example.test/'), environment.OLLAMA_BASE_URL);
  equal(resolveProvider(env({ ...environment, OLLAMA_API_KEY: 'short' })).configured, false);
  equal(resolveProvider(env({ ...environment, OLLAMA_API_KEY: 'X'.repeat(64) })).configured, false);
});
Deno.test('money rounds decimal strings exactly and rejects nonfinite/missing/oversized inputs', async () => {
  equal(moneyCents('1.005'), 101n); equal(moneyCents('-1.005'), -101n); equal(moneyCents(0.1 + 0.2), 30n);
  for (const value of [null, '', 'NaN', Infinity, NaN, '99999999999999999999', '1e20', true]) await rejects(() => moneyCents(value), 503);
});
Deno.test('snapshot applies credit notes once and keeps currencies separate', () => {
  const result = invoiceSnapshot([invoice(), invoice({ invoice_type_code: '381', subtotal: '10', vat_amount: '1.50', total_amount: '11.50', amount_paid: '11.50' }), invoice({ currency_code: 'USD' }), invoice({ invoice_type_code: '381', subtotal: '-10', vat_amount: '-1.50', total_amount: '-11.50', amount_paid: '-11.50' })]);
  equal(result.creditNoteCount, 2);
  equal(result.currencies.map(group => [group.currency, group.total]), [['SAR', '92.00'], ['USD', '115.00']]);
  assert(!('total' in result)); assert(result.scope.includes('Currencies are separate'));
});
Deno.test('snapshot excludes the 1001st sentinel from amounts and counts', () => {
  const rows = Array.from({ length: 1000 }, () => invoice({ total_amount: '0.10' }));
  const result = invoiceSnapshot([...rows, invoice({ total_amount: NaN })]);
  equal(result.invoiceCount, 1000); equal(result.truncated, true); equal(result.currencies[0].total, '100.00');
});
Deno.test('snapshot aggregate remains exact above JavaScript safe-integer cents', () => {
  const result = invoiceSnapshot(Array.from({ length: 1000 }, () => invoice({ total_amount: '9999999999999.99' })));
  equal(result.currencies[0].total, '9999999999999990.00');
});
Deno.test('snapshot refuses invalid statuses currencies data and excessive result sets', async () => {
  for (const row of [invoice({ status: 'draft' }), invoice({ currency_code: null }), invoice({ amount_paid: null }), null]) await rejects(() => invoiceSnapshot([row]), 503);
  await rejects(() => invoiceSnapshot(Array.from({ length: 1002 }, () => invoice())), 503);
});
Deno.test('invoice query is tenant-scoped deterministic issued-only and sentinel bounded', async () => {
  const store = database(); await loadInvoiceSnapshot(store.db, 'TRUSTED_COMPANY_ONLY');
  assert(store.calls.some(call => JSON.stringify(call) === JSON.stringify(['eq', 'company_id', 'TRUSTED_COMPANY_ONLY'])));
  equal(store.calls.filter(call => call[0] === 'in'), [['in', 'status', ISSUED_STATUSES]]);
  equal(store.calls.filter(call => call[0] === 'order').map(call => call[1]), ['issue_date', 'created_at', 'id']);
  equal(store.calls.at(-1), ['limit', 1001]);
  equal(store.calls.find(call => call[0] === 'select')?.[2], { count: 'exact' });
});
Deno.test('exact count preserves truthful truncation when REST clamps returned rows to 1000', async () => {
  const rows = Array.from({ length: 1000 }, () => invoice());
  const store = database(rows, 1500); const snapshot = await loadInvoiceSnapshot(store.db, 'TRUSTED_COMPANY_ONLY');
  equal(snapshot.invoiceCount, 1000); equal(snapshot.eligibleInvoiceCount, 1500); equal(snapshot.truncated, true);
  const unavailable = database(rows, null);
  await rejects(() => loadInvoiceSnapshot(unavailable.db, 'TRUSTED_COMPANY_ONLY'), 503);
  const smallerCap = await loadInvoiceSnapshot(database([invoice()], 10).db, 'TRUSTED_COMPANY_ONLY');
  equal(smallerCap.invoiceCount, 1); equal(smallerCap.truncated, true);
});
Deno.test('status authenticates but consumes no quota and reads no invoice rows', async () => {
  let network = 0;
  const test = fixture({ fetch: async (url, init) => { network++; equal(url, environment.OLLAMA_BASE_URL + '/health'); equal(init?.method, 'GET'); equal(new Headers(init?.headers).get('Authorization'), 'Bearer ' + token); return response({ ok: true, ready: true, model: environment.OLLAMA_MODEL }); } });
  const result = await test.handler(request({ action: 'status' })); const body = await result.json();
  equal(result.status, 200); equal(body.provider, 'ollama'); equal(body.available, true); equal(body.healthChecked, true); equal(body.inferenceVerified, false); equal(body.readOnly, true); equal(body.mode, 'generative'); equal(test.calls, []); equal(network, 1); equal(test.authCalls.length, 1);
  assert(!JSON.stringify(body).includes(token)); assert(!JSON.stringify(body).includes(environment.OLLAMA_BASE_URL));
});
Deno.test('unconfigured status and chat never consume quota or call any provider', async () => {
  let network = 0; const test = fixture({ values: {}, fetch: async () => { network++; throw new Error(); } });
  const status = await (await test.handler(request({ action: 'status' }))).json(); equal(status.provider, 'unconfigured'); equal(status.available, false);
  const chat = await test.handler(request({ message: 'hello' })); equal(chat.status, 503); equal((await chat.json()).code, 'configuration_required'); equal(network, 0); equal(test.calls, []);
});
Deno.test('unauthorized or inactive callers cannot inspect status or reach providers', async () => {
  let network = 0;
  for (const denied of [401, 403]) {
    const test = fixture({ denied, fetch: async () => { network++; throw new Error(); } });
    const result = await test.handler(request({ action: 'status' })); equal(result.status, denied); equal((await result.json()).code, 'auth_error'); equal(test.calls, []);
  }
  equal(network, 0);
});
Deno.test('client company model key endpoint and unknown action overrides are rejected', async () => {
  let network = 0; const test = fixture({ fetch: async () => { network++; throw new Error(); } });
  for (const body of [{ message: 'hello', company_id: 'FOREIGN_COMPANY' }, { message: 'hello', model: 'paid-model' }, { message: 'hello', key: 'client-key' }, { message: 'hello', url: 'https://foreign.example.test' }, { action: 'mutate', message: 'hello' }, { action: 'status', message: 'extra' }]) {
    equal((await test.handler(request(body))).status, 400);
  }
  equal(test.calls, []); equal(network, 0);
});
Deno.test('chat uses trusted tenant snapshot one quota and fixed gateway protocol', async () => {
  let network = 0; const test = fixture({ fetch: async (url, init) => {
    network++; equal(url, environment.OLLAMA_BASE_URL + '/api/chat'); equal(init?.redirect, 'error');
    const body = JSON.parse(String(init?.body)); equal(Object.keys(body), ['model', 'messages', 'stream']); equal(body.model, environment.OLLAMA_MODEL); equal(body.stream, false);
    equal(body.messages.map((message: { role: string }) => message.role), ['system', 'user']); equal(body.messages[1].content, 'حلل الفواتير'); assert(body.messages[0].content.includes('115.00'));
    assert(!body.messages[0].content.includes('TRUSTED_COMPANY_ONLY')); return response(assistant());
  } });
  const result = await test.handler(request({ message: 'حلل الفواتير' })); const body = await result.json();
  equal(result.status, 200); equal(body.mode, 'generative'); equal(body.provider, 'ollama'); equal(body.readOnly, true); equal(body.generatedAt, '2026-10-28T12:00:00.000Z'); equal(body.limits.responseTokens, 512); equal(network, 1);
  equal(test.calls.filter(call => call[0] === 'rpc').length, 1); assert(test.calls.some(call => call[0] === 'eq' && call[2] === 'TRUSTED_COMPANY_ONLY'));
});
Deno.test('quota denial blocks invoice reads and generation; database errors stay private', async () => {
  let network = 0; const test = fixture({ fetch: async () => { network++; throw new Error(); } }); test.quotaFailure();
  const result = await test.handler(request({ message: 'hello' })); equal(result.status, 429); equal((await result.json()).code, 'rate_limited'); equal(test.calls.length, 1); equal(network, 0);
});
Deno.test('invoice database failure never generates fabricated output', async () => {
  let network = 0; const test = fixture({ fetch: async () => { network++; throw new Error(); } }); test.dataFailure();
  const result = await test.handler(request({ message: 'hello' })); const body = await result.json(); equal(result.status, 503); equal(body.code, 'data_unavailable'); assert(!JSON.stringify(body).includes('NEVER_EXPOSE')); equal(network, 0);
});
Deno.test('gateway health unavailable wrong-model and transport failures are honest false status', async () => {
  for (const fetcher of [async () => response({ ok: true, ready: true, model: 'different' }), async () => response({ ok: false }, 503), async () => { throw new DOMException('private endpoint', 'TimeoutError'); }]) {
    const status = await gatewayHealth(configured(), { fetch: fetcher }); equal(status.available, false); equal(status.inferenceVerified, false);
  }
});
Deno.test('provider failures and timeouts are sanitized and never fall back to a paid API', async () => {
  for (const failure of [new DOMException(token, 'TimeoutError'), new Error(token)]) {
    let network = 0; const error = await rejects(() => generateAnswer(configured(), invoiceSnapshot([]), 'hello', { fetch: async (url) => { network++; equal(url, environment.OLLAMA_BASE_URL + '/api/chat'); throw failure; } }));
    equal(network, 1); equal(error.code, 'provider_unavailable'); assert(!error.message.includes(token));
  }
  const error = await rejects(() => generateAnswer(configured(), invoiceSnapshot([]), 'hello', { fetch: async () => new Response(token, { status: 429 }) }), 429); equal(error.code, 'rate_limited'); assert(!error.message.includes(token));
});
Deno.test('provider response size is bounded with and without content-length', async () => {
  for (const oversized of [() => new Response('X', { headers: { 'Content-Length': '999999' } }), () => new Response('X'.repeat(131073))]) {
    const error = await rejects(() => generateAnswer(configured(), invoiceSnapshot([]), 'hello', { fetch: async () => oversized() }), 502); assert(error.message.includes('limit'));
  }
});
Deno.test('real abort deadlines terminate a stalled provider and health request', async () => {
  const stalled: typeof fetch = (_url, init) => new Promise((_resolve, reject) => {
    const signal = init?.signal;
    assert(signal);
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
  await rejects(() => generateAnswer(configured(), invoiceSnapshot([]), 'hello', { fetch: stalled, timeoutMs: 5 }), 504);
  const health = await gatewayHealth(configured(), { fetch: stalled, healthTimeoutMs: 5 });
  equal(health.available, false);
});
Deno.test('incomplete blank wrong-model or malformed provider responses never become AI answers', async () => {
  for (const body of [{ ...assistant(), done: false }, { ...assistant(), model: 'foreign-model' }, assistant(' '), [], { message: { content: 'no model proof' } }]) {
    await rejects(() => generateAnswer(configured(), invoiceSnapshot([]), 'hello', { fetch: async () => response(body) }), 502);
  }
});
Deno.test('outbound gateway requests are capped before network access', async () => {
  let network = 0;
  await rejects(() => generateAnswer(configured(), invoiceSnapshot([]), 'X'.repeat(20000), { fetch: async () => { network++; return response(assistant()); } }), 413);
  equal(network, 0);
});
Deno.test('explicit future paid provider preserves fixed Responses API without tools or persistence', async () => {
  const config = configured({ AI_PROVIDER: 'openai', AI_ALLOW_PAID_PROVIDER: 'true', OPENAI_MODEL: 'future-model', OPENAI_API_KEY: 'OFFLINE_OPENAI_KEY_NOT_REAL_123456' });
  const answer = await generateAnswer(config, invoiceSnapshot([]), 'hello', { fetch: async (url, init) => {
    equal(url, 'https://api.openai.com/v1/responses'); const body = JSON.parse(String(init?.body)); equal(body.store, false); equal(body.max_output_tokens, AI_LIMITS.responseTokens); assert(!('tools' in body));
    return response({ output: [{ content: [{ type: 'output_text', text: 'Verified response' }] }] });
  } }); equal(answer, 'Verified response');
});
Deno.test('oversized inbound JSON fails before quota or generation', async () => {
  const test = fixture(); const result = await test.handler(request({ message: 'X'.repeat(17000) })); equal(result.status, 413); equal(test.calls, []);
});
