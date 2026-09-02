# ERPX-AI Project Structure

```
erpx-ai/
│
├── database/                          # Database schemas and migrations
│   ├── 01_schema.sql                  # Complete database schema
│   ├── 02_rls_policies.sql            # Row Level Security policies
│   ├── 03_seed_data.sql               # Sample data for testing
│   └── README.md                      # Database documentation
│
├── docs/                              # Project documentation
│   ├── AWS_DEPLOYMENT.md              # AWS deployment guide
│   ├── SECURITY_CHECKLIST.md          # Security requirements
│   ├── PRODUCTION_READINESS.md        # Production readiness report
│   └── FOLDER_STRUCTURE.md            # This file
│
├── src/                               # Application source code
│   ├── app/                           # Main application directory
│   │   ├── components/                # Reusable UI components
│   │   │   ├── ui/                    # Base UI components (Button, Input, etc.)
│   │   │   ├── figma/                 # Figma-generated components
│   │   │   ├── Login.tsx              # Login component
│   │   │   ├── Splash.tsx             # Splash screen
│   │   │   ├── LoadingState.tsx       # Loading indicator
│   │   │   ├── EmptyState.tsx         # Empty state UI
│   │   │   └── ErrorState.tsx         # Error display
│   │   │
│   │   ├── context/                   # React contexts
│   │   │   └── ThemeContext.tsx       # Theme management (dark/light)
│   │   │
│   │   ├── data/                      # Mock/seed data
│   │   │   └── seedUsers.ts           # Demo users
│   │   │
│   │   ├── layout/                    # Layout components
│   │   │   ├── MainLayout.tsx         # Main app layout
│   │   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   │   └── Topbar.tsx             # Top navigation bar
│   │   │
│   │   ├── pages/                     # Page components
│   │   │   ├── finance/               # Finance module pages
│   │   │   │   ├── FinanceDashboardPage.tsx
│   │   │   │   ├── JournalEntriesPage.tsx
│   │   │   │   ├── GeneralLedgerPage.tsx
│   │   │   │   ├── TrialBalancePage.tsx
│   │   │   │   ├── AccountsReceivablePage.tsx
│   │   │   │   ├── AccountsPayablePage.tsx
│   │   │   │   ├── CashBankManagementPage.tsx
│   │   │   │   ├── BudgetManagementPage.tsx
│   │   │   │   ├── ExpenseManagementPage.tsx
│   │   │   │   ├── FixedAssetsPage.tsx
│   │   │   │   ├── VATTaxPage.tsx
│   │   │   │   ├── FinancialReportsPage.tsx
│   │   │   │   └── AIFinanceAssistantPage.tsx
│   │   │   │
│   │   │   ├── hr/                    # HR module pages
│   │   │   │   ├── HRDashboardPage.tsx
│   │   │   │   ├── EmployeeListPage.tsx
│   │   │   │   ├── AttendancePage.tsx
│   │   │   │   ├── LeaveManagementPage.tsx
│   │   │   │   ├── PayrollPage.tsx
│   │   │   │   ├── RecruitmentPage.tsx
│   │   │   │   ├── HRReportsPage.tsx
│   │   │   │   └── AIHRAssistantPage.tsx
│   │   │   │
│   │   │   ├── inventory/             # Inventory module pages
│   │   │   │   └── InventoryManagementPage.tsx
│   │   │   │
│   │   │   ├── DashboardPage.tsx      # Main dashboard
│   │   │   ├── ExecutiveDashboard.tsx # Executive dashboard
│   │   │   ├── SupabaseDiagnosticPage.tsx  # Diagnostic page
│   │   │   ├── InvoicingPage.tsx      # Invoicing
│   │   │   ├── SalesPage.tsx          # Sales management
│   │   │   ├── PurchasesPage.tsx      # Purchase orders
│   │   │   ├── InventoryPageNew.tsx   # Inventory management
│   │   │   ├── POSPage.tsx            # Point of sale
│   │   │   └── ... (30+ more pages)
│   │   │
│   │   └── App.tsx                    # Root application component
│   │
│   ├── contexts/                      # Global contexts (outside app/)
│   │   └── AuthContext.tsx            # Authentication context
│   │
│   ├── hooks/                         # Custom React hooks
│   │   └── useSupabaseQuery.ts        # Supabase data fetching hooks
│   │
│   ├── lib/                           # Core libraries and utilities
│   │   ├── supabase.ts                # Supabase client configuration
│   │   ├── realtime.ts                # Realtime subscriptions manager
│   │   └── utils.ts                   # Utility functions
│   │
│   ├── services/                      # API service layer
│   │   ├── usersService.ts            # User management
│   │   ├── customersService.ts        # Customer management
│   │   ├── productsService.ts         # Product management
│   │   ├── inventoryService.ts        # Inventory management
│   │   ├── invoicesService.ts         # Invoice management
│   │   └── dashboardService.ts        # Dashboard analytics
│   │
│   ├── styles/                        # Global styles
│   │   ├── theme.css                  # Tailwind theme customization
│   │   └── fonts.css                  # Font imports
│   │
│   └── main.tsx                       # Application entry point
│
├── .github/                           # GitHub configuration
│   └── workflows/                     # CI/CD workflows
│       └── deploy.yml                 # Automated deployment (to be created)
│
├── infrastructure/                    # Infrastructure as Code (to be created)
│   ├── terraform/                     # Terraform configuration
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── docker/                        # Docker configuration
│       └── Dockerfile
│
├── public/                            # Public static assets
│   └── (images, icons, etc.)
│
├── .env                               # Environment variables (NOT in git)
├── .env.example                       # Environment variable template
├── .gitignore                         # Git ignore rules
├── package.json                       # NPM dependencies and scripts
├── pnpm-lock.yaml                     # Dependency lock file
├── tsconfig.json                      # TypeScript configuration
├── vite.config.ts                     # Vite build configuration
├── tailwind.config.js                 # Tailwind CSS configuration (v4)
└── README.md                          # Project README

```

## Directory Descriptions

### `/database/`

Contains all database-related files including schema definitions, Row Level Security policies, seed data, and migrations. Critical for setting up the PostgreSQL database in Supabase.

### `/docs/`

Comprehensive documentation for deployment, security, production readiness, and project structure. Essential reading for DevOps and security teams.

### `/src/app/`

Main application code following a feature-based structure. Each module (Finance, HR, Inventory, etc.) has its own subdirectory for better organization.

### `/src/components/`

Reusable UI components shared across the application. Includes base components from Radix UI and custom components for common patterns.

### `/src/contexts/`

React Context providers for global state management (Authentication, Theme, etc.).

### `/src/hooks/`

Custom React hooks for data fetching, authentication, and other reusable logic.

### `/src/lib/`

Core libraries and utilities including Supabase client, realtime manager, and helper functions.

### `/src/services/`

Service layer that abstracts database operations. Each service handles CRUD operations for a specific domain (users, customers, products, etc.).

### `/src/styles/`

Global styles and theme configuration. Uses Tailwind CSS v4 with custom theme tokens.

## Key Files

### Configuration Files

- **`.env`** - Environment variables (Supabase URL and keys)
- **`package.json`** - Project dependencies and scripts
- **`tsconfig.json`** - TypeScript compiler settings
- **`vite.config.ts`** - Vite bundler configuration
- **`tailwind.config.js`** - Tailwind CSS theme customization

### Core Application Files

- **`src/main.tsx`** - Application entry point
- **`src/app/App.tsx`** - Root component with routing
- **`src/lib/supabase.ts`** - Supabase client setup
- **`src/contexts/AuthContext.tsx`** - Authentication logic
- **`src/hooks/useSupabaseQuery.ts`** - Data fetching hooks

### Database Files

- **`database/01_schema.sql`** - Complete database schema (40+ tables)
- **`database/02_rls_policies.sql`** - Security policies for multi-tenant isolation
- **`database/03_seed_data.sql`** - Sample data for development/testing

## Module Organization

### Finance Module

Located in `/src/app/pages/finance/`, includes:

- Dashboard, Journal Entries, General Ledger
- Accounts Receivable/Payable
- Cash & Bank Management
- Budgets, Expenses, Fixed Assets
- VAT/Tax Management
- Financial Reports
- AI Assistant

### HR Module

Located in `/src/app/pages/hr/`, includes:

- Dashboard, Employee Management
- Attendance Tracking
- Leave Management
- Payroll Processing
- Recruitment
- Reports
- AI Assistant

### Inventory Module

Located in `/src/app/pages/inventory/`, includes:

- Inventory Management
- Stock Levels
- Warehouses
- Movements

### Sales Module

Pages for:

- Sales Orders
- Customer Management (CRM)
- Invoicing
- Point of Sale (POS)
- Quotations

### Purchasing Module

Pages for:

- Purchase Orders
- Supplier Management
- Goods Receipts
- Purchase Analytics

## Service Layer Pattern

Each service follows this pattern:

```typescript
// src/services/exampleService.ts
import { supabase, isDemoMode } from '../lib/supabase';

export async function listItems(companyId: string) {
  if (isDemoMode) {
    return MOCK_DATA;
  }

  const { data, error } = await supabase.from('items').select('*').eq('company_id', companyId);

  if (error) throw error;
  return data;
}

export async function createItem(itemData: any) {
  if (isDemoMode) {
    throw new Error('Cannot create in demo mode');
  }

  const { data, error } = await supabase.from('items').insert([itemData]).select().single();

  if (error) throw error;
  return data;
}
```

## Naming Conventions

### Files

- **Components:** PascalCase (e.g., `Button.tsx`, `DashboardCard.tsx`)
- **Utilities:** camelCase (e.g., `formatDate.ts`, `apiClient.ts`)
- **Services:** camelCase with `Service` suffix (e.g., `usersService.ts`)
- **Hooks:** camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Types:** PascalCase with `.types.ts` suffix (e.g., `User.types.ts`)

### Code

- **Variables:** camelCase (e.g., `userName`, `totalAmount`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `API_URL`, `MAX_RETRY_COUNT`)
- **Types/Interfaces:** PascalCase (e.g., `User`, `ProductData`)
- **Components:** PascalCase (e.g., `<UserProfile />`)

## Import Organization

Organize imports in this order:

1. React imports
2. Third-party libraries
3. Internal utilities and services
4. Components
5. Types
6. Styles

```typescript
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, TrendingUp } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useInventory } from '../../hooks/useSupabaseQuery';
import { updateInventoryQuantity } from '../../services/inventoryService';

import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';

import type { Product } from '../../types/product.types';
```

## Build Output

After running `pnpm run build`:

```
dist/
├── assets/
│   ├── index-[hash].js          # Main application bundle
│   ├── index-[hash].css         # Compiled CSS
│   └── vendor-[hash].js         # Third-party dependencies
└── index.html                   # Entry HTML file
```

Deploy the `dist/` directory to:

- AWS S3 + CloudFront
- AWS Amplify
- ECS Fargate (with Nginx)

## Environment Variables

Required variables in `.env`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

All environment variables must be prefixed with `VITE_` to be accessible in the frontend.

## Scripts

```bash
pnpm run dev        # Start development server
pnpm run build      # Build for production
pnpm run preview    # Preview production build locally
```

## Best Practices

1. **Components** - Keep components small and focused (< 300 lines)
2. **Services** - All database operations go through services
3. **Hooks** - Extract reusable logic into custom hooks
4. **Types** - Use TypeScript strictly, avoid `any`
5. **Error Handling** - Use try-catch and display user-friendly errors
6. **Loading States** - Always show loading indicators
7. **Responsive** - Mobile-first design approach
8. **Performance** - Use React.memo for expensive components
9. **Security** - Never expose service_role key, only anon key
10. **Documentation** - Comment complex logic, not obvious code
