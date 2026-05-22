-- ============================================================================
-- ERPX-AI Seed Data - Sample Data for Testing
-- Run this AFTER the main schema deployment
-- ============================================================================

-- Insert Demo Company
INSERT INTO companies (id, name, legal_name, tax_id, currency, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ERPX Demo Company',
  'ERPX Technologies LLC',
  '300000000300003',
  'SAR',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Insert Main Branch
INSERT INTO branches (id, company_id, name, code, city, country, is_headquarters)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Main Branch - Riyadh',
  'HQ-RUH',
  'Riyadh',
  'Saudi Arabia',
  true
)
ON CONFLICT (company_id, code) DO NOTHING;

-- Insert Product Categories
INSERT INTO product_categories (id, company_id, name, code, is_active) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Electronics', 'ELEC', true),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Office Supplies', 'OFFC', true),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'Furniture', 'FURN', true),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'Software', 'SOFT', true)
ON CONFLICT (company_id, name) DO NOTHING;

-- Insert Sample Products
INSERT INTO products (id, company_id, category_id, sku, product_name, description, unit_price, cost_price, vat_rate, min_stock_level, reorder_point, is_active) VALUES
  (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000020',
    'LAP-DELL-001',
    'Dell Latitude 5420 Laptop',
    'Business laptop with Intel i7, 16GB RAM, 512GB SSD',
    4500.00,
    3800.00,
    15.00,
    10,
    15,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000021',
    'CHR-ERG-001',
    'Ergonomic Office Chair',
    'Comfortable office chair with lumbar support',
    850.00,
    650.00,
    15.00,
    20,
    25,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000022',
    'DSK-STD-001',
    'Standing Desk - Adjustable',
    'Electric height-adjustable standing desk',
    1200.00,
    900.00,
    15.00,
    15,
    20,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000033',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000020',
    'MON-DELL-001',
    'Dell 27" 4K Monitor',
    'UltraSharp 4K USB-C monitor',
    1850.00,
    1500.00,
    15.00,
    12,
    18,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000034',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000023',
    'LIC-OFF365',
    'Microsoft 365 Business License',
    'Annual Microsoft 365 subscription per user',
    420.00,
    350.00,
    15.00,
    50,
    60,
    true
  )
ON CONFLICT (company_id, sku) DO NOTHING;

-- Insert Warehouse
INSERT INTO warehouses (id, company_id, name, code, city, country, is_active) VALUES
  (
    '00000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000001',
    'Main Warehouse - Riyadh',
    'WH-RUH-01',
    'Riyadh',
    'Saudi Arabia',
    true
  )
ON CONFLICT (company_id, code) DO NOTHING;

-- Insert Inventory Records
INSERT INTO inventory (product_id, warehouse_id, quantity_available, quantity_reserved, quantity_on_order) VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000040', 150, 20, 50),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000040', 80, 10, 30),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000040', 45, 5, 15),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000040', 95, 15, 25),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000040', 250, 50, 100)
ON CONFLICT (product_id, warehouse_id) DO NOTHING;

-- Insert Sample Customers
INSERT INTO customers (id, company_id, customer_code, company_name, contact_name, email, phone, city, country, status, credit_limit) VALUES
  (
    '00000000-0000-0000-0000-000000000050',
    '00000000-0000-0000-0000-000000000001',
    'CUST-001',
    'Acme Corporation',
    'John Doe',
    'john.doe@acme.com',
    '+966501234567',
    'Riyadh',
    'Saudi Arabia',
    'active',
    50000.00
  ),
  (
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000001',
    'CUST-002',
    'TechStart Inc',
    'Jane Smith',
    'jane.smith@techstart.com',
    '+966507654321',
    'Jeddah',
    'Saudi Arabia',
    'active',
    75000.00
  ),
  (
    '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000001',
    'CUST-003',
    'Global Trade Co',
    'Mike Johnson',
    'mike.johnson@globaltrade.com',
    '+966509876543',
    'Dammam',
    'Saudi Arabia',
    'active',
    100000.00
  )
ON CONFLICT (company_id, customer_code) DO NOTHING;

-- Insert Sample Suppliers
INSERT INTO suppliers (id, company_id, supplier_code, company_name, contact_name, email, phone, city, country, status) VALUES
  (
    '00000000-0000-0000-0000-000000000060',
    '00000000-0000-0000-0000-000000000001',
    'SUP-001',
    'Office Supplies Ltd',
    'Sarah Ahmed',
    'sarah@officesupplies.com',
    '+966551234567',
    'Riyadh',
    'Saudi Arabia',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000061',
    '00000000-0000-0000-0000-000000000001',
    'SUP-002',
    'Tech Equipment Co',
    'Ahmed Ali',
    'ahmed@techequip.com',
    '+966557654321',
    'Jeddah',
    'Saudi Arabia',
    'active'
  )
ON CONFLICT (company_id, supplier_code) DO NOTHING;

-- Insert Departments
INSERT INTO departments (id, company_id, name, code, is_active) VALUES
  ('00000000-0000-0000-0000-000000000070', '00000000-0000-0000-0000-000000000001', 'Sales', 'SALES', true),
  ('00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000001', 'Finance', 'FIN', true),
  ('00000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000001', 'IT', 'IT', true),
  ('00000000-0000-0000-0000-000000000073', '00000000-0000-0000-0000-000000000001', 'HR', 'HR', true),
  ('00000000-0000-0000-0000-000000000074', '00000000-0000-0000-0000-000000000001', 'Operations', 'OPS', true)
ON CONFLICT (company_id, code) DO NOTHING;

-- Success Message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Sample data inserted successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo Company: ERPX Demo Company';
  RAISE NOTICE 'Products: 5 items';
  RAISE NOTICE 'Customers: 3 companies';
  RAISE NOTICE 'Suppliers: 2 companies';
  RAISE NOTICE 'Inventory: Stock levels populated';
  RAISE NOTICE 'Departments: 5 departments';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready for testing!';
  RAISE NOTICE '========================================';
END $$;

