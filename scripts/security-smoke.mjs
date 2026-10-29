import assert from 'node:assert/strict';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, createServer, preview } from 'vite';
import { chromium } from 'playwright';

// Runs without live credentials. API responses are mocked only in the isolated
// lifecycle harness; production and demo cases exercise the actual application.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = path.join(root, '.tmp', 'security-smoke');
process.chdir(root);
await mkdir(temp, { recursive: true });
const servers = [];
let browser;
let activePage;
let checks = 0;
const originalNodeEnv = process.env.NODE_ENV;
const config = (demo) => ({
  root, envDir: false, logLevel: 'warn',
  cacheDir: path.join(temp, 'vite-cache'),
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
    'import.meta.env.VITE_DEMO_MODE': JSON.stringify(demo ? 'true' : 'false'),
  },
});
const origin = (server) => 'http://127.0.0.1:' + server.httpServer.address().port;
const checked = (label) => { checks++; console.log('PASS ' + label); };
const forge = () => {
  localStorage.setItem('erpx_demo_email', 'admin@example.com');
  localStorage.setItem('erpx_demo_password', 'must-be-removed');
  localStorage.setItem('user', JSON.stringify({ role: 'owner', roles: ['owner', 'admin'] }));
  localStorage.setItem('auth', JSON.stringify({ user: { user_metadata: { role: 'owner' } }, token: 'forged' }));
};

const harness = `import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '/src/contexts/AuthContext.tsx';
import ProtectedRoute from '/src/components/ProtectedRoute.tsx';
function Probe() {
  const auth = useAuth();
  window.__authView = { id: auth.currentUser?.id ?? null, profile: auth.user?.id ?? null, loading: auth.loading, roles: auth.roles.map(r => r.role_name), error: auth.accessError?.message ?? null };
  window.__signOut = auth.signOut;
  return null;
}
createRoot(document.getElementById('root')).render(<StrictMode><BrowserRouter><AuthProvider><Probe/><ProtectedRoute requiredRole={['admin']}><p data-testid="admin-secret">ADMIN SECRET</p></ProtectedRoute></AuthProvider></BrowserRouter></StrictMode>);`;
const authMock = `
window.__pendingProfiles = {};
window.__initialResolvers = [];
let listener;
const session = id => id ? { access_token: 'controlled-token', refresh_token: '', token_type: 'bearer', expires_in: 3600, user: { id, email: id + '@example.com', user_metadata: { role: 'owner', roles: ['admin', 'owner'] }, app_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() } } : null;
window.__emitAuth = id => listener?.(id ? 'SIGNED_IN' : 'SIGNED_OUT', session(id));
window.__resolveProfile = (id, name, status = 'active') => window.__pendingProfiles[id]({ data: name ? { id, company_id: 'company-1', branch_id: null, role_id: 'role-' + name, status } : null, error: null });
window.__settleInitial = id => window.__initialResolvers.splice(0).forEach(resolve => resolve({ data: { session: session(id) }, error: null }));
export const hasSupabaseConfig = true;
export const isDemoMode = false;
export const getDemoUser = () => { throw Error('Unexpected demo identity'); };
export const supabase = {
  auth: {
    onAuthStateChange(callback) { listener = callback; return { data: { subscription: { unsubscribe() { if (listener === callback) listener = undefined; } } } }; },
    getSession() { return new Promise(resolve => window.__initialResolvers.push(resolve)); },
    async signOut() { listener?.('SIGNED_OUT', null); return { error: null }; }
  },
  from(table) { let id; return { select() { return this; }, eq(_column, value) { id = value; return this; }, maybeSingle() {
    if (table === 'users') return new Promise(resolve => window.__pendingProfiles[id] = resolve);
    const name = id.slice(5);
    return Promise.resolve({ data: { id, company_id: null, name, display_name: name, permissions: name === 'admin' ? { all: true } : { read: true } }, error: null });
  } }; },
  rpc() { return Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'Missing optional RBAC RPC' } }); }
};`;
const harnessFile = path.join(temp, 'harness.html');
const moduleFile = path.join(temp, 'harness.tsx');

try {
  browser = await chromium.launch({ headless: true });
  if (!process.argv.includes('--skip-production')) {
    // Even explicitly enabled demo settings must not bypass a production build.
    const output = path.join(temp, 'production');
    await build({ ...config(true), build: { outDir: output, emptyOutDir: true } });
    const production = await preview({ ...config(true), build: { outDir: output }, preview: { host: '127.0.0.1', port: 0, strictPort: true } });
    servers.push(production);
    const context = await browser.newContext();
    await context.addInitScript(forge);
    activePage = await context.newPage();
    const remoteApi = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname.endsWith('supabase.co')) { remoteApi.push(url.pathname); return route.abort(); }
      return route.continue();
    });
    await activePage.goto(origin(production) + '/admin/users');
    await activePage.waitForURL('**/login');
    await activePage.getByText('إعدادات الاتصال بقاعدة البيانات غير مكتملة. تواصل مع مسؤول النظام.').waitFor();
    assert.equal(await activePage.locator('button[type="submit"]').isDisabled(), true);
    assert.equal(await activePage.evaluate(() => localStorage.getItem('erpx_demo_password')), null);
    assert.equal(await activePage.evaluate(() => localStorage.getItem('erpx_demo_email')), null);
    assert.deepEqual(remoteApi, []);
    checked('production missing config rejects forged localStorage and demo flag; no plaintext password remains');
    await context.close();
  }

  // Vite build sets NODE_ENV=production process-wide. Restore development before
  // testing the explicitly local demo branch in this same Node process.
  process.env.NODE_ENV = 'development';
  const development = await createServer({ ...config(true), mode: 'development', server: { host: '127.0.0.1', port: 0, strictPort: true } });
  await development.listen();
  servers.push(development);
  const base = origin(development);
  for (const [email, target, expected] of [
    ['not-an-admin@example.com', '/admin/users', 'denied'],
    ['admin@example.com', '/admin/emergency-access', 'denied'],
    ['cashier@example.com', '/dashboard', 'cashier'],
  ]) {
    const context = await browser.newContext();
    await context.addInitScript(value => localStorage.setItem('erpx_demo_email', value), email);
    activePage = await context.newPage();
    await activePage.goto(base + target);
    if (expected === 'denied') {
      await activePage.getByRole('heading', { name: 'ليس لديك صلاحية لفتح هذه الصفحة' }).first().waitFor();
    } else {
      await activePage.waitForURL('**/cashier/pos');
    }
    checked('explicit local demo access: ' + email + ' -> ' + target + ' = ' + expected);
    await context.close();
  }

  await writeFile(harnessFile, '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script type="module" src="/.tmp/security-smoke/harness.tsx"></script></body></html>');
  await writeFile(moduleFile, harness);
  const context = await browser.newContext();
  await context.route('**/src/lib/supabase.ts*', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: authMock }));
  activePage = await context.newPage();
  const errors = [];
  activePage.on('pageerror', error => errors.push(error.message));
  await activePage.goto(base + '/.tmp/security-smoke/harness.html');
  await activePage.waitForFunction(() => window.__initialResolvers?.length >= 2);
  await activePage.evaluate(() => window.__emitAuth('user-admin'));
  await activePage.waitForFunction(() => !!window.__pendingProfiles['user-admin']);
  await activePage.evaluate(() => window.__resolveProfile('user-admin', 'admin'));
  await activePage.getByTestId('admin-secret').waitFor();
  await activePage.evaluate(() => window.__settleInitial(null));
  await activePage.waitForFunction(() => window.__authView.id === 'user-admin' && !window.__authView.loading);
  assert.equal(await activePage.getByTestId('admin-secret').count(), 1);
  checked('late initial session cannot overwrite a newer auth event, including StrictMode remount');

  await activePage.evaluate(() => window.__emitAuth('user-employee'));
  await activePage.waitForFunction(() => window.__authView.id === 'user-employee' && window.__authView.loading);
  assert.equal(await activePage.getByTestId('admin-secret').count(), 0);
  await activePage.waitForFunction(() => !!window.__pendingProfiles['user-employee']);
  await activePage.evaluate(() => window.__resolveProfile('user-employee', 'employee'));
  await activePage.getByRole('heading', { name: 'ليس لديك صلاحية لفتح هذه الصفحة' }).waitFor();
  assert.deepEqual(await activePage.evaluate(() => window.__authView.roles), ['employee']);
  checked('switching users revokes old access immediately; forged auth metadata does not grant admin');

  await activePage.evaluate(() => window.__emitAuth('user-stale'));
  await activePage.waitForFunction(() => !!window.__pendingProfiles['user-stale']);
  await activePage.evaluate(() => window.__emitAuth('user-new'));
  await activePage.waitForFunction(() => !!window.__pendingProfiles['user-new']);
  await activePage.evaluate(() => window.__resolveProfile('user-new', 'employee'));
  await activePage.waitForFunction(() => window.__authView.profile === 'user-new');
  await activePage.evaluate(() => window.__resolveProfile('user-stale', 'admin'));
  await activePage.waitForFunction(() => window.__authView.profile === 'user-new' && !window.__authView.loading);
  assert.deepEqual(await activePage.evaluate(() => window.__authView.roles), ['employee']);
  checked('late prior-account admin profile cannot replace the current account');

  await activePage.evaluate(() => window.__emitAuth('user-logout-race'));
  await activePage.waitForFunction(() => !!window.__pendingProfiles['user-logout-race']);
  await activePage.evaluate(() => window.__signOut());
  await activePage.evaluate(() => window.__resolveProfile('user-logout-race', 'admin'));
  await activePage.waitForFunction(() => window.__authView.id === null && !window.__authView.loading);
  assert.equal(await activePage.getByTestId('admin-secret').count(), 0);
  assert.deepEqual(await activePage.evaluate(() => window.__authView.roles), []);
  assert.deepEqual(errors, []);
  checked('late profile after sign-out never restores identity or privileges');
  await activePage.evaluate(() => window.__emitAuth('user-unregistered'));
  await activePage.waitForFunction(() => !!window.__pendingProfiles['user-unregistered']);
  await activePage.evaluate(() => window.__resolveProfile('user-unregistered', null));
  await activePage.getByRole('link', { name: 'إكمال تسجيل الشركة' }).waitFor();
  assert.equal(await activePage.getByTestId('admin-secret').count(), 0);
  await activePage.evaluate(() => window.__emitAuth('user-suspended'));
  await activePage.waitForFunction(() => !!window.__pendingProfiles['user-suspended']);
  await activePage.evaluate(() => window.__resolveProfile('user-suspended', 'employee', 'suspended'));
  await activePage.waitForFunction(() => !!window.__authView.error && !window.__authView.loading);
  assert.equal(await activePage.getByRole('link', { name: 'إكمال تسجيل الشركة' }).count(), 0);
  assert.equal(await activePage.getByTestId('admin-secret').count(), 0);
  checked('only a missing ERP profile offers registration; suspended accounts remain blocked');
  await context.close();
  console.log('Security browser checks passed: ' + checks);
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(temp, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  for (const server of servers.reverse()) {
    if (server.close) await server.close();
    else await new Promise(resolve => server.httpServer.close(resolve));
  }
  await Promise.all([harnessFile, moduleFile].map(file => unlink(file).catch(() => {})));
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
}
