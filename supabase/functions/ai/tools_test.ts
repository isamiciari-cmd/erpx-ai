import { createAIHandler } from './handler.ts';
import { selectReadTool } from './provider.ts';
import { createPreviewFetch } from '../../../scripts/ai/preview-provider.ts';
import type { AIDatabase } from './snapshot.ts';
import { definitions, runTool, type ReadDatabase, type ReadQuery } from './tools.ts';

const now = new Date('2026-11-24T12:00:00Z');
type Row = Record<string, unknown>;
function assert(value: unknown, message = 'assertion failed'): asserts value { if (!value) throw new Error(message); }
function data() {
  const records: Record<string, Row[]> = {
    invoices: [
      { company_id: 'a', branch_id: 'a1', invoice_number: 'QA-01', status: 'partial', currency_code: 'SAR', total_amount: '115.00', amount_paid: '40.00', amount_due: '75.00', due_date: '2026-11-23' },
      { company_id: 'a', branch_id: 'a2', invoice_number: 'QA-02', status: 'partial', currency_code: 'SAR', amount_due: '999.00', due_date: '2026-11-23' },
      { company_id: 'b', branch_id: 'b1', invoice_number: 'QA-01', status: 'paid', currency_code: 'SAR', total_amount: '800.00', amount_paid: '800.00', amount_due: '0.00', due_date: '2026-11-23' },
    ],
    sales: [{ company_id: 'a', branch_id: 'a1', status: 'completed', sale_date: '2026-11-24T03:00:00Z', total_amount: '115.00', invoices: { company_id: 'a', currency_code: 'SAR' } }],
    shifts: [
      { company_id: 'a', branch_id: 'a1', cashier_id: 'cash-a', status: 'open', shift_number: 'QA-S1', total_sales: '115.00', total_refunds: '0.00', opened_at: '2026-11-24' },
      { company_id: 'a', branch_id: 'a1', cashier_id: 'cash-b', status: 'open', shift_number: 'QA-OTHER', total_sales: '900.00', total_refunds: '0.00', opened_at: '2026-11-24' },
    ],
    products: [{ id: 'p1', company_id: 'a', is_active: true, sku: 'QA-SKU', min_stock_level: 3 }],
    inventory: [
      { product_id: 'p1', quantity_available: 2, products: { company_id: 'a' }, warehouses: { company_id: 'a', branch_id: 'a1' } },
      { product_id: 'p1', quantity_available: 40, products: { company_id: 'a' }, warehouses: { company_id: 'a', branch_id: 'a2' } },
    ],
  };
  const reads: string[] = [];
  let quota = 0;
  const db: ReadDatabase & Pick<AIDatabase, 'rpc'> = {
    from(table) { return { select() {
      reads.push(table);
      let result = records[table];
      const get = (row: Row, key: string) => key.split('.').reduce<unknown>((item, part) => (item as Row)?.[part], row);
      const query: ReadQuery = {
        eq: (k, v) => { result = result.filter(r => get(r, k) === v); return query; },
        in: (k, v) => { result = result.filter(r => v.includes(String(get(r, k)))); return query; },
        gt: (k, v) => { result = result.filter(r => Number(get(r, k)) > v); return query; },
        gte: (k, v) => { result = result.filter(r => String(get(r, k)) >= v); return query; },
        lt: (k, v) => { result = result.filter(r => String(get(r, k)) < v); return query; },
        limit: async n => ({ data: result.slice(0, n), count: result.length, error: null }),
      };
      return query;
    } }; },
    rpc: async () => { quota++; return { error: null }; },
  };
  return { db, reads, quota: () => quota };
}

Deno.test('admin and accountant read the assigned branch and separate the two companies', async () => {
  const { db } = data();
  const a = { db, company: 'a', branch: 'a1', user: 'admin', role: 'admin' };
  const b = { ...a, company: 'b', branch: 'b1', role: 'accountant' };
  assert((await runTool(a, 'find_invoice', { invoice_number: 'QA-01' }, 'QA-01', now, true)).message.includes('115.00 / 40.00 / 75.00'));
  assert((await runTool(b, 'find_invoice', { invoice_number: 'QA-01' }, 'QA-01', now, false)).message.includes('800.00 / 800.00 / 0.00'));
  assert((await runTool(a, 'overdue_receivables', {}, '', now, false)).message.endsWith('75.00 SAR'));
  assert((await runTool(a, 'sales_summary', { days: 1 }, '', now, false)).message.endsWith('115.00 SAR'));
  assert((await runTool(a, 'low_stock', {}, '', now, false)).message.includes('QA-SKU: 2 / 3'));
});

Deno.test('cashier reads own shift and only follows an allow-listed link', async () => {
  const { db, reads } = data();
  const ctx = { db, company: 'a', branch: 'a1', user: 'cash-a', role: 'cashier' };
  assert(!definitions('cashier').some(item => item.name === 'find_invoice'));
  const shift = await runTool(ctx, 'shift_summary', {}, '', now, false);
  assert(shift.message.includes('QA-S1') && !shift.message.includes('QA-OTHER'));
  assert((await runTool(ctx, 'navigation', { destination: 'pos' }, '', now, false)).path === '/cashier/pos');
  for (const [name, args] of [['find_invoice', { invoice_number: 'QA-01' }], ['navigation', { destination: 'invoices' }], ['shift_summary', { company: 'b' }], ['execute_business_action', {}]] as const) {
    const result = await runTool(ctx, name, args, '', now, false).catch(error => error);
    assert(result.code === 'invalid_request');
  }
  assert(reads.join() === 'shifts');
});

Deno.test('Responses classifies before any customer read and never receives database results', async () => {
  const { db, reads, quota } = data();
  let calls = 0;
  const handler = createAIHandler({
    authenticate: async () => ({ db: { rpc: db.rpc, from: () => { throw new Error('Legacy invoice snapshot must not run'); } },
      profile: { company_id: 'a' }, context: { db, company: 'a', branch: 'a1', user: 'a-admin', role: 'admin' } }),
    env: name => ({ AI_PROVIDER: 'openai', AI_ALLOW_PAID_PROVIDER: 'true', OPENAI_API_KEY: 'OFFLINE_TEST_PLACEHOLDER_ONLY', OPENAI_MODEL: 'model-fixture' })[name],
    now: () => now,
    fetch: async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      assert(body.store === false && reads.length === 0 && body.input === 'ما حالة QA-01؟');
      assert(!JSON.stringify(body).includes('customer_id') && !JSON.stringify(body).includes('115.00'));
      return Response.json({ status: 'completed', output: [{ type: 'function_call', name: 'find_invoice', arguments: '{"invoice_number":"QA-01"}' }] });
    },
  });
  const send = (body: unknown) => handler(new Request('https://fixture.invalid/ai/chat', { method: 'POST', body: JSON.stringify(body) }));
  assert((await send({ action: 'confirm', company_id: 'b' })).status === 400);
  assert((await send({ message: 'ما حالة QA-01؟', branch_id: 'b1' })).status === 400);
  const response = await send({ message: 'ما حالة QA-01؟' });
  assert(response.status === 200);
  const reply = await response.json();
  assert(reply.message.includes('115.00 / 40.00 / 75.00') && reply.dataScope.includes('a1'));
  assert(calls === 1 && quota() === 1);
});

Deno.test('OpenAI errors are bounded and provider response text is never reflected', async () => {
  const config = { provider: 'openai', deploymentMode: 'hosted_api', configured: true, model: 'mock', key: 'TEST_ONLY' } as const;
  const privateText = 'PRIVATE_PROVIDER_DETAILS';
  for (const [http, mapped] of [[401, 502], [429, 429], [500, 502]]) {
    const error = await selectReadTool(config, 'admin', 'local test', { fetch: async () => new Response(privateText, { status: http }) }).catch(e => e);
    assert(error.status === mapped && !error.message.includes(privateText));
  }
  const failure = await selectReadTool(config, 'admin', 'test', { fetch: async () => Response.json({
    status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: privateText }] }],
  }) }).catch(e => e);
  assert(failure.code === 'provider_unavailable' && !failure.message.includes(privateText));
});

Deno.test('explicit preview uses the mock transport, keeps database figures and performs no quota write', async () => {
  const { db, quota } = data();
  const handler = createAIHandler({
    authenticate: async () => ({ db: { rpc: db.rpc, from: () => { throw new Error('Not a legacy request'); } },
      profile: { company_id: 'a' }, context: { db, company: 'a', branch: 'a1', user: 'test', role: 'accountant' } }),
    env: () => undefined, now: () => now, preview: { fetch: createPreviewFetch(), timeoutMs: 15 },
  });
  const send = (body: unknown) => handler(new Request('http://127.0.0.1/ai', { method: 'POST', body: JSON.stringify(body) }));
  assert((await (await send({ action: 'status' })).json()).preview === true);
  const invoice = await (await send({ message: 'Invoice # QA-01' })).json();
  assert(invoice.preview && invoice.message.includes('115.00 / 40.00 / 75.00'));
  assert((await send({ message: 'Sales [qa:429]' })).status === 429);
  const timeout = await send({ message: 'Sales [qa:timeout]' });
  assert(timeout.status === 504 && (await timeout.json()).code === 'timeout');
  const retry = await send({ message: 'Sales [qa:timeout]' });
  assert(retry.status === 200 && (await retry.json()).message.includes('115.00 SAR'));
  assert((await send({ message: 'Sales', preview: true })).status === 400);
  assert(quota() === 0);
});

Deno.test('a verified zero and a failed sales query have distinct results', async () => {
  const { db } = data();
  const context = { db, company: 'a', branch: 'empty-branch', user: 'admin', role: 'admin' };
  assert((await runTool(context, 'sales_summary', { days: 1 }, '', now, false)).message.includes(': 0'));
  const broken: ReadDatabase = {
    from(table) { return { select(columns, options) {
      const original = db.from(table).select(columns, options);
      const query: ReadQuery = {
        ...original,
        eq: () => query, gte: () => query, lt: () => query,
        limit: async () => ({ data: null, count: null, error: 'PRIVATE_DB_DETAIL' }),
      };
      return query;
    } }; },
  };
  const error = await runTool({ ...context, db: broken }, 'sales_summary', { days: 1 }, '', now, false).catch(e => e);
  assert(error.status === 503 && error.code === 'data_unavailable' && !error.message.includes('PRIVATE_DB_DETAIL'));
});
