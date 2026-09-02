import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://localhost:5174';
const routes = ['/', '/login', '/dashboard', '/cashier/pos', '/admin/tenants'];

const browser = await chromium.launch();
const context = await browser.newContext();

for (const route of routes) {
  const page = await context.newPage();
  try {
    const url = `${base}${route}`;
    console.log('Visiting', url);
    await page.goto(url, { waitUntil: 'networkidle' });
    // give SPA a moment to run client-side redirects
    await page.waitForTimeout(800);
    const final = page.url();
    const title = await page.title();
    console.log('  Final URL:', final);
    console.log('  Title:', title);

    // Check if login form exists
    const loginForm = await page.$('form');
    if (loginForm && final.includes('/login')) {
      console.log('  -> Redirected to login (unauthenticated)');
    }
  } catch (err) {
    console.error('  Error visiting', route, err);
  } finally {
    await page.close();
  }
}

await browser.close();

// --- Authenticated simulation: set localStorage/cookie keys then re-check protected routes ---
console.log('\nRunning authenticated session simulation...');
const authBrowser = await chromium.launch();
const authContext = await authBrowser.newContext();
const authPage = await authContext.newPage();

// Intercept likely auth/api requests and return a mocked authenticated user
await authContext.route('**/*', (route) => {
  const req = route.request();
  const url = req.url().toLowerCase();
  const isApi =
    url.includes('/api/') ||
    url.includes('/auth') ||
    url.includes('/user') ||
    url.includes('/session') ||
    url.includes('supabase.co') ||
    url.includes('/me');
  if (isApi) {
    const body = JSON.stringify({
      user: { id: 'test-user', email: 'test@local', roles: ['admin', 'cashier'] },
    });
    route.fulfill({ status: 200, contentType: 'application/json', body });
  } else {
    route.continue();
  }
});

async function applyLocalAuth(page) {
  // Set a variety of common keys so the app's auth layer picks up one of them.
  await page.evaluate(() => {
    try {
      const user = { id: 'test-user', email: 'test@local', roles: ['admin', 'cashier'] };
      localStorage.setItem('erp.auth.user', JSON.stringify(user));
      localStorage.setItem('erp.auth.token', 'test-token');
      localStorage.setItem('auth', JSON.stringify({ user, token: 'test-token' }));
      localStorage.setItem('user', JSON.stringify(user));
      // Supabase-like token shape
      localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({ currentSession: { access_token: 'test-token' }, user }),
      );
      // Cookie fallback
      document.cookie = 'sb:token=test-token; path=/';
    } catch (e) {
      // ignore
    }
  });
}

for (const route of routes) {
  try {
    const url = `${base}${route}`;
    console.log('Visiting (auth) ', url);
    await authPage.goto(base, { waitUntil: 'networkidle' });
    await applyLocalAuth(authPage);
    await authPage.goto(url, { waitUntil: 'networkidle' });
    await authPage.waitForTimeout(800);
    const final = authPage.url();
    const title = await authPage.title();
    console.log('  Final URL (auth):', final);
    console.log('  Title:', title);
  } catch (err) {
    console.error('  Error visiting (auth)', route, err);
  }
}

await authContext.close();
await authBrowser.close();
