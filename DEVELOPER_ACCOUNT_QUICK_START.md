# ⚡ Developer Account - Quick Start (5 Minutes)

## 🎯 What You Need to Do

Follow these 4 steps to enable developer quick login:

---

## Step 1: Create Auth User in Supabase (2 minutes)

1. Go to: **https://supabase.com/dashboard**
2. Select your ERPX-AI project
3. Click **Authentication** → **Users**
4. Click **"Add user"** → **"Create new user"**
5. Fill in:
   ```
   Email: i.1122@erpx-ai.com
   Password: @12345
   Auto Confirm User: ✅ (IMPORTANT - CHECK THIS!)
   ```
6. Click **"Create user"**
7. **COPY THE USER ID** - looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

---

## Step 2: Create Developer Profile (1 minute)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New query"**
3. Open the file: `database/CREATE_DEVELOPER_USER.sql`
4. **Find this line in STEP 3:**
   ```sql
   v_auth_user_id UUID := 'YOUR_USER_ID_HERE'; -- REPLACE THIS!
   ```
5. **Replace** `YOUR_USER_ID_HERE` with the User ID you copied
6. **Copy the ENTIRE SQL script**
7. **Paste** into Supabase SQL Editor
8. Click **"Run"**

**Expected result:**

```
✓ Developer role created successfully
✓ Developer user profile created successfully
```

---

## Step 3: Restart Dev Server (30 seconds)

```bash
# Stop the server
Press Ctrl+C

# Start it again
pnpm dev
```

**Why?** Environment variables are only loaded when server starts.

---

## Step 4: Test Login (30 seconds)

1. Open: **http://localhost:5173/login**
2. You'll see a **yellow button**: "Developer Quick Login"
3. Click it
4. You should be logged in and redirected to `/admin/control-tower`
5. Look for the **yellow badge** in top-right: "Developer Mode Active"

---

## ✅ Success Checklist

After completing all steps, verify:

- ✅ Yellow "Developer Quick Login" button appears on login page
- ✅ Clicking it logs you in automatically
- ✅ Yellow "Dev Mode" badge shows after login
- ✅ You're redirected to admin dashboard
- ✅ You have access to all modules

---

## 🔒 Security Notes

**Don't worry about security:**

1. ✅ Dev bypass **only works on localhost**
2. ✅ Automatically **disabled on production** (erpx-ai.com)
3. ✅ Yellow badge **warns you** when it's active
4. ✅ Production **always requires** real authentication

**Even if you deploy with `VITE_DEV_AUTH_BYPASS=true`, it won't work on production domains.**

---

## 🐛 Troubleshooting

### Button not showing?

1. Check `.env` has: `VITE_DEV_AUTH_BYPASS=true` ✅ (Already set)
2. Restart dev server: `pnpm dev`
3. Hard refresh browser: `Ctrl+Shift+R`

### "Developer account not found" error?

1. Make sure you created the auth user in Supabase Dashboard
2. Make sure you replaced `YOUR_USER_ID_HERE` with the real User ID
3. Run the SQL script again

### Still stuck?

See full guide: `DEVELOPER_ACCOUNT_SETUP.md`

---

## 📋 Quick Reference

| Action                 | Command/URL                       |
| ---------------------- | --------------------------------- |
| **Supabase Dashboard** | https://supabase.com/dashboard    |
| **Create Auth User**   | Authentication → Users → Add user |
| **SQL Editor**         | SQL Editor → New query            |
| **Dev Server**         | `pnpm dev`                        |
| **Login Page**         | http://localhost:5173/login       |
| **Developer Email**    | i.1122@erpx-ai.com                |
| **Developer Password** | @12345                            |

---

## 🎉 You're Done!

After completing these 4 steps, you can use the yellow "Developer Quick Login" button for instant access during development and testing.

**Total time: ~5 minutes** ⏱️
