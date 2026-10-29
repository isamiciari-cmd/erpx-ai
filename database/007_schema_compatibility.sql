-- Additive bridge for 01_schema.sql and the current Supabase application model.
-- Run before 03_sales_invoicing_zatca.sql and 006_v2_workflow_compatible.sql.
BEGIN;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name = 'users' AND column_name = 'firebase_uid' AND is_nullable = 'NO') THEN
    RAISE EXCEPTION 'Firebase schema detected. Migrate Auth identities before applying the Supabase installation.';
  END IF;
END $$;

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS onboarding_owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS vat_number text;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2) NOT NULL DEFAULT 15;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_point integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS item_code text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'GOODS';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tracking_method text NOT NULL DEFAULT 'NONE';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_stock_level integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id);
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS quantity_on_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS last_counted_at timestamptz;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS performed_by uuid REFERENCES public.users(id) DEFAULT auth.uid();
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) DEFAULT auth.uid();
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS from_warehouse_id uuid REFERENCES public.warehouses(id);
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS to_warehouse_id uuid REFERENCES public.warehouses(id);
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS reference_type varchar(50);
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS reference_id uuid;
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.inventory_movements ALTER COLUMN performed_by SET DEFAULT auth.uid();

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sales_order_id uuid REFERENCES public.sales_orders(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_amount numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_due numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_status varchar(20) DEFAULT 'unpaid';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS reference_number varchar(100);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS zatca_uuid uuid;
ALTER TABLE public.invoice_lines ADD COLUMN IF NOT EXISTS discount_amount numeric(18,2) DEFAULT 0;
ALTER TABLE public.invoice_lines ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2) DEFAULT 0;
ALTER TABLE public.invoice_lines ADD COLUMN IF NOT EXISTS vat_amount numeric(18,2) DEFAULT 0;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.company_id FROM public.users u WHERE u.id = auth.uid() AND u.status = 'active';
$$;
CREATE OR REPLACE FUNCTION public.user_has_permission(perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT FROM public.users u JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND u.status = 'active'
      AND (r.company_id IS NULL OR r.company_id = u.company_id)
      AND (r.permissions->>'all' = 'true' OR r.permissions->>perm = 'true')
  );
$$;
REVOKE ALL ON FUNCTION public.get_user_company_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(), public.user_has_permission(text) TO authenticated;

-- Line tables were missing RLS in the original base installation.
DO $$
DECLARE t text; parent text; parent_key text; permission text;
BEGIN
  FOR t, parent, parent_key, permission IN VALUES
    ('invoice_lines','invoices','invoice_id','finance'),
    ('sales_order_lines','sales_orders','sales_order_id','sales'),
    ('purchase_order_lines','purchase_orders','purchase_order_id','purchases'),
    ('journal_entry_lines','journal_entries','journal_entry_id','finance')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS erpx_parent_tenant_read ON public.%I', t);
    EXECUTE format('CREATE POLICY erpx_parent_tenant_read ON public.%I FOR SELECT TO authenticated USING (EXISTS (SELECT FROM public.%I p WHERE p.id = %I AND p.company_id = public.get_user_company_id()))', t, parent, parent_key);
    EXECUTE format('DROP POLICY IF EXISTS erpx_parent_tenant_write ON public.%I', t);
    EXECUTE format('CREATE POLICY erpx_parent_tenant_write ON public.%I FOR ALL TO authenticated USING (public.user_has_permission(%L) AND EXISTS (SELECT FROM public.%I p WHERE p.id = %I AND p.company_id = public.get_user_company_id())) WITH CHECK (public.user_has_permission(%L) AND EXISTS (SELECT FROM public.%I p WHERE p.id = %I AND p.company_id = public.get_user_company_id()))', t, permission, parent, parent_key, permission, parent, parent_key);
  END LOOP;
END $$;
COMMIT;
