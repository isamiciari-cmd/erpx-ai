# 🔧 Developer Account Setup Guide

## Overview

This guide explains how to set up and use the developer test account with authentication bypass for ERPX-AI.

**Developer Account:**

- Email: `i.1122@erpx-ai.com`
- Password: `@12345`
- Role: Developer (full system access)

---

## ✅ Setup Steps

### Step 1: Enable Developer Mode in Environment

The developer bypass is already enabled in your `.env` file:

```env
VITE_DEV_AUTH_BYPASS=true
```

**Security Features:**

- ✅ Only works on `localhost` or `staging` domains
- ✅ Automatically disabled on production domain (`erpx-ai.com`)
- ✅ Shows visible warning badge when active
- ✅ No bypass in production - always requires real authentication

---

### Step 2: Create Auth User in Supabase

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your ERPX-AI project

2. **Navigate to Authentication:**
   - Click **Authentication** in left sidebar
   - Click **Users**

3. **Create New User:**
   - Click **"Add user"** → **"Create new user"**
   - Fill in the form:

   ```
   Email: i.1122@erpx-ai.com
   Password: @12345
   Auto Confirm User: ✅ (CHECK THIS BOX!)
   ```

4. **Save the User ID:**
   - After creating, you'll see the user in the list
   - Click on the user to view details
   - **COPY THE USER ID** (looks like: `123e4567-e89b-12d3-a456-426614174000`)
   - You'll need this in the next step

---

### Step 3: Create Developer Role and Profile

1. **Go to Supabase Dashboard → SQL Editor**

2. **Run the SQL Script:**
   - Open the file: `database/CREATE_DEVELOPER_USER.sql`
   - **IMPORTANT:** Replace `YOUR_USER_ID_HERE` in STEP 3 with the User ID you copied
   - Copy the entire SQL script
   - Paste into Supabase SQL Editor
   - Click **"Run"**

3. **Verify Success:**
   - You should see success messages
   - At the end, you'll see a table showing the developer user details
   - Should show: email, role: developer, full permissions

---

### Step 4: Restart Dev Server

**CRITICAL:** Environment variables are only loaded when the server starts.

```bash
# Stop the dev server (Ctrl+C)

# Start it again
pnpm dev
```

---

### Step 5: Test Developer Login

1. **Open the Login Page:**
   - http://localhost:5173/login

2. **You'll See Two Options:**

   **Option A: Developer Quick Login (Yellow Button)**
   - Click the yellow **"Developer Quick Login"** button
   - Automatically logs in with developer account
   - Redirects to `/admin/control-tower`

   **Option B: Manual Login (Blue Button)**
   - Enter email: `i.1122@erpx-ai.com`
   - Enter password: `@12345`
   - Click **"Sign In"**
   - Same result as quick login

3. **Check for Dev Mode Badge:**
   - After login, you should see a **yellow badge** in the top-right
   - Says: "Developer Mode Active - Auth Bypass Enabled"
   - This confirms dev bypass is working

---

## 🎯 Developer Role Permissions

The developer role has **full access** to everything:

### Finance Module

- ✅ View, create, edit, delete all finance data
- ✅ Manage budgets and reports
- ✅ Access all accounting features

### HR Module

- ✅ Manage employees
- ✅ Process payroll
- ✅ View HR reports

### Inventory & POS

- ✅ Manage products and inventory
- ✅ Process sales and refunds
- ✅ Open/close cashier shifts

### Admin Access

- ✅ User management
- ✅ Role management
- ✅ Company settings
- ✅ Branch management

### Developer-Specific

- ✅ Database access
- ✅ API testing
- ✅ View error logs
- ✅ Supabase diagnostic tools
- ✅ Debug pages

---

## 🔒 Security Features

### Production Protection

The developer bypass has **multiple layers of security:**

1. **Domain Check:**

   ```typescript
   const PRODUCTION_DOMAINS = ['erpx-ai.com', 'www.erpx-ai.com', 'app.erpx-ai.com'];
   ```
   - If running on any production domain, bypass is **automatically disabled**
   - Even if `VITE_DEV_AUTH_BYPASS=true`, it won't work on production

2. **Environment Variable:**
   - Must be explicitly enabled: `VITE_DEV_AUTH_BYPASS=true`
   - Default in `.env.example` is `false`

3. **Visual Indicator:**
   - Yellow badge shows when bypass is active
   - Impossible to miss in development
   - Never shows in production (bypass disabled)

4. **Real Authentication in Production:**
   - On production domain, **always** requires:
     - Valid Supabase authentication
     - Email verification
     - Active user account
   - No shortcuts or bypasses

---

## 🧪 Testing Workflow

### Local Development

```bash
# 1. Start dev server
pnpm dev

# 2. Open browser
http://localhost:5173/login

# 3. Click "Developer Quick Login"

# 4. Verify:
- ✅ Logged in successfully
- ✅ Yellow "Dev Mode" badge visible
- ✅ Redirected to /admin/control-tower
- ✅ Full access to all modules
```

### Staging Environment

Same as local, but:

- Domain must include "staging" or "dev"
- Example: `https://staging.erpx-ai.com`
- Dev bypass will work
- Badge will show

### Production Environment

```bash
# Domain: https://erpx-ai.com or https://app.erpx-ai.com

# What happens:
- ❌ "Developer Quick Login" button is hidden
- ❌ Dev bypass is disabled (even if env var is true)
- ✅ Only real authentication works
- ✅ Must use valid credentials
- ✅ No dev mode badge
```

---

## 🐛 Troubleshooting

### "Developer bypass is disabled on this environment"

**Cause:** Running on production domain or `VITE_DEV_AUTH_BYPASS` not set to `true`

**Fix:**

1. Check `.env` file: `VITE_DEV_AUTH_BYPASS=true`
2. Check domain: Must be `localhost` or include `staging`/`dev`
3. Restart dev server: `pnpm dev`

---

### "Developer account not found"

**Cause:** Developer user not created in Supabase

**Fix:**

1. Create auth user in Supabase Dashboard (Step 2)
2. Run `CREATE_DEVELOPER_USER.sql` with correct User ID (Step 3)
3. Verify user exists: Check the verification query at the end of the SQL script

---

### "Developer Quick Login" button not visible

**Cause:** Dev bypass not enabled or wrong environment

**Fix:**

1. Check `.env`: `VITE_DEV_AUTH_BYPASS=true`
2. Make sure you're on `localhost` (not production)
3. Restart dev server
4. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

### Yellow badge not showing after login

**Cause:** Dev mode not active

**Fix:**

1. Verify `.env` has `VITE_DEV_AUTH_BYPASS=true`
2. Check browser console for dev mode messages
3. Make sure you're on localhost
4. If on production domain, this is **expected** (badge never shows in production)

---

## 📝 Environment Configuration

### Development (.env)

```env
VITE_SUPABASE_URL=https://svxmlejmhlocsjjtftxd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:3000/api
VITE_ENV=development
VITE_DEV_AUTH_BYPASS=true
```

### Staging (.env.staging)

```env
VITE_SUPABASE_URL=https://svxmlejmhlocsjjtftxd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=https://api-staging.erpx-ai.com/api
VITE_ENV=staging
VITE_DEV_AUTH_BYPASS=true
```

### Production (.env.production)

```env
VITE_SUPABASE_URL=https://svxmlejmhlocsjjtftxd.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=https://api.erpx-ai.com/api
VITE_ENV=production
VITE_DEV_AUTH_BYPASS=false
```

**Note:** Even if you accidentally set `VITE_DEV_AUTH_BYPASS=true` in production, the domain check will **always** disable it.

---

## 🚀 Quick Reference

| Environment    | Domain              | Dev Bypass  | Yellow Badge | Quick Login Button |
| -------------- | ------------------- | ----------- | ------------ | ------------------ |
| **Local**      | localhost           | ✅ Enabled  | ✅ Shows     | ✅ Visible         |
| **Staging**    | staging.erpx-ai.com | ✅ Enabled  | ✅ Shows     | ✅ Visible         |
| **Production** | erpx-ai.com         | ❌ Disabled | ❌ Hidden    | ❌ Hidden          |

---

## 📞 Support

**If you're stuck:**

1. Check this guide first
2. Review the troubleshooting section
3. Check browser console for error messages
4. Verify Supabase user was created
5. Make sure `.env` file is configured correctly
6. Restart dev server after any `.env` changes

**Remember:**

- Developer bypass is a **testing feature** only
- It's **completely disabled** in production
- It's **safe to use** in development
- The yellow badge is your **visual confirmation** it's active

---

## ✅ Summary

1. ✅ Dev bypass enabled in `.env`: `VITE_DEV_AUTH_BYPASS=true`
2. ✅ Auth user created in Supabase: `i.1122@erpx-ai.com`
3. ✅ Developer role and profile created via SQL
4. ✅ Dev server restarted to load env vars
5. ✅ Yellow "Developer Quick Login" button appears on login page
6. ✅ After login, yellow badge shows dev mode is active
7. ✅ Full access to all modules and debugging tools
8. ✅ Automatically disabled on production domains

**You're ready to test! 🎉**
