-- ERPX-AI Seed Data
-- Sample data for development and testing

-- ============================================
-- COMPANY & BRANCHES
-- ============================================

-- Insert sample company
INSERT INTO companies (id, name, legal_name, tax_id, vat_number, country, currency, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'ERPX Technologies', 'ERPX Technologies LLC', 'TAX-12345', '300123456700003', 'SA', 'SAR', 'active');

-- Insert branches
INSERT INTO branches (id, company_id, name, code, city, is_headquarters, status) VALUES
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'Main Branch - Riyadh', 'RYD-01', 'Riyadh', true, 'active'),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'Jeddah Branch', 'JED-01', 'Jeddah', false, 'active'),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'Dammam Branch', 'DAM-01', 'Dammam', false, 'active');

-- ============================================
-- WAREHOUSES
-- ============================================

INSERT INTO warehouses (id, company_id, branch_id, name, code, status) VALUES
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'Main Warehouse', 'WH-MAIN', 'active'),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', 'Jeddah Warehouse', 'WH-JED', 'active'),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440013', 'Dammam Warehouse', 'WH-DAM', 'active');

-- ============================================
-- CATEGORIES
-- ============================================

INSERT INTO categories (id, company_id, name, description, status) VALUES
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440001', 'Electronics', 'Electronic devices and accessories', 'active'),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440001', 'Clothing', 'Apparel and fashion items', 'active'),
('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440001', 'Food & Beverages', 'Food products and drinks', 'active'),
('550e8400-e29b-41d4-a716-446655440034', '550e8400-e29b-41d4-a716-446655440001', 'Home & Garden', 'Home improvement and garden supplies', 'active'),
('550e8400-e29b-41d4-a716-446655440035', '550e8400-e29b-41d4-a716-446655440001', 'Sports & Outdoors', 'Sports equipment and outdoor gear', 'active');

-- ============================================
-- PRODUCTS
-- ============================================

INSERT INTO products (id, company_id, category_id, sku, name, unit_of_measure, cost_price, selling_price, vat_rate, min_stock_level, reorder_point, is_active) VALUES
-- Electronics
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440031', 'ELC-001', 'Wireless Mouse', 'unit', 25.00, 49.99, 15.00, 30, 50, true),
('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440031', 'ELC-002', 'USB-C Cable', 'unit', 5.00, 12.99, 15.00, 100, 150, true),
('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440031', 'ELC-003', 'Laptop Stand', 'unit', 35.00, 79.99, 15.00, 20, 40, true),
('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440031', 'ELC-004', 'Headphones', 'unit', 45.00, 99.99, 15.00, 25, 50, true),
-- Clothing
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440032', 'CLT-045', 'T-Shirt Blue', 'unit', 8.00, 24.99, 15.00, 50, 80, true),
('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440032', 'CLT-046', 'Jeans Regular Fit', 'unit', 20.00, 59.99, 15.00, 30, 50, true),
-- Food
('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440033', 'FD-123', 'Coffee Beans 1kg', 'kg', 15.00, 39.99, 15.00, 100, 150, true),
('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440033', 'FD-124', 'Organic Tea Box', 'unit', 8.00, 19.99, 15.00, 50, 80, true),
-- Home & Garden
('550e8400-e29b-41d4-a716-446655440071', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440034', 'HM-089', 'Desk Lamp', 'unit', 18.00, 44.99, 15.00, 25, 40, true),
('550e8400-e29b-41d4-a716-446655440072', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440034', 'HM-090', 'Plant Pot', 'unit', 6.00, 14.99, 15.00, 40, 60, true),
-- Sports
('550e8400-e29b-41d4-a716-446655440081', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440035', 'SPT-056', 'Yoga Mat', 'unit', 12.00, 29.99, 15.00, 40, 60, true),
('550e8400-e29b-41d4-a716-446655440082', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440035', 'SPT-057', 'Water Bottle', 'unit', 5.00, 15.00, 15.00, 100, 150, true);

-- ============================================
-- INVENTORY
-- ============================================

INSERT INTO inventory (product_id, warehouse_id, quantity_available, quantity_reserved) VALUES
-- Main Warehouse
('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440021', 8, 2),
('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440021', 245, 15),
('550e8400-e29b-41d4-a716-446655440043', '550e8400-e29b-41d4-a716-446655440021', 50, 5),
('550e8400-e29b-41d4-a716-446655440044', '550e8400-e29b-41d4-a716-446655440021', 35, 10),
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440021', 15, 5),
('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440021', 42, 8),
('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440021', 22, 10),
('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440021', 67, 12),
('550e8400-e29b-41d4-a716-446655440071', '550e8400-e29b-41d4-a716-446655440021', 12, 3),
('550e8400-e29b-41d4-a716-446655440072', '550e8400-e29b-41d4-a716-446655440021', 54, 6),
('550e8400-e29b-41d4-a716-446655440081', '550e8400-e29b-41d4-a716-446655440021', 18, 8),
('550e8400-e29b-41d4-a716-446655440082', '550e8400-e29b-41d4-a716-446655440021', 167, 25);

-- ============================================
-- CUSTOMERS
-- ============================================

INSERT INTO customers (id, company_id, customer_code, name, email, phone, city, country, credit_limit, payment_terms, status) VALUES
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'CUS-001', 'Ahmed Trading Co.', 'ahmed@trading.com', '+966501234567', 'Riyadh', 'SA', 100000.00, 30, 'active'),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'CUS-002', 'Al-Noor Electronics', 'info@alnoor.com', '+966507654321', 'Jeddah', 'SA', 75000.00, 30, 'active'),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440001', 'CUS-003', 'Saudi Tech Solutions', 'sales@sauditech.com', '+966509876543', 'Dammam', 'SA', 50000.00, 15, 'active'),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440001', 'CUS-004', 'Modern Retail Group', 'contact@modernretail.com', '+966502468135', 'Riyadh', 'SA', 60000.00, 30, 'active');

-- ============================================
-- SUPPLIERS
-- ============================================

INSERT INTO suppliers (id, company_id, supplier_code, name, email, phone, city, country, payment_terms, status) VALUES
('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440001', 'SUP-001', 'Global Electronics Supply', 'orders@globalsupply.com', '+971501234567', 'Dubai', 'AE', 45, 'active'),
('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440001', 'SUP-002', 'Fashion Importers Ltd', 'sales@fashionimport.com', '+86138123456789', 'Guangzhou', 'CN', 60, 'active'),
('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440001', 'SUP-003', 'Coffee Direct', 'info@coffeedirect.com', '+55119876543', 'São Paulo', 'BR', 30, 'active');

-- ============================================
-- SALES ORDERS
-- ============================================

INSERT INTO sales_orders (id, company_id, branch_id, order_number, customer_id, order_date, status, subtotal, vat_amount, total_amount) VALUES
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'SO-2026-001', '550e8400-e29b-41d4-a716-446655440101', '2026-05-01', 'confirmed', 2000.00, 300.00, 2300.00),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', 'SO-2026-002', '550e8400-e29b-41d4-a716-446655440102', '2026-05-03', 'confirmed', 1500.00, 225.00, 1725.00),
('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'SO-2026-003', '550e8400-e29b-41d4-a716-446655440103', '2026-05-04', 'draft', 3200.00, 480.00, 3680.00);

-- ============================================
-- INVOICES
-- ============================================

INSERT INTO invoices (id, company_id, branch_id, invoice_number, customer_id, sales_order_id, invoice_date, due_date, status, subtotal, vat_amount, total_amount, amount_paid, amount_due, is_zatca_compliant) VALUES
('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'INV-2026-001', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440301', '2026-05-01', '2026-05-31', 'paid', 2000.00, 300.00, 2300.00, 2300.00, 0.00, true),
('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', 'INV-2026-002', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440302', '2026-05-03', '2026-06-02', 'sent', 1500.00, 225.00, 1725.00, 0.00, 1725.00, true),
('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'INV-2026-003', '550e8400-e29b-41d4-a716-446655440103', NULL, '2026-04-15', '2026-05-15', 'overdue', 3200.00, 480.00, 3680.00, 0.00, 3680.00, true);

-- ============================================
-- EXPENSE CATEGORIES
-- ============================================

INSERT INTO expense_categories (id, company_id, name, description) VALUES
('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440001', 'Payroll', 'Employee salaries and benefits'),
('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440001', 'Operations', 'General operational expenses'),
('550e8400-e29b-41d4-a716-446655440503', '550e8400-e29b-41d4-a716-446655440001', 'Marketing', 'Marketing and advertising costs'),
('550e8400-e29b-41d4-a716-446655440504', '550e8400-e29b-41d4-a716-446655440001', 'Utilities', 'Electricity, water, internet'),
('550e8400-e29b-41d4-a716-446655440505', '550e8400-e29b-41d4-a716-446655440001', 'Rent', 'Office and warehouse rent');

-- ============================================
-- EXPENSES
-- ============================================

INSERT INTO expenses (id, company_id, branch_id, category_id, expense_number, expense_date, amount, vat_amount, description, status) VALUES
('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440502', 'EXP-2026-001', '2026-05-01', 5000.00, 750.00, 'Office supplies monthly purchase', 'approved'),
('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440504', 'EXP-2026-002', '2026-05-02', 2500.00, 375.00, 'Electricity bill - April', 'approved'),
('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440503', 'EXP-2026-003', '2026-05-03', 8000.00, 1200.00, 'Digital marketing campaign', 'approved');

-- Note: Firebase users will be created through the authentication flow
-- The users table will be populated when users sign in for the first time
