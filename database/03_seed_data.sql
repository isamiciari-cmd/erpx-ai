-- ============================================================================
-- Seed Data for Testing
-- ============================================================================

-- Insert Demo Company
INSERT INTO companies (id, name, legal_name, tax_id, currency, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ERPX Demo Company',
  'ERPX Technologies LLC',
  'SA-123456789',
  'SAR',
  'active'
);

-- Insert Main Branch
INSERT INTO branches (company_id, name, code, city, country, is_headquarters)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Main Branch',
  'HQ',
  'Riyadh',
  'Saudi Arabia',
  true
);

-- Insert Sample Customers
INSERT INTO customers (company_id, customer_code, company_name, contact_name, email, phone, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'CUST001', 'Acme Corporation', 'John Doe', 'john@acme.com', '+966501234567', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'CUST002', 'TechStart Inc', 'Jane Smith', 'jane@techstart.com', '+966507654321', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'CUST003', 'Global Trade Co', 'Mike Johnson', 'mike@globaltrade.com', '+966509876543', 'active');

-- Insert Sample Suppliers
INSERT INTO suppliers (company_id, supplier_code, company_name, contact_name, email, phone, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'SUP001', 'Office Supplies Ltd', 'Sarah Ahmed', 'sarah@officesup.com', '+966551234567', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'SUP002', 'Tech Equipment Co', 'Ahmed Ali', 'ahmed@techequip.com', '+966557654321', 'active');

-- Insert Product Categories
INSERT INTO product_categories (company_id, name)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Electronics'),
  ('00000000-0000-0000-0000-000000000001', 'Office Supplies'),
  ('00000000-0000-0000-0000-000000000001', 'Furniture');

-- Insert Sample Products
INSERT INTO products (company_id, category_id, sku, product_name, description, unit_price, cost_price, min_stock_level, unit_of_measure, is_active)
SELECT
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM product_categories WHERE name = 'Electronics' LIMIT 1),
  'PROD001',
  'Laptop - Dell Latitude 5420',
  'Business laptop with 16GB RAM, 512GB SSD',
  4500.00,
  3800.00,
  10,
  'pcs',
  true
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM product_categories WHERE name = 'Office Supplies' LIMIT 1),
  'PROD002',
  'Office Chair - Ergonomic',
  'Comfortable ergonomic office chair',
  850.00,
  650.00,
  20,
  'pcs',
  true
UNION ALL SELECT
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM product_categories WHERE name = 'Office Supplies' LIMIT 1),
  'PROD003',
  'Desk - Standing Desk',
  'Adjustable height standing desk',
  1200.00,
  900.00,
  15,
  'pcs',
  true;

-- Insert Warehouse
INSERT INTO warehouses (company_id, name, code, city, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Main Warehouse',
  'WH001',
  'Riyadh',
  true
);

-- Insert Inventory
INSERT INTO inventory (product_id, warehouse_id, quantity_available, quantity_reserved)
SELECT
  p.id,
  (SELECT id FROM warehouses WHERE code = 'WH001' LIMIT 1),
  CASE
    WHEN p.sku = 'PROD001' THEN 150
    WHEN p.sku = 'PROD002' THEN 80
    WHEN p.sku = 'PROD003' THEN 45
  END,
  CASE
    WHEN p.sku = 'PROD001' THEN 20
    WHEN p.sku = 'PROD002' THEN 10
    WHEN p.sku = 'PROD003' THEN 5
  END
FROM products p
WHERE p.company_id = '00000000-0000-0000-0000-000000000001';

-- Insert Departments
INSERT INTO departments (company_id, name, code, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Sales', 'SALES', true),
  ('00000000-0000-0000-0000-000000000001', 'Finance', 'FIN', true),
  ('00000000-0000-0000-0000-000000000001', 'IT', 'IT', true),
  ('00000000-0000-0000-0000-000000000001', 'HR', 'HR', true);

-- Insert Leave Types
INSERT INTO leave_types (company_id, name, code, days_per_year, is_paid, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Annual Leave', 'ANNUAL', 30, true, true),
  ('00000000-0000-0000-0000-000000000001', 'Sick Leave', 'SICK', 15, true, true),
  ('00000000-0000-0000-0000-000000000001', 'Emergency Leave', 'EMERGENCY', 5, true, true);

-- Insert Chart of Accounts (Basic Structure)
INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, is_active)
VALUES
  -- Assets
  ('00000000-0000-0000-0000-000000000001', '1000', 'Assets', 'asset', true),
  ('00000000-0000-0000-0000-000000000001', '1100', 'Current Assets', 'asset', true),
  ('00000000-0000-0000-0000-000000000001', '1110', 'Cash and Bank', 'asset', true),
  ('00000000-0000-0000-0000-000000000001', '1120', 'Accounts Receivable', 'asset', true),
  ('00000000-0000-0000-0000-000000000001', '1130', 'Inventory', 'asset', true),
  
  -- Liabilities
  ('00000000-0000-0000-0000-000000000001', '2000', 'Liabilities', 'liability', true),
  ('00000000-0000-0000-0000-000000000001', '2100', 'Current Liabilities', 'liability', true),
  ('00000000-0000-0000-0000-000000000001', '2110', 'Accounts Payable', 'liability', true),
  ('00000000-0000-0000-0000-000000000001', '2120', 'VAT Payable', 'liability', true),
  
  -- Equity
  ('00000000-0000-0000-0000-000000000001', '3000', 'Equity', 'equity', true),
  ('00000000-0000-0000-0000-000000000001', '3100', 'Capital', 'equity', true),
  ('00000000-0000-0000-0000-000000000001', '3200', 'Retained Earnings', 'equity', true),
  
  -- Revenue
  ('00000000-0000-0000-0000-000000000001', '4000', 'Revenue', 'revenue', true),
  ('00000000-0000-0000-0000-000000000001', '4100', 'Sales Revenue', 'revenue', true),
  ('00000000-0000-0000-0000-000000000001', '4200', 'Service Revenue', 'revenue', true),
  
  -- Expenses
  ('00000000-0000-0000-0000-000000000001', '5000', 'Expenses', 'expense', true),
  ('00000000-0000-0000-0000-000000000001', '5100', 'Cost of Goods Sold', 'expense', true),
  ('00000000-0000-0000-0000-000000000001', '5200', 'Salaries and Wages', 'expense', true),
  ('00000000-0000-0000-0000-000000000001', '5300', 'Rent Expense', 'expense', true),
  ('00000000-0000-0000-0000-000000000001', '5400', 'Utilities Expense', 'expense', true);

