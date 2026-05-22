# ERPX - Enterprise Resource Planning Platform

Complete multi-tenant SaaS ERP system with AI-powered automation and analytics.

## 🏗️ System Architecture

```
Client (Web/App)
   ↓
Auth + Tenant Resolver
   ↓
ERPX Core (Modules)
   ↓
Multi-Tenant Database
   ↓
Billing Service (Stripe)
```

## 📦 Core Modules

### 1. Finance Core
- **Chart of Accounts**: Hierarchical account tree (Assets, Liabilities, Revenue, Expense, Equity)
- **Invoicing**: Multi-currency invoices (SAR, USD, EUR, GBP) with line items
- **Expenses**: Transaction management with categorization
- **Currency Exchange**: Real-time converter with auto-updates
- **ZATCA E-Invoicing**: Saudi compliance with UBL XML, ECDSA signatures, QR codes

### 2. HR Core
- **Employees**: CRUD with contracts, departments, salaries
- **Attendance**: Check-in/out, overtime tracking
- **Leaves**: Request/approval workflow
- **Payroll**: Automated salary calculation integrated with Finance

### 3. Inventory Core
- **Stock Management**: SKU tracking, quantities, locations
- **Movement Recording**: IN/OUT/TRANSFER with references
- **Min Quantity Alerts**: Auto-detect low/out-of-stock
- **Integration**: Connected to POS and Purchase Orders

### 4. Sales Core
- **CRM**: Customer relationship management
- **Sales Pipeline**: Opportunities and deals
- **POS Terminal**: Full-screen restaurant POS with menu, cart, payments
- **Subscriptions**: Recurring billing management

### 5. Projects & Services
- **Projects**: Task management and tracking
- **Timesheets**: Time logging and billing
- **Field Service**: On-site service management
- **Helpdesk**: Support tickets and customer service

### 6. Marketing
- **Website Builder**: Content management
- **eCommerce**: Online store and catalog
- **Marketing Automation**: Campaigns and email

## 🎛️ Control Tower (Admin SaaS)

### Tenant Management
```typescript
@Entity()
export class Tenant {
  id: number;
  name: string;
  domain: string; // company.erpx.sa
  plan: string; // Basic / Pro / Enterprise
  status: string; // active / suspended
  stripeCustomerId: string;
}
```

### Billing Engine
```typescript
@Entity()
export class Subscription {
  id: number;
  tenantId: number;
  planId: number;
  status: string; // active / canceled / past_due
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}
```

**Plans:**
- Basic: SAR 299/mo - 10 users, Finance, CRM, 10GB storage
- Pro: SAR 999/mo - 50 users, All Basic + HR, Inventory, 100GB
- Enterprise: Custom - Unlimited users, white-label, on-premise

### Usage Analytics
```typescript
@Entity()
export class UsageLog {
  id: number;
  tenantId: number;
  module: string;
  action: string;
  timestamp: Date;
}
```

**Limits per Plan:**
```typescript
const limits = {
  Basic: { Finance: 500, Inventory: 200, HR: 10, Sales: 100 },
  Pro: { Finance: 5000, Inventory: 2000, HR: 50, Sales: 1000 },
  Enterprise: { Finance: -1, Inventory: -1, HR: -1, Sales: -1 } // unlimited
};
```

### AI Insights Layer

Automated intelligence for proactive management:

```typescript
// Auto-suspend tenant after 3 failed payments
if (tenant.paymentFailed >= 3 && tenant.status === "active") {
  await suspendTenant(tenant.id);
  await notifyAdmin(`Tenant ${tenant.name} auto-suspended`);
}

// Suggest upgrade if usage is high
if (tenant.usage > 0.8 && tenant.plan === "Basic") {
  await sendUpgradeEmail(tenant.id, "Pro");
}

// Churn risk detection
if (tenant.usage < 0.2 && tenant.status === "active") {
  await sendEngagementEmail(tenant.id);
  await notifyAdmin(`Churn risk: ${tenant.name}`);
}

// Revenue drop alert
if (tenant.revenue < -0.2) {
  await notifyAdmin(`Revenue dropped 20% for ${tenant.name}`);
}
```

### System Health Monitor
```typescript
@Entity()
export class SystemHealth {
  service: string; // API Gateway, Database, Auth, Billing, Storage, Cache
  status: string; // ok / down / slow
  latency: number; // milliseconds
  uptime: number; // percentage
}
```

**Thresholds:**
- Latency: <50ms = ok, <150ms = slow, ≥150ms = critical
- Uptime: ≥99.5% = healthy

### Module Marketplace
```typescript
@Entity()
export class Module {
  id: number;
  name: string;
  description: string;
  price: number;
  active: boolean;
  installs: number;
  rating: number;
}
```

**Available Modules:**
- Advanced Analytics (SAR 199/mo)
- Mobile App (SAR 299/mo)
- E-Signature (SAR 149/mo)
- WhatsApp Integration (SAR 99/mo)

## 🔐 RBAC System

### Roles & Permissions

```typescript
type Permission =
  | "tenants.manage"
  | "billing.manage"
  | "modules.manage"
  | "system.shutdown"
  | "users.manage"
  | "analytics.view";

type Role = "super_admin" | "admin" | "tenant_admin" | "user" | "viewer";
```

**super_admin:**
- Full platform control
- Can shutdown system
- Manages all tenants, billing, modules

**admin:**
- Platform management
- Cannot shutdown system
- Manages tenants and users

**tenant_admin:**
- Manages their own tenant
- User management within organization
- Analytics and billing view

**user:**
- Basic workspace access

**viewer:**
- Read-only monitoring

## 🎨 ERPX Studio (Low-Code Builder)

Dynamic module creation without coding:

```typescript
@Entity()
export class Module {
  id: number;
  name: string;
  fields: Field[]; // Dynamic schema
  permissions: any;
  workflows: WorkflowRule[];
}

@Entity()
export class DynamicRecord {
  id: number;
  moduleId: number;
  data: any; // JSON storage for all fields
}
```

**Field Types:**
- text, number, email, date, textarea, select, checkbox

**Workflow Engine:**
```typescript
if (data.total > 10000) {
  return "auto_approve";
} else {
  return "require_approval";
}
```

**AI Module Generator:**
- Input: "أريد نظام HR" / "I need invoice system"
- Output: Pre-configured module with fields, workflows, permissions

## 🔄 Integration Flow

### POS → Finance → Inventory → HR

```typescript
async function processPayment(cart, employee) {
  // 1. Create Order
  const order = await posAPI.createOrder(cart, employee.id);
  
  // 2. Finance Integration (Record Revenue)
  await financeAPI.createTransaction({
    type: "income",
    amount: order.total,
    module: "POS",
    reference: order.id
  });
  
  // 3. Inventory Integration (Deduct Stock)
  for (const item of cart) {
    await inventoryAPI.recordMovement({
      itemId: item.id,
      type: "OUT",
      quantity: item.quantity,
      reference: `POS-${order.id}`
    });
  }
  
  // 4. HR Integration (Track Activity + Commission)
  await hrAPI.logActivity({
    employeeId: employee.id,
    action: "sale",
    amount: order.total,
    commission: order.total * 0.02 // 2% commission
  });
}
```

## 📊 SaaS Metrics

### Key Performance Indicators

```typescript
const metrics = {
  activeTenants: 1240,
  MRR: 480000, // Monthly Recurring Revenue
  churnRate: 3.1,
  avgUptime: 99.9,
  growthRate: 22.3
};
```

### Calculations

**MRR (Monthly Recurring Revenue):**
```typescript
function calculateMRR(revenues) {
  return revenues
    .filter(r => isCurrentMonth(r.date))
    .reduce((sum, r) => sum + r.amount, 0);
}
```

**Churn Rate:**
```typescript
const churnRate = (canceledSubscriptions / totalSubscriptions) * 100;
```

## 🌐 Multi-Tenant Architecture

### Subdomain-based Routing
```
company1.erpx.sa → Tenant A (Schema: tenant_1)
company2.erpx.sa → Tenant B (Schema: tenant_2)
company3.erpx.sa → Tenant C (Schema: tenant_3)
```

### Data Isolation
- Each tenant has isolated database schema
- Shared authentication service
- Centralized billing and admin

### Signup Flow
```
User Sign Up
   ↓
Create Tenant
   ↓
Create Stripe Customer
   ↓
Assign Plan
   ↓
Provision Database Schema
   ↓
Activate ERPX Workspace
```

## 🔌 Stripe Webhook Events

```typescript
@Post("webhook")
handleWebhook(event) {
  switch (event.type) {
    case "invoice.paid":
      // Activate subscription
      await updateTenantStatus(customerId, "active");
      break;
      
    case "invoice.payment_failed":
      // Mark as past due
      await updateTenantStatus(customerId, "past_due");
      await sendPaymentReminder(customerId);
      break;
      
    case "customer.subscription.deleted":
      // Suspend account
      await suspendTenant(customerId);
      break;
      
    case "customer.subscription.trial_will_end":
      // Send trial ending reminder
      await sendTrialEndingEmail(customerId);
      break;
  }
}
```

## 🎯 Tech Stack

**Frontend:**
- React 18.3.1 + TypeScript
- React Router 7.13.0
- Motion (Framer Motion) for animations
- Tailwind CSS v4
- Recharts 2.15.2
- Lucide React (icons)

**Backend (Architecture):**
- TypeORM entities
- Multi-tenant database
- Stripe billing integration
- Mock APIs for demo

**Key Features:**
- Real-time updates with WebSocket simulation
- AI-powered insights and automation
- Dark theme with glassmorphism
- Responsive design
- ZATCA compliance (Saudi e-invoicing)

## 📱 Pages Overview

### Public
- `/pricing` - Self-service signup with plan selection

### Dashboard
- `/` - Real-time KPIs, AI features, charts

### Finance
- `/finance/accounting` - Chart of Accounts
- `/finance/invoicing` - Multi-currency invoices
- `/finance/expenses` - Transaction management
- `/finance/currency` - Exchange rates
- `/finance/zatca` - E-invoicing compliance

### Sales & CRM
- `/crm` - Customer management
- `/sales` - Pipeline and opportunities
- `/pos` - Point of Sale terminal
- `/subscriptions` - Recurring billing

### Operations
- `/inventory` - Stock management
- `/purchase` - Purchase orders
- `/mrp` - Material planning
- `/plm` - Product lifecycle

### HR
- `/hr/employees` - Employee CRUD
- `/hr/recruitment` - Hiring workflow
- `/hr/payroll` - Salary processing
- `/hr/attendance` - Time tracking

### Projects
- `/projects` - Task management
- `/timesheets` - Time logging
- `/field-service` - On-site services
- `/helpdesk` - Support tickets

### Marketing
- `/website` - Website builder
- `/ecommerce` - Online store
- `/marketing` - Campaigns

### Admin (Super Admin Only)
- `/admin/control-tower` - Central command center
- `/admin/tenants` - Tenant management
- `/admin/studio` - Low-code builder
- `/admin/metrics` - SaaS analytics
- `/admin/usage` - Usage tracking
- `/admin/automation` - Automation rules
- `/admin/webhooks` - Webhook simulator

## 🚀 Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start dev server (already running):
   ```bash
   # Server auto-started, access via preview
   ```

3. Default credentials (demo):
   - Any email/password combination works
   - System starts with splash screen → login → dashboard

## 📝 Environment

- Platform: Figma Make
- React + Vite (custom setup)
- No manual build needed
- Preview surface auto-refreshes

---

**Built with Claude Code** 🤖
