-- CREATE SALES AND SHIFTS TABLES FOR ERPX-AI
-- Run this in Supabase SQL Editor to create POS/Cashier tables

-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  sale_number VARCHAR(50) NOT NULL UNIQUE,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'mada', 'apple_pay', 'bank_transfer', 'split')),
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0,
  change_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded', 'on_hold')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on company_id for faster queries
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_shift_id ON sales(shift_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_number ON sales(sale_number);

-- Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
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

-- Create index on cashier_id and branch_id for faster queries
CREATE INDEX IF NOT EXISTS idx_shifts_cashier_id ON shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_shifts_branch_id ON shifts(branch_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);

-- Enable Row Level Security
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Sales
-- Users can only see sales from their company
CREATE POLICY "Users can view sales from their company"
  ON sales
  FOR SELECT
  USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Cashiers can insert sales
CREATE POLICY "Cashiers can create sales"
  ON sales
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.permissions->>'pos_access' = 'true'
      AND u.company_id = sales.company_id
    )
  );

-- Managers and admins can update sales
CREATE POLICY "Managers can update sales"
  ON sales
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND (r.name = 'admin' OR r.name = 'manager')
      AND u.company_id = sales.company_id
    )
  );

-- Only admins can delete sales
CREATE POLICY "Admins can delete sales"
  ON sales
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'admin'
      AND u.company_id = sales.company_id
    )
  );

-- RLS Policies for Shifts
-- Users can only see shifts from their company
CREATE POLICY "Users can view shifts from their company"
  ON shifts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND company_id = (
        SELECT company_id FROM users u2
        JOIN branches b ON shifts.branch_id = b.id
        WHERE u2.id = auth.uid()
      )
    )
  );

-- Cashiers can insert their own shifts
CREATE POLICY "Cashiers can create their own shifts"
  ON shifts
  FOR INSERT
  WITH CHECK (
    cashier_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.permissions->>'open_close_shift' = 'true'
    )
  );

-- Cashiers can update their own shifts
CREATE POLICY "Cashiers can update their own shifts"
  ON shifts
  FOR UPDATE
  USING (
    cashier_id = auth.uid()
  );

-- Managers and admins can update any shift in their company
CREATE POLICY "Managers can update any shift"
  ON shifts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND (r.name = 'admin' OR r.name = 'manager')
    )
  );

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE sales IS 'POS sales transactions';
COMMENT ON TABLE shifts IS 'Cashier shifts for tracking daily operations';
COMMENT ON COLUMN sales.items IS 'JSONB array of sale items with product details';
COMMENT ON COLUMN sales.payment_method IS 'Payment method: cash, card, mada, apple_pay, bank_transfer, or split';
COMMENT ON COLUMN shifts.status IS 'Shift status: open or closed';

-- Verify tables were created
SELECT
  'sales' AS table_name,
  COUNT(*) AS record_count
FROM sales
UNION ALL
SELECT
  'shifts' AS table_name,
  COUNT(*) AS record_count
FROM shifts;
