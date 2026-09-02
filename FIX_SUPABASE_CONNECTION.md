# 🔧 Fix "Failed to fetch" Error

## Problem

The app is trying to connect to Supabase but doesn't have valid credentials.

## Solution

### Step 1: Get Your Supabase Anon Key

1. Go to: https://supabase.com/dashboard
2. Select your ERPX-AI project
3. Go to: **Settings** → **API**
4. Find the **Project URL** section - should show: `https://svxmlejmhlocsjjtftxd.supabase.co`
5. Scroll down to **Project API keys**
6. Copy the **`anon` `public`** key (NOT the service_role key!)
   - It's a long string starting with `eyJ...`

### Step 2: Add the Key to .env File

1. Open the `.env` file in this project
2. Replace `YOUR_ANON_KEY_HERE` with your actual anon key
3. The file should look like this:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://svxmlejmhlocsjjtftxd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eG1sZWptaGxvY3NqanRmdHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODg1NzI4MDAsImV4cCI6MjAwNDE0ODgwMH0.YOUR_SIGNATURE_HERE

# API Configuration
VITE_API_URL=http://localhost:3000/api
VITE_ENV=development
```

### Step 3: Restart the Dev Server

**IMPORTANT:** Environment variables are only loaded when the dev server starts.

1. Stop the current dev server (Ctrl+C in terminal)
2. Restart it:
   ```bash
   pnpm dev
   ```

### Step 4: Test the Connection

1. Go to: http://localhost:5173/login
2. Try to login with: `admin-1@erpx-ai.com` / `@12345@`
3. Should now connect successfully!

---

## Alternative: Quick Test (If You Don't Have the Anon Key Yet)

If you can't find your anon key right now, you can test with demo mode:

1. Open `.env` and set:

   ```env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   ```

   (Leave them empty)

2. The app will run in demo mode with mock data

But you MUST add real credentials for production!

---

## For Production (Vercel)

You also need to set these in Vercel:

1. Go to: https://vercel.com/dashboard
2. Select your erpx-ai project
3. Settings → Environment Variables
4. Add:
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://svxmlejmhlocsjjtftxd.supabase.co`
   - **Environments:** Production, Preview, Development

5. Add:
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** [Your anon key from Supabase]
   - **Environments:** Production, Preview, Development

6. Redeploy your site

---

## Still Having Issues?

### Check if Supabase Project is Active

1. Go to: https://supabase.com/dashboard
2. Make sure your project is not paused
3. Check if you can see the "Tables" tab and your database tables

### Check CORS Settings

1. In Supabase Dashboard
2. Go to: Settings → API → CORS
3. Make sure these are allowed:
   - `http://localhost:5173` (development)
   - `https://erpx-ai.com` (production)
   - `https://*.vercel.app` (Vercel preview)

### Check Site URL

1. In Supabase Dashboard
2. Go to: Authentication → URL Configuration
3. Set **Site URL** to: `https://erpx-ai.com`
4. Add **Redirect URLs:**
   - `http://localhost:5173/**`
   - `https://erpx-ai.com/**`
   - `https://*.vercel.app/**`

---

**After fixing, the error should be gone! 🎉**
