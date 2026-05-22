-- ============================================================================
-- ERPX-AI Production Database Schema
-- PostgreSQL 15+ with Supabase
-- Complete Multi-tenant ERP System
-- Version: 1.0.0
-- ============================================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core System Tables
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

INSERT INTO roles (name, display_name, permissions, is_system_role) VALUES
('admin', 'Administrator', '{"all": true}', true),
('manager', 'Manager', '{"finance": true, "inventory": true, "sales": true, "purchases": true, "hr": true}', true),
('employee', 'Employee', '{"read": true}', true);

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

-- Finance Module
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_code VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, account_code)
);

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
  line_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM & Sales
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_code VARCHAR(100) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  tax_id VARCHAR(100),
  credit_limit DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, customer_code)
);

CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_number VARCHAR(100) NOT NULL,
  order_date DATE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, order_number)
);

CREATE TABLE sales_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  line_number INTEGER NOT NULL
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_number VARCHAR(100) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'unpaid',
  qr_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID,
  description TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  line_number INTEGER NOT NULL
);

-- Inventory
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_category_id UUID REFERENCES product_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id),
  sku VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_price DECIMAL(15,2) NOT NULL,
  cost_price DECIMAL(15,2),
  min_stock_level INTEGER DEFAULT 0,
  unit_of_measure VARCHAR(50) DEFAULT 'pcs',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, sku)
);

CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  city VARCHAR(100),
  manager_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity_available INTEGER DEFAULT 0,
  quantity_reserved INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  movement_number VARCHAR(100) NOT NULL,
  movement_date TIMESTAMPTZ DEFAULT NOW(),
  movement_type VARCHAR(50) NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  performed_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, movement_number)
);

-- Purchasing
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_code VARCHAR(100) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, supplier_code)
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  po_number VARCHAR(100) NOT NULL,
  po_date DATE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, po_number)
);

CREATE TABLE purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  line_number INTEGER NOT NULL
);

-- HR Module
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  manager_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  employee_number VARCHAR(100) NOT NULL,
  hire_date DATE NOT NULL,
  salary DECIMAL(15,2),
  employment_status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_number)
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  work_hours DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'present',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, attendance_date)
);

CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  days_per_year INTEGER,
  is_paid BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(company_id, code)
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested DECIMAL(5,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit & System
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_sales_orders_company ON sales_orders(company_id);
CREATE INDEX idx_purchase_orders_company ON purchase_orders(company_id);
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- Auto-update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
