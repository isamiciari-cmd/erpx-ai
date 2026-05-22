-- ============================================================================
-- Row Level Security (RLS) Policies
-- Multi-tenant Data Isolation
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(perm TEXT)
RETURNS BOOLEAN AS $$
  SELECT 
    CASE
      WHEN (SELECT (r.permissions->>'all')::boolean FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = auth.uid()) THEN true
      WHEN (SELECT (r.permissions->>perm)::boolean FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = auth.uid()) THEN true
      ELSE false
    END;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- COMPANIES - Users can only see their own company
-- ============================================================================
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = get_user_company_id());

CREATE POLICY "Admins can update their company"
  ON companies FOR UPDATE
  USING (id = get_user_company_id() AND user_has_permission('admin'));

-- ============================================================================
-- USERS - Isolated by company
-- ============================================================================
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can insert users in their company"
  ON users FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_has_permission('hr'));

CREATE POLICY "Admins can update users in their company"
  ON users FOR UPDATE
  USING (company_id = get_user_company_id() AND user_has_permission('hr'));

CREATE POLICY "Admins can delete users in their company"
  ON users FOR DELETE
  USING (company_id = get_user_company_id() AND user_has_permission('hr'));

-- ============================================================================
-- CUSTOMERS - Isolated by company
-- ============================================================================
CREATE POLICY "Users can view customers in their company"
  ON customers FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Sales users can create customers"
  ON customers FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_has_permission('sales'));

CREATE POLICY "Sales users can update customers"
  ON customers FOR UPDATE
  USING (company_id = get_user_company_id() AND user_has_permission('sales'));

CREATE POLICY "Admins can delete customers"
  ON customers FOR DELETE
  USING (company_id = get_user_company_id() AND user_has_permission('admin'));

-- ============================================================================
-- PRODUCTS - Isolated by company
-- ============================================================================
CREATE POLICY "Users can view products in their company"
  ON products FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Inventory managers can create products"
  ON products FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_has_permission('inventory'));

CREATE POLICY "Inventory managers can update products"
  ON products FOR UPDATE
  USING (company_id = get_user_company_id() AND user_has_permission('inventory'));

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (company_id = get_user_company_id() AND user_has_permission('admin'));

-- ============================================================================
-- INVENTORY - Accessible by company
-- ============================================================================
CREATE POLICY "Users can view inventory in their company"
  ON inventory FOR SELECT
  USING (product_id IN (SELECT id FROM products WHERE company_id = get_user_company_id()));

CREATE POLICY "Inventory managers can modify inventory"
  ON inventory FOR ALL
  USING (product_id IN (SELECT id FROM products WHERE company_id = get_user_company_id()) AND user_has_permission('inventory'));

-- ============================================================================
-- INVOICES - Isolated by company
-- ============================================================================
CREATE POLICY "Users can view invoices in their company"
  ON invoices FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Finance users can create invoices"
  ON invoices FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_has_permission('finance'));

CREATE POLICY "Finance users can update invoices"
  ON invoices FOR UPDATE
  USING (company_id = get_user_company_id() AND user_has_permission('finance'));

CREATE POLICY "Admins can delete invoices"
  ON invoices FOR DELETE
  USING (company_id = get_user_company_id() AND user_has_permission('admin'));

-- ============================================================================
-- SALES ORDERS - Isolated by company
-- ============================================================================
CREATE POLICY "Users can view sales orders in their company"
  ON sales_orders FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Sales users can create orders"
  ON sales_orders FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_has_permission('sales'));

CREATE POLICY "Sales users can update orders"
  ON sales_orders FOR UPDATE
  USING (company_id = get_user_company_id() AND user_has_permission('sales'));

-- ============================================================================
-- PURCHASE ORDERS - Isolated by company
-- ============================================================================
CREATE POLICY "Users can view purchase orders in their company"
  ON purchase_orders FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Purchase users can create POs"
  ON purchase_orders FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_has_permission('purchases'));

CREATE POLICY "Purchase users can update POs"
  ON purchase_orders FOR UPDATE
  USING (company_id = get_user_company_id() AND user_has_permission('purchases'));

-- ============================================================================
-- EMPLOYEES - Isolated by company
-- ============================================================================
CREATE POLICY "Users can view employees in their company"
  ON employees FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "HR users can manage employees"
  ON employees FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('hr'));

-- ============================================================================
-- ATTENDANCE - Isolated by company
-- ============================================================================
CREATE POLICY "Users can view attendance in their company"
  ON attendance FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "HR users can manage attendance"
  ON attendance FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('hr'));

-- ============================================================================
-- AUDIT LOGS - Read-only for company users
-- ============================================================================
CREATE POLICY "Users can view audit logs in their company"
  ON audit_logs FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- NOTIFICATIONS - User-specific
-- ============================================================================
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- CHART OF ACCOUNTS - Company-specific
-- ============================================================================
CREATE POLICY "Users can view accounts in their company"
  ON chart_of_accounts FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Finance users can manage accounts"
  ON chart_of_accounts FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('finance'));

-- ============================================================================
-- JOURNAL ENTRIES - Company-specific
-- ============================================================================
CREATE POLICY "Users can view journal entries in their company"
  ON journal_entries FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Finance users can manage journal entries"
  ON journal_entries FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('finance'));

-- ============================================================================
-- BRANCHES - Company-specific
-- ============================================================================
CREATE POLICY "Users can view branches in their company"
  ON branches FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Admins can manage branches"
  ON branches FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('admin'));

-- ============================================================================
-- ROLES - System and company-specific
-- ============================================================================
CREATE POLICY "Users can view roles"
  ON roles FOR SELECT
  USING (company_id IS NULL OR company_id = get_user_company_id());

CREATE POLICY "Admins can manage company roles"
  ON roles FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('admin'));

-- ============================================================================
-- SUPPLIERS - Company-specific
-- ============================================================================
CREATE POLICY "Users can view suppliers in their company"
  ON suppliers FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Purchase users can manage suppliers"
  ON suppliers FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('purchases'));

-- ============================================================================
-- WAREHOUSES - Company-specific
-- ============================================================================
CREATE POLICY "Users can view warehouses in their company"
  ON warehouses FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Inventory managers can manage warehouses"
  ON warehouses FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('inventory'));

-- ============================================================================
-- DEPARTMENTS - Company-specific
-- ============================================================================
CREATE POLICY "Users can view departments in their company"
  ON departments FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "HR users can manage departments"
  ON departments FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('hr'));

-- ============================================================================
-- LEAVE TYPES - Company-specific
-- ============================================================================
CREATE POLICY "Users can view leave types in their company"
  ON leave_types FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "HR users can manage leave types"
  ON leave_types FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('hr'));

-- ============================================================================
-- LEAVE REQUESTS - Company-specific with employee self-service
-- ============================================================================
CREATE POLICY "Users can view leave requests in their company"
  ON leave_requests FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Employees can create their own leave requests"
  ON leave_requests FOR INSERT
  WITH CHECK (
    company_id = get_user_company_id() AND
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "HR users can manage all leave requests"
  ON leave_requests FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('hr'));

-- ============================================================================
-- PRODUCT CATEGORIES - Company-specific
-- ============================================================================
CREATE POLICY "Users can view categories in their company"
  ON product_categories FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Inventory managers can manage categories"
  ON product_categories FOR ALL
  USING (company_id = get_user_company_id() AND user_has_permission('inventory'));

-- ============================================================================
-- INVENTORY MOVEMENTS - Company-specific
-- ============================================================================
CREATE POLICY "Users can view inventory movements in their company"
  ON inventory_movements FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Inventory users can create movements"
  ON inventory_movements FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND user_has_permission('inventory'));
