# ERPX-AI: Complete Database Analysis & Schema Documentation

**Document Version:** 1.0  
**Last Updated:** May 16, 2026  
**Database:** PostgreSQL 15.x  
**Provider:** Supabase

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Multi-Tenant Architecture](#multi-tenant-architecture)
3. [Core Tables](#core-tables)
4. [Entity Relationship Diagram](#entity-relationship-diagram)
5. [Row-Level Security (RLS)](#row-level-security-rls)
6. [Indexes & Performance](#indexes--performance)
7. [Data Integrity](#data-integrity)
8. [Scalability Strategy](#scalability-strategy)

---

## Database Overview

### Technology Stack

**Database Engine:** PostgreSQL 15.x  
**Hosting:** Supabase (Managed PostgreSQL on AWS)  
**Character Set:** UTF-8  
**Collation:** en_US.UTF-8  
**Timezone:** UTC (converted to client timezone in application)

### Database Statistics

| Metric                                | Value                    |
| ------------------------------------- | ------------------------ |
| **Total Tables**                      | 30+ tables               |
| **Total Indexes**                     | 60+ indexes              |
| **Total Constraints**                 | 100+ (FK, unique, check) |
| **Total Triggers**                    | 15+ triggers             |
| **Total Functions**                   | 10+ functions            |
| **Estimated Size (1,000 companies)**  | 50-100 GB                |
| **Estimated Size (10,000 companies)** | 500 GB - 1 TB            |

### PostgreSQL Extensions

```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

## Multi-Tenant Architecture

### Tenant Isolation Strategy

ERPX-AI uses **Shared Database, Shared Schema** multi-tenancy:

```
Single PostgreSQL Database
  ├── All companies share the same tables
  ├── Each table has company_id column
  ├── Row-Level Security (RLS) enforces isolation
  └── No data leakage between tenants
```

**Advantages:**

- ✅ Cost-effective (shared infrastructure)
- ✅ Easy backups and maintenance
- ✅ Simpler schema migrations
- ✅ Cross-tenant analytics possible (for platform admins)

**Security:**

- **Database-level isolation** via RLS policies
- **Application cannot bypass** RLS (enforced by PostgreSQL)
- **Even service role** respects RLS (unless explicitly bypassed)

### Tenant Hierarchy

```
companies (Root tenant entity)
  ├── branches (Physical locations)
  ├── users (Employees, staff members)
  ├── roles (Permission sets)
  ├── customers (CRM contacts)
  ├── suppliers (Vendors)
  ├── products (Inventory items)
  ├── sales (Transactions)
  ├── invoices (Billing documents)
  ├── expenses (Finance records)
  └── [all other domain tables]
```

---

## Core Tables

### 1. System Tables

#### companies

**Purpose:** Root tenant entity, represents a business using ERPX-AI

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  tax_id VARCHAR(100) UNIQUE,
  currency VARCHAR(3) DEFAULT 'SAR',
  timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
  status VARCHAR(20) DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**

- `settings` - Company preferences (JSONB for flexibility)
- `tax_id` - Unique business registration number
- `currency` - Default currency (SAR, USD, EUR, etc.)

**Sample Data:**

```json
{
  "id": "a1b2c3...",
  "name": "Acme Corporation",
  "tax_id": "300012345600003",
  "currency": "SAR",
  "settings": {
    "vat_rate": 0.15,
    "fiscal_year_start": "01-01",
    "invoice_prefix": "INV"
  }
}
```

#### branches

**Purpose:** Physical locations (stores, warehouses, offices)

```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  city VARCHAR(100),
  country VARCHAR(100),
  is_headquarters BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);
```

**Use Cases:**

- Multi-store retail chains
- Warehouse management
- Regional offices
- Franchises

#### roles

**Purpose:** Permission sets (RBAC)

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255),
  permissions JSONB DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);
```

**Permissions Structure (JSONB):**

```json
{
  "all": false,
  "finance_access": true,
  "finance_read": true,
  "finance_write": true,
  "finance_delete": false,
  "inventory_access": true,
  "inventory_write": true,
  "pos_access": true,
  "open_close_shift": true,
  "process_refunds": false,
  "hr_access": false,
  "admin_access": false,
  "manage_users": false
}
```

#### users

**Purpose:** Employee/staff accounts

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(50),
  employee_id VARCHAR(100),
  department VARCHAR(100),
  position VARCHAR(100),
  avatar_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, email)
);
```

**Key Design Decisions:**

- `id` references `auth.users(id)` - Links to Supabase Auth
- `company_id` - Multi-tenant isolation
- `branch_id` - User's primary branch (can access others)
- `role_id` - Determines permissions

---

### 2. Finance Module Tables

#### chart_of_accounts

**Purpose:** Accounting chart of accounts

```sql
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, account_code)
);
```

**Account Types:**

- Assets (1000-1999)
- Liabilities (2000-2999)
- Equity (3000-3999)
- Revenue (4000-4999)
- Expenses (5000-5999)

#### journal_entries

**Purpose:** Accounting journal entries

```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_number VARCHAR(100) NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, entry_number)
);

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  description TEXT
);
```

**Double-Entry Bookkeeping:**

- Every entry has equal debits and credits
- Enforced by database constraint or application logic

#### invoices

**Purpose:** Customer invoices

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);
```

**Invoice Statuses:**

- `draft` - Being created
- `sent` - Sent to customer
- `paid` - Payment received
- `overdue` - Past due date
- `cancelled` - Cancelled

---

### 3. Inventory Module Tables

#### products

**Purpose:** Products/services sold by company

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  unit_price DECIMAL(15,2) NOT NULL,
  cost_price DECIMAL(15,2),
  barcode VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, sku)
);
```

#### inventory

**Purpose:** Stock levels per branch

```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id),
  quantity_on_hand INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, product_id, branch_id)
);
```

**Stock Tracking:**

- Per product, per branch
- `quantity_on_hand` updated on sales/purchases
- `reorder_level` triggers low-stock alerts

---

### 4. Sales Module Tables

#### sales

**Purpose:** POS transactions

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  sale_number VARCHAR(50) NOT NULL UNIQUE,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN
    ('cash', 'card', 'mada', 'apple_pay', 'bank_transfer', 'split')),
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0,
  change_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN
    ('completed', 'cancelled', 'refunded', 'on_hold')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Items Structure (JSONB):**

```json
[
  {
    "product_id": "uuid",
    "name": "Product Name",
    "quantity": 2,
    "unit_price": 100.0,
    "subtotal": 200.0,
    "discount": 0,
    "total": 200.0
  }
]
```

#### shifts

**Purpose:** Cashier shifts for POS

```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  shift_number VARCHAR(50) NOT NULL UNIQUE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  starting_cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ending_cash DECIMAL(15, 2),
  total_sales DECIMAL(15, 2),
  total_cash DECIMAL(15, 2),
  total_card DECIMAL(15, 2),
  total_transactions INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 5. HR Module Tables

#### employees

**Purpose:** Employee records (separate from users table)

```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  employee_id VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(10),
  nationality VARCHAR(100),
  national_id VARCHAR(100),
  hire_date DATE NOT NULL,
  termination_date DATE,
  salary DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id)
);
```

#### attendance

**Purpose:** Daily attendance tracking

```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status VARCHAR(20) DEFAULT 'present',
  notes TEXT,
  UNIQUE(company_id, employee_id, date)
);
```

#### payroll

**Purpose:** Salary payments

```sql
CREATE TABLE payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_salary DECIMAL(15,2),
  allowances DECIMAL(15,2) DEFAULT 0,
  deductions DECIMAL(15,2) DEFAULT 0,
  net_salary DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'draft',
  payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Entity Relationship Diagram

### Core Entity Relationships

```
companies (1) ────┬──── (M) branches
                  ├──── (M) users
                  ├──── (M) roles
                  ├──── (M) customers
                  ├──── (M) suppliers
                  ├──── (M) products
                  ├──── (M) invoices
                  ├──── (M) sales
                  └──── (M) employees

users (M) ──────── (1) roles
      (1) ──────── (M) sales [as cashier]
      (1) ──────── (M) journal_entries [as creator]

products (1) ─────── (M) inventory
         (M) ─────── (1) categories

sales (M) ────────── (1) shifts
      (M) ────────── (1) branches
      (M) ────────── (1) users [cashier]

invoices (M) ─────── (1) customers
```

### Database Normalization

**Normalization Level:** Third Normal Form (3NF)

**Benefits:**

- Minimal data redundancy
- Data integrity through foreign keys
- Easier updates (single source of truth)

**Denormalization (Where Applied):**

- `sales.items` - JSONB array (faster queries, less joins)
- Materialized views for reporting (planned)

---

## Row-Level Security (RLS)

### RLS Policy Framework

Every table has RLS enabled with four policy types:

1. **SELECT** - Who can read data
2. **INSERT** - Who can create records
3. **UPDATE** - Who can modify records
4. **DELETE** - Who can remove records

### Example: products Table

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their company's products
CREATE POLICY "products_select_policy"
  ON products FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- INSERT: Users with inventory_write permission
CREATE POLICY "products_insert_policy"
  ON products FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.permissions->>'inventory_write' = 'true'
    )
  );

-- UPDATE: Same as INSERT
CREATE POLICY "products_update_policy"
  ON products FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.permissions->>'inventory_write' = 'true'
    )
  );

-- DELETE: Only admins
CREATE POLICY "products_delete_policy"
  ON products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'admin'
      AND u.company_id = products.company_id
    )
  );
```

### RLS Performance Optimization

**Problem:** Complex RLS policies can slow queries

**Solutions:**

1. **Indexes on company_id** - Every table has index on company_id
2. **Function caching** - Frequently called functions (get user's company) are cached
3. **Connection pooling** - PgBouncer reduces connection overhead
4. **Materialized views** - Pre-compute expensive queries

---

## Indexes & Performance

### Index Strategy

**Primary Indexes:**

- All primary keys (automatic unique index)
- All foreign keys
- `company_id` on every multi-tenant table

**Secondary Indexes:**

- Frequently queried columns (`status`, `date`, `email`)
- Full-text search columns
- Composite indexes for common query patterns

**Example Indexes:**

```sql
-- Foreign key indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_branch_id ON users(branch_id);

-- Query optimization indexes
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);

-- Composite indexes
CREATE INDEX idx_sales_company_branch_date
  ON sales(company_id, branch_id, sale_date DESC);

-- Full-text search
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
```

### Query Performance

**Typical Query Performance:**

- Simple SELECT: 5-15ms
- JOIN (2-3 tables): 20-50ms
- Complex aggregation: 50-200ms
- Full-text search: 30-100ms

**Optimization Techniques:**

- Use EXPLAIN ANALYZE for slow queries
- Add indexes on WHERE/JOIN columns
- Use materialized views for reports
- Partition large tables (future)

---

## Data Integrity

### Constraints

**Primary Keys:**

- UUID for all tables (globally unique, distributed-friendly)

**Foreign Keys:**

- All relationships enforced
- ON DELETE CASCADE for dependent data
- ON DELETE SET NULL for optional references

**Unique Constraints:**

```sql
-- Natural unique constraints
UNIQUE(company_id, email)         -- users
UNIQUE(company_id, sku)            -- products
UNIQUE(company_id, invoice_number) -- invoices
```

**Check Constraints:**

```sql
CHECK (status IN ('active', 'inactive'))
CHECK (total_amount >= 0)
CHECK (vat_rate BETWEEN 0 AND 1)
```

### Triggers

**Auto-update Timestamps:**

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Audit Logging (Future):**

- Track all changes to sensitive tables
- Store old/new values
- Track who changed what when

---

## Scalability Strategy

### Current (0-1,000 companies)

- Single PostgreSQL instance (8 GB RAM)
- Shared tables with RLS
- ~50 GB database size
- 1,000 concurrent connections (pooled)

### Growth (1,000-10,000 companies)

- Dedicated instance (32 GB RAM)
- Read replicas for reporting
- ~500 GB database size
- Partitioning by company_id (for largest tables)

### Enterprise (10,000+ companies)

- Sharding by region or company size
- Separate databases for enterprise clients
- Multi-region read replicas
- Dedicated analytics database

### Table Partitioning Strategy (Future)

**Large Tables to Partition:**

- `sales` - Partition by date (monthly/yearly)
- `journal_entries` - Partition by fiscal year
- `attendance` - Partition by year

**Example:**

```sql
CREATE TABLE sales (
  -- columns
) PARTITION BY RANGE (sale_date);

CREATE TABLE sales_2026_01 PARTITION OF sales
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

---

## Backup & Recovery

### Automated Backups

- **Frequency:** Daily at 2 AM UTC
- **Retention:** 7 days (Pro plan)
- **Type:** Full database snapshot
- **Storage:** Encrypted S3

### Point-in-Time Recovery (PITR)

- **Restore to:** Any second within retention
- **RTO:** 15-30 minutes
- **RPO:** <1 minute (WAL logs)

---

## Conclusion

**Database Strengths:**

- ✅ Enterprise-grade PostgreSQL foundation
- ✅ Multi-tenant architecture with database-level isolation
- ✅ Comprehensive RLS for security
- ✅ Well-indexed for performance
- ✅ Normalized schema for data integrity
- ✅ Scalable to millions of records

**Future Enhancements:**

- Table partitioning for large datasets
- Materialized views for reporting
- Full-text search optimization
- Audit logging system
- Data warehouse integration

---

_Next: Section 6 - Hosting & Deployment Architecture_
