# Common Issues & Solutions

Quick solutions to frequently encountered problems.

## Supabase Connection

### Failed to Fetch

**Symptoms:**
- "TypeError: Failed to fetch" in console
- Login page doesn't work
- Data doesn't load

**Causes:**
1. Missing or invalid Supabase anon key
2. Supabase project paused/deleted
3. Wrong Supabase URL
4. Dev server not restarted after .env changes

**Solution:**

```bash
# 1. Verify .env file exists and has correct keys
cat .env

# 2. Get fresh credentials from Supabase
# Dashboard → Settings → API
# Copy: Project URL and anon key

# 3. Update .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI...

# 4. CRITICAL: Restart dev server
# Press Ctrl+C, then:
pnpm dev

# 5. Hard refresh browser
# Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### Supabase Project Paused

**Symptoms:**
- 404 error from Supabase URL
- "Project is not active" message

**Solution:**

1. Go to https://supabase.com/dashboard
2. Find your project
3. Click "Resume Project" or "Restore"
4. Wait 2-3 minutes for activation
5. Refresh your app

### Wrong Anon Key

**Symptoms:**
- 401 Unauthorized errors
- "Invalid API key" messages

**Solution:**

Get the correct key:
1. Supabase Dashboard → Settings → API
2. Look for "Project API keys" section
3. Copy the **anon public** key (NOT service_role!)
4. Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
5. Update `.env` file
6. Restart dev server

## Build & Deployment

### Vercel Build Fails

**Symptoms:**
- Build fails with TypeScript errors
- Module not found errors
- Out of memory errors

**Solutions:**

```bash
# Test build locally first
pnpm build

# Check for TypeScript errors
pnpm type-check

# Clear cache and rebuild
rm -rf node_modules dist .vite
pnpm install
pnpm build

# If out of memory on Vercel:
# Add to package.json:
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
  }
}
```

### Module Not Found

**Symptoms:**
- `Cannot find module '@/...'` errors
- Import path errors

**Solution:**

```bash
# Check tsconfig.json has correct paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# Check vite.config.ts has alias
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src')
  }
}

# Reinstall dependencies
pnpm install
```

### Environment Variables Not Working

**Symptoms:**
- `undefined` values for env variables
- Different behavior local vs production

**Solution:**

```bash
# Vite requires VITE_ prefix
❌ SUPABASE_URL=...
✅ VITE_SUPABASE_URL=...

# Must restart dev server after .env changes
# Environment variables are only loaded on startup!

# Vercel: Add variables in Dashboard
# Settings → Environment Variables
# Select: Production, Preview, Development
```

## Database Issues

### RLS Policies Blocking Queries

**Symptoms:**
- Empty data despite records existing
- "permission denied for table" errors
- Works for admin but not other roles

**Solution:**

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View existing policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Common fix: Company isolation policy
CREATE POLICY "Users can view own company data"
  ON your_table
  FOR SELECT
  USING (company_id = (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));
```

### Migration Fails

**Symptoms:**
- "relation already exists" errors
- Foreign key violations
- Constraint violations

**Solution:**

```sql
-- Check what exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Drop and recreate (CAUTION: loses data)
DROP TABLE IF EXISTS problem_table CASCADE;

-- Or use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS problem_table (...);
```

### Realtime Not Working

**Symptoms:**
- UI doesn't update when database changes
- No Realtime subscription errors
- Data requires page refresh

**Solution:**

1. Enable Realtime in Supabase:
   - Dashboard → Database → Replication
   - Select tables to replicate
   - Click "Save"

2. Check subscription code:
```typescript
const subscription = supabase
  .channel('table_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'products' },
    (payload) => console.log('Change:', payload)
  )
  .subscribe();

// IMPORTANT: Cleanup
return () => subscription.unsubscribe();
```

## Authentication Issues

### Can't Login - Invalid Credentials

**Symptoms:**
- "Invalid email or password" for known credentials
- Test accounts don't work

**Solution:**

```sql
-- 1. Check if user exists in auth.users
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'admin-1@erpx-ai.com';

-- 2. Check if user profile exists
SELECT * FROM users WHERE email = 'admin-1@erpx-ai.com';

-- 3. Create admin user if missing
-- Run: database/CREATE_ADMIN_USER.sql
```

### Session Expires Immediately

**Symptoms:**
- Logged out right after login
- "Session expired" messages constantly

**Solution:**

1. Check Supabase Auth settings:
   - Dashboard → Authentication → Settings
   - JWT expiry: Should be 3600 (1 hour)
   - Refresh token rotation: Enabled

2. Check for CORS issues:
   - Auth → URL Configuration
   - Add your domain to allowed URLs

### Wrong Dashboard After Login

**Symptoms:**
- Cashier sees admin dashboard
- Role-based routing not working

**Solution:**

Check role-based redirect logic:

```typescript
// In ProductionLogin.tsx
const roleName = userProfile?.role?.name;

switch (roleName) {
  case 'cashier':
    navigate("/cashier/pos");
    break;
  case 'admin':
    navigate("/");
    break;
  // ...
}
```

## Performance Issues

### Slow Initial Load

**Solutions:**

```bash
# Check bundle size
pnpm build
# Look for large chunks in dist/assets/

# Implement code splitting
# See vite.config.ts manualChunks configuration

# Enable compression on Vercel
# Automatic for static assets

# Use React lazy loading
const FinanceModule = lazy(() => import('./modules/finance'));
```

### Memory Leaks

**Symptoms:**
- Browser tab uses increasing memory
- App slows down over time
- Eventually crashes

**Common Causes:**

```typescript
// ❌ Bad: Subscription not cleaned up
useEffect(() => {
  const subscription = supabase.channel('changes')...
  // Missing return cleanup!
}, []);

// ✅ Good: Proper cleanup
useEffect(() => {
  const subscription = supabase.channel('changes')...
  return () => subscription.unsubscribe();
}, []);

// ❌ Bad: Event listener not removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// ✅ Good: Cleanup event listener
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

## Development Issues

### Hot Reload Not Working

**Solution:**

```bash
# Check Vite config has HMR enabled
server: {
  hmr: true
}

# Restart dev server
# Ctrl+C, then pnpm dev

# Check for filesystem watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Port Already in Use

**Solution:**

```bash
# Find process using port 5173
lsof -i :5173

# Kill the process
kill -9 <PID>

# Or use different port
pnpm dev -- --port 5174
```

### TypeScript Errors in Editor

**Solution:**

```bash
# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"

# Check tsconfig.json is valid
npx tsc --noEmit

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

## Testing Issues

### Tests Fail Locally but Pass in CI

**Causes:**
- Environment differences
- Timezone issues
- Async timing issues

**Solutions:**

```typescript
// Use fake timers
vi.useFakeTimers();
vi.setSystemTime(new Date('2024-01-01'));

// Wait for async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

## Production Issues

### 404 on Refresh in Production

**Cause:** SPA routing not configured on Vercel

**Solution:**

Create/update `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### CORS Errors in Production

**Solution:**

1. Supabase Dashboard → Authentication → URL Configuration
2. Add production URL:
   ```
   https://erpx-ai.com/**
   https://*.vercel.app/**
   ```

3. Check API headers (if using custom API)

### Images Not Loading

**Causes:**
- Incorrect import paths
- Images not in `public/` folder
- Build not including images

**Solutions:**

```typescript
// ❌ Wrong
import img from './image.png';

// ✅ Correct for public folder
<img src="/images/logo.png" />

// ✅ Correct for imported images
import logo from '@/assets/logo.png';
<img src={logo} />
```

## Getting More Help

1. **Check browser console** (F12) for detailed errors
2. **Check Vercel build logs** for deployment issues
3. **Check Supabase logs** for database/auth issues
4. **Enable verbose logging** in development:

```typescript
// In main.tsx
if (import.meta.env.DEV) {
  console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('Mode:', import.meta.env.MODE);
}
```

5. **Create minimal reproduction**
6. **Check GitHub issues**: https://github.com/isamiciari-cmd/erpx-ai/issues

---

**Still stuck? Create an issue with:**
- Error message (full text)
- Browser console logs
- Steps to reproduce
- Environment (dev/production)
- Browser version
