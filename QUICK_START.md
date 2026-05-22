# 🚀 ERPX Quick Start Guide

## 📦 You Just Received

**File**: `erpx-complete-source.tar.gz` (99 KB)  
**Location**: `/workspaces/default/code/erpx-complete-source.tar.gz`

## 🎯 What's Inside

✅ **Complete ERP System** - 18 modules, 64 components, 24,000+ lines of code  
✅ **Multi-Tenant SaaS** - Full admin platform with billing & automation  
✅ **AI Features** - Predictions, chatbot, voice control, decision engine  
✅ **Saudi Compliance** - ZATCA e-invoicing with UBL XML & QR codes  
✅ **Full Documentation** - Architecture guide, README, file manifest  

## 📂 Extract the Archive

```bash
# Navigate to your desired location
cd ~/projects

# Extract the archive
tar -xzf /workspaces/default/code/erpx-complete-source.tar.gz

# You'll get:
# ├── src/                  # All source code
# ├── package.json          # Dependencies
# ├── README.md             # Full documentation
# ├── ARCHITECTURE.md       # System design
# └── FILE_MANIFEST.md      # File listing
```

## 🏃 Run the Project

```bash
# Install dependencies
pnpm install

# Note: This is a Figma Make project
# The dev server runs automatically
# No need to run "npm run dev" or "vite"
```

## 📚 Documentation Files

### 1. **README.md** - Start Here!
- Complete feature list
- Technology stack
- All routes and pages
- Data models
- Development guide

### 2. **ARCHITECTURE.md** - System Design
- Entity models with TypeScript types
- Integration flows (POS → Finance → Inventory → HR)
- Multi-tenant architecture
- Automation rules
- RBAC system

### 3. **FILE_MANIFEST.md** - File Guide
- Complete file listing (99 files)
- What each file does
- Where to find specific features
- File statistics

## 🎯 Key Files to Explore

### Start with these:

1. **`src/app/App.tsx`**  
   Main router - See all routes and navigation flow

2. **`src/app/pages/DashboardPage.tsx`**  
   Main dashboard with real-time KPIs and AI features

3. **`src/app/pages/ControlTowerPage.tsx`**  
   Admin command center - SaaS platform overview

4. **`src/app/pages/ZATCAPage.tsx`**  
   Saudi e-invoicing - Most complex module

5. **`src/app/services/AutomationEngine.ts`**  
   Business logic automation - 4 smart rules

## 🗂️ Project Structure at a Glance

```
src/app/
├── App.tsx                      # ⭐ Main router
├── layout/                      # Layout components
│   ├── MainLayout.tsx
│   ├── Sidebar.tsx             # ⭐ Navigation menu
│   └── Topbar.tsx
├── components/                  # Reusable components
│   ├── Splash.tsx              # Splash screen
│   ├── Login.tsx               # Login page
│   ├── AIAssistant.tsx         # ⭐ AI Chatbot
│   ├── VoiceControl.tsx        # Voice navigation
│   └── ui/                     # 30+ UI components
├── pages/                       # Main pages
│   ├── DashboardPage.tsx       # ⭐ Dashboard
│   ├── ControlTowerPage.tsx    # ⭐ Admin center
│   ├── ZATCAPage.tsx           # ⭐ E-invoicing
│   ├── POSPage.tsx             # POS terminal
│   ├── StudioPage.tsx          # Low-code builder
│   └── [15 more pages]
└── services/                    # Business logic
    ├── AutomationEngine.ts     # ⭐ Automation
    └── PermissionsManager.ts   # RBAC
```

## 🎨 Features by Module

### 💰 Finance (5 pages)
- Chart of Accounts
- Multi-currency invoicing
- Expense tracking
- Currency exchange
- **ZATCA e-invoicing** ⭐

### 👥 HR (1 page)
- Employee management
- Contract tracking
- Payroll calculation

### 📦 Operations (2 pages)
- Inventory management
- **POS Terminal** ⭐

### 🏢 Admin SaaS (7 pages)
- **Control Tower** ⭐
- Tenant management
- **ERPX Studio** (Low-code builder) ⭐
- SaaS metrics
- Usage tracking
- Webhook simulator
- Automation rules

### 🤖 AI Features
- Revenue forecasting
- Anomaly detection
- **AI Chatbot** ⭐
- Strategic recommendations
- Voice navigation

## 🔑 Authentication Flow

```
Splash Screen (3 seconds)
   ↓
Login Page (any email/password works)
   ↓
Dashboard
```

## 🌐 Available Routes

### Public
- `/pricing` - Pricing page with signup

### Main App (After login)
- `/` - Dashboard
- `/finance/*` - Finance modules
- `/hr/employees` - HR management
- `/pos` - POS terminal
- `/inventory` - Stock management
- `/admin/*` - Admin pages (super admin only)

## 💡 Key Technologies

- **React 18.3.1** + TypeScript
- **React Router 7.13.0** for navigation
- **Motion** (Framer Motion) for animations
- **Tailwind CSS v4** for styling
- **Recharts** for data visualization
- **Lucide React** for icons

## 🔐 User Roles & Permissions

### Roles (in `services/PermissionsManager.ts`)
1. **super_admin** - Full platform access
2. **admin** - Platform management
3. **tenant_admin** - Manage own tenant
4. **user** - Basic access
5. **viewer** - Read-only

### Test with
Login with any credentials, system defaults to super_admin for demo.

## 🤖 Automation Rules (4 rules)

Configured in `services/AutomationEngine.ts`:

1. **Auto-suspend** - Suspend tenant after 3 failed payments
2. **Upgrade suggestion** - Send email when usage > 80%
3. **Churn detection** - Alert when usage < 20%
4. **Revenue alert** - Notify on 20% revenue drop

Test by running simulation in `/admin/automation`

## 📊 Data Flow Example

### POS Transaction Flow
```typescript
// src/app/pages/POSPage.tsx

1. Customer orders from menu
   ↓
2. POS creates order → Finance records income
   ↓
3. Inventory deducts stock → HR tracks commission
   ↓
4. Receipt generated with QR code
```

See integration in: `POSPage.tsx` lines 250-280

## 🎯 Common Tasks

### Add a new page?
1. Create file in `src/app/pages/YourPage.tsx`
2. Add route in `src/app/App.tsx`
3. Add menu item in `src/app/layout/Sidebar.tsx`

### Customize colors?
Edit `src/styles/theme.css` for design tokens

### Add new automation rule?
Edit `src/app/services/AutomationEngine.ts`

### Change permissions?
Edit `src/app/services/PermissionsManager.ts`

## 🐛 Important Notes

⚠️ **This is a demo/prototype**:
- All APIs are **mock** (no real backend)
- Data stored in **memory** (resets on refresh)
- Stripe is **simulated** (no real billing)
- AI is **rule-based** (not real ML)

✅ **Perfect for**:
- Understanding ERP architecture
- Learning React + TypeScript patterns
- Building real implementation on top
- Demonstrating to clients

## 🚀 Next Steps

1. ✅ Extract archive
2. ✅ Read README.md
3. ✅ Review ARCHITECTURE.md
4. ✅ Explore `src/app/pages/`
5. ✅ Run `pnpm install`
6. ✅ Start customizing!

## 📞 Questions?

- Check **README.md** for detailed docs
- See **ARCHITECTURE.md** for system design
- Browse **FILE_MANIFEST.md** for file locations
- Review source code comments (well-documented!)

## 🎉 You're Ready!

Your complete ERPX source code is ready to explore and customize.

**Happy coding!** 🚀

---

**ERPX v1.0.0** - Enterprise Resource Planning eXperience  
Built with React, TypeScript, and Claude Code
