# 📦 How to Download ERPX-AI Project

## Project Location

**Full Path:** `/workspaces/default/code`  
**Total Files:** 258 (excluding node_modules)  
**Size:** ~50-100 MB (without dependencies)

---

## Option 1: Download via Claude Code Interface ⭐ (Easiest)

**If you're using Claude Code Web or Desktop:**

1. Look for a **Download** / **Export** / **Save** button in the interface
2. Or try: **File Menu** → **Export Workspace** or **Download Project**
3. This should give you a complete `.zip` file with all code

**If you don't see this option, use Option 2 below.**

---

## Option 2: Create Archive File

I can create a compressed archive that you can download:

**Run this in your terminal where Claude Code is:**

```bash
cd /workspaces/default/code
tar -czf erpx-ai-project.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='.vite' \
  --exclude='.vercel' \
  .
```

This creates: `erpx-ai-project.tar.gz` (~10-20 MB)

**To extract it later:**

```bash
tar -xzf erpx-ai-project.tar.gz
```

---

## Option 3: Copy to Your Local Machine

**If you have terminal access to the Claude Code environment:**

```bash
# On Claude Code machine:
cd /workspaces/default/code
rsync -av --exclude='node_modules' --exclude='.git' . /path/to/your/local/erpx-ai/

# Or use scp:
scp -r /workspaces/default/code your-computer:/local/path/erpx-ai/
```

---

## Option 4: Manual Copy (If all else fails)

### Essential Files Checklist

Copy these files/folders **in this order**:

**1. Root Configuration (12 files)**

```
✅ package.json
✅ pnpm-lock.yaml
✅ tsconfig.json
✅ vite.config.ts
✅ index.html
✅ vercel.json
✅ .npmrc
✅ .env.example
✅ README.md
✅ DEPLOYMENT_WORKFLOW.md
✅ DEPLOYMENT_FIX_COMPLETE.md
✅ PUSH_TO_GITHUB_NOW.md
```

**2. Source Code Directory**

```
✅ src/ (entire folder - ~150 files)
   ├── main.tsx
   ├── lib/
   ├── services/
   ├── contexts/
   ├── hooks/
   ├── styles/
   └── app/
```

**3. Database Scripts**

```
✅ database/ (entire folder - ~10 files)
   ├── DEPLOY_TO_SUPABASE.sql
   ├── CREATE_ADMIN_USER.sql
   ├── CREATE_CASHIER_USER.sql
   ├── CREATE_SALES_TABLES.sql
   └── ADD_REGISTRATION_TABLES.sql
```

**4. Public Assets (if exists)**

```
✅ public/ (entire folder if it exists)
```

**5. Documentation (all .md files in root)**

---

## Option 5: Create ZIP Archive (Alternative)

```bash
cd /workspaces/default/code
zip -r erpx-ai-project.zip . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "dist/*" \
  -x ".vite/*" \
  -x ".vercel/*"
```

This creates: `erpx-ai-project.zip` (~10-20 MB)

---

## After Downloading

### 1. Extract Files

```bash
# If you got .tar.gz:
tar -xzf erpx-ai-project.tar.gz -C ~/Desktop/erpx-ai

# If you got .zip:
unzip erpx-ai-project.zip -d ~/Desktop/erpx-ai
```

### 2. Install Dependencies

```bash
cd ~/Desktop/erpx-ai
pnpm install
```

### 3. Create .env File

```bash
cp .env.example .env
# Then edit .env and add your Supabase anon key
```

### 4. Test Locally

```bash
pnpm dev
```

Open: http://localhost:5173

### 5. Push to GitHub

```bash
git init
git add .
git commit -m "Initial ERPX-AI commit"
git branch -M main
git remote add origin https://github.com/isamiciari-cmd/erpx-ai.git
git push -u origin main
```

---

## Minimum Required Files for Deployment

If you want to deploy with **minimal files**:

**Must Have:**

1. `package.json` - Dependencies
2. `tsconfig.json` - TypeScript config
3. `vite.config.ts` - Build config
4. `index.html` - Entry point
5. `src/` folder - All source code
6. `vercel.json` - Deployment config
7. `.env` - Environment variables

**After these, run:**

```bash
pnpm install  # Downloads dependencies
pnpm build    # Creates dist/ folder
```

---

## Verification Checklist

After downloading, verify you have:

```bash
✅ ls package.json          # Should exist
✅ ls src/main.tsx          # Should exist
✅ ls src/app/App.tsx       # Should exist
✅ ls database/*.sql        # Should show SQL files
✅ wc -l src/**/*.tsx       # Should show TypeScript files
```

---

## File Structure You Should See

```
erpx-ai/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── vercel.json
├── .env.example
├── README.md
├── src/
│   ├── main.tsx
│   ├── lib/
│   ├── services/
│   ├── contexts/
│   ├── hooks/
│   ├── styles/
│   └── app/
├── database/
│   └── *.sql files
└── public/
```

---

## Troubleshooting

### "No such file or directory"

→ You might be in the wrong directory. Navigate to `/workspaces/default/code` first.

### "Permission denied"

→ You don't have access to Claude Code's filesystem directly. Use the interface download option.

### "Archive too large"

→ Exclude node_modules (it's regenerated with `pnpm install` anyway).

### "Can't find download button"

→ Ask your Claude Code interface support how to export/download the workspace.

---

## Quick Commands Reference

**Create Archive:**

```bash
cd /workspaces/default/code
tar -czf ~/erpx-ai.tar.gz --exclude=node_modules --exclude=.git .
```

**Check Archive Contents:**

```bash
tar -tzf ~/erpx-ai.tar.gz | head -20
```

**Extract Archive:**

```bash
tar -xzf ~/erpx-ai.tar.gz -C ~/Desktop/erpx-ai
```

---

## What's NOT Included (On Purpose)

- ❌ `node_modules/` - Too large (500+ MB), regenerate with `pnpm install`
- ❌ `.git/` - Optional, you'll create new repo anyway
- ❌ `dist/` - Build output, regenerate with `pnpm build`
- ❌ `.vite/` - Cache, not needed
- ❌ `.vercel/` - Vercel cache, not needed

---

## Need Help?

**Tell me which method you want to use:**

1. "I found the download button" → Great! Just download and extract
2. "I need the archive command" → I'll give you exact commands
3. "I want to copy manually" → I'll list every single file path
4. "Something else" → Describe your setup and I'll help

**What's your setup?**

- Are you using Claude Code Web or Desktop?
- Do you have terminal access?
- What operating system (Windows/Mac/Linux)?

Let me know and I'll give you **exact step-by-step instructions** for your situation! 📦
