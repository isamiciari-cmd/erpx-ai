# 🚀 ERPX-AI Complete Deployment Workflow

## Overview

```
Figma (Design) → Code (React/TypeScript) → GitHub (Version Control) → Vercel (Hosting)
                                                    ↓
                                            Supabase (Database)
```

## Current Status

✅ Code is ready and committed locally
❌ Code NOT pushed to GitHub yet
❌ Vercel NOT connected to GitHub
❌ Many components still use static/demo data
❌ Environment variables NOT set in Vercel
❌ Supabase Realtime NOT enabled

---

## Step-by-Step Deployment Fix

### STEP 1: Push Code to GitHub ⚠️ (REQUIRED)

You MUST push the code from this workspace to GitHub. Vercel cannot deploy without it.

**Option A: Using Git Command Line**

```bash
# Navigate to your project folder on your computer
cd /path/to/erpx-ai

# Make sure you have the latest code from Claude Code
# (Copy all files from Claude Code workspace to this folder)

# Add remote (if not already added)
git remote add origin https://github.com/isamiciari-cmd/erpx-ai.git

# Push to GitHub
git push -u origin main

# You'll be prompted for credentials:
# Username: isamiciari-cmd
# Password: [Your GitHub Personal Access Token]
```

**Get GitHub Token:**

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Check `repo` scope
4. Generate and copy the token (starts with `ghp_...`)
5. Use it as your password when pushing

**Option B: Using GitHub Desktop (Easier)**

1. Download: https://desktop.github.com
2. File → Clone Repository → `isamiciari-cmd/erpx-ai`
3. Copy all files from Claude Code workspace into the cloned folder
4. GitHub Desktop will show all changes
5. Commit message: "Complete ERPX-AI application with cashier system"
6. Click "Push origin"

---

### STEP 2: Connect Vercel to GitHub

1. Go to: https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import from GitHub: `isamiciari-cmd/erpx-ai`
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install`
5. **Add Environment Variables:**
   - `VITE_SUPABASE_URL` = `https://svxmlejmhlocsjjtftxd.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = [Your Supabase anon key]
6. Click "Deploy"

**Important Settings:**

- ✅ Enable "Auto Deploy" for main branch
- ✅ Add production domain: `erpx-ai.com`
- ✅ Add redirect URLs in Supabase Authentication settings

---

### STEP 3: Get Supabase Anon Key

1. Go to: https://supabase.com/dashboard
2. Select your ERPX-AI project
3. Settings → API
4. Copy **"anon public"** key (NOT service_role!)
5. Paste it in Vercel environment variables

---

### STEP 4: Configure Supabase for Production

#### A. Set Allowed URLs

1. Supabase Dashboard → Authentication → URL Configuration
2. **Site URL:** `https://erpx-ai.com`
3. **Redirect URLs:** Add these:
   ```
   http://localhost:5173/**
   https://erpx-ai.com/**
   https://*.vercel.app/**
   ```

#### B. Enable Realtime (For Live Updates)

1. Supabase Dashboard → Database → Replication
2. Enable Realtime for these tables:
   - ✅ `users`
   - ✅ `roles`
   - ✅ `branches`
   - ✅ `companies`
   - ✅ `sales_orders`
   - ✅ `invoices`
   - ✅ `products`
   - ✅ `inventory`
   - ✅ `customers`

3. Click "0 tables" → Select all tables above → Save

#### C. Verify Row Level Security (RLS)

Make sure RLS is enabled on all tables with policies for `company_id` isolation.

---

### STEP 5: Test the Deployment

After Vercel finishes deploying:

1. Visit: https://erpx-ai.com
2. Try logging in:
   - **Admin:** `admin-1@erpx-ai.com` / `@12345@`
   - **Cashier:** `cashier@erpx-ai.com` / `Aa12141312@`
3. Check if data loads from Supabase
4. Check browser console for errors (F12)

---

## Workflow Going Forward

### Making Changes to ERPX-AI

#### 1. Design Changes in Figma

```
Figma → Export design → Convert to React components → Push to GitHub → Auto-deploy
```

**Process:**

1. Design in Figma
2. Use Figma Dev Mode to get code
3. Convert to React/TypeScript components
4. Test locally with `pnpm dev`
5. Commit and push to GitHub
6. Vercel auto-deploys

#### 2. Code Changes

```
Claude Code / VS Code → Test locally → Commit → Push to GitHub → Auto-deploy
```

**Process:**

1. Make code changes
2. Test locally: `pnpm dev`
3. Commit: `git add . && git commit -m "description"`
4. Push: `git push origin main`
5. Vercel auto-deploys (takes 1-2 minutes)

#### 3. Database Changes

```
Supabase SQL Editor → Run migration → App automatically uses new data
```

**Process:**

1. Write SQL in Supabase SQL Editor
2. Run migration
3. Update TypeScript types if needed
4. App reflects changes immediately (no redeploy needed for data)

#### 4. Emergency Rollback

```
Vercel Dashboard → Deployments → Find previous working version → Promote
```

---

## Common Issues & Fixes

### ❌ "Changes not showing after Vercel redeploy"

**Cause:** Code wasn't pushed to GitHub, Vercel deployed old code

**Fix:**

1. Make sure code is committed locally: `git status`
2. Push to GitHub: `git push origin main`
3. Wait for Vercel to auto-deploy
4. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### ❌ "Failed to fetch" errors

**Cause:** Supabase environment variables not set

**Fix:**

1. Check Vercel → Settings → Environment Variables
2. Make sure both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Redeploy after adding variables

### ❌ "Data not loading / Empty screens"

**Cause:** Static/demo data instead of Supabase queries

**Fix:**

1. Check if component uses `useState` with hardcoded arrays
2. Replace with Supabase query in `useEffect`
3. See "Replacing Static Data" section below

### ❌ "Build failed on Vercel"

**Cause:** TypeScript errors or missing dependencies

**Fix:**

1. Test build locally: `pnpm build`
2. Fix any errors
3. Push fix to GitHub
4. Vercel will retry automatically

---

## Replacing Static Data with Supabase

### Before (Static Data):

```typescript
const [products, setProducts] = useState([
  { id: '1', name: 'Product A', price: 100 },
  { id: '2', name: 'Product B', price: 250 },
]);
```

### After (Supabase Data):

```typescript
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', user.company_id);

    if (data) setProducts(data);
    setLoading(false);
  }

  fetchProducts();
}, [user.company_id]);
```

### With Realtime:

```typescript
useEffect(() => {
  // Initial fetch
  fetchProducts();

  // Subscribe to changes
  const subscription = supabase
    .channel('products_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
      console.log('Product changed:', payload);
      fetchProducts(); // Refresh data
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

## Environment Variables Checklist

### Local Development (.env file)

```env
VITE_SUPABASE_URL=https://svxmlejmhlocsjjtftxd.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
VITE_API_URL=http://localhost:3000/api
VITE_ENV=development
```

### Vercel Production

Go to Vercel → Settings → Environment Variables:

| Variable Name            | Value                                      | Environments                     |
| ------------------------ | ------------------------------------------ | -------------------------------- |
| `VITE_SUPABASE_URL`      | `https://svxmlejmhlocsjjtftxd.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | [Your anon key]                            | Production, Preview, Development |

---

## Monitoring & Debugging

### Check Deployment Status

- Vercel Dashboard: https://vercel.com/dashboard
- See build logs for errors
- Check deployment URL

### Check Database Queries

- Supabase Dashboard → Logs → Postgres Logs
- See all queries and errors
- Check for slow queries

### Check Realtime Connections

- Supabase Dashboard → Logs → Realtime Logs
- See active subscriptions
- Debug connection issues

### Check Application Errors

- Browser Console (F12) → Console tab
- See JavaScript errors
- Check network tab for failed requests

---

## Summary

✅ **To Fix Deployment:**

1. Push code to GitHub (YOU must do this - I can't access your credentials)
2. Connect Vercel to GitHub repository
3. Set environment variables in Vercel
4. Enable Realtime in Supabase
5. Replace static data with Supabase queries (I'll help with this)

✅ **Workflow:**

- Figma → Code → GitHub → Vercel → Production
- Database changes in Supabase reflect immediately
- Code changes auto-deploy from GitHub

✅ **Need Help?**

- See FIX_SUPABASE_CONNECTION.md for database issues
- See CASHIER_SYSTEM_COMPLETE.md for cashier role setup
- See README_DEPLOY_NOW.md for alternative deployment methods

---

**Next: I'll now update the codebase to replace static data with Supabase queries and enable Realtime.**
