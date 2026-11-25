import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { preview } from 'vite';

const url = 'https://svxmlejmhlocsjjtftxd.supabase.co';
const argv = process.argv.slice(2);
const kind = argv.find(arg => arg.startsWith('--fixture='))?.split('=')[1] ?? 'workflow';
const role = argv.find(arg => arg.startsWith('--role='))?.split('=')[1] ?? 'admin';
const automated = argv.includes('--verify');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let stage = 'validate configuration';
let browser, server, edge;
try {
  assert.equal(process.env.AI_LOCAL_PREVIEW, 'true');
  assert.ok(['workflow', 'roles'].includes(kind) && ['admin', 'accountant', 'cashier'].includes(role));
  const f = JSON.parse(await readFile(`.tmp/release-acceptance/qa-${kind}.private.json`, 'utf8'));
  assert.equal(f.supabaseUrl, url);
  assert.equal(f.metadata.qaKind, kind);
  const account = f[role];
  assert.match(account.email, /@example\.test$/);
  const db = createClient(url, f.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  stage = 'sign in and verify the synthetic account';
  const login = await db.auth.signInWithPassword({ email: account.email, password: account.password });
  assert.ifError(login.error);
  const { user, session } = login.data;
  assert.equal(user.id, account.userId);
  assert.equal(user.app_metadata.erpx_release_acceptance.marker, f.metadata.marker);
  const company = await db.from('companies').select('settings').eq('id', f.companyId).single();
  assert.ifError(company.error);
  assert.equal(company.data.settings.erpx_release_acceptance.marker, f.metadata.marker);
  const profile = await db.from('users').select('company_id,branch_id').eq('id', user.id).single();
  assert.ifError(profile.error);
  assert.deepEqual(profile.data, { company_id: f.companyId, branch_id: f.branchId });

  stage = 'start loopback-only preview';
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const loopback = 'http://127.0.0.1:' + port;
  const allowedEnv = ['SUPABASE_URL','SUPABASE_ANON_KEY','AI_LOCAL_PREVIEW','AI_PREVIEW_COMPANY','AI_PREVIEW_MARKER','AI_PREVIEW_PORT','AI_PREVIEW_SESSION'];
  edge = spawn(process.env.QA_DENO_EXE || 'deno', ['run','--cached-only','--allow-env=' + allowedEnv.join(','),
    '--allow-net=127.0.0.1:' + port + ',svxmlejmhlocsjjtftxd.supabase.co','scripts/ai/preview-edge.ts'], {
    windowsHide: true, stdio: 'ignore',
    env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, LOCALAPPDATA: process.env.LOCALAPPDATA,
      USERPROFILE: process.env.USERPROFILE, DENO_DIR: process.env.DENO_DIR, SUPABASE_URL: url, SUPABASE_ANON_KEY: f.supabaseAnonKey,
      AI_LOCAL_PREVIEW: 'true', AI_PREVIEW_COMPANY: f.companyId, AI_PREVIEW_MARKER: f.metadata.marker,
      AI_PREVIEW_PORT: String(port), AI_PREVIEW_SESSION: session.access_token },
  });
  let started = false;
  edge.on('error', () => { started = false; });
  for (let i = 0; i < 45 && edge.exitCode === null; i++) {
    try { started = (await fetch(loopback, { method: 'OPTIONS' })).ok; } catch {}
    if (started) break;
    await pause(250);
  }
  assert.ok(started);
  server = await preview({ configLoader: 'runner', envDir: false, logLevel: 'error', preview: { host: '127.0.0.1', port: 0 } });
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  browser = await chromium.launch({ headless: automated || argv.includes('--headless') });
  const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Riyadh', serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(session => {
    localStorage.setItem('sb-svxmlejmhlocsjjtftxd-auth-token', JSON.stringify(session));
    localStorage.setItem('language', 'ar');
    localStorage.setItem('i18nextLng', 'ar');
  }, session);
  const replies = [];
  await context.route('**/*', async route => {
    const request = route.request();
    const target = new URL(request.url());
    const method = request.method();
    if (target.origin === origin && ['GET','HEAD'].includes(method)) return route.continue();
    if (target.origin !== url) return route.abort();
    if (target.pathname === '/functions/v1/ai/chat' && method === 'POST') {
      try {
        const response = await fetch(loopback, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
          body: request.postData(), signal: AbortSignal.timeout(15000) });
        const body = await response.json();
        if (request.postDataJSON().action !== 'status') replies.push({ status: response.status, body });
        await route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(body) });
      } catch {
        // A refresh may still be in flight when the local browser is closed.
        await route.abort().catch(() => {});
      }
      return;
    }
    if (['GET','HEAD','OPTIONS'].includes(method) || ['/rest/v1/rpc/get_user_roles','/rest/v1/rpc/get_user_permissions'].includes(target.pathname)) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  stage = 'open assistant UI';
  await page.goto(origin + (role === 'cashier' ? '/cashier/pos' : '/dashboard'));
  await page.locator('.ws-assistant-fab').click();
  await page.getByText('وضع الاختبار', { exact: true }).waitFor();
  if (!automated) {
    console.log('Local QA assistant ready. Close the browser to stop.');
    await once(browser, 'disconnected');
  } else {
    const input = page.locator('#assistant-drawer-message');
    const submit = page.locator('form').filter({ has: input }).locator('button[type=submit]');
    const ask = async question => {
      const next = replies.length + 1;
      await input.fill(question);
      await submit.click();
      for (let i=0; i<70 && replies.length<next; i++) await pause(250);
      assert.equal(replies.length, next);
      await page.waitForFunction(() => !document.querySelector('#assistant-drawer-message')?.disabled);
      return replies.at(-1);
    };
    if (role === 'cashier') {
      stage = 'verify cashier capabilities';
      assert.equal(await page.getByRole('button', { name: 'المبيعات', exact: true }).count(), 0);
      assert.equal((await ask('لخص الوردية المفتوحة')).status, 200);
      const link = await ask('افتح نقطة البيع');
      assert.equal(link.body.recordPath, '/cashier/pos');
      const denied = await ask('ما المبيعات المكتملة؟');
      assert.match(denied.body.message, /غير متاح/);
      console.log(JSON.stringify({ role, kind, shift: true, navigation: true, salesRestricted: true }));
    } else {
      stage = 'reconcile nonzero sales report';
      const result = await ask('ما إجمالي المبيعات المكتملة آخر 90 يومًا؟');
      assert.equal(result.status, 200);
      assert.equal(result.body.preview, true);
      const period = result.body.dataScope.match(/(\d{4}-\d{2}-\d{2}) – (\d{4}-\d{2}-\d{2}) \(UTC\)/);
      assert.ok(period && result.body.dataScope.includes(f.branchId));
      const report = await db.from('sales').select('total_amount,invoice_id', { count: 'exact' }).eq('company_id', f.companyId).eq('branch_id', f.branchId)
        .eq('status', 'completed').gte('sale_date', period[1] + 'T00:00:00Z').lt('sale_date', new Date(Date.parse(period[2])+86400000).toISOString()).limit(1000);
      assert.ifError(report.error);
      assert.ok(report.count > 0 && report.count === report.data.length && report.data.every(sale => sale.invoice_id));
      const totals = {};
      for (const sale of report.data) {
        const invoice = await db.from('invoices').select('currency_code').eq('company_id', f.companyId).eq('id', sale.invoice_id).single();
        assert.ifError(invoice.error);
        const currency = invoice.data.currency_code;
        totals[currency] = (totals[currency] || 0) + Math.round(Number(sale.total_amount) * 100);
      }
      for (const [currency, cents] of Object.entries(totals)) assert.ok(result.body.message.includes((cents/100).toFixed(2) + ' ' + currency));
      assert.ok(result.body.message.includes(': ' + report.count));
      stage = 'verify errors and retry';
      for (const [trigger, status, label] of [['429',429,/طلبات كثيرة/],['timeout',504,/انتهت مهلة/]]) {
        assert.equal((await ask(`المبيعات [qa:${trigger}]`)).status, status);
        await page.getByRole('alert').filter({ hasText: label }).waitFor();
        assert.match(await input.inputValue(), /\[qa:/);
        assert.equal((await ask(`المبيعات [qa:${trigger}]`)).status, 200);
      }
      stage = 'reconcile invoice figures and test company isolation';
      const invoice = await db.from('invoices').select('invoice_number,total_amount,amount_paid,amount_due')
        .eq('company_id', f.companyId).eq('branch_id', f.branchId).gt('amount_paid',0).gt('amount_due',0).limit(1);
      assert.ifError(invoice.error);
      const partial = invoice.data[0];
      const ordinary = await db.from('invoices').select('invoice_number,total_amount,amount_paid,amount_due')
        .eq('company_id', f.companyId).eq('branch_id', f.branchId).gt('amount_paid',0).order('amount_paid', { ascending:false }).limit(1);
      assert.ifError(ordinary.error);
      const selected = partial ?? ordinary.data[0];
      let invoiceMatched = false;
      if (selected) {
        const answer = await ask('ما حالة تحصيل الفاتورة # ' + selected.invoice_number + '؟');
        assert.equal(answer.status,200);
        assert.ok(answer.body.message.includes([selected.total_amount,selected.amount_paid,selected.amount_due].map(v=>Number(v).toFixed(2)).join(' / ')));
        invoiceMatched = true;
      }
      const other = JSON.parse(await readFile(`.tmp/release-acceptance/qa-${kind === 'workflow' ? 'roles' : 'workflow'}.private.json`,'utf8'));
      assert.notEqual(other.companyId,f.companyId);
      assert.equal(other.supabaseUrl, url);
      assert.equal(other.metadata.qaKind, kind === 'workflow' ? 'roles' : 'workflow');
      const denied = await db.from('invoices').select('id').eq('company_id',other.companyId).limit(1);
      assert.ifError(denied.error);
      assert.equal(denied.data.length,0);
      for (const question of ['ما الذمم المتأخرة؟', 'ما الأصناف منخفضة المخزون؟']) assert.equal((await ask(question)).status, 200);
      stage = 'capture desktop and mobile screenshots';
      await page.reload();
      await page.locator('.ws-assistant-fab').click();
      await page.getByText('وضع الاختبار', { exact: true }).waitFor();
      await ask('ما إجمالي المبيعات المكتملة آخر 90 يومًا؟');
      await page.waitForFunction(() => !document.querySelector('[role="dialog"] [aria-busy="true"]'));
      await mkdir('.tmp/ai-assistant-preview', { recursive: true });
      await page.getByRole('dialog').screenshot({ path: `.tmp/ai-assistant-preview/${kind}-${role}-desktop.png` });
      await page.setViewportSize({ width:390,height:844 });
      await page.getByRole('log').locator('article').last().scrollIntoViewIfNeeded();
      await page.getByRole('dialog').screenshot({ path: `.tmp/ai-assistant-preview/${kind}-${role}-mobile.png` });
      const evidence = { kind, role, period: [period[1],period[2]], completed: report.count, totalsCents: totals, invoiceMatched,
        invoiceAmounts: invoiceMatched ? [selected.total_amount, selected.amount_paid, selected.amount_due] : undefined,
        partialMatched: !!partial && invoiceMatched, isolated: true, retry429: true, retryTimeout: true };
      await writeFile(`.tmp/ai-assistant-preview/${kind}-${role}-report.json`, JSON.stringify(evidence,null,2));
      console.log(JSON.stringify(evidence));
    }
  }
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', stage, errorType: error.name }));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server?.close();
  edge?.kill();
}
