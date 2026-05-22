# ERPX Source Code - File Manifest

## 📦 Archive Information

**File**: `erpx-complete-source.tar.gz`  
**Size**: 97 KB compressed  
**Total Files**: 99  
**Created**: April 26, 2026  

## 📋 Contents

### 📄 Root Files
```
├── package.json                    # Dependencies and scripts
├── README.md                       # Complete documentation
├── ARCHITECTURE.md                 # System architecture guide
└── FILE_MANIFEST.md               # This file
```

### 🎨 Styles (src/styles/)
```
src/styles/
├── tailwind.css                   # Tailwind v4 configuration
├── index.css                      # Global styles
├── fonts.css                      # Font imports
└── theme.css                      # Theme tokens and variables
```

### 🧩 UI Components (src/app/components/ui/)
```
src/app/components/ui/
├── accordion.tsx                  # Collapsible sections
├── alert-dialog.tsx              # Modal dialogs
├── alert.tsx                     # Alert notifications
├── avatar.tsx                    # User avatars
├── badge.tsx                     # Status badges
├── button.tsx                    # Button component
├── calendar.tsx                  # Date picker
├── card.tsx                      # Card container
├── carousel.tsx                  # Image carousel
├── chart.tsx                     # Chart wrapper
├── checkbox.tsx                  # Checkbox input
├── command.tsx                   # Command palette
├── context-menu.tsx              # Right-click menu
├── dialog.tsx                    # Dialog modals
├── dropdown-menu.tsx             # Dropdown menus
├── form.tsx                      # Form components
├── input.tsx                     # Text inputs
├── label.tsx                     # Form labels
├── popover.tsx                   # Popovers
├── progress.tsx                  # Progress bars
├── select.tsx                    # Select dropdowns
├── separator.tsx                 # Dividers
├── sheet.tsx                     # Side panels
├── slider.tsx                    # Range sliders
├── switch.tsx                    # Toggle switches
├── table.tsx                     # Data tables
├── tabs.tsx                      # Tab navigation
├── textarea.tsx                  # Multi-line text
├── toast.tsx                     # Toast notifications
└── tooltip.tsx                   # Tooltips
```

### 🎯 Core Components (src/app/components/)
```
src/app/components/
├── Splash.tsx                    # Animated splash screen (3s timer)
├── Login.tsx                     # Login page with glassmorphism
├── Card.tsx                      # Reusable KPI card component
├── PredictionCard.tsx            # AI revenue forecasting card
├── SmartAlerts.tsx               # Anomaly detection alerts
├── VoiceControl.tsx              # Voice navigation (Web Speech API)
├── AIAssistant.tsx               # Interactive chatbot
├── AIDecisionEngine.tsx          # Strategic AI recommendations
├── SubscriptionManager.tsx       # Subscription controls
└── figma/
    └── ImageWithFallback.tsx     # Image component with fallback
```

### 🏗️ Layout Components (src/app/layout/)
```
src/app/layout/
├── MainLayout.tsx                # Main layout wrapper (Sidebar + Topbar + Content)
├── Sidebar.tsx                   # Collapsible navigation sidebar
└── Topbar.tsx                    # Top bar with search and notifications
```

### 📄 Pages - Finance Module (src/app/pages/)
```
Finance Pages:
├── FinancePage.tsx               # Expense tracking (Income/Expense transactions)
├── InvoicingPage.tsx             # Multi-currency invoicing (SAR, USD, EUR, GBP)
├── ChartOfAccountsPage.tsx       # Hierarchical accounting (Assets, Liabilities, etc.)
├── CurrencyPage.tsx              # Real-time currency converter
└── ZATCAPage.tsx                 # Saudi e-invoicing (UBL XML + ECDSA + QR codes)
```

### 📄 Pages - HR Module
```
HR Pages:
└── EmployeesPage.tsx             # Employee CRUD, contracts, departments, salaries
```

### 📄 Pages - Operations Module
```
Operations Pages:
├── POSPage.tsx                   # Full-screen POS terminal (Restaurant/Retail)
└── InventoryPage.tsx             # Stock management (IN/OUT/TRANSFER movements)
```

### 📄 Pages - Admin & SaaS Module
```
Admin Pages:
├── TenantManagementPage.tsx      # Multi-tenant CRUD, plans, domains
├── StudioPage.tsx                # Low-code module builder with AI
├── PricingPage.tsx               # Public self-service pricing page
├── SaaSMetricsPage.tsx           # MRR, churn, growth analytics
├── UsageTrackingPage.tsx         # Module usage monitoring per tenant
├── WebhookSimulatorPage.tsx      # Stripe webhook event simulator
├── ControlTowerPage.tsx          # Central admin command center
└── AutomationRulesPage.tsx       # Automation engine UI
```

### 📄 Pages - Dashboard & Generic
```
Dashboard & Other:
├── DashboardPage.tsx             # Main dashboard with real-time KPIs
└── GenericPage.tsx               # Placeholder for unimplemented modules
```

### 🛠️ Services (src/app/services/)
```
src/app/services/
├── AutomationEngine.ts           # 4 automation rules + utilities
│   ├── Auto-suspend unpaid tenant
│   ├── Suggest plan upgrade
│   ├── Detect churn risk
│   └── Alert on revenue drop
│
└── PermissionsManager.ts         # RBAC system
    ├── 5 roles (super_admin, admin, tenant_admin, user, viewer)
    └── 12 permissions
```

### 📱 Main Application
```
src/app/
└── App.tsx                       # Main router with authentication flow
```

## 📊 File Statistics

### By Category
- **Pages**: 18 files (~15,000 lines)
- **Components**: 13 core + 30 UI (~8,000 lines)
- **Layout**: 3 files (~400 lines)
- **Services**: 2 files (~400 lines)
- **Styles**: 4 files (~200 lines)
- **Config**: 1 file (package.json)
- **Docs**: 3 files (README, ARCHITECTURE, MANIFEST)

### Technology Breakdown
- **React Components**: 64 files
- **TypeScript**: 100% type-safe
- **Mock APIs**: 15+ simulated backends
- **Total Lines of Code**: ~24,000 lines

## 🎯 Key Features by File

### Authentication & Security
- `Login.tsx` - Mock authentication with localStorage
- `Splash.tsx` - 3-second animated loading screen
- `PermissionsManager.ts` - Role-based access control

### Finance Features
- `ZATCAPage.tsx` - Saudi e-invoicing compliance
  - UBL XML generation
  - ECDSA digital signatures
  - QR code generation (TLV format)
- `InvoicingPage.tsx` - Multi-currency invoices
- `ChartOfAccountsPage.tsx` - Hierarchical accounts
- `CurrencyPage.tsx` - Real-time exchange rates

### SaaS Admin Features
- `ControlTowerPage.tsx` - Command center
  - System health monitoring
  - AI insights
  - Revenue analytics
  - Module marketplace
- `AutomationEngine.ts` - Business logic automation
- `TenantManagementPage.tsx` - Multi-tenant management
- `StudioPage.tsx` - Low-code builder

### AI Features
- `AIAssistant.tsx` - Chatbot with smart responses
- `AIDecisionEngine.tsx` - Strategic recommendations
- `PredictionCard.tsx` - Revenue forecasting
- `SmartAlerts.tsx` - Anomaly detection
- `VoiceControl.tsx` - Voice navigation

### Data Visualization
- `DashboardPage.tsx` - Real-time charts (Recharts)
- `SaaSMetricsPage.tsx` - SaaS analytics
- `UsageTrackingPage.tsx` - Usage monitoring

## 📦 How to Extract

```bash
# Extract the archive
tar -xzf erpx-complete-source.tar.gz

# Navigate to project
cd src/app

# Install dependencies
pnpm install

# Development server runs automatically in Figma Make
```

## 🔍 Finding Specific Features

### Need to find...
- **Authentication logic**: `src/app/components/Login.tsx`
- **Routing setup**: `src/app/App.tsx`
- **Navigation menu**: `src/app/layout/Sidebar.tsx`
- **AI chatbot**: `src/app/components/AIAssistant.tsx`
- **Multi-tenant logic**: `src/app/pages/TenantManagementPage.tsx`
- **Automation rules**: `src/app/services/AutomationEngine.ts`
- **RBAC permissions**: `src/app/services/PermissionsManager.ts`
- **Saudi e-invoicing**: `src/app/pages/ZATCAPage.tsx`
- **POS terminal**: `src/app/pages/POSPage.tsx`
- **Low-code builder**: `src/app/pages/StudioPage.tsx`

## 📝 Notes

1. All API calls are **mock/simulated** using setTimeout
2. Stripe integration is **simulated** (no real API calls)
3. Real-time updates use setInterval for demo purposes
4. Voice control requires **Chrome or Edge** browser
5. AI responses are **rule-based**, not real AI/ML
6. Multi-tenant uses **mock database** with in-memory storage

## 🚀 Next Steps

1. Extract the archive
2. Review `README.md` for full documentation
3. Check `ARCHITECTURE.md` for system design
4. Explore `src/app/pages/` for main features
5. Review `src/app/services/` for business logic

---

**Archive Version**: 1.0.0  
**Generated**: April 26, 2026  
**Total Size**: 97 KB (compressed), ~2.5 MB (uncompressed)
