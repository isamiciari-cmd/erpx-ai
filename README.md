# ERPX - Enterprise Resource Planning System

**Complete Multi-Tenant SaaS ERP Platform with AI-Powered Automation**

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Development server is already running
# Access via preview surface in Figma Make
```

## 📦 What's Included

This archive contains the complete source code for ERPX, including:

### Core Application
- ✅ React 18.3.1 + TypeScript
- ✅ React Router 7.13.0 for navigation
- ✅ Motion (Framer Motion) for animations
- ✅ Tailwind CSS v4 for styling
- ✅ Recharts 2.15.2 for data visualization
- ✅ Lucide React for icons

### Features Implemented

#### 🔐 Authentication & Access Control
- Splash screen with animated logo
- Login page with glassmorphism design
- Role-based access control (RBAC)
- 5 user roles: super_admin, admin, tenant_admin, user, viewer

#### 💰 Finance Module
- Chart of Accounts (hierarchical tree)
- Multi-currency invoicing (SAR, USD, EUR, GBP)
- Expense tracking and categorization
- Real-time currency converter
- ZATCA e-invoicing compliance (Saudi Arabia)
  - UBL XML generation
  - ECDSA digital signatures
  - QR code generation (TLV format)

#### 👥 HR Module
- Employee management (CRUD)
- Contract tracking (start/end dates)
- Department management
- Salary tracking
- Total payroll calculation

#### 📦 Operations
- **Inventory Management**
  - SKU tracking
  - Stock movements (IN/OUT/TRANSFER)
  - Min quantity alerts
  - Location tracking
  
- **POS Terminal**
  - Full-screen restaurant POS
  - Menu grid with categories
  - Shopping cart with quantity controls
  - Payment processing
  - Integration with Finance, Inventory, HR

#### 🏢 Multi-Tenant SaaS Admin

**Control Tower** - Central command center:
- Real-time system health monitoring
- MRR tracking and revenue analytics
- Active tenants overview
- AI-powered insights and alerts

**Tenant Management**:
- Multi-tenant CRUD operations
- Subscription plans (Basic, Pro, Enterprise)
- Domain-based routing (tenant.erpx.sa)
- Status management (active, suspended, expired)

**ERPX Studio** - Low-Code Builder:
- AI-powered module generation
- Dynamic field designer (7 field types)
- Workflow rules engine
- Permission designer
- Live form preview

**Billing & Subscriptions**:
- Self-service pricing page
- Stripe integration (simulated)
- Webhook event handling
- Usage tracking with plan-based limits

**Automation Engine**:
- 4 pre-configured automation rules
- Auto-suspend after payment failure
- Upgrade suggestions based on usage
- Churn risk detection
- Revenue drop alerts

**Analytics & Monitoring**:
- SaaS metrics dashboard (MRR, churn, growth)
- Usage tracking per tenant
- Module marketplace
- System health monitor (6 services)

#### 🤖 AI Features
- **AI Prediction Card** - Revenue forecasting with 78% confidence
- **Smart Alerts** - Anomaly detection (drops, spikes, below average)
- **AI Assistant** - Interactive chatbot with smart responses
- **AI Decision Engine** - Strategic recommendations with 92% confidence
- **Voice Control** - Navigate using voice commands (Web Speech API)

#### 📊 Dashboard
- Real-time KPIs with live updates
- Revenue and orders charts
- Live/Pause toggle for data updates
- ERP modules overview
- All AI features integrated

## 📁 Project Structure

```
src/app/
├── App.tsx                          # Main router
├── layout/
│   ├── MainLayout.tsx              # Layout wrapper
│   ├── Sidebar.tsx                 # Collapsible navigation
│   └── Topbar.tsx                  # Top bar with search
├── components/
│   ├── Splash.tsx                  # Animated splash screen
│   ├── Login.tsx                   # Login with glassmorphism
│   ├── Card.tsx                    # Reusable KPI card
│   ├── PredictionCard.tsx          # AI forecasting
│   ├── SmartAlerts.tsx             # Anomaly detection
│   ├── VoiceControl.tsx            # Voice navigation
│   ├── AIAssistant.tsx             # Chatbot
│   ├── AIDecisionEngine.tsx        # Strategic AI
│   └── SubscriptionManager.tsx     # Subscription controls
├── pages/
│   ├── DashboardPage.tsx           # Main dashboard
│   ├── FinancePage.tsx             # Expenses
│   ├── InvoicingPage.tsx           # Invoices
│   ├── ChartOfAccountsPage.tsx     # Accounting
│   ├── CurrencyPage.tsx            # Exchange rates
│   ├── ZATCAPage.tsx               # Saudi e-invoicing
│   ├── EmployeesPage.tsx           # HR management
│   ├── POSPage.tsx                 # Point of sale
│   ├── InventoryPage.tsx           # Stock management
│   ├── TenantManagementPage.tsx    # Multi-tenant admin
│   ├── StudioPage.tsx              # Low-code builder
│   ├── PricingPage.tsx             # Public pricing
│   ├── SaaSMetricsPage.tsx         # Analytics
│   ├── UsageTrackingPage.tsx       # Usage limits
│   ├── WebhookSimulatorPage.tsx    # Stripe webhooks
│   ├── ControlTowerPage.tsx        # Command center
│   ├── AutomationRulesPage.tsx     # Automation UI
│   └── GenericPage.tsx             # Placeholder
└── services/
    ├── AutomationEngine.ts         # Automation logic
    └── PermissionsManager.ts       # RBAC system
```

## 🎨 Design System

- **Theme**: Dark mode with neon blue accents
- **Effects**: Glassmorphism, gradients, shadows
- **Animations**: Smooth transitions with Motion
- **Typography**: System fonts with custom weights
- **Colors**: Blue/Cyan primary, Purple/Pink accents

## 🔧 Technology Stack

### Frontend
- React 18.3.1
- TypeScript
- React Router 7.13.0
- Motion 12.23.24 (Framer Motion)
- Tailwind CSS 4.1.12
- Recharts 2.15.2
- Lucide React 0.487.0

### Backend Architecture (Entities)
- TypeORM entities
- Multi-tenant database with schema isolation
- Stripe integration
- Mock APIs with setTimeout simulation

## 🌐 Routes

### Public
- `/pricing` - Self-service signup

### Authenticated
- `/` - Dashboard
- `/finance/accounting` - Chart of Accounts
- `/finance/invoicing` - Invoices
- `/finance/expenses` - Transactions
- `/finance/currency` - Exchange rates
- `/finance/zatca` - E-invoicing
- `/crm` - CRM (placeholder)
- `/sales` - Sales pipeline (placeholder)
- `/pos` - POS Terminal
- `/subscriptions` - Subscriptions (placeholder)
- `/inventory` - Stock management
- `/purchase` - Purchase orders (placeholder)
- `/hr/employees` - Employee management
- `/hr/payroll` - Payroll (placeholder)
- `/projects` - Projects (placeholder)

### Admin (Super Admin Only)
- `/admin/control-tower` - Command center
- `/admin/tenants` - Tenant management
- `/admin/studio` - Low-code builder
- `/admin/metrics` - SaaS analytics
- `/admin/usage` - Usage tracking
- `/admin/automation` - Automation rules
- `/admin/webhooks` - Webhook simulator
- `/settings` - Settings (placeholder)

## 🔐 Security & Permissions

### Roles
1. **super_admin** - Full platform control
2. **admin** - Platform management (no shutdown)
3. **tenant_admin** - Manages own tenant
4. **user** - Basic workspace access
5. **viewer** - Read-only monitoring

### Permissions
- tenants.manage / tenants.view
- billing.manage / billing.view
- modules.manage / modules.view
- system.shutdown / system.monitor
- users.manage / users.view
- analytics.view
- webhooks.manage

## 💾 Data Models

### Multi-Tenant
```typescript
interface Tenant {
  id: number;
  name: string;
  domain: string; // company.erpx.sa
  plan: "Basic" | "Pro" | "Enterprise";
  status: "active" | "suspended" | "expired";
  stripeCustomerId: string;
}
```

### Subscription
```typescript
interface Subscription {
  id: number;
  tenantId: number;
  planId: number;
  status: "active" | "canceled" | "past_due";
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}
```

### Usage Tracking
```typescript
interface UsageLog {
  id: number;
  tenantId: number;
  module: string;
  action: string;
  timestamp: Date;
}
```

## 🤖 Automation Rules

1. **Auto-suspend unpaid tenant**
   - Condition: Payment failed ≥ 3 times
   - Action: Suspend tenant + Notify admin

2. **Suggest plan upgrade**
   - Condition: Usage > 80% AND plan = Basic
   - Action: Send upgrade email

3. **Detect churn risk**
   - Condition: Usage < 20%
   - Action: Send engagement email + Alert admin

4. **Alert on revenue drop**
   - Condition: Revenue drop ≥ 20%
   - Action: Notify admin immediately

## 📈 Integration Flow

```
POS Order
   ↓
Finance (Record Revenue)
   ↓
Inventory (Deduct Stock)
   ↓
HR (Track Activity + Commission)
```

## 🎯 Subscription Plans

### Basic - SAR 299/month
- 10 users
- Finance & Invoicing
- Basic CRM
- 10GB storage
- Email support

### Pro - SAR 999/month
- 50 users
- All Basic features
- HR & Payroll
- Inventory Management
- 100GB storage
- Priority support
- API access

### Enterprise - Custom Pricing
- Unlimited users
- All Pro features
- White-label solution
- Unlimited storage
- 24/7 dedicated support
- On-premise deployment
- SLA guarantee

## 🚀 Deployment

This is a Figma Make project. The Vite dev server is already running.

**Important Notes**:
- Do NOT run `vite build` manually
- Do NOT create `index.html`
- Preview updates automatically
- No localhost URLs available

## 📚 Documentation

See `ARCHITECTURE.md` for detailed system architecture, entity models, and integration flows.

## 🛠️ Development

- All modules use mock APIs with setTimeout
- Real-time updates simulated with setInterval
- Stripe integration is simulated (no real API calls)
- Voice control requires Chrome/Edge browser
- AI responses are rule-based (not real AI)

## 📝 License

Private project - All rights reserved

---

**Built with Claude Code** 🤖
Version: 1.0.0
Date: April 26, 2026
