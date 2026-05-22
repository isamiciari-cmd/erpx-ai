# Deploy ERPX-AI to Vercel with GoDaddy Domain

## 🚀 Step-by-Step Deployment Guide

### **STEP 1: Create Vercel Account (2 minutes)**

1. Go to **https://vercel.com**
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"** or **"Continue with Email"**
4. Complete the signup process

---

### **STEP 2: Deploy Your App (5 minutes)**

**Method A: Deploy via CLI (Recommended)**

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to your project folder:
   ```bash
   cd /workspaces/default/code
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

4. Deploy:
   ```bash
   vercel --prod
   ```

5. Follow the prompts:
   - **Set up and deploy?** → Yes
   - **Which scope?** → Your account
   - **Link to existing project?** → No
   - **Project name?** → erpx-ai (or any name you want)
   - **Directory?** → Press Enter (current directory)
   - **Override settings?** → No

**Method B: Deploy via Web Dashboard (Easier)**

1. Go to **https://vercel.com/new**

2. Click **"Deploy from Terminal or Git"**

3. Drag and drop your **entire project folder** OR upload the `/dist` folder

4. Vercel will auto-detect settings and deploy

5. Wait 2-3 minutes for deployment to complete

6. You'll get a URL like: `https://erpx-ai.vercel.app`

---

### **STEP 3: Test Your Deployment (1 minute)**

1. Click on the deployment URL Vercel provided
2. Your ERPX-AI app should be live!
3. Test the Supabase connection at: `https://your-app.vercel.app/admin/supabase-diagnostic`

---

### **STEP 4: Connect Your GoDaddy Domain (5 minutes)**

#### **A. In Vercel Dashboard:**

1. Go to your project in Vercel
2. Click **"Settings"** → **"Domains"**
3. Click **"Add Domain"**
4. Enter your GoDaddy domain (e.g., `yourdomain.com`)
5. Vercel will show you DNS records to add

#### **B. In GoDaddy:**

1. Log into **https://godaddy.com**
2. Go to **"My Products"** → **"Domains"**
3. Click **"DNS"** next to your domain
4. Click **"Add"** to add new DNS records

**Add these records (Vercel will give you the exact values):**

**For root domain (yourdomain.com):**
- **Type:** A
- **Name:** @
- **Value:** `76.76.21.21` (Vercel's IP)
- **TTL:** 600

**For www subdomain (www.yourdomain.com):**
- **Type:** CNAME
- **Name:** www
- **Value:** `cname.vercel-dns.com`
- **TTL:** 600

5. Click **"Save"**

#### **C. Wait for DNS Propagation (5-30 minutes)**

- DNS changes can take 5-30 minutes to propagate
- Check status at: https://dnschecker.org
- Vercel will automatically issue SSL certificate once DNS is verified

---

### **STEP 5: Verify Everything Works**

1. Visit **https://yourdomain.com**
2. Your ERPX-AI app should load
3. Check SSL certificate (should show 🔒 in browser)
4. Test Supabase connection
5. Done! 🎉

---

## 📋 Important Notes

### **Environment Variables**

Your Supabase credentials are already configured in `vercel.json`. If you need to update them:

1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Add/Edit:
   - `VITE_SUPABASE_URL` = `https://svxmlejmhlocsjjtftxd.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = Your anon key

### **Custom Domain Configurations**

**Option 1: Root domain only (yourdomain.com)**
- Add A record pointing to Vercel

**Option 2: WWW only (www.yourdomain.com)**
- Add CNAME record for www
- Add redirect from root to www

**Option 3: Both (recommended)**
- Add both A and CNAME records
- Set one as primary, redirect the other

### **Automatic Deployments**

Every time you update your code:
```bash
vercel --prod
```

Or connect to GitHub for automatic deployments on every push.

---

## 🆘 Troubleshooting

**Problem: "Domain is not verified"**
- Solution: Wait 10-30 minutes for DNS to propagate

**Problem: "Build failed"**
- Solution: Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json

**Problem: "Environment variables not working"**
- Solution: Add them in Vercel Dashboard → Settings → Environment Variables
- Redeploy after adding variables

**Problem: "404 on page refresh"**
- Solution: Already configured in vercel.json (rewrites setting)

**Problem: "Supabase connection failed"**
- Solution: Verify environment variables are set correctly in Vercel

---

## 📊 Vercel Free Tier Limits

✅ **Included in Free Tier:**
- Unlimited deployments
- 100 GB bandwidth/month
- SSL certificates
- Custom domains
- Automatic HTTPS

❌ **Not Included (Requires Pro):**
- More than 100 GB bandwidth
- Team collaboration
- Advanced analytics

---

## 🔗 Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Documentation:** https://vercel.com/docs
- **GoDaddy DNS Management:** https://dcc.godaddy.com/manage/dns
- **DNS Propagation Checker:** https://dnschecker.org

---

## ✅ Deployment Checklist

- [ ] Vercel account created
- [ ] App deployed to Vercel
- [ ] Test deployment URL works
- [ ] Supabase connection tested
- [ ] GoDaddy DNS records added
- [ ] Custom domain connected
- [ ] SSL certificate issued
- [ ] Final testing on custom domain
- [ ] Share with users!

---

**Need help?** 
- Vercel Support: https://vercel.com/support
- Check deployment logs in Vercel dashboard
