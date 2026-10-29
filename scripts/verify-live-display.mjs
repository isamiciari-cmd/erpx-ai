// Read-only display acceptance after a production patch; no business RPC writes.
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url);
const origin = 'https://code-isamiciari-5169s-projects.vercel.app';
const project = 'https://svxmlejmhlocsjjtftxd.supabase.co';
const run = '20261027T125148Z-8377c4cc66a4';
let browser;
const report = { startedAt: new Date().toISOString(), readOnlyBusinessData: true,
  passed: false, themes: [], blockedRequests: 0, pageErrors: 0, httpFailures: 0 };
function check(condition, code) { if (!condition) throw new Error(code); }
try {
  const config = JSON.parse(await readFile(new URL('.tmp/release-acceptance/live-fixture.private.json', root), 'utf8'));
  const journey = JSON.parse(await readFile(new URL(`.tmp/release-acceptance/${run}/report.json`, root), 'utf8'));
  const manifest = JSON.parse(await readFile(new URL('.tmp/release-acceptance/release-manifest.json', root), 'utf8'));
  check(config.baseUrl === origin && config.supabaseUrl === project &&
    config.metadata.runId === run && config.metadata.state === 'ready' &&
    config.companyName.startsWith('ERPX RELEASE ACCEPTANCE ') &&
    journey.status === 'passed' && journey.fixtureCompanyId === config.companyId,
  'display_fixture_guard_failed');
  report.releaseId = manifest.release.id;
  report.runId = run;
  browser = await chromium.launch({ headless: true });
  for (const name of ['admin', 'cashier']) {
    const identity = config[name];
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 },
      locale: 'en-US', colorScheme: 'light' });
    await context.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'en');
      if (!localStorage.getItem('erpx-theme')) localStorage.setItem('erpx-theme', 'dark');
    });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.continue();
      let body;
      try { body = request.postDataJSON(); } catch { /* No raw request data is logged. */ }
      const signIn = url.pathname === '/auth/v1/token' &&
        url.searchParams.get('grant_type') === 'password' &&
        body?.email === identity.email && body?.password === identity.password;
      const readRole = ['/rest/v1/rpc/get_user_roles', '/rest/v1/rpc/get_user_permissions'].includes(url.pathname) &&
        body && Object.keys(body).length === 1 && body.p_user_id === identity.userId;
      if (url.origin === project && request.method() === 'POST' && (signIn || readRole)) return route.continue();
      report.blockedRequests += 1;
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', () => { report.pageErrors += 1; });
    page.on('response', response => { if (response.status() >= 400) report.httpFailures += 1; });
    page.on('dialog', async dialog => { report.blockedRequests += 1; await dialog.dismiss(); });
    await page.goto(`${origin}/login`);
    await page.locator('#email').fill(identity.email);
    await page.locator('#password').fill(identity.password);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(url => !url.pathname.startsWith('/login'));
    if (name === 'admin') {
      for (const theme of ['dark', 'light']) {
        await page.evaluate(value => localStorage.setItem('erpx-theme', value), theme);
        await page.goto(`${origin}/finance/general-ledger`);
        await page.getByRole('heading', { name: 'General ledger', exact: true }).waitFor();
        await page.getByRole('cell', { name: `INV-${journey.evidence.standaloneInvoice.id}`, exact: false }).first().waitFor();
        const contrasts = await page.evaluate(() => {
          const pixel = document.createElement('canvas'); pixel.width = pixel.height = 1;
          const canvas = pixel.getContext('2d');
          const rgb = color => { canvas.clearRect(0, 0, 1, 1); canvas.fillStyle = color;
            canvas.fillRect(0, 0, 1, 1); return [...canvas.getImageData(0, 0, 1, 1).data].slice(0, 3); };
          const light = values => values.map(value => { const n = value / 255;
            return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, n, index) => sum + n * [0.2126, 0.7152, 0.0722][index], 0);
          const background = getComputedStyle(document.documentElement).getPropertyValue('--app-bg').trim();
          return { darkClass: document.documentElement.classList.contains('dark'),
            ratios: ['h1', 'tbody td'].map(selector => {
              const color = getComputedStyle(document.querySelector(`section ${selector}`)).color;
              const a = light(rgb(color)), b = light(rgb(background));
              return { selector, color, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
            }) };
        });
        check(contrasts.darkClass === (theme === 'dark') && contrasts.ratios.every(item => item.ratio >= 4.5), 'ledger_contrast_failed');
        report.themes.push({ theme, ...contrasts });
        await page.screenshot({ path: new URL(`.tmp/release-acceptance/${run}/display-ledger-${theme}.png`, root).pathname.replace(/^\/(\w:)/, '$1'),
          fullPage: true, mask: [page.locator('input[type="email"], input[type="password"]')] });
      }
    } else {
      await page.goto(`${origin}/cashier/pos`);
      await page.getByText('Acceptance Branch', { exact: true }).waitFor();
      check(await page.getByText('Branch not assigned', { exact: true }).count() === 0, 'cashier_branch_label_failed');
      await page.getByPlaceholder('Search products by name or barcode...').fill(`Release acceptance ${run}`);
      await page.getByRole('heading', { name: `Release acceptance ${run}`, exact: true }).waitFor();
      check(await page.locator('svg.lucide-package').count() > 0, 'cashier_product_icon_failed');
      report.cashier = { assignedBranchNameShown: true, productIconShown: true, noShiftOpened: true };
      await page.screenshot({ path: new URL(`.tmp/release-acceptance/${run}/display-cashier.png`, root).pathname.replace(/^\/(\w:)/, '$1'),
        fullPage: true, mask: [page.locator('input[type="email"], input[type="password"]')] });
    }
    await context.close();
  }
  const release = await fetch(`${origin}/release.json`).then(response => response.json());
  check(release.id === report.releaseId, 'display_release_mismatch');
  check(report.blockedRequests === 0 && report.pageErrors === 0 && report.httpFailures === 0, 'display_browser_errors');
  report.passed = true;
} catch (error) {
  // Error text from browser locators may include a filled password; never log it.
  report.failure = /^[a-z_]+$/.test(error.message) ? error.message : error.name;
  process.exitCode = 1;
} finally {
  await browser?.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(new URL('.tmp/release-acceptance/display-verification.json', root), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
