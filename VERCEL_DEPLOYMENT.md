# Vercel Deployment Instructions

## CRITICAL: Clear Build Cache Before Deployment

The previous deployment has cached a **corrupted pnpm-lock.yaml** file.
Vercel cache ID: `71Y54FnU8ppkJADqnWxBbycDaXrB`

### Required Steps in Vercel Dashboard:

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select project: `erpx-ai`

2. **Clear Build Cache (REQUIRED)**
   
   **Option A - From Settings:**
   - Go to **Settings** → **General**
   - Scroll to **Build & Development Settings**
   - Click **"Clear Build Cache"** button
   
   **Option B - From Deployment:**
   - Go to **Deployments** tab
   - Click on latest deployment
   - Click `⋯` (three dots) menu
   - Select **"Redeploy"**
   - ✅ **CHECK** "Clear Build Cache and Redeploy"
   - Click **"Redeploy"** button

3. **Verify Deployment Logs**
   - After redeployment, check logs
   - Should NOT see: `Restored build cache from previous deployment`
   - Should see: Fresh `pnpm install` starting from scratch

## Current Configuration

- **Commit Hash:** 41b1542dd (or latest)
- **Node Version:** >=18.0.0
- **pnpm Version:** >=9.0.0
- **Framework:** Vite (auto-detected)

## New vercel.json Configuration

The deployment now:
- Deletes node_modules before install
- Deletes pnpm-lock.yaml from cache and regenerates
- Forces fresh install with `--no-frozen-lockfile --force`
- Disables framework auto-detection to prevent cache conflicts
- Sets proper cache headers

## Troubleshooting

If deployment still fails:

1. **Delete the project from Vercel and reimport**
   - This will clear ALL caches completely
   - Reimport from GitHub
   - Redeploy

2. **Check GitHub pnpm-lock.yaml**
   - Verify no merge conflict markers exist
   - File should be ~380KB
   - Run: `grep -c "<<<<<<< HEAD" pnpm-lock.yaml` (should return 0)

3. **Contact Vercel Support**
   - If cache clearing doesn't work
   - Request manual cache purge for deployment ID: `71Y54FnU8ppkJADqnWxBbycDaXrB`

## Environment Variables

All required env vars are in `vercel.json`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VERCEL_FORCE_NO_BUILD_CACHE=1`
- `NODE_ENV=production`

## Expected Deployment Logs

```
✓ Cloning completed
✓ Running "install" command: rm -rf node_modules pnpm-lock.yaml && pnpm install...
✓ Dependencies installed
✓ Running "build" command: pnpm build
✓ Build completed
✓ Deployment ready
```

---

**Last Updated:** 2026-05-22  
**Status:** Ready for fresh deployment after cache clear
