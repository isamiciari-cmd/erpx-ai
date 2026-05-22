-- ERPX-AI PostgreSQL Database Schema
-- Cloud SQL for Firebase SQL Connect

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Companies (Multi-tenant support)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(50),
    vat_number VARCHAR(50),
    country VARCHAR(2) DEFAULT 'SA',
    currency VARCHAR(3) DEFAULT 'SAR',
    fiscal_year_start DATE,
    logo_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branches (Multi-location support)
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    address TEXT,
    city VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    manager_id UUID,
    is_headquarters BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (Firebase Auth linked)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    phone VARCHAR(50),
    role_id UUID REFERENCES roles(id),
    branch_id UUID REFERENCES branches(id),
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    employee_code VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(15, 2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CRM TABLES
-- ============================================

-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    tax_id VARCHAR(50),
    vat_number VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(2),
    credit_limit DECIMAL(15, 2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    supplier_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    tax_id VARCHAR(50),
    vat_number VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(2),
    payment_terms INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INVENTORY TABLES
-- ============================================

-- Product Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    barcode VARCHAR(100),
    unit_of_measure VARCHAR(50) DEFAULT 'unit',
    cost_price DECIMAL(15, 2) DEFAULT 0,
    selling_price DECIMAL(15, 2) DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 15.00,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    reorder_point INTEGER,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Warehouses
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    address TEXT,
    manager_id UUID REFERENCES employees(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory (Current stock levels)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity_available INTEGER DEFAULT 0,
    quantity_reserved INTEGER DEFAULT 0,
    last_counted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id)
);

-- Inventory Movements
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id),
    movement_type VARCHAR(20) NOT NULL, -- IN, OUT, TRANSFER, ADJUST
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50), -- SALE, PURCHASE, TRANSFER, ADJUSTMENT
    reference_id UUID,
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SALES TABLES
-- ============================================

-- Sales Orders
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    order_date DATE NOT NULL,
    delivery_date DATE,
    status VARCHAR(20) DEFAULT 'draft', -- draft, confirmed, shipped, delivered, cancelled
    subtotal DECIMAL(15, 2) DEFAULT 0,
    vat_amount DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Order Items
CREATE TABLE sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 15.00,
    line_total DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PURCHASE TABLES
-- ============================================

-- Purchase Orders
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, confirmed, received, cancelled
    subtotal DECIMAL(15, 2) DEFAULT 0,
    vat_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Items
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    vat_rate DECIMAL(5, 2) DEFAULT 15.00,
    line_total DECIMAL(15, 2) NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INVOICING TABLES
-- ============================================

-- Invoices (ZATCA Compliant)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    sales_order_id UUID REFERENCES sales_orders(id),
    invoice_type VARCHAR(20) DEFAULT 'standard', -- standard, credit_note, debit_note
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    subtotal DECIMAL(15, 2) DEFAULT 0,
    vat_amount DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    amount_due DECIMAL(15, 2) DEFAULT 0,
    -- ZATCA E-Invoice Fields
    qr_code TEXT,
    zatca_uuid VARCHAR(255),
    zatca_hash VARCHAR(255),
    is_zatca_compliant BOOLEAN DEFAULT false,
    zatca_submitted_at TIMESTAMP,
    payment_terms TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 15.00,
    vat_amount DECIMAL(15, 2) DEFAULT 0,
    line_total DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PAYMENT TABLES
-- ============================================

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_type VARCHAR(20) NOT NULL, -- receivable, payable
    reference_type VARCHAR(50), -- invoice, purchase_order
    reference_id UUID,
    customer_id UUID REFERENCES customers(id),
    supplier_id UUID REFERENCES suppliers(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50), -- cash, card, bank_transfer, check
    transaction_reference VARCHAR(255),
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EXPENSE TABLES
-- ============================================

-- Expense Categories
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    category_id UUID REFERENCES expense_categories(id),
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    expense_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    vat_amount DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    payment_method VARCHAR(50),
    receipt_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- HR & PAYROLL TABLES
-- ============================================

-- Payroll
CREATE TABLE payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    payroll_number VARCHAR(50) UNIQUE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    basic_salary DECIMAL(15, 2) NOT NULL,
    allowances DECIMAL(15, 2) DEFAULT 0,
    deductions DECIMAL(15, 2) DEFAULT 0,
    net_salary DECIMAL(15, 2) NOT NULL,
    payment_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    status VARCHAR(20) DEFAULT 'present', -- present, absent, late, half_day, leave
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, attendance_date)
);

-- ============================================
-- AUDIT & LOGGING
-- ============================================

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity_type VARCHAR(100), -- users, products, invoices, etc.
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);

-- Customers
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_code ON customers(customer_code);

-- Suppliers
CREATE INDEX idx_suppliers_company_id ON suppliers(company_id);

-- Products
CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);

-- Inventory
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);

-- Inventory Movements
CREATE INDEX idx_movements_company_id ON inventory_movements(company_id);
CREATE INDEX idx_movements_product_id ON inventory_movements(product_id);
CREATE INDEX idx_movements_created_at ON inventory_movements(created_at);

-- Sales Orders
CREATE INDEX idx_sales_orders_company_id ON sales_orders(company_id);
CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_date ON sales_orders(order_date);

-- Invoices
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

-- Payments
CREATE INDEX idx_payments_company_id ON payments(company_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- Audit Logs
CREATE INDEX idx_audit_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- ============================================
-- SEED DATA (Default Roles)
-- ============================================

INSERT INTO roles (name, display_name, description, permissions) VALUES
('admin', 'Administrator', 'Full system access', '{"all": true}'::jsonb),
('manager', 'Manager', 'Department management access', '{"read": true, "write": true, "delete": false}'::jsonb),
('employee', 'Employee', 'Limited access to assigned tasks', '{"read": true, "write": false, "delete": false}'::jsonb),
('accountant', 'Accountant', 'Financial data access', '{"finance": true, "invoices": true}'::jsonb),
('sales', 'Sales Representative', 'Sales module access', '{"sales": true, "customers": true}'::jsonb),
('warehouse', 'Warehouse Staff', 'Inventory management access', '{"inventory": true, "products": true}'::jsonb);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all relevant tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update inventory on movement
CREATE OR REPLACE FUNCTION update_inventory_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movement_type = 'IN' THEN
        UPDATE inventory
        SET quantity_available = quantity_available + NEW.quantity
        WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
    ELSIF NEW.movement_type = 'OUT' THEN
        UPDATE inventory
        SET quantity_available = quantity_available - NEW.quantity
        WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
    ELSIF NEW.movement_type = 'TRANSFER' THEN
        -- Decrease from source warehouse
        UPDATE inventory
        SET quantity_available = quantity_available - NEW.quantity
        WHERE product_id = NEW.product_id AND warehouse_id = NEW.from_warehouse_id;
        -- Increase in destination warehouse
        UPDATE inventory
        SET quantity_available = quantity_available + NEW.quantity
        WHERE product_id = NEW.product_id AND warehouse_id = NEW.to_warehouse_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory
AFTER INSERT ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION update_inventory_on_movement();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Dashboard Financial Summary View
CREATE OR REPLACE VIEW vw_financial_summary AS
SELECT
    company_id,
    SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status IN ('draft', 'sent') THEN total_amount ELSE 0 END) as pending_revenue,
    SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as overdue_amount,
    COUNT(*) as total_invoices,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices
FROM invoices
GROUP BY company_id;

-- Low Stock Alert View
CREATE OR REPLACE VIEW vw_low_stock_products AS
SELECT
    p.id,
    p.company_id,
    p.sku,
    p.name,
    p.min_stock_level,
    p.reorder_point,
    w.name as warehouse_name,
    i.quantity_available,
    i.quantity_reserved,
    CASE
        WHEN i.quantity_available <= p.min_stock_level THEN 'critical'
        WHEN i.quantity_available <= p.reorder_point THEN 'warning'
        ELSE 'normal'
    END as stock_status
FROM products p
JOIN inventory i ON p.id = i.product_id
JOIN warehouses w ON i.warehouse_id = w.id
WHERE i.quantity_available <= p.reorder_point
ORDER BY i.quantity_available ASC;

-- Sales Performance View
CREATE OR REPLACE VIEW vw_sales_performance AS
SELECT
    so.company_id,
    so.branch_id,
    DATE_TRUNC('month', so.order_date) as month,
    COUNT(*) as order_count,
    SUM(so.total_amount) as total_sales,
    AVG(so.total_amount) as average_order_value
FROM sales_orders so
WHERE so.status NOT IN ('cancelled')
GROUP BY so.company_id, so.branch_id, DATE_TRUNC('month', so.order_date);
