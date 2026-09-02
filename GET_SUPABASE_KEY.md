# 🔑 How to Get Your Supabase Anon Key

## The Problem

Your `.env` file currently has:

```env
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

This is **NOT a real key** - it's just a placeholder!

---

## Quick Fix (2 Minutes)

### Step 1: Get Your Real Anon Key

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Login if needed

2. **Select Your Project:**
   - Find your ERPX-AI project
   - Click on it

3. **Navigate to API Settings:**
   - Click **Settings** (⚙️ icon in left sidebar)
   - Click **API**

4. **Copy the Anon Key:**
   - Scroll down to **"Project API keys"** section
   - You'll see two keys:
     - ✅ `anon` `public` - **COPY THIS ONE**
     - ❌ `service_role` - **DO NOT USE THIS**
   - Click the **Copy** button next to the anon key

**What the anon key looks like:**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
(long string, about 200+ characters)
```

---

### Step 2: Update .env File

**Option A: I'll Update It (Give Me the Key)**

Reply with: "Here's my anon key: [paste the key]"

Then I'll update the .env file for you.

**Option B: Update It Yourself**

1. Open `.env` file in this project
2. Find the line: `VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE`
3. Replace `YOUR_ANON_KEY_HERE` with your actual key
4. Save the file

**Should look like:**

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://svxmlejmhlocsjjtftxd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBh...

# API Configuration
VITE_API_URL=http://localhost:3000/api
VITE_ENV=development
```

---

### Step 3: Restart Dev Server

**CRITICAL:** Environment variables are only loaded when the server starts!

1. **Stop the current dev server:**
   - Press `Ctrl+C` in the terminal

2. **Start it again:**

   ```bash
   pnpm dev
   ```

3. **Wait for:** "Local: http://localhost:5173"

---

### Step 4: Test

1. **Open:** http://localhost:5173
2. **Try to login:**
   - Email: `admin-1@erpx-ai.com`
   - Password: `@12345@`
3. **Should work now!** ✅

---

## Troubleshooting

### "I can't find the anon key"

**Make sure you're looking at the right place:**

1. Supabase Dashboard → Your Project
2. Settings (not Database, not Authentication)
3. API (not General, not Auth)
4. Scroll down to "Project API keys"
5. The anon key is the FIRST one (labeled `anon` `public`)

### "Still getting Failed to fetch"

**Checklist:**

1. ✅ Did you copy the **anon** key (not service_role)?
2. ✅ Did you paste it in `.env` file?
3. ✅ Did you **restart the dev server**? (Very important!)
4. ✅ Did you refresh the browser?

### "The key is too long / doesn't fit"

**That's normal!** The anon key is 200+ characters. Just paste the whole thing on one line:

```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eG1sZWptaGxvY3NqanRmdHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODg1NzI4MDAsImV4cCI6MjAwNDE0ODgwMH0.your_very_long_signature_here_continues
```

### "I don't have a Supabase project yet"

1. Go to: https://supabase.com
2. Click "Start your project"
3. Create new project
4. Wait for it to initialize (~2 minutes)
5. Then follow steps above to get anon key

---

## Quick Copy-Paste Template

Once you have your anon key, here's the complete .env file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://svxmlejmhlocsjjtftxd.supabase.co
VITE_SUPABASE_ANON_KEY=[PASTE YOUR ANON KEY HERE]

# API Configuration
VITE_API_URL=http://localhost:3000/api
VITE_ENV=development
```

---

## Security Note

**The anon key is safe to expose in frontend code.**

- ✅ Anon key: Safe for client-side (browser) use
- ❌ Service role key: NEVER expose in frontend

Row Level Security (RLS) in Supabase protects your data even with the anon key exposed.

---

## After Fixing

Once you add the real anon key and restart:

1. ✅ Login page will work
2. ✅ Data will load from Supabase
3. ✅ No more "Failed to fetch" errors
4. ✅ You can test the cashier POS system
5. ✅ Ready to deploy to production

---

## Need Help?

**Tell me:**

1. Did you find the anon key in Supabase dashboard?
2. Do you want me to update the .env file? (Give me the key)
3. Are you stuck on a specific step?

**I'll help you fix this in the next 2 minutes!** 🔑
