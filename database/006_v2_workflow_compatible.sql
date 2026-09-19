-- ERPX-AI V2 Compatible Workflow Migration
-- Purchase Requests + Goods Receipts + Inventory Movements + Report Audit
-- Designed for the existing Supabase Cloud schema.

BEGIN;

-- ============================================================
-- 1. PURCHASE REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  request_number VARCHAR(50) NOT NULL,
  requested_by UUID REFERENCES users(id),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date DATE,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','rejected','converted','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, request_number)
);

CREATE TABLE IF NOT EXISTS purchase_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  description TEXT,
  quantity NUMERIC(15,2) NOT NULL CHECK (quantity > 0),
  estimated_unit_cost NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. GOODS RECEIPTS
-- ============================================================

CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  receipt_number VARCHAR(50) NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id),
  warehouse_id UUID REFERENCES warehouses(id),
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','accepted','partial','rejected','cancelled')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  ordered_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
  received_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
  rejected_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (received_quantity >= 0 AND rejected_quantity >= 0)
);

-- ============================================================
-- 3. INVENTORY MOVEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,

  movement_number VARCHAR(100) NOT NULL,
  movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  movement_type VARCHAR(20) NOT NULL
    CHECK (movement_type IN ('IN','OUT','TRANSFER','ADJUST')),

  quantity NUMERIC(15,3) NOT NULL
    CHECK (quantity > 0),

  from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,

  reference_type VARCHAR(50),
  reference_id UUID,
  notes TEXT,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id, movement_number),

  CHECK (
    (
      movement_type IN ('IN','OUT','ADJUST')
      AND warehouse_id IS NOT NULL
    )
    OR
    (
      movement_type = 'TRANSFER'
      AND from_warehouse_id IS NOT NULL
      AND to_warehouse_id IS NOT NULL
      AND from_warehouse_id <> to_warehouse_id
    )
  )
);

-- ============================================================
-- 4. REPORT EXPORT AUDIT
-- ============================================================

CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  report_type VARCHAR(100) NOT NULL,
  format VARCHAR(20) NOT NULL
    CHECK (format IN ('pdf','excel','csv','print')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_purchase_requests_company_status
  ON purchase_requests(company_id, status);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_date
  ON purchase_requests(request_date DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_request_items_request
  ON purchase_request_items(request_id);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_company_status
  ON goods_receipts(company_id, status);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_po
  ON goods_receipts(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_receipt
  ON goods_receipt_items(receipt_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_date
  ON inventory_movements(company_id, movement_date DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_warehouse
  ON inventory_movements(product_id, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference
  ON inventory_movements(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_report_exports_company_date
  ON report_exports(company_id, created_at DESC);

-- ============================================================
-- 6. RLS
-- ============================================================

ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchase_requests_company_access
  ON purchase_requests;

CREATE POLICY purchase_requests_company_access
ON purchase_requests
FOR ALL
USING (
  company_id = (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id = (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS purchase_request_items_company_access
  ON purchase_request_items;

CREATE POLICY purchase_request_items_company_access
ON purchase_request_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM purchase_requests pr
    WHERE pr.id = request_id
      AND pr.company_id = (
        SELECT company_id
        FROM users
        WHERE id = auth.uid()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM purchase_requests pr
    WHERE pr.id = request_id
      AND pr.company_id = (
        SELECT company_id
        FROM users
        WHERE id = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS goods_receipts_company_access
  ON goods_receipts;

CREATE POLICY goods_receipts_company_access
ON goods_receipts
FOR ALL
USING (
  company_id = (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id = (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS goods_receipt_items_company_access
  ON goods_receipt_items;

CREATE POLICY goods_receipt_items_company_access
ON goods_receipt_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM goods_receipts gr
    WHERE gr.id = receipt_id
      AND gr.company_id = (
        SELECT company_id
        FROM users
        WHERE id = auth.uid()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM goods_receipts gr
    WHERE gr.id = receipt_id
      AND gr.company_id = (
        SELECT company_id
        FROM users
        WHERE id = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS inventory_movements_company_access ON inventory_movements;

CREATE POLICY inventory_movements_company_access
ON inventory_movements
FOR SELECT
USING (
  company_id = (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id = (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS report_exports_company_access
  ON report_exports;

CREATE POLICY report_exports_company_access
ON report_exports
FOR ALL
USING (
  company_id = (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id = (
    SELECT company_id
    FROM users
    WHERE id = auth.uid()
  )
);

-- ============================================================
-- 7. ATOMIC INVENTORY MOVEMENT RPC
-- ============================================================

CREATE OR REPLACE FUNCTION create_inventory_movement(
  p_company_id UUID,
  p_product_id UUID,
  p_movement_type VARCHAR,
  p_quantity NUMERIC,
  p_movement_number VARCHAR,
  p_warehouse_id UUID DEFAULT NULL,
  p_from_warehouse_id UUID DEFAULT NULL,
  p_to_warehouse_id UUID DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_company_id UUID;
  v_product_company_id UUID;
  v_source_company_id UUID;
  v_target_company_id UUID;
  v_current_quantity INTEGER;
  v_movement_id UUID;
  v_type VARCHAR(20);
  v_quantity INTEGER;
BEGIN
  v_type := UPPER(TRIM(p_movement_type));

  IF v_type NOT IN ('IN','OUT','TRANSFER','ADJUST') THEN
    RAISE EXCEPTION 'Unsupported movement type: %', p_movement_type;
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity <> TRUNC(p_quantity) THEN
    RAISE EXCEPTION 'Inventory movement quantity must be a positive whole number';
  END IF;

  v_quantity := p_quantity::INTEGER;

  IF p_movement_number IS NULL OR LENGTH(TRIM(p_movement_number)) = 0 THEN
    RAISE EXCEPTION 'Movement number is required';
  END IF;

  SELECT company_id
  INTO v_user_company_id
  FROM users
  WHERE id = auth.uid();

  IF v_user_company_id IS NULL OR v_user_company_id <> p_company_id THEN
    RAISE EXCEPTION 'Company access denied';
  END IF;

  SELECT company_id
  INTO v_product_company_id
  FROM products
  WHERE id = p_product_id;

  IF v_product_company_id IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  IF v_product_company_id <> p_company_id THEN
    RAISE EXCEPTION 'Product does not belong to the requested company';
  END IF;

  IF v_type IN ('IN','OUT','ADJUST') THEN
    IF p_warehouse_id IS NULL THEN
      RAISE EXCEPTION 'Warehouse is required for % movements', v_type;
    END IF;

    SELECT company_id
    INTO v_source_company_id
    FROM warehouses
    WHERE id = p_warehouse_id;

    IF v_source_company_id IS NULL OR v_source_company_id <> p_company_id THEN
      RAISE EXCEPTION 'Warehouse access denied';
    END IF;
  END IF;

  IF v_type = 'TRANSFER' THEN
    IF p_from_warehouse_id IS NULL
       OR p_to_warehouse_id IS NULL
       OR p_from_warehouse_id = p_to_warehouse_id THEN
      RAISE EXCEPTION 'Valid source and destination warehouses are required for transfers';
    END IF;

    SELECT company_id
    INTO v_source_company_id
    FROM warehouses
    WHERE id = p_from_warehouse_id;

    SELECT company_id
    INTO v_target_company_id
    FROM warehouses
    WHERE id = p_to_warehouse_id;

    IF v_source_company_id IS NULL
       OR v_target_company_id IS NULL
       OR v_source_company_id <> p_company_id
       OR v_target_company_id <> p_company_id THEN
      RAISE EXCEPTION 'Transfer warehouse access denied';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM inventory_movements
    WHERE company_id = p_company_id
      AND movement_number = TRIM(p_movement_number)
  ) THEN
    RAISE EXCEPTION 'Movement number already exists: %', p_movement_number;
  END IF;

  IF v_type = 'IN' THEN

    INSERT INTO inventory (
      product_id,
      warehouse_id,
      quantity_available,
      quantity_reserved,
      quantity_on_order,
      last_counted_at,
      created_at,
      updated_at
    )
    VALUES (
      p_product_id,
      p_warehouse_id,
      v_quantity,
      0,
      0,
      NULL,
      NOW(),
      NOW()
    )
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantity_available = inventory.quantity_available + EXCLUDED.quantity_available,
      updated_at = NOW();

  ELSIF v_type = 'OUT' THEN

    SELECT quantity_available
    INTO v_current_quantity
    FROM inventory
    WHERE product_id = p_product_id
      AND warehouse_id = p_warehouse_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
      RAISE EXCEPTION 'Inventory record not found';
    END IF;

    IF v_current_quantity < v_quantity THEN
      RAISE EXCEPTION
        'Insufficient stock. Available: %, requested: %',
        v_current_quantity,
        v_quantity;
    END IF;

    UPDATE inventory
    SET quantity_available = quantity_available - v_quantity,
        updated_at = NOW()
    WHERE product_id = p_product_id
      AND warehouse_id = p_warehouse_id;

  ELSIF v_type = 'ADJUST' THEN

    INSERT INTO inventory (
      product_id,
      warehouse_id,
      quantity_available,
      quantity_reserved,
      quantity_on_order,
      last_counted_at,
      created_at,
      updated_at
    )
    VALUES (
      p_product_id,
      p_warehouse_id,
      v_quantity,
      0,
      0,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantity_available = EXCLUDED.quantity_available,
      last_counted_at = NOW(),
      updated_at = NOW();

  ELSIF v_type = 'TRANSFER' THEN

    SELECT quantity_available
    INTO v_current_quantity
    FROM inventory
    WHERE product_id = p_product_id
      AND warehouse_id = p_from_warehouse_id
    FOR UPDATE;

    IF v_current_quantity IS NULL THEN
      RAISE EXCEPTION 'Source inventory record not found';
    END IF;

    IF v_current_quantity < v_quantity THEN
      RAISE EXCEPTION
        'Insufficient stock for transfer. Available: %, requested: %',
        v_current_quantity,
        v_quantity;
    END IF;

    UPDATE inventory
    SET quantity_available = quantity_available - v_quantity,
        updated_at = NOW()
    WHERE product_id = p_product_id
      AND warehouse_id = p_from_warehouse_id;

    INSERT INTO inventory (
      product_id,
      warehouse_id,
      quantity_available,
      quantity_reserved,
      quantity_on_order,
      last_counted_at,
      created_at,
      updated_at
    )
    VALUES (
      p_product_id,
      p_to_warehouse_id,
      v_quantity,
      0,
      0,
      NULL,
      NOW(),
      NOW()
    )
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantity_available = inventory.quantity_available + EXCLUDED.quantity_available,
      updated_at = NOW();

  END IF;

  INSERT INTO inventory_movements (
    company_id,
    product_id,
    warehouse_id,
    movement_number,
    movement_date,
    movement_type,
    quantity,
    from_warehouse_id,
    to_warehouse_id,
    reference_type,
    reference_id,
    notes,
    created_by,
    created_at
  )
  VALUES (
    p_company_id,
    p_product_id,
    CASE
      WHEN v_type = 'TRANSFER' THEN p_from_warehouse_id
      ELSE p_warehouse_id
    END,
    TRIM(p_movement_number),
    NOW(),
    v_type,
    p_quantity,
    CASE WHEN v_type = 'TRANSFER' THEN p_from_warehouse_id ELSE NULL END,
    CASE WHEN v_type = 'TRANSFER' THEN p_to_warehouse_id ELSE NULL END,
    p_reference_type,
    p_reference_id,
    p_notes,
    auth.uid(),
    NOW()
  )
  RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$;

REVOKE ALL ON FUNCTION create_inventory_movement(
  UUID, UUID, VARCHAR, NUMERIC, VARCHAR, UUID, UUID, UUID, VARCHAR, UUID, TEXT, UUID
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_inventory_movement(
  UUID, UUID, VARCHAR, NUMERIC, VARCHAR, UUID, UUID, UUID, VARCHAR, UUID, TEXT, UUID
) TO authenticated;

COMMIT;
