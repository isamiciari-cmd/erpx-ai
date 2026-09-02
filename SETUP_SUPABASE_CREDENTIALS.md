# Setup Supabase Credentials - REQUIRED ⚠️

## Current Issue

```
[Supabase] ⚠️ Running in DEMO MODE - Supabase credentials not configured
[AuthProvider] ❌ Missing Supabase environment variables
```

**Your app is not connected to Supabase because environment variables are missing.**

---

## Quick Fix (5 minutes)

### Step 1: Get Your Supabase Credentials

1. **Go to your Supabase Dashboard:**
   - https://app.supabase.com

2. **Select your project** (or create a new one if you don't have one)

3. **Go to Project Settings:**
   - Click the ⚙️ gear icon (bottom left)
   - Click **"Settings"**
   - Click **"API"** in the left sidebar

4. **Copy these two values:**

   **Project URL** (looks like this):

   ```
   https://abcdefghijklmnop.supabase.co
   ```

   **anon/public key** (looks like this):

   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzg2MzI4OCwiZXhwIjoxOTM5NDM5Mjg4fQ.abc123def456ghi789
   ```

---

### Step 2: Update the .env File

1. **Open the `.env` file** in your project root (already created for you)

2. **Replace these two lines:**

   **BEFORE:**

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   **AFTER** (with your actual values):

   ```env
   VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzg2MzI4OCwiZXhwIjoxOTM5NDM5Mjg4fQ.abc123def456ghi789
   ```

3. **Save the file**

---

### Step 3: Restart Your Dev Server

**If running locally:**

```bash
# Stop the dev server (Ctrl+C)
# Start it again
npm run dev
# or
pnpm dev
```

**If deployed on Vercel:**

1. Go to Vercel dashboard
2. Go to your project
3. Click **"Settings"** → **"Environment Variables"**
4. Add these two variables:
   - `VITE_SUPABASE_URL` = Your project URL
   - `VITE_SUPABASE_ANON_KEY` = Your anon key
5. Click **"Redeploy"**

---

### Step 4: Verify It Works

Open your browser console and you should now see:

**BEFORE (Error):**

```
[Supabase] ⚠️ Running in DEMO MODE - Supabase credentials not configured
[AuthProvider] ❌ Missing Supabase environment variables
```

**AFTER (Success):**

```
[Supabase] Initializing Supabase client...
[Supabase] VITE_SUPABASE_URL: ✓ https://abcdefghijklmnop.supabase.co...
[Supabase] VITE_SUPABASE_ANON_KEY: ✓ eyJhbGciOiJIUzI1NiIsInR5...
[Supabase] ✓ Supabase credentials validated
[Supabase] ✓ Supabase client created
```

---

## For Vercel Deployment

### Add Environment Variables in Vercel

1. **Go to your Vercel project:**
   - https://vercel.com/your-username/erpx-ai

2. **Click "Settings"** in the top navigation

3. **Click "Environment Variables"** in the left sidebar

4. **Add these two variables:**

   **Variable 1:**
   - **Key:** `VITE_SUPABASE_URL`
   - **Value:** `https://your-project-id.supabase.co`
   - **Environment:** Select all (Production, Preview, Development)

   **Variable 2:**
   - **Key:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGci...` (your full anon key)
   - **Environment:** Select all (Production, Preview, Development)

5. **Click "Save"**

6. **Redeploy:**
   - Go to "Deployments" tab
   - Click the three dots (⋯) on the latest deployment
   - Click "Redeploy"
   - Wait for build to complete

---

## Troubleshooting

### Issue: "Still showing DEMO MODE after updating .env"

**Solution:**

1. Make sure you saved the `.env` file
2. Restart your dev server (Ctrl+C and start again)
3. Clear browser cache and reload
4. Check the file is named `.env` (not `.env.txt` or `.env.example`)

### Issue: "VITE_SUPABASE_URL: ✗ Missing"

**Solution:**

1. Open `.env` file
2. Make sure the line starts with `VITE_SUPABASE_URL=` (no spaces)
3. Make sure there's no quotes around the URL
4. Correct format: `VITE_SUPABASE_URL=https://abc123.supabase.co`

### Issue: "VITE_SUPABASE_ANON_KEY: ✗ Missing"

**Solution:**

1. Open `.env` file
2. Make sure the line starts with `VITE_SUPABASE_ANON_KEY=` (no spaces)
3. Make sure there's no quotes around the key
4. The key should start with `eyJ` and be very long (200+ characters)
5. Correct format: `VITE_SUPABASE_ANON_KEY=eyJhbGci...`

### Issue: "Environment variables not loading in Vite"

**Solution:**

1. Make sure variables start with `VITE_` prefix
2. Restart dev server after changing `.env`
3. Check `.env` is in project root (same folder as `package.json`)
4. Make sure `.env` is not in `.gitignore` locally (it should be in `.gitignore` for git, but needs to exist locally)

---

## Security Notes

### ✅ Safe to Use

- **anon/public key** - This is safe to expose in frontend code
- It's designed to be public and has Row-Level Security (RLS) protection

### ❌ Never Use in Frontend

- **service_role key** - NEVER put this in `.env` or frontend code
- This bypasses RLS and should only be used in secure backend code

---

## Project Structure

```
your-project/
├── .env                    ← Create this file (you have it now!)
├── .env.example            ← Template file (don't modify)
├── package.json
├── vite.config.ts
└── src/
    └── lib/
        └── supabase.ts     ← Reads environment variables
```

---

## Example .env File

Here's what your `.env` should look like:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzg2MzI4OCwiZXhwIjoxOTM5NDM5Mjg4fQ.abc123def456ghi789

# API Configuration
VITE_API_URL=http://localhost:3000/api
VITE_ENV=development

# Developer Authentication Bypass
VITE_DEV_AUTH_BYPASS=false
```

**Note:** Replace the URL and key with YOUR actual values from Supabase!

---

## Quick Checklist

- [ ] Created Supabase project at https://app.supabase.com
- [ ] Copied Project URL from Settings → API
- [ ] Copied anon/public key from Settings → API
- [ ] Updated `.env` file with real values
- [ ] Saved the `.env` file
- [ ] Restarted dev server
- [ ] Checked browser console for success messages
- [ ] (For Vercel) Added environment variables in Vercel dashboard
- [ ] (For Vercel) Redeployed the application

---

## Still Having Issues?

If you're still seeing the error after following these steps:

1. **Check the `.env` file location:**

   ```bash
   ls -la .env
   ```

   Should show the file exists

2. **Check the `.env` file content:**

   ```bash
   cat .env
   ```

   Should show your actual values (not placeholders)

3. **Check environment variables are loaded:**
   Add this temporarily to your code:

   ```typescript
   console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
   console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20));
   ```

4. **Verify Supabase project is active:**
   - Go to https://app.supabase.com
   - Make sure project status is "Active" (not paused)

---

## Next Steps After Setup

Once Supabase is connected:

1. ✅ **Run RBAC migrations** (if not done yet)
   - See `RBAC_PRODUCTION_MODE.md`

2. ✅ **Test authentication**
   - Try logging in
   - Check console for success logs

3. ✅ **Deploy to Vercel**
   - Push to GitHub
   - Vercel auto-deploys
   - Add environment variables in Vercel

---

**Your app cannot function without Supabase credentials. Please complete this setup now.**
