# ERPX-AI Database Architecture

## Overview

This directory contains the complete PostgreSQL database schema for ERPX-AI, a multi-tenant enterprise resource planning system built on Supabase.

## Database Files

### 1. `01_schema.sql`

Complete database schema including:

- **Core System Tables**: Companies, Branches, Users, Roles
- **Finance Module**: Chart of Accounts, Journal Entries, Budgets
- **Sales & CRM**: Customers, Sales Orders, Invoices, Payments
- **Inventory**: Products, Warehouses, Stock Management
- **Purchasing**: Suppliers, Purchase Orders, Goods Receipts
- **HR Module**: Employees, Attendance, Leave Management, Payroll
- **Audit System**: Audit Logs, Notifications, Activity Feed

**Total Tables**: 40+ tables with complete relationships

### 2. `02_rls_policies.sql`

Row Level Security policies for:

- Multi-tenant data isolation (company_id based)
- Role-based access control (RBAC)
- Permission-based operations
- User-specific data access

### 3. `03_seed_data.sql`

Sample data for testing:

- Demo company setup
- Sample customers, suppliers, products
- Chart of accounts structure
- Department and leave type templates

## Setup Instructions

### Step 1: Create Database

```bash
# In Supabase SQL Editor, run in order:
1. 01_schema.sql
2. 02_rls_policies.sql
3. 03_seed_data.sql (optional - for testing)
```

### Step 2: Verify Installation

```sql
-- Check tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- Check sample data
SELECT * FROM companies;
SELECT * FROM products LIMIT 5;
```

### Step 3: Create First User

```sql
-- After user signs up via Supabase Auth, add their profile:
INSERT INTO users (
  id,  -- This should match auth.users.id
  company_id,
  role_id,
  email,
  first_name,
  last_name,
  status
) VALUES (
  'user-auth-uuid-here',
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM roles WHERE name = 'admin' LIMIT 1),
  'admin@company.com',
  'Admin',
  'User',
  'active'
);
```

## Multi-Tenancy Architecture

### Data Isolation

Every table with company data includes `company_id`:

```sql
company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE
```

### RLS Helper Functions

```sql
-- Get current user's company
get_user_company_id() RETURNS UUID

-- Check permissions
user_has_permission(permission TEXT) RETURNS BOOLEAN
```

### Policy Pattern

```sql
-- SELECT: View data in your company
USING (company_id = get_user_company_id())

-- INSERT: Create data for your company with permission
WITH CHECK (
  company_id = get_user_company_id()
  AND user_has_permission('module_name')
)
```

## Permission System

### System Roles

- **admin**: Full access to all modules
- **manager**: Access to all operational modules
- **employee**: Read-only access

### Module Permissions

```json
{
  "all": true, // Super admin
  "finance": true, // Finance module
  "sales": true, // Sales & CRM
  "purchases": true, // Purchasing
  "inventory": true, // Inventory management
  "hr": true, // Human resources
  "reports": true // Reporting access
}
```

### Custom Roles

Companies can create custom roles:

```sql
INSERT INTO roles (company_id, name, display_name, permissions)
VALUES (
  'company-uuid',
  'sales_rep',
  'Sales Representative',
  '{"sales": true, "read": true}'
);
```

## Indexes & Performance

### Indexed Columns

- All `company_id` fields
- Foreign key relationships
- Status fields for filtering
- Date fields for range queries
- Email and code fields for lookups

### Query Optimization

```sql
-- Always filter by company_id first
SELECT * FROM products
WHERE company_id = get_user_company_id()
  AND is_active = true;

-- Use indexes for searches
SELECT * FROM customers
WHERE company_id = get_user_company_id()
  AND (
    company_name ILIKE '%search%'
    OR customer_code ILIKE '%search%'
  );
```

## Audit Trail

### Automatic Tracking

All major tables include:

- `created_at TIMESTAMPTZ DEFAULT NOW()`
- `updated_at TIMESTAMPTZ DEFAULT NOW()`
- Auto-update trigger on UPDATE

### Audit Logs Table

Captures:

- User actions (INSERT, UPDATE, DELETE)
- Old and new values (JSONB)
- IP address and user agent
- Entity type and ID

### Enable Audit Logging

```sql
-- Create trigger function for audit logging
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    company_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) VALUES (
    get_user_company_id(),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER audit_customers
AFTER INSERT OR UPDATE OR DELETE ON customers
FOR EACH ROW EXECUTE FUNCTION log_audit();
```

## Backup Strategy

### Supabase Automated Backups

- Daily automated backups (Pro plan)
- Point-in-time recovery
- Backup retention based on plan

### Manual Backup

```bash
# Using pg_dump
pg_dump -h db.project.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup_$(date +%Y%m%d).dump

# Using Supabase CLI
supabase db dump -f backup.sql
```

### Restore

```bash
# Full restore
pg_restore -h db.project.supabase.co \
  -U postgres \
  -d postgres \
  backup.dump

# Using Supabase dashboard
# Go to Settings > Database > Restore from backup
```

## Migrations

### Schema Changes

```sql
-- Always use transactions for schema changes
BEGIN;

-- Add new column
ALTER TABLE products
ADD COLUMN new_field VARCHAR(100);

-- Create index
CREATE INDEX idx_products_new_field
ON products(new_field);

-- Update RLS policy if needed
DROP POLICY IF EXISTS "policy_name" ON products;
CREATE POLICY "policy_name" ON products ...;

COMMIT;
```

### Data Migrations

```sql
-- Batch updates for large tables
UPDATE products
SET new_field = 'default_value'
WHERE company_id = 'specific-company'
  AND new_field IS NULL
LIMIT 1000;
```

## Monitoring

### Database Health

```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### RLS Performance

```sql
-- Check policy execution
SELECT * FROM pg_policies;

-- Test policy performance
EXPLAIN ANALYZE
SELECT * FROM products
WHERE company_id = get_user_company_id();
```

## Security Best Practices

1. **Never disable RLS** in production
2. **Use helper functions** for reusable logic
3. **Validate input** at application layer
4. **Encrypt sensitive data** (use pgcrypto)
5. **Regular security audits** of policies
6. **Monitor failed policy checks** in logs
7. **Use service_role** key only in backend
8. **Rotate API keys** periodically

## Support

For issues or questions:

- Check Supabase docs: https://supabase.com/docs
- Database migrations: https://supabase.com/docs/guides/database/migrations
- RLS policies: https://supabase.com/docs/guides/auth/row-level-security
