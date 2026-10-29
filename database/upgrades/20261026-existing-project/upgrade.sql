-- Target-specific upgrade for the inspected ERPX Supabase project.
-- Existing tables, identity IDs, financial rows and migration history are preserved.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='45s';
SET LOCAL search_path=public,extensions,pg_catalog;
DO $$ BEGIN IF to_regclass('public.roles') IS NULL OR to_regclass('public.user_roles') IS NULL OR to_regclass('public.users') IS NULL THEN RAISE EXCEPTION 'Wrong database baseline'; END IF; END $$;
-- Fail the entire transaction if any original public value changes.
-- Short transaction-level locks also prevent concurrent writes during this check.
CREATE TEMP TABLE erpx_upgrade_original_rows(table_name text,column_names text[],row_hash text,row_count bigint) ON COMMIT DROP;
DO $$ DECLARE t record; columns_sql text; checksum text; n bigint; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace WHERE s.nspname='public' AND c.relkind='r' ORDER BY c.relname LOOP
  EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',t.relname);
 END LOOP;
 FOR t IN SELECT c.relname,array_agg(a.attname::text ORDER BY a.attnum) cols FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped WHERE s.nspname='public' AND c.relkind='r' GROUP BY c.relname LOOP
  SELECT string_agg(quote_ident(x),',') INTO columns_sql FROM unnest(t.cols) x;
  EXECUTE format('SELECT md5(coalesce(jsonb_agg(x ORDER BY x::text)::text,''[]'')),count(*) FROM (SELECT to_jsonb(r) x FROM (SELECT %s FROM public.%I) r) s',columns_sql,t.relname) INTO checksum,n;
  INSERT INTO erpx_upgrade_original_rows VALUES(t.relname,t.cols,checksum,n);
 END LOOP;
END $$;
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_number VARCHAR(100) NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, entry_number)
);
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  line_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Additive bridge for 01_schema.sql and the current Supabase application model.
-- Run before 03_sales_invoicing_zatca.sql and 006_v2_workflow_compatible.sql.

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

-- Transactional POS and persisted invoice drafts. No external payment capture or
-- ZATCA submission is claimed by these database functions.

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS request_payload jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS draft_request_id uuid;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS draft_request_payload jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS sales_company_idempotency ON public.sales(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_draft_request ON public.invoices(company_id, draft_request_id) WHERE draft_request_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS shifts_one_open_per_cashier ON public.shifts(company_id,branch_id,cashier_id) WHERE status = 'open';

-- Restrictive policies fence off older permissive policies (which otherwise OR
-- together). Completed POS documents must only be written by atomic RPCs.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['sales','shifts','payments','invoices','customers','products','warehouses','journal_entries','chart_of_accounts'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS erpx_active_company_fence ON public.%I', t);
    EXECUTE format('CREATE POLICY erpx_active_company_fence ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (company_id = public.get_user_company_id()) WITH CHECK (company_id = public.get_user_company_id())', t);
  END LOOP;
END $$;
DROP POLICY IF EXISTS erpx_no_direct_pos_insert ON public.sales;
CREATE POLICY erpx_no_direct_pos_insert ON public.sales AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (status IN ('draft','on_hold') AND invoice_id IS NULL AND journal_entry_id IS NULL);
DROP POLICY IF EXISTS erpx_no_direct_pos_update ON public.sales;
CREATE POLICY erpx_no_direct_pos_update ON public.sales AS RESTRICTIVE FOR UPDATE TO authenticated USING (status IN ('draft','on_hold') AND invoice_id IS NULL) WITH CHECK (status IN ('draft','on_hold','cancelled') AND invoice_id IS NULL AND journal_entry_id IS NULL);
DROP POLICY IF EXISTS erpx_no_direct_pos_delete ON public.sales;
CREATE POLICY erpx_no_direct_pos_delete ON public.sales AS RESTRICTIVE FOR DELETE TO authenticated USING (status IN ('draft','on_hold') AND invoice_id IS NULL);
DROP POLICY IF EXISTS erpx_cashier_held_orders ON public.sales;
CREATE POLICY erpx_cashier_held_orders ON public.sales FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id() AND cashier_id = auth.uid() AND status = 'on_hold' AND public.user_has_permission('pos_access'))
  WITH CHECK (company_id = public.get_user_company_id() AND cashier_id = auth.uid() AND status = 'on_hold' AND public.user_has_permission('pos_access'));
DROP POLICY IF EXISTS erpx_cashier_shift_scope ON public.shifts;
CREATE POLICY erpx_cashier_shift_scope ON public.shifts AS RESTRICTIVE FOR ALL TO authenticated
  USING (cashier_id = auth.uid() OR public.user_has_permission('admin'))
  WITH CHECK (cashier_id = auth.uid() AND EXISTS (SELECT FROM public.branches b WHERE b.id = branch_id AND b.company_id = public.get_user_company_id()));
DROP POLICY IF EXISTS erpx_no_direct_shift_close ON public.shifts;
CREATE POLICY erpx_no_direct_shift_close ON public.shifts AS RESTRICTIVE FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS erpx_valid_shift_open ON public.shifts;
CREATE POLICY erpx_valid_shift_open ON public.shifts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (status = 'open' AND opening_cash >= 0 AND total_sales = 0 AND total_refunds = 0 AND closed_at IS NULL AND closing_cash IS NULL);
DROP POLICY IF EXISTS erpx_cashier_can_open_shift ON public.shifts;
CREATE POLICY erpx_cashier_can_open_shift ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (cashier_id = auth.uid() AND company_id = public.get_user_company_id() AND (public.user_has_permission('sales') OR public.user_has_permission('pos_access')));
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['invoices','journal_entries'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS erpx_only_draft_insert ON public.%I',t);
    EXECUTE format('CREATE POLICY erpx_only_draft_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (status = ''draft'' AND created_by = auth.uid())',t);
    EXECUTE format('DROP POLICY IF EXISTS erpx_only_draft_update ON public.%I',t);
    EXECUTE format('CREATE POLICY erpx_only_draft_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (status = ''draft'') WITH CHECK (status = ''draft'')',t);
    EXECUTE format('DROP POLICY IF EXISTS erpx_only_draft_delete ON public.%I',t);
    EXECUTE format('CREATE POLICY erpx_only_draft_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (status = ''draft'')',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments','erpx_no_direct_payment_'||lower(t));
    EXECUTE format('CREATE POLICY %I ON public.payments AS RESTRICTIVE FOR %s TO authenticated %s',
      'erpx_no_direct_payment_'||lower(t),t,CASE WHEN t='INSERT' THEN 'WITH CHECK (false)' ELSE 'USING (false)' END);
  END LOOP;
END $$;
DO $$ DECLARE t text; parent text; parent_key text; predicate text; BEGIN
  FOR t,parent,parent_key IN VALUES ('invoice_lines','invoices','invoice_id'),('journal_entry_lines','journal_entries','journal_entry_id') LOOP
    predicate := format('EXISTS (SELECT FROM public.%I p WHERE p.id = %I AND p.status = ''draft'')',parent,parent_key);
    EXECUTE format('DROP POLICY IF EXISTS erpx_line_draft_insert ON public.%I',t);
    EXECUTE format('CREATE POLICY erpx_line_draft_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)',t,predicate);
    EXECUTE format('DROP POLICY IF EXISTS erpx_line_draft_update ON public.%I',t);
    EXECUTE format('CREATE POLICY erpx_line_draft_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',t,predicate,predicate);
    EXECUTE format('DROP POLICY IF EXISTS erpx_line_draft_delete ON public.%I',t);
    EXECUTE format('CREATE POLICY erpx_line_draft_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (%s)',t,predicate);
  END LOOP;
END $$;

-- Tenant checks must hold for both sides of an inventory relationship.
DROP POLICY IF EXISTS erpx_inventory_tenant_fence ON public.inventory;
CREATE POLICY erpx_inventory_tenant_fence ON public.inventory AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT FROM public.products p JOIN public.warehouses w ON w.id = warehouse_id WHERE p.id = product_id AND p.company_id = public.get_user_company_id() AND w.company_id = p.company_id))
  WITH CHECK (EXISTS (SELECT FROM public.products p JOIN public.warehouses w ON w.id = warehouse_id WHERE p.id = product_id AND p.company_id = public.get_user_company_id() AND w.company_id = p.company_id));

CREATE OR REPLACE FUNCTION public.erpx_guard_user_security_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE assigned public.roles%ROWTYPE; BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND NEW.id = auth.uid() AND NOT EXISTS(SELECT FROM public.users u WHERE u.id=auth.uid())
    AND EXISTS(SELECT FROM public.companies c JOIN public.roles r ON r.id=NEW.role_id AND (r.company_id IS NULL OR r.company_id=c.id) WHERE c.id=NEW.company_id AND c.onboarding_owner_id=auth.uid() AND r.id=NEW.role_id AND r.name='admin') THEN RETURN NEW; END IF;
  IF NEW.company_id IS DISTINCT FROM public.get_user_company_id() THEN RAISE EXCEPTION 'User company access denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO assigned FROM public.roles r WHERE r.id = NEW.role_id AND (r.company_id IS NULL OR r.company_id = NEW.company_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Role does not belong to this company'; END IF;
  IF NEW.branch_id IS NOT NULL AND NOT EXISTS (SELECT FROM public.branches b WHERE b.id = NEW.branch_id AND b.company_id = NEW.company_id) THEN RAISE EXCEPTION 'User branch access denied'; END IF;
  IF assigned.name IN ('owner','developer','super_admin') AND (TG_OP = 'INSERT' OR NEW.role_id IS DISTINCT FROM OLD.role_id) THEN RAISE EXCEPTION 'Platform roles must be assigned by a trusted server administrator'; END IF;
  IF NOT public.user_has_permission('admin') THEN
    IF TG_OP = 'UPDATE' AND (NEW.role_id IS DISTINCT FROM OLD.role_id OR NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.branch_id IS DISTINCT FROM OLD.branch_id OR NEW.status IS DISTINCT FROM OLD.status) THEN RAISE EXCEPTION 'Only administrators can change user access' USING ERRCODE = '42501'; END IF;
    IF TG_OP = 'INSERT' AND (assigned.permissions->>'all' = 'true' OR assigned.permissions->>'admin' = 'true' OR assigned.name NOT IN ('employee','viewer')) THEN RAISE EXCEPTION 'Only administrators can assign elevated roles' USING ERRCODE = '42501'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS erpx_guard_user_security_fields ON public.users;
CREATE TRIGGER erpx_guard_user_security_fields BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.erpx_guard_user_security_fields();

-- Compute snapshots from trusted catalog values; ignore all client supplied
-- names, prices, VAT rates, line totals and tax totals.
CREATE OR REPLACE FUNCTION public.erpx_calculate_invoice_lines(p_company_id uuid, p_items jsonb, p_document_discount numeric DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_variable
DECLARE
  item jsonb; product public.products%ROWTYPE; quantity numeric; percentage numeric;
  raw numeric; line_discount numeric; net numeric; tax numeric; allocated numeric;
  remaining_discount numeric; remaining_net numeric; discount numeric;
  subtotal numeric := 0; discounts numeric := 0; taxable numeric := 0; vat numeric := 0;
  prepared jsonb := '[]'; lines jsonb := '[]'; seen uuid[] := ARRAY[]::uuid[];
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'Items must be an array'; END IF;
  IF jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 500 THEN RAISE EXCEPTION 'An invoice requires 1 to 500 items'; END IF;
  IF p_document_discount IS NULL OR p_document_discount::text IN ('NaN','Infinity','-Infinity') OR p_document_discount < 0 OR round(p_document_discount,2) <> p_document_discount THEN RAISE EXCEPTION 'Invalid document discount'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(item) <> 'object' OR jsonb_typeof(item->'quantity') <> 'number' THEN RAISE EXCEPTION 'Invalid invoice item'; END IF;
    SELECT * INTO product FROM public.products p WHERE p.id = (item->>'product_id')::uuid AND p.company_id = p_company_id AND p.is_active FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product not found, inactive or outside company'; END IF;
    IF product.id = ANY(seen) THEN RAISE EXCEPTION 'Combine duplicate product lines before checkout'; END IF;
    seen := array_append(seen,product.id);
    quantity := (item->>'quantity')::numeric;
    percentage := coalesce((item->>'discount_percentage')::numeric,0);
    IF quantity::text IN ('NaN','Infinity','-Infinity') OR quantity <= 0 OR quantity > 1000000 OR quantity <> trunc(quantity) THEN RAISE EXCEPTION 'Quantity must be a positive whole number'; END IF;
    IF percentage::text IN ('NaN','Infinity','-Infinity') OR percentage < 0 OR percentage > 100 THEN RAISE EXCEPTION 'Invalid line discount'; END IF;
    IF product.unit_price IS NULL OR product.unit_price < 0 OR product.unit_price::text IN ('NaN','Infinity','-Infinity') OR product.vat_rate IS NULL OR product.vat_rate NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Invalid catalog price or VAT configuration'; END IF;
    IF product.cost_price IS NOT NULL AND (product.cost_price < 0 OR product.cost_price::text IN ('NaN','Infinity','-Infinity')) THEN RAISE EXCEPTION 'Invalid catalog cost'; END IF;
    IF (percentage > 0 OR p_document_discount > 0) AND NOT (public.user_has_permission('sales') OR public.user_has_permission('pos_discount')) THEN RAISE EXCEPTION 'Discount permission required' USING ERRCODE = '42501'; END IF;
    raw := round(product.unit_price * quantity,2);
    line_discount := round(raw * percentage / 100,2);
    subtotal := subtotal + raw; discounts := discounts + line_discount;
    prepared := prepared || jsonb_build_array(jsonb_build_object(
      'product_id',product.id,'product_name',product.product_name,'quantity',quantity,
      'unit_price',product.unit_price,'cost_price',coalesce(product.cost_price,0),
      'track_inventory',(product.track_inventory AND product.product_type <> 'SERVICE'),'tracking_method',product.tracking_method,
      'discount_percentage',percentage,'discount_amount',line_discount,'subtotal',raw,'vat_rate',product.vat_rate));
  END LOOP;
  remaining_net := subtotal-discounts; remaining_discount := p_document_discount;
  IF remaining_discount > remaining_net THEN RAISE EXCEPTION 'Discount exceeds invoice net amount'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(prepared) LOOP
    net := (item->>'subtotal')::numeric - (item->>'discount_amount')::numeric;
    allocated := CASE WHEN remaining_net = 0 THEN 0 ELSE least(net,round(remaining_discount * net / remaining_net,2)) END;
    remaining_net := remaining_net - net; remaining_discount := remaining_discount - allocated;
    net := net - allocated; discount := (item->>'discount_amount')::numeric + allocated;
    tax := round(net * (item->>'vat_rate')::numeric / 100,2);
    taxable := taxable + net; vat := vat + tax;
    lines := lines || jsonb_build_array(item || jsonb_build_object('discount_amount',discount,'taxable_amount',net,'vat_amount',tax,'total',net+tax));
  END LOOP;
  RETURN jsonb_build_object('items',lines,'subtotal',subtotal,'discount_amount',discounts+p_document_discount,'taxable_amount',taxable,'vat_amount',vat,'total_amount',taxable+vat);
END $$;
REVOKE ALL ON FUNCTION public.erpx_calculate_invoice_lines(uuid,jsonb,numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_invoice_draft(
  p_company_id uuid,p_customer_id uuid,p_items jsonb,p_due_date date,
  p_notes text DEFAULT NULL,p_request_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_variable
DECLARE calc jsonb; item jsonb; invoice_id uuid; number text; line_no integer := 0;
  existing public.invoices%ROWTYPE; payload jsonb; currency text;
BEGIN
  IF p_company_id IS DISTINCT FROM public.get_user_company_id() OR NOT (public.user_has_permission('finance') OR public.user_has_permission('sales')) THEN RAISE EXCEPTION 'Invoice access denied' USING ERRCODE = '42501'; END IF;
  IF p_due_date IS NULL OR p_due_date < current_date OR length(coalesce(p_notes,'')) > 5000 THEN RAISE EXCEPTION 'Invalid invoice due date or notes'; END IF;
  IF NOT EXISTS (SELECT FROM public.customers c WHERE c.id = p_customer_id AND c.company_id = p_company_id AND c.status = 'active') THEN RAISE EXCEPTION 'Customer access denied'; END IF;
  payload := jsonb_build_object('customer',p_customer_id,'items',p_items,'due',p_due_date,'notes',p_notes,'user',auth.uid());
  IF p_request_id IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_company_id::text || p_request_id::text,0));
    SELECT * INTO existing FROM public.invoices i WHERE i.company_id = p_company_id AND i.draft_request_id = p_request_id;
    IF FOUND THEN
      IF existing.draft_request_payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Idempotency key reused with different invoice data'; END IF;
      RETURN jsonb_build_object('success',true,'invoice_id',existing.id,'invoice_number',existing.invoice_number,'subtotal',existing.subtotal,'discount_amount',existing.discount_amount,'vat_amount',existing.vat_amount,'total_amount',existing.total_amount);
    END IF;
  END IF;
  calc := public.erpx_calculate_invoice_lines(p_company_id,p_items,0);
  invoice_id := gen_random_uuid(); number := 'DRAFT-' || invoice_id::text;
  SELECT c.currency INTO currency FROM public.companies c WHERE c.id = p_company_id;
  INSERT INTO public.invoices(id,company_id,customer_id,invoice_number,issue_date,due_date,subtotal,discount_amount,vat_amount,total_amount,
    taxable_amount,tax_exclusive_amount,tax_inclusive_amount,payable_amount,allowance_total_amount,amount_due,amount_paid,payment_status,status,notes,created_by,currency_code,draft_request_id,draft_request_payload)
  VALUES(invoice_id,p_company_id,p_customer_id,number,current_date,p_due_date,(calc->>'subtotal')::numeric,(calc->>'discount_amount')::numeric,(calc->>'vat_amount')::numeric,(calc->>'total_amount')::numeric,
    (calc->>'taxable_amount')::numeric,(calc->>'taxable_amount')::numeric,(calc->>'total_amount')::numeric,(calc->>'total_amount')::numeric,(calc->>'discount_amount')::numeric,(calc->>'total_amount')::numeric,0,'unpaid','draft',p_notes,auth.uid(),coalesce(currency,'SAR'),p_request_id,payload);
  FOR item IN SELECT value FROM jsonb_array_elements(calc->'items') LOOP
    line_no := line_no + 1;
    INSERT INTO public.invoice_lines(invoice_id,product_id,description,quantity,unit_price,line_total,line_number,discount_amount,vat_rate,vat_amount)
    VALUES(invoice_id,(item->>'product_id')::uuid,item->>'product_name',(item->>'quantity')::numeric,(item->>'unit_price')::numeric,(item->>'taxable_amount')::numeric,line_no,(item->>'discount_amount')::numeric,(item->>'vat_rate')::numeric,(item->>'vat_amount')::numeric);
  END LOOP;
  RETURN (calc-'items') || jsonb_build_object('success',true,'invoice_id',invoice_id,'invoice_number',number);
END $$;
REVOKE ALL ON FUNCTION public.save_invoice_draft(uuid,uuid,jsonb,date,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_invoice_draft(uuid,uuid,jsonb,date,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_pos_sale(
  p_company_id uuid,p_branch_id uuid,p_cashier_id uuid,p_shift_id uuid,
  p_payment_method text,p_customer_id uuid,p_items jsonb,p_discount_amount numeric,
  p_notes text,p_idempotency_key uuid,p_warehouse_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_variable
DECLARE
  calc jsonb; item jsonb; payload jsonb; existing public.sales%ROWTYPE;
  warehouse_id uuid; warehouse_count integer; available numeric; quantity numeric;
  customer_id uuid; sale_id uuid := gen_random_uuid(); invoice_id uuid := gen_random_uuid(); payment_id uuid := gen_random_uuid(); journal_id uuid := gen_random_uuid();
  number text; line_no integer := 0; currency text; cost numeric := 0; account record;
  settlement_account uuid; sales_account uuid; vat_account uuid; cost_account uuid; inventory_account uuid;
BEGIN
  IF auth.uid() IS NULL OR p_company_id IS DISTINCT FROM public.get_user_company_id() OR p_cashier_id IS DISTINCT FROM auth.uid()
    OR NOT (public.user_has_permission('sales') OR public.user_has_permission('pos_access')) THEN RAISE EXCEPTION 'POS access denied' USING ERRCODE = '42501'; END IF;
  IF p_idempotency_key IS NULL THEN RAISE EXCEPTION 'An idempotency key is required for checkout'; END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('cash','card','mada','apple_pay','bank_transfer') THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;
  IF length(coalesce(p_notes,'')) > 5000 THEN RAISE EXCEPTION 'Notes exceed 5000 characters'; END IF;
  payload := jsonb_build_object('branch',p_branch_id,'cashier',p_cashier_id,'shift',p_shift_id,'method',p_payment_method,'customer',p_customer_id,'items',p_items,'discount',p_discount_amount,'notes',p_notes,'warehouse',p_warehouse_id);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_company_id::text || p_idempotency_key::text,0));
  SELECT * INTO existing FROM public.sales s WHERE s.company_id = p_company_id AND s.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF existing.request_payload IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Idempotency key reused with different sale data'; END IF;
    SELECT p.id INTO payment_id FROM public.payments p WHERE p.sale_id = existing.id AND p.status = 'completed';
    RETURN jsonb_build_object('success',true,'sale_id',existing.id,'sale_number',existing.sale_number,'invoice_id',existing.invoice_id,
      'invoice_number',(SELECT i.invoice_number FROM public.invoices i WHERE i.id = existing.invoice_id),'payment_id',payment_id,
      'payment_number',(SELECT p.payment_number FROM public.payments p WHERE p.id = payment_id),'customer_id',existing.customer_id,
      'subtotal',existing.subtotal,'discount_amount',existing.discount_amount,'taxable_amount',existing.subtotal-existing.discount_amount,'vat_amount',existing.vat_amount,'total_amount',existing.total_amount,'items',existing.items,'journal_entry_id',existing.journal_entry_id);
  END IF;
  IF NOT EXISTS (SELECT FROM public.branches b WHERE b.id = p_branch_id AND b.company_id = p_company_id AND b.status = 'active') THEN RAISE EXCEPTION 'Branch access denied'; END IF;
  IF EXISTS (SELECT FROM public.users u WHERE u.id = auth.uid() AND u.branch_id IS NOT NULL AND u.branch_id <> p_branch_id)
     AND NOT public.user_has_permission('admin') THEN RAISE EXCEPTION 'Cashier is not assigned to this branch'; END IF;
  PERFORM 1 FROM public.shifts s WHERE s.id = p_shift_id AND s.company_id = p_company_id AND s.branch_id = p_branch_id AND s.cashier_id = auth.uid() AND s.status = 'open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'An open shift for this cashier and branch is required'; END IF;
  IF p_warehouse_id IS NULL THEN
    SELECT count(*),(array_agg(w.id ORDER BY w.id))[1] INTO warehouse_count,warehouse_id FROM public.warehouses w WHERE w.company_id = p_company_id AND w.branch_id = p_branch_id AND w.is_active;
    IF warehouse_count <> 1 THEN RAISE EXCEPTION 'Select a warehouse assigned to this branch; automatic selection requires exactly one active warehouse'; END IF;
  ELSE warehouse_id := p_warehouse_id; END IF;
  IF NOT EXISTS (SELECT FROM public.warehouses w WHERE w.id = warehouse_id AND w.company_id = p_company_id AND w.branch_id = p_branch_id AND w.is_active) THEN RAISE EXCEPTION 'Warehouse access denied'; END IF;
  calc := public.erpx_calculate_invoice_lines(p_company_id,p_items,p_discount_amount);
  IF (calc->>'total_amount')::numeric <= 0 THEN RAISE EXCEPTION 'Sale total must be positive'; END IF;
  -- Deterministic order avoids deadlocks; row locks prevent overselling. Reserved
  -- units are unavailable to POS even while they remain physically on hand.
  FOR item IN SELECT value FROM jsonb_array_elements(calc->'items') ORDER BY value->>'product_id' LOOP
    IF NOT (item->>'track_inventory')::boolean THEN CONTINUE; END IF;
    IF item->>'tracking_method' <> 'NONE' THEN RAISE EXCEPTION 'Batch and serial tracked products require their inventory allocation workflow'; END IF;
    SELECT coalesce(i.quantity_available,0)-coalesce(i.quantity_reserved,0) INTO available FROM public.inventory i
      WHERE i.product_id = (item->>'product_id')::uuid AND i.warehouse_id = warehouse_id FOR UPDATE;
    quantity := (item->>'quantity')::numeric;
    IF NOT FOUND OR available < quantity THEN RAISE EXCEPTION 'Insufficient available stock for %', item->>'product_name'; END IF;
  END LOOP;
  IF p_customer_id IS NULL THEN
    INSERT INTO public.customers(company_id,customer_code,company_name,status) VALUES(p_company_id,'ERPX-WALK-IN','Walk-in customer','active')
      ON CONFLICT(company_id,customer_code) DO UPDATE SET customer_code = EXCLUDED.customer_code RETURNING id INTO customer_id;
  ELSE
    SELECT c.id INTO customer_id FROM public.customers c WHERE c.id = p_customer_id AND c.company_id = p_company_id AND c.status = 'active';
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer access denied'; END IF;
  END IF;
  number := replace(sale_id::text,'-','');
  SELECT c.currency INTO currency FROM public.companies c WHERE c.id = p_company_id;
  INSERT INTO public.invoices(id,company_id,branch_id,customer_id,invoice_number,issue_date,issue_time,due_date,subtotal,discount_amount,vat_amount,total_amount,
    taxable_amount,tax_exclusive_amount,tax_inclusive_amount,payable_amount,allowance_total_amount,amount_due,amount_paid,payment_status,status,created_by,notes,currency_code,invoice_subtype,reporting_status)
  VALUES(invoice_id,p_company_id,p_branch_id,customer_id,'INV-'||number,current_date,localtime,current_date,(calc->>'subtotal')::numeric,(calc->>'discount_amount')::numeric,(calc->>'vat_amount')::numeric,(calc->>'total_amount')::numeric,
    (calc->>'taxable_amount')::numeric,(calc->>'taxable_amount')::numeric,(calc->>'total_amount')::numeric,(calc->>'total_amount')::numeric,(calc->>'discount_amount')::numeric,(calc->>'total_amount')::numeric,0,'unpaid','issued',auth.uid(),p_notes,coalesce(currency,'SAR'),'02','pending');
  INSERT INTO public.sales(id,company_id,branch_id,cashier_id,shift_id,customer_id,invoice_id,sale_number,payment_method,subtotal,discount_amount,vat_amount,total_amount,amount_paid,change_amount,items,status,notes,idempotency_key,request_payload,warehouse_id)
  VALUES(sale_id,p_company_id,p_branch_id,auth.uid(),p_shift_id,customer_id,invoice_id,'POS-'||number,p_payment_method,(calc->>'subtotal')::numeric,(calc->>'discount_amount')::numeric,(calc->>'vat_amount')::numeric,(calc->>'total_amount')::numeric,(calc->>'total_amount')::numeric,0,calc->'items','completed',p_notes,p_idempotency_key,payload,warehouse_id);
  FOR item IN SELECT value FROM jsonb_array_elements(calc->'items') LOOP
    line_no := line_no+1;
    INSERT INTO public.invoice_lines(invoice_id,product_id,description,quantity,unit_price,line_total,line_number,discount_amount,vat_rate,vat_amount)
    VALUES(invoice_id,(item->>'product_id')::uuid,item->>'product_name',(item->>'quantity')::numeric,(item->>'unit_price')::numeric,(item->>'taxable_amount')::numeric,line_no,(item->>'discount_amount')::numeric,(item->>'vat_rate')::numeric,(item->>'vat_amount')::numeric);
    IF (item->>'track_inventory')::boolean THEN
    UPDATE public.inventory i SET quantity_available = i.quantity_available-(item->>'quantity')::integer,updated_at = now()
      WHERE i.product_id = (item->>'product_id')::uuid AND i.warehouse_id = warehouse_id;
    INSERT INTO public.inventory_movements(company_id,product_id,warehouse_id,movement_number,movement_type,quantity,reference_type,reference_id,performed_by,created_by)
    VALUES(p_company_id,(item->>'product_id')::uuid,warehouse_id,'POS-'||number||'-'||line_no,'OUT',(item->>'quantity')::numeric,'SALE',sale_id,auth.uid(),auth.uid());
    cost := cost + round(greatest((item->>'cost_price')::numeric,0)*(item->>'quantity')::numeric,2);
    END IF;
  END LOOP;
  INSERT INTO public.payments(id,company_id,branch_id,customer_id,invoice_id,sale_id,payment_number,payment_method,amount,currency_code,status,created_by)
  VALUES(payment_id,p_company_id,p_branch_id,customer_id,invoice_id,sale_id,'PAY-'||number,p_payment_method,(calc->>'total_amount')::numeric,coalesce(currency,'SAR'),'completed',auth.uid());
  -- Dedicated system accounts avoid guessing which existing ledger account is
  -- cash, settlement, output VAT or inventory. Reports include these native rows.
  INSERT INTO public.chart_of_accounts(company_id,account_code,account_name,account_type) VALUES
    (p_company_id,'ERPX-POS-CASH','POS cash','asset'),(p_company_id,'ERPX-POS-CARD','POS electronic payment settlement','asset'),
    (p_company_id,'ERPX-POS-SALES','POS sales revenue','revenue'),(p_company_id,'ERPX-POS-VAT','POS output VAT','liability'),
    (p_company_id,'ERPX-POS-COGS','POS cost of goods sold','expense'),(p_company_id,'ERPX-POS-STOCK','POS inventory','asset')
    ON CONFLICT(company_id,account_code) DO NOTHING;
  SELECT a.id INTO settlement_account FROM public.chart_of_accounts a WHERE a.company_id = p_company_id AND a.account_code = CASE WHEN p_payment_method = 'cash' THEN 'ERPX-POS-CASH' ELSE 'ERPX-POS-CARD' END AND a.is_active;
  SELECT a.id INTO sales_account FROM public.chart_of_accounts a WHERE a.company_id = p_company_id AND a.account_code = 'ERPX-POS-SALES' AND a.is_active;
  SELECT a.id INTO vat_account FROM public.chart_of_accounts a WHERE a.company_id = p_company_id AND a.account_code = 'ERPX-POS-VAT' AND a.is_active;
  SELECT a.id INTO cost_account FROM public.chart_of_accounts a WHERE a.company_id = p_company_id AND a.account_code = 'ERPX-POS-COGS' AND a.is_active;
  SELECT a.id INTO inventory_account FROM public.chart_of_accounts a WHERE a.company_id = p_company_id AND a.account_code = 'ERPX-POS-STOCK' AND a.is_active;
  IF settlement_account IS NULL OR sales_account IS NULL OR vat_account IS NULL OR cost_account IS NULL OR inventory_account IS NULL THEN RAISE EXCEPTION 'POS accounting account is inactive'; END IF;
  INSERT INTO public.journal_entries(id,company_id,entry_number,entry_date,description,status,created_by)
    VALUES(journal_id,p_company_id,'POS-'||number,current_date,'POS sale '||number,'posted',auth.uid());
  INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,line_number) VALUES
    (journal_id,settlement_account,(calc->>'total_amount')::numeric,0,1),
    (journal_id,sales_account,0,(calc->>'taxable_amount')::numeric,2),
    (journal_id,vat_account,0,(calc->>'vat_amount')::numeric,3),
    (journal_id,cost_account,cost,0,4),(journal_id,inventory_account,0,cost,5);
  UPDATE public.sales s SET journal_entry_id = journal_id WHERE s.id = sale_id;
  UPDATE public.shifts s SET total_sales = s.total_sales+(calc->>'total_amount')::numeric WHERE s.id = p_shift_id;
  INSERT INTO public.audit_logs(company_id,user_id,action,entity_type,entity_id,new_values)
    VALUES(p_company_id,auth.uid(),'complete_pos_sale','sales',sale_id,jsonb_build_object('invoice_id',invoice_id,'payment_id',payment_id,'journal_entry_id',journal_id,'total_amount',calc->'total_amount'));
  RETURN calc || jsonb_build_object('success',true,'sale_id',sale_id,'sale_number','POS-'||number,'invoice_id',invoice_id,'invoice_number','INV-'||number,'payment_id',payment_id,'payment_number','PAY-'||number,'customer_id',customer_id,'journal_entry_id',journal_id);
END $$;
REVOKE ALL ON FUNCTION public.complete_pos_sale(uuid,uuid,uuid,uuid,text,uuid,jsonb,numeric,text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_pos_sale(uuid,uuid,uuid,uuid,text,uuid,jsonb,numeric,text,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_pos_shift(p_shift_id uuid,p_closing_cash numeric)
RETURNS public.shifts LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_variable
DECLARE shift public.shifts%ROWTYPE; cash_sales numeric; total_sales numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.user_has_permission('sales') OR public.user_has_permission('pos_access')) THEN RAISE EXCEPTION 'Shift access denied' USING ERRCODE = '42501'; END IF;
  IF p_closing_cash IS NULL OR p_closing_cash < 0 OR p_closing_cash::text IN ('NaN','Infinity','-Infinity') OR round(p_closing_cash,2) <> p_closing_cash THEN RAISE EXCEPTION 'Invalid closing cash'; END IF;
  SELECT * INTO shift FROM public.shifts s WHERE s.id = p_shift_id AND s.company_id = public.get_user_company_id() AND s.cashier_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR shift.status <> 'open' THEN RAISE EXCEPTION 'Open shift not found'; END IF;
  SELECT coalesce(sum(s.total_amount) FILTER(WHERE s.payment_method = 'cash'),0),coalesce(sum(s.total_amount),0)
    INTO cash_sales,total_sales FROM public.sales s WHERE s.shift_id = p_shift_id AND s.status = 'completed';
  UPDATE public.shifts s SET closed_at = now(),closing_cash = p_closing_cash,expected_cash = shift.opening_cash+cash_sales,
    cash_difference = p_closing_cash-(shift.opening_cash+cash_sales),total_sales = total_sales,status = 'closed'
    WHERE s.id = p_shift_id RETURNING s.* INTO shift;
  RETURN shift;
END $$;
REVOKE ALL ON FUNCTION public.close_pos_shift(uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_pos_shift(uuid,numeric) TO authenticated;
-- Old public definer utility must not be callable to mutate other invoices.
REVOKE ALL ON FUNCTION public.recalculate_invoice_payment_state(uuid) FROM PUBLIC, anon, authenticated;

-- Company-scoped business workflows. All mutations go through a validated,
-- version-checked RPC; immutable events retain the audit trail.

CREATE TABLE IF NOT EXISTS public.business_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  module text NOT NULL CHECK (module ~ '^[a-z][a-z0-9_]{1,79}$'),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 255),
  reference text NOT NULL DEFAULT '' CHECK (length(reference) <= 120),
  status text NOT NULL DEFAULT 'draft',
  record_date date NOT NULL DEFAULT current_date,
  amount numeric(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  data jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(data) = 'object'),
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_records_company_module ON public.business_records(company_id, module, record_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS business_record_reference ON public.business_records(company_id,module,reference) WHERE reference <> '';
CREATE UNIQUE INDEX IF NOT EXISTS business_employee_pay_period ON public.business_records(company_id,(data->>'employee_id'),(data->>'pay_period')) WHERE module='hr_payroll' AND status <> 'cancelled';
CREATE UNIQUE INDEX IF NOT EXISTS business_employee_attendance_day ON public.business_records(company_id,(data->>'employee_id'),record_date) WHERE module='hr_attendance' AND status <> 'cancelled';

CREATE TABLE IF NOT EXISTS public.business_record_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  record_id uuid NOT NULL REFERENCES public.business_records(id),
  action text NOT NULL,
  old_status text,
  new_status text NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.users(id),
  before_data jsonb,
  after_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_events_record ON public.business_record_events(company_id,record_id,created_at DESC);

CREATE OR REPLACE FUNCTION public.business_can_access(p_company uuid, p_module text, p_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u JOIN public.roles r ON r.id=u.role_id
    WHERE u.id=auth.uid() AND u.company_id=p_company AND u.company_id=public.get_user_company_id() AND u.status='active'
    AND (r.company_id IS NULL OR r.company_id=u.company_id)
    AND coalesce(to_jsonb(r)->>'status','active')='active'
    AND EXISTS(SELECT 1 FROM public.companies c WHERE c.id=u.company_id AND coalesce(c.status,'active')='active')
    AND (lower(r.name) IN ('admin','super_admin','owner','developer','manager')
      OR r.permissions->>'all'='true' OR r.permissions->>'*'='true'
      OR r.permissions->>split_part(p_module,'_',1)='true'
      OR r.permissions->>p_module='true'
      OR r.permissions->>(split_part(p_module,'_',1) || CASE WHEN p_write THEN '.write' ELSE '.read' END)='true'
      OR (jsonb_typeof(r.permissions)='array' AND r.permissions ? (split_part(p_module,'_',1) || CASE WHEN p_write THEN '.write' ELSE '.read' END))
      OR (NOT p_write AND split_part(p_module,'_',1) NOT IN ('finance','hr') AND r.permissions->>'read'='true')
      OR (split_part(p_module,'_',1)='finance' AND lower(r.name) IN ('accountant','finance_manager'))
      OR (split_part(p_module,'_',1)='hr' AND lower(r.name) IN ('hr_manager','hr')))
  );
$$;
REVOKE ALL ON FUNCTION public.business_can_access(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_can_access(uuid,text,boolean) TO authenticated;

ALTER TABLE public.business_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_record_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS business_records_read ON public.business_records;
CREATE POLICY business_records_read ON public.business_records FOR SELECT TO authenticated USING (public.business_can_access(company_id,module,false));
DROP POLICY IF EXISTS business_events_read ON public.business_record_events;
CREATE POLICY business_events_read ON public.business_record_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.business_records r WHERE r.id=record_id AND r.company_id=business_record_events.company_id));
REVOKE ALL ON public.business_records,public.business_record_events FROM anon,authenticated;
GRANT SELECT ON public.business_records,public.business_record_events TO authenticated;

CREATE OR REPLACE FUNCTION public.save_business_record(p_company_id uuid, p_id uuid, p_expected_version integer, p_record jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_old public.business_records%ROWTYPE;
  v_new public.business_records%ROWTYPE;
  v_module text := p_record->>'module';
  v_status text := coalesce(p_record->>'status','draft');
  v_data jsonb := coalesce(p_record->'data','{}'::jsonb);
  v_amount numeric := coalesce((p_record->>'amount')::numeric,0);
  v_allowed text[];
  v_line jsonb;
  v_debit numeric := 0;
  v_credit numeric := 0;
  v_account public.chart_of_accounts%ROWTYPE;
  v_journal uuid;
  v_index integer := 0;
  v_user uuid := auth.uid();
  v_base numeric;
  v_allowances numeric;
  v_deductions numeric;
BEGIN
  IF v_user IS NULL OR NOT public.business_can_access(p_company_id,v_module,true) THEN RAISE EXCEPTION 'You do not have permission to change these company records.' USING ERRCODE='42501'; END IF;
  IF v_module IS NULL OR v_module !~ '^[a-z][a-z0-9_]{1,79}$' OR jsonb_typeof(v_data)<>'object' OR octet_length(v_data::text)>100000 THEN RAISE EXCEPTION 'Invalid business record.'; END IF;
  IF v_amount < 0 OR v_amount >= 10000000000000 OR v_amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid amount.'; END IF;
  IF length(btrim(coalesce(p_record->>'title',''))) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'Name is required (maximum 255 characters).'; END IF;

  IF p_id IS NOT NULL THEN
    SELECT * INTO v_old FROM public.business_records WHERE id=p_id AND company_id=p_company_id AND module=v_module FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Record not found in this company.'; END IF;
    IF p_expected_version IS DISTINCT FROM v_old.version THEN RAISE EXCEPTION 'This record changed. Refresh before saving again.' USING ERRCODE='40001'; END IF;
    IF v_old.status IN ('posted','paid','completed','cancelled') THEN RAISE EXCEPTION 'Finalized records are immutable. Create a correcting record.'; END IF;
    IF v_status <> v_old.status THEN
      v_allowed := CASE v_old.status
        WHEN 'draft' THEN ARRAY['submitted','active','cancelled']
        WHEN 'submitted' THEN ARRAY['approved','rejected','cancelled']
        WHEN 'approved' THEN ARRAY['posted','paid','completed','cancelled']
        WHEN 'active' THEN ARRAY['completed','inactive','on_hold','cancelled']
        WHEN 'inactive' THEN ARRAY['active','cancelled']
        WHEN 'on_hold' THEN ARRAY['active','cancelled']
        WHEN 'rejected' THEN ARRAY['draft','cancelled'] ELSE ARRAY[]::text[] END;
      IF NOT(v_status=ANY(v_allowed)) THEN RAISE EXCEPTION 'Invalid status transition.'; END IF;
      IF p_record->>'title' IS DISTINCT FROM v_old.title OR coalesce(p_record->>'reference','') IS DISTINCT FROM v_old.reference OR (p_record->>'record_date')::date IS DISTINCT FROM v_old.record_date OR round(v_amount,2) IS DISTINCT FROM v_old.amount OR (v_data IS DISTINCT FROM v_old.data AND NOT (v_old.status='approved' AND v_status='paid' AND v_module IN ('hr_payroll','finance_payables','finance_expenses') AND v_data-'payment_reference'=v_old.data-'payment_reference')) THEN RAISE EXCEPTION 'Save edits separately before changing status.'; END IF;
    ELSIF v_old.status IN ('submitted','approved') THEN
      RAISE EXCEPTION 'Submitted records must be rejected and returned to draft before editing.';
    END IF;
  ELSIF v_status <> 'draft' THEN RAISE EXCEPTION 'New records must start as draft.';
  END IF;

  -- Module constraints are enforced here as well as in the UI.
  IF v_module='finance_journal' THEN
    IF v_status NOT IN ('draft','submitted','approved','rejected','posted','cancelled') THEN RAISE EXCEPTION 'Invalid journal status.'; END IF;
    IF jsonb_typeof(v_data->'lines') IS DISTINCT FROM 'array' OR jsonb_array_length(v_data->'lines') NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'A journal requires 2 to 200 lines.'; END IF;
    FOR v_line IN SELECT * FROM jsonb_array_elements(v_data->'lines') LOOP
      SELECT * INTO v_account FROM public.chart_of_accounts WHERE id=(v_line->>'account_id')::uuid AND company_id=p_company_id AND is_active=true;
      IF NOT FOUND THEN RAISE EXCEPTION 'Each journal account must be active and belong to this company.'; END IF;
      IF coalesce((v_line->>'debit')::numeric,0)<0 OR coalesce((v_line->>'credit')::numeric,0)<0 OR ((coalesce((v_line->>'debit')::numeric,0)>0)=(coalesce((v_line->>'credit')::numeric,0)>0)) THEN RAISE EXCEPTION 'Each journal line needs a debit or credit, not both.'; END IF;
      IF (v_line->>'debit')::numeric::text IN ('NaN','Infinity','-Infinity') OR (v_line->>'credit')::numeric::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid journal amount.'; END IF;
      v_debit := v_debit+round(coalesce((v_line->>'debit')::numeric,0),2);
      v_credit := v_credit+round(coalesce((v_line->>'credit')::numeric,0),2);
    END LOOP;
    IF v_debit<=0 OR v_debit<>v_credit THEN RAISE EXCEPTION 'Journal debits and credits must balance.'; END IF;
    v_amount:=v_debit;
  END IF;
  IF v_module LIKE 'hr_%' AND v_module NOT IN ('hr_employees','hr_recruitment') THEN
    IF NOT EXISTS(SELECT 1 FROM public.business_records WHERE id=(v_data->>'employee_id')::uuid AND company_id=p_company_id AND module='hr_employees' AND (status='active' OR (p_id IS NOT NULL AND v_old.data->>'employee_id'=v_data->>'employee_id'))) THEN RAISE EXCEPTION 'Select an active employee in this company.'; END IF;
  END IF;
  IF v_module='hr_payroll' THEN
    IF v_status NOT IN ('draft','submitted','approved','rejected','paid','cancelled') THEN RAISE EXCEPTION 'Invalid payroll status.'; END IF;
    IF coalesce(v_data->>'pay_period','') !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Pay period must use YYYY-MM.'; END IF;
    v_base:=(v_data->>'base_salary')::numeric; v_allowances:=coalesce((v_data->>'allowances')::numeric,0); v_deductions:=coalesce((v_data->>'deductions')::numeric,0);
    IF v_base IS NULL OR v_base<0 OR v_allowances<0 OR v_deductions<0 OR v_deductions>v_base+v_allowances OR (v_base+v_allowances+v_deductions)::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid payroll amounts.'; END IF;
    v_amount:=round(v_base+v_allowances-v_deductions,2);
  END IF;
  IF v_module='finance_budgets' AND (coalesce(v_data->>'start_date','')='' OR coalesce(v_data->>'end_date','')='' OR (v_data->>'end_date')::date<(v_data->>'start_date')::date) THEN RAISE EXCEPTION 'Budget dates are required and must be in order.'; END IF;
  IF v_module='finance_assets' AND (coalesce((v_data->>'residual_value')::numeric,0)>v_amount OR coalesce((v_data->>'residual_value')::numeric,0)<0 OR coalesce((v_data->>'useful_life_months')::numeric,0)<=0) THEN RAISE EXCEPTION 'Asset life must be positive and residual value cannot exceed cost.'; END IF;
  IF v_module='hr_leave' THEN
    IF coalesce(v_data->>'start_date','')='' OR coalesce(v_data->>'end_date','')='' OR (v_data->>'end_date')::date<(v_data->>'start_date')::date THEN RAISE EXCEPTION 'Leave dates are required and must be in order.'; END IF;
    -- Serialize overlap checks for the same employee under concurrent requests.
    PERFORM 1 FROM public.business_records WHERE id=(v_data->>'employee_id')::uuid AND company_id=p_company_id FOR UPDATE;
    IF v_status IN ('submitted','approved') AND EXISTS(SELECT 1 FROM public.business_records b WHERE b.company_id=p_company_id AND b.module='hr_leave' AND b.id<>coalesce(p_id,gen_random_uuid()) AND b.status IN ('submitted','approved','completed') AND b.data->>'employee_id'=v_data->>'employee_id' AND (b.data->>'start_date')::date<=(v_data->>'end_date')::date AND (b.data->>'end_date')::date>=(v_data->>'start_date')::date) THEN RAISE EXCEPTION 'This employee already has leave covering those dates.'; END IF;
  END IF;
  IF v_module='hr_attendance' AND (coalesce(v_data->>'check_in','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR (coalesce(v_data->>'check_out','')<>'' AND (v_data->>'check_out' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR v_data->>'check_out'<v_data->>'check_in'))) THEN RAISE EXCEPTION 'Use HH:MM times; check-out must follow check-in.'; END IF;
  IF v_status='paid' AND v_module IN ('hr_payroll','finance_payables','finance_expenses') AND length(btrim(coalesce(v_data->>'payment_reference',''))) NOT BETWEEN 1 AND 250 THEN RAISE EXCEPTION 'Enter the actual bank/payment reference before marking this record paid (maximum 250 characters).'; END IF;
  IF v_module IN ('finance_payables','finance_expenses') AND v_status IN ('active','posted') THEN RAISE EXCEPTION 'Invalid finance workflow status.'; END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.business_records(company_id,module,title,reference,status,record_date,amount,data,created_by) VALUES (p_company_id,v_module,btrim(p_record->>'title'),btrim(coalesce(p_record->>'reference','')),v_status,(p_record->>'record_date')::date,v_amount,v_data,v_user) RETURNING * INTO v_new;
  ELSE
    UPDATE public.business_records SET title=btrim(p_record->>'title'),reference=btrim(coalesce(p_record->>'reference','')),status=v_status,record_date=(p_record->>'record_date')::date,amount=v_amount,data=v_data,version=version+1,updated_at=now() WHERE id=p_id RETURNING * INTO v_new;
  END IF;
  IF v_module='finance_journal' AND v_status='posted' THEN
    INSERT INTO public.journal_entries(company_id,entry_number,entry_date,description,status,created_by) VALUES(p_company_id,'BR-'||v_new.id::text,v_new.record_date,v_new.title,'posted',v_user) RETURNING id INTO v_journal;
    FOR v_line IN SELECT * FROM jsonb_array_elements(v_data->'lines') LOOP
      v_index:=v_index+1;
      INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,line_number) VALUES(v_journal,(v_line->>'account_id')::uuid,round(coalesce((v_line->>'debit')::numeric,0),2),round(coalesce((v_line->>'credit')::numeric,0),2),v_index);
    END LOOP;
  END IF;
  INSERT INTO public.business_record_events(company_id,record_id,action,old_status,new_status,actor_id,before_data,after_data) VALUES(p_company_id,v_new.id,CASE WHEN p_id IS NULL THEN 'created' WHEN v_old.status<>v_status THEN 'status_changed' ELSE 'updated' END,v_old.status,v_status,v_user,CASE WHEN p_id IS NOT NULL THEN to_jsonb(v_old) END,to_jsonb(v_new));
  RETURN to_jsonb(v_new);
END;
$$;
REVOKE ALL ON FUNCTION public.save_business_record(uuid,uuid,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_business_record(uuid,uuid,integer,jsonb) TO authenticated;

COMMENT ON TABLE public.business_records IS 'Tenant-scoped workflow records. Posted journal records are written once to the canonical journal_entries ledger.';

CREATE OR REPLACE FUNCTION public.save_business_account(p_company_id uuid,p_id uuid,p_code text,p_name text,p_type text,p_active boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_account public.chart_of_accounts%ROWTYPE;
BEGIN
  IF NOT public.business_can_access(p_company_id,'finance_accounts',true) THEN RAISE EXCEPTION 'Finance permission required.' USING ERRCODE='42501'; END IF;
  IF length(btrim(coalesce(p_code,''))) NOT BETWEEN 1 AND 50 OR length(btrim(coalesce(p_name,''))) NOT BETWEEN 1 AND 255 OR p_type NOT IN ('asset','liability','equity','revenue','expense') OR p_type IS NULL THEN RAISE EXCEPTION 'Valid code, name and account type are required.'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.chart_of_accounts(company_id,account_code,account_name,account_type,is_active) VALUES(p_company_id,btrim(p_code),btrim(p_name),p_type,p_active) RETURNING * INTO v_account;
  ELSE
    SELECT * INTO v_account FROM public.chart_of_accounts WHERE id=p_id AND company_id=p_company_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Account not found.'; END IF;
    IF (v_account.account_code<>btrim(p_code) OR v_account.account_type<>p_type) AND EXISTS(SELECT 1 FROM public.journal_entry_lines WHERE account_id=p_id) THEN RAISE EXCEPTION 'Used account codes and types cannot be changed.'; END IF;
    UPDATE public.chart_of_accounts SET account_code=btrim(p_code),account_name=btrim(p_name),account_type=p_type,is_active=p_active WHERE id=p_id RETURNING * INTO v_account;
  END IF;
  RETURN to_jsonb(v_account);
END;
$$;
REVOKE ALL ON FUNCTION public.save_business_account(uuid,uuid,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_business_account(uuid,uuid,text,text,text,boolean) TO authenticated;

-- Issuing recognizes revenue and receivables once. Payment receipts settle
-- receivables; they do not recognize the same revenue a second time.
CREATE OR REPLACE FUNCTION public.issue_invoice(p_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_line public.invoice_lines%ROWTYPE;
  v_subtotal numeric:=0; v_discount numeric:=0; v_taxable numeric:=0; v_vat numeric:=0; v_net numeric; v_tax numeric;
  v_ar uuid; v_revenue uuid; v_tax_account uuid; v_journal uuid; v_count integer:=0;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found.'; END IF;
  IF NOT public.business_can_access(v_invoice.company_id,'finance_invoices',true) THEN RAISE EXCEPTION 'Finance permission required.' USING ERRCODE='42501'; END IF;
  IF v_invoice.status<>'draft' THEN
    IF EXISTS(SELECT 1 FROM public.journal_entries WHERE company_id=v_invoice.company_id AND entry_number='INV-'||p_invoice_id::text AND status='posted') THEN RETURN to_jsonb(v_invoice); END IF;
    RAISE EXCEPTION 'Only draft invoices can be issued.';
  END IF;
  IF v_invoice.currency_code IS DISTINCT FROM (SELECT currency FROM public.companies WHERE id=v_invoice.company_id) THEN RAISE EXCEPTION 'Foreign currency posting requires an exchange-rate journal; use company currency for this workflow.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.customers WHERE id=v_invoice.customer_id AND company_id=v_invoice.company_id) THEN RAISE EXCEPTION 'The customer must belong to this company.'; END IF;
  FOR v_line IN SELECT * FROM public.invoice_lines WHERE invoice_id=p_invoice_id ORDER BY line_number FOR UPDATE LOOP
    IF v_line.product_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.products p WHERE p.id=v_line.product_id AND p.company_id=v_invoice.company_id) THEN RAISE EXCEPTION 'Invoice product must belong to this company'; END IF;
    v_count:=v_count+1;
    IF v_line.quantity<=0 OR v_line.unit_price<0 OR coalesce(v_line.discount_amount,0)<0 OR coalesce(v_line.discount_amount,0)>round(v_line.quantity*v_line.unit_price,2) OR v_line.vat_rate<0 OR v_line.vat_rate>100 THEN RAISE EXCEPTION 'Invalid invoice line amounts.'; END IF;
    v_net:=round(v_line.quantity*v_line.unit_price,2)-coalesce(v_line.discount_amount,0);
    v_tax:=round(v_net*coalesce(v_line.vat_rate,0)/100,2);
    UPDATE public.invoice_lines SET line_total=v_net,vat_amount=v_tax WHERE id=v_line.id;
    v_subtotal:=v_subtotal+round(v_line.quantity*v_line.unit_price,2);v_discount:=v_discount+coalesce(v_line.discount_amount,0);v_taxable:=v_taxable+v_net;v_vat:=v_vat+v_tax;
  END LOOP;
  IF v_count=0 OR v_taxable+v_vat<=0 THEN RAISE EXCEPTION 'A positive invoice with at least one line is required.'; END IF;
  INSERT INTO public.chart_of_accounts(company_id,account_code,account_name,account_type) VALUES(v_invoice.company_id,'ERPX-AR','Trade receivables','asset'),(v_invoice.company_id,'ERPX-POS-SALES','Sales revenue','revenue'),(v_invoice.company_id,'ERPX-POS-VAT','VAT payable','liability') ON CONFLICT(company_id,account_code) DO NOTHING;
  SELECT id INTO v_ar FROM public.chart_of_accounts WHERE company_id=v_invoice.company_id AND account_code='ERPX-AR';
  SELECT id INTO v_revenue FROM public.chart_of_accounts WHERE company_id=v_invoice.company_id AND account_code='ERPX-POS-SALES';
  SELECT id INTO v_tax_account FROM public.chart_of_accounts WHERE company_id=v_invoice.company_id AND account_code='ERPX-POS-VAT';
  IF EXISTS(SELECT 1 FROM public.chart_of_accounts WHERE id IN(v_ar,v_revenue,v_tax_account) AND NOT is_active) THEN RAISE EXCEPTION 'Activate the receivables, sales and VAT system accounts before issuing.'; END IF;
  INSERT INTO public.journal_entries(company_id,entry_number,entry_date,description,status,created_by) VALUES(v_invoice.company_id,'INV-'||p_invoice_id::text,v_invoice.issue_date,'Issue invoice '||v_invoice.invoice_number,'posted',auth.uid()) RETURNING id INTO v_journal;
  INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,line_number) VALUES(v_journal,v_ar,v_taxable+v_vat,0,1),(v_journal,v_revenue,0,v_taxable,2);
  IF v_vat>0 THEN INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,line_number) VALUES(v_journal,v_tax_account,0,v_vat,3); END IF;
  UPDATE public.invoices SET subtotal=v_subtotal,discount_amount=v_discount,taxable_amount=v_taxable,tax_exclusive_amount=v_taxable,tax_inclusive_amount=v_taxable+v_vat,vat_amount=v_vat,total_amount=v_taxable+v_vat,payable_amount=v_taxable+v_vat,amount_due=v_taxable+v_vat,status='issued',updated_at=now() WHERE id=p_invoice_id RETURNING * INTO v_invoice;
  RETURN to_jsonb(v_invoice);
END;
$$;
REVOKE ALL ON FUNCTION public.issue_invoice(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.issue_invoice(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_invoice_payment(p_invoice_id uuid,p_amount numeric,p_method text,p_reference text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_invoice public.invoices%ROWTYPE; v_receipt public.payments%ROWTYPE; v_cash uuid; v_ar uuid; v_journal uuid;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found.'; END IF;
  IF NOT public.business_can_access(v_invoice.company_id,'finance_receivables',true) THEN RAISE EXCEPTION 'Finance permission required.' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount,2) OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_method IS NULL OR p_method NOT IN('cash','card','mada','apple_pay','bank_transfer') THEN RAISE EXCEPTION 'A positive payment, valid method and request ID are required.'; END IF;
  IF p_method<>'cash' AND length(btrim(coalesce(p_reference,'')))=0 THEN RAISE EXCEPTION 'A bank or card reference is required.'; END IF;
  SELECT * INTO v_receipt FROM public.payments WHERE company_id=v_invoice.company_id AND payment_number='RCPT-'||p_request_id::text;
  IF FOUND THEN
    IF v_receipt.invoice_id IS DISTINCT FROM p_invoice_id OR v_receipt.amount<>p_amount OR v_receipt.payment_method<>p_method OR coalesce(v_receipt.reference_number,'')<>coalesce(p_reference,'') THEN RAISE EXCEPTION 'This payment request ID was already used for different payment details.'; END IF;
    RETURN to_jsonb(v_invoice);
  END IF;
  IF v_invoice.status NOT IN('issued','partial','unpaid','overdue') OR NOT EXISTS(SELECT 1 FROM public.journal_entries WHERE company_id=v_invoice.company_id AND entry_number='INV-'||p_invoice_id::text AND status='posted') THEN RAISE EXCEPTION 'Issue this invoice through the accounting workflow before recording a receipt.'; END IF;
  IF p_amount>v_invoice.amount_due THEN RAISE EXCEPTION 'Payment exceeds the outstanding balance.'; END IF;
  INSERT INTO public.chart_of_accounts(company_id,account_code,account_name,account_type) VALUES(v_invoice.company_id,CASE WHEN p_method='cash' THEN 'ERPX-POS-CASH' ELSE 'ERPX-POS-CARD' END,CASE WHEN p_method='cash' THEN 'Cash' ELSE 'Bank and card clearing' END,'asset') ON CONFLICT(company_id,account_code) DO NOTHING;
  SELECT id INTO v_cash FROM public.chart_of_accounts WHERE company_id=v_invoice.company_id AND account_code=CASE WHEN p_method='cash' THEN 'ERPX-POS-CASH' ELSE 'ERPX-POS-CARD' END AND is_active;
  SELECT id INTO v_ar FROM public.chart_of_accounts WHERE company_id=v_invoice.company_id AND account_code='ERPX-AR' AND is_active;
  IF v_cash IS NULL OR v_ar IS NULL THEN RAISE EXCEPTION 'Activate the cash/bank and receivables accounts.'; END IF;
  INSERT INTO public.payments(company_id,branch_id,customer_id,invoice_id,payment_number,payment_method,amount,currency_code,reference_number,status,created_by) VALUES(v_invoice.company_id,v_invoice.branch_id,v_invoice.customer_id,p_invoice_id,'RCPT-'||p_request_id::text,p_method,p_amount,v_invoice.currency_code,p_reference,'completed',auth.uid());
  INSERT INTO public.journal_entries(company_id,entry_number,entry_date,description,status,created_by) VALUES(v_invoice.company_id,'RCPT-'||p_request_id::text,current_date,'Receipt for invoice '||v_invoice.invoice_number,'posted',auth.uid()) RETURNING id INTO v_journal;
  INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,line_number) VALUES(v_journal,v_cash,p_amount,0,1),(v_journal,v_ar,0,p_amount,2);
  -- Canonical payment trigger recalculates amount_paid, amount_due and status.
  SELECT * INTO v_invoice FROM public.invoices WHERE id=p_invoice_id;
  RETURN to_jsonb(v_invoice);
END;
$$;
REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid,numeric,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid,numeric,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.receive_stock(p_company_id uuid,p_product_id uuid,p_warehouse_id uuid,p_quantity integer,p_reference text,p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_product public.products%ROWTYPE; v_movement public.inventory_movements%ROWTYPE; v_id uuid; v_stock uuid; v_clearing uuid; v_journal uuid; v_cost numeric;
BEGIN
  IF NOT public.business_can_access(p_company_id,'inventory',true) THEN RAISE EXCEPTION 'Inventory permission required.' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR p_quantity IS NULL OR p_quantity<=0 OR p_quantity>1000000 OR length(btrim(coalesce(p_reference,'')))=0 THEN RAISE EXCEPTION 'Positive quantity, receipt reference and request ID are required.'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id=p_product_id AND company_id=p_company_id AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Select an active product in this company.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.warehouses WHERE id=p_warehouse_id AND company_id=p_company_id AND is_active) THEN RAISE EXCEPTION 'Select an active warehouse in this company.'; END IF;
  SELECT * INTO v_movement FROM public.inventory_movements WHERE company_id=p_company_id AND movement_number='REC-'||p_request_id::text;
  IF FOUND THEN
    IF v_movement.product_id<>p_product_id OR v_movement.warehouse_id<>p_warehouse_id OR v_movement.quantity<>p_quantity OR v_movement.notes IS DISTINCT FROM p_reference THEN RAISE EXCEPTION 'Receipt request already used for different details.'; END IF;
    RETURN v_movement.id;
  END IF;
  INSERT INTO public.inventory(product_id,warehouse_id,quantity_available,quantity_reserved,quantity_on_order,created_at,updated_at) VALUES(p_product_id,p_warehouse_id,p_quantity,0,0,now(),now()) ON CONFLICT(product_id,warehouse_id) DO UPDATE SET quantity_available=inventory.quantity_available+excluded.quantity_available,updated_at=now();
  INSERT INTO public.inventory_movements(company_id,product_id,warehouse_id,movement_number,movement_type,quantity,reference_type,reference_id,notes,performed_by,created_by) VALUES(p_company_id,p_product_id,p_warehouse_id,'REC-'||p_request_id::text,'IN',p_quantity,'goods_receipt',p_request_id,p_reference,auth.uid(),auth.uid()) RETURNING id INTO v_id;
  v_cost:=round(p_quantity*coalesce(v_product.cost_price,0),2);
  IF v_cost>0 THEN
    INSERT INTO public.chart_of_accounts(company_id,account_code,account_name,account_type) VALUES(p_company_id,'ERPX-POS-STOCK','Inventory','asset'),(p_company_id,'ERPX-GRN-CLEARING','Goods receipts awaiting supplier invoice','liability') ON CONFLICT(company_id,account_code) DO NOTHING;
    SELECT id INTO v_stock FROM public.chart_of_accounts WHERE company_id=p_company_id AND account_code='ERPX-POS-STOCK' AND is_active;
    SELECT id INTO v_clearing FROM public.chart_of_accounts WHERE company_id=p_company_id AND account_code='ERPX-GRN-CLEARING' AND is_active;
    IF v_stock IS NULL OR v_clearing IS NULL THEN RAISE EXCEPTION 'Activate the inventory and goods receipt clearing accounts.'; END IF;
    INSERT INTO public.journal_entries(company_id,entry_number,entry_date,description,status,created_by) VALUES(p_company_id,'REC-'||p_request_id::text,current_date,'Goods receipt: '||p_reference,'posted',auth.uid()) RETURNING id INTO v_journal;
    INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,line_number) VALUES(v_journal,v_stock,v_cost,0,1),(v_journal,v_clearing,0,v_cost,2);
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.receive_stock(uuid,uuid,uuid,integer,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receive_stock(uuid,uuid,uuid,integer,text,uuid) TO authenticated;


CREATE TABLE IF NOT EXISTS public.integration_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  kind text NOT NULL CHECK (kind IN ('ai','zatca')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_usage_window ON public.integration_usage(user_id,kind,created_at);
ALTER TABLE public.integration_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_usage FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.consume_integration_quota(p_kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_company uuid; v_count integer;
BEGIN
  IF auth.uid() IS NULL OR p_kind NOT IN ('ai','zatca') OR p_kind IS NULL THEN RAISE EXCEPTION 'Invalid integration access'; END IF;
  SELECT u.company_id INTO v_company FROM public.users u JOIN public.roles r ON r.id=u.role_id
  WHERE u.id=auth.uid() AND u.status='active' AND r.name IN ('owner','super_admin','admin','manager','accountant','developer');
  IF v_company IS NULL THEN RAISE EXCEPTION 'Integration access denied'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_kind, 0));
  SELECT count(*) INTO v_count FROM public.integration_usage WHERE user_id=auth.uid() AND kind=p_kind AND created_at > now()-interval '1 minute';
  IF v_count >= (CASE WHEN p_kind='ai' THEN 10 ELSE 20 END) THEN RAISE EXCEPTION 'Integration rate limit reached'; END IF;
  INSERT INTO public.integration_usage(user_id,company_id,kind) VALUES(auth.uid(),v_company,p_kind);
  DELETE FROM public.integration_usage WHERE user_id=auth.uid() AND created_at < now()-interval '1 day';
END $$;
REVOKE ALL ON FUNCTION public.consume_integration_quota(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.consume_integration_quota(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.zatca_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  environment text NOT NULL CHECK (environment IN ('simulation','core')),
  status text NOT NULL DEFAULT 'sending' CHECK(status IN ('sending','accepted','rejected','unknown')),
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invoice_id,environment)
);
ALTER TABLE public.zatca_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zatca_submissions FROM anon,authenticated;
GRANT SELECT ON public.zatca_submissions TO authenticated;
CREATE POLICY zatca_submissions_company_read ON public.zatca_submissions FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.users u JOIN public.roles r ON r.id=u.role_id WHERE u.id=auth.uid() AND u.company_id=zatca_submissions.company_id AND u.status='active' AND r.name IN ('owner','super_admin','admin','accountant','manager','developer')));


CREATE TABLE IF NOT EXISTS public.company_setting_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id),
 actor_id uuid NOT NULL REFERENCES public.users(id), before_data jsonb NOT NULL, after_data jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_setting_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_setting_events FROM anon,authenticated;
GRANT SELECT ON public.company_setting_events TO authenticated;
CREATE POLICY company_setting_events_read ON public.company_setting_events FOR SELECT TO authenticated USING(public.business_can_access(company_id,'company_preferences',true));
CREATE OR REPLACE FUNCTION public.update_company_settings(p_company_id uuid,p_name text,p_legal_name text,p_tax_id text,p_currency text,p_timezone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_old public.companies; v_new public.companies;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users u JOIN public.roles r ON r.id=u.role_id WHERE u.id=auth.uid() AND u.company_id=p_company_id AND u.status='active' AND (r.company_id IS NULL OR r.company_id=u.company_id) AND r.name IN ('admin','owner','super_admin')) THEN RAISE EXCEPTION 'Company administrator required'; END IF;
 IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 255 OR p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$' OR p_timezone IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_timezone) THEN RAISE EXCEPTION 'Invalid company details'; END IF;
 SELECT * INTO v_old FROM public.companies WHERE id=p_company_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Company not found'; END IF;
 IF v_old.currency IS DISTINCT FROM p_currency AND EXISTS(SELECT 1 FROM public.invoices WHERE company_id=p_company_id) THEN RAISE EXCEPTION 'Cannot change the base currency after invoices exist'; END IF;
 UPDATE public.companies SET name=btrim(p_name),legal_name=nullif(btrim(p_legal_name),''),tax_id=nullif(btrim(p_tax_id),''),currency=p_currency,timezone=p_timezone,updated_at=now() WHERE id=p_company_id RETURNING * INTO v_new;
 INSERT INTO public.company_setting_events(company_id,actor_id,before_data,after_data) VALUES(p_company_id,auth.uid(),to_jsonb(v_old),to_jsonb(v_new));
 RETURN to_jsonb(v_new);
END $$;
REVOKE ALL ON FUNCTION public.update_company_settings(uuid,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_company_settings(uuid,text,text,text,text,text) TO authenticated;

-- Role inspection remains available through existing SELECT grants and RLS.
-- Role grants and reserved role names are configured by trusted server code or
-- controlled database migrations, never by a browser's table write privileges.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.roles FROM PUBLIC, anon, authenticated;

-- Table-level REVOKE does not remove pre-existing column-level grants.
-- Clear those too so UPDATE(name) cannot retain the reserved-name escalation.
DO $$
DECLARE columns_sql text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum)
    INTO columns_sql
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.roles'::regclass AND attnum > 0 AND NOT attisdropped;
  IF columns_sql IS NOT NULL THEN
    EXECUTE format(
      'REVOKE INSERT (%s), UPDATE (%s) ON TABLE public.roles FROM PUBLIC, anon, authenticated',
      columns_sql, columns_sql
    );
  END IF;
END $$;

-- Supabase service-role operations remain server-only. SECURITY DEFINER
-- onboarding retains its owner's privileges and needs no client INSERT grant.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.roles TO service_role;

-- Preserve the live JSONB onboarding API and global unique role names.
CREATE UNIQUE INDEX IF NOT EXISTS erpx_company_onboarding_owner ON public.companies(onboarding_owner_id) WHERE onboarding_owner_id IS NOT NULL;
-- Active company and role checks apply uniformly to old and new table policies.
CREATE OR REPLACE FUNCTION public.get_user_company_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT u.company_id FROM public.users u JOIN public.companies c ON c.id=u.company_id JOIN public.roles r ON r.id=u.role_id
 WHERE u.id=auth.uid() AND u.status='active' AND c.status='active' AND coalesce(r.status,'active')='active' AND (r.company_id IS NULL OR r.company_id=u.company_id)
 AND (c.tenant_id IS NULL OR EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=c.tenant_id AND t.status='active'));
$$;
CREATE OR REPLACE FUNCTION public.user_has_permission(perm text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.users u JOIN public.roles r ON r.id=u.role_id
 WHERE u.id=auth.uid() AND u.company_id=public.get_user_company_id() AND (r.company_id IS NULL OR r.company_id=u.company_id) AND coalesce(r.status,'active')='active'
 AND (r.permissions->>'all'='true' OR r.permissions->>perm='true' OR r.name IN ('owner','super_admin','admin') OR (r.name='cashier' AND perm='pos_access') OR (r.name='finance_manager' AND perm='finance')));
$$;
REVOKE ALL ON FUNCTION public.get_user_company_id(), public.user_has_permission(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(),public.user_has_permission(text) TO authenticated;

-- Existing role/member rows remain intact. Only the signed-in user's active roles are exposed.
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id uuid)
RETURNS TABLE(role_name text,display_name text,level integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT DISTINCT r.name::text,coalesce(r.display_name,r.name)::text,coalesce(r.level,CASE r.name WHEN 'owner' THEN 1000 WHEN 'developer' THEN 900 WHEN 'super_admin' THEN 800 WHEN 'admin' THEN 700 WHEN 'cashier' THEN 300 ELSE 200 END)
 FROM public.roles r JOIN public.users u ON u.id=p_user_id
 WHERE p_user_id=auth.uid() AND u.company_id=public.get_user_company_id() AND coalesce(r.status,'active')='active' AND (r.company_id IS NULL OR r.company_id=u.company_id)
 AND (r.id=u.role_id OR EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=u.id AND ur.role_id=r.id));
$$;
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
RETURNS TABLE(permission_key text,permission_name text,category text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH rs AS (SELECT r.* FROM public.roles r JOIN public.get_user_roles(p_user_id) ur ON ur.role_name=r.name),
 keys AS (
 SELECT p.permission_key::text AS key FROM rs JOIN public.role_permissions rp ON rp.role_id=rs.id JOIN public.permissions p ON p.id=rp.permission_id
 UNION SELECT e.key FROM rs CROSS JOIN LATERAL jsonb_each(coalesce(rs.permissions,'{}')) e WHERE e.value='true'::jsonb AND e.key NOT IN ('all','read')
 UNION SELECT c||'.'||a FROM rs CROSS JOIN unnest(ARRAY['dashboard','users','finance','hr','inventory','sales','purchases','pos','reports','settings']) c CROSS JOIN unnest(ARRAY['view','create','update','delete','export']) a WHERE rs.permissions->>'all'='true' OR rs.permissions->>c='true' OR rs.name IN ('owner','super_admin','admin') OR (rs.permissions->>'read'='true' AND a='view') OR (rs.name='cashier' AND c='pos')
 UNION SELECT 'audit.view' FROM rs WHERE rs.permissions->>'all'='true' OR rs.name IN ('owner','super_admin','admin')
 ) SELECT DISTINCT key,key,split_part(key,'.',1) FROM keys;
$$;
REVOKE ALL ON FUNCTION public.get_user_roles(uuid),public.get_user_permissions(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid),public.get_user_permissions(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_current_user_company_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT public.get_user_company_id() $$;
CREATE OR REPLACE FUNCTION public.has_role(target_user uuid,role_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.get_user_roles(target_user) r WHERE r.role_name=has_role.role_name) $$;
CREATE OR REPLACE FUNCTION public.has_permission(target_user uuid,permission_key text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.get_user_permissions(target_user) p WHERE p.permission_key=has_permission.permission_key) $$;
REVOKE ALL ON FUNCTION public.get_current_user_company_id(),public.has_role(uuid,text),public.has_permission(uuid,text),public.is_owner(uuid),public.is_developer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_company_id(),public.has_role(uuid,text),public.has_permission(uuid,text),public.is_owner(uuid),public.is_developer(uuid) TO authenticated;

-- Restore necessary SELECT paths, without enabling client role administration.
DROP POLICY IF EXISTS erpx_roles_company_read ON public.roles;
CREATE POLICY erpx_roles_company_read ON public.roles FOR SELECT TO authenticated USING(public.get_user_company_id() IS NOT NULL AND (company_id IS NULL OR company_id=public.get_user_company_id()));
GRANT SELECT ON public.roles TO authenticated;
CREATE POLICY erpx_permissions_read ON public.permissions FOR SELECT TO authenticated USING(public.get_user_company_id() IS NOT NULL);
CREATE POLICY erpx_role_permissions_read ON public.role_permissions FOR SELECT TO authenticated USING(public.get_user_company_id() IS NOT NULL AND EXISTS(SELECT 1 FROM public.roles r WHERE r.id=role_id AND (r.company_id IS NULL OR r.company_id=public.get_user_company_id())));
CREATE POLICY erpx_user_roles_read ON public.user_roles FOR SELECT TO authenticated USING(public.get_user_company_id() IS NOT NULL AND (user_id=auth.uid() OR (public.user_has_permission('admin') AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=user_id AND u.company_id=public.get_user_company_id()))));
CREATE POLICY erpx_profiles_self_read ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid());
CREATE POLICY erpx_tenant_read ON public.tenants FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.companies c WHERE c.id=public.get_user_company_id() AND c.tenant_id=tenants.id));
CREATE POLICY erpx_user_tenants_read ON public.user_tenants FOR SELECT TO authenticated USING(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.companies c WHERE c.id=public.get_user_company_id() AND c.tenant_id=user_tenants.tenant_id));
GRANT SELECT ON public.permissions,public.role_permissions,public.user_roles,public.profiles,public.tenants,public.user_tenants TO authenticated;
-- Auditable events come from trusted transactional functions and server administration.
REVOKE ALL ON public.audit_logs FROM PUBLIC,anon;
REVOKE INSERT,UPDATE,DELETE ON public.audit_logs FROM PUBLIC,anon,authenticated;
CREATE POLICY erpx_audit_read_fence ON public.audit_logs AS RESTRICTIVE FOR SELECT TO authenticated USING(company_id=public.get_user_company_id() AND (public.user_has_permission('admin') OR public.user_has_permission('audit')));
CREATE POLICY erpx_movement_company_fence ON public.inventory_movements AS RESTRICTIVE FOR SELECT TO authenticated USING(company_id=public.get_user_company_id());
CREATE POLICY erpx_sales_company_read ON public.sales FOR SELECT TO authenticated USING(company_id=public.get_user_company_id());
CREATE POLICY erpx_payments_company_read ON public.payments FOR SELECT TO authenticated USING(company_id=public.get_user_company_id());
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['chart_of_accounts','journal_entries'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY erpx_ledger_company_read ON public.%I FOR SELECT TO authenticated USING(company_id=public.get_user_company_id())',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP; END $$;
GRANT SELECT ON public.journal_entry_lines TO authenticated;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['invoice_lines','sales_order_lines','purchase_order_lines'] LOOP
 EXECUTE format('CREATE POLICY erpx_product_company_reference ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (true) WITH CHECK (product_id IS NULL OR EXISTS(SELECT 1 FROM public.products p WHERE p.id=product_id AND p.company_id=public.get_user_company_id()))',t);
 END LOOP; END $$;
CREATE POLICY erpx_account_company_reference ON public.journal_entry_lines AS RESTRICTIVE FOR ALL TO authenticated USING(true) WITH CHECK(EXISTS(SELECT 1 FROM public.chart_of_accounts a WHERE a.id=account_id AND a.company_id=public.get_user_company_id()));
-- Inventory quantities are changed only through audited receipt/POS transactions.
REVOKE INSERT,UPDATE,DELETE ON public.inventory,public.inventory_movements FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.create_inventory_movement(uuid,uuid,character varying,numeric,character varying,uuid,uuid,uuid,character varying,uuid,text,uuid) FROM PUBLIC,anon,authenticated;

-- New invoice fields mirror legacy aliases without rewriting any old financial totals.
CREATE OR REPLACE FUNCTION public.erpx_invoice_line_aliases() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.vat_rate IS NULL THEN NEW.vat_rate:=coalesce(NEW.tax_rate,0); ELSE NEW.tax_rate:=NEW.vat_rate; END IF;
   IF NEW.discount_amount IS NULL THEN NEW.discount_amount:=round(NEW.quantity*NEW.unit_price*coalesce(NEW.discount_percent,0)/100,2); END IF;
 ELSE
   IF NEW.tax_rate IS DISTINCT FROM OLD.tax_rate AND NEW.vat_rate IS NOT DISTINCT FROM OLD.vat_rate THEN NEW.vat_rate:=NEW.tax_rate; ELSE NEW.tax_rate:=NEW.vat_rate; END IF;
   IF NEW.discount_percent IS DISTINCT FROM OLD.discount_percent AND NEW.discount_amount IS NOT DISTINCT FROM OLD.discount_amount THEN NEW.discount_amount:=round(NEW.quantity*NEW.unit_price*coalesce(NEW.discount_percent,0)/100,2); END IF;
 END IF;
 IF NEW.quantity*NEW.unit_price>0 THEN NEW.discount_percent:=round(NEW.discount_amount/(NEW.quantity*NEW.unit_price)*100,2); END IF;
 NEW.vat_amount:=round(NEW.line_total*coalesce(NEW.vat_rate,0)/100,2);
 RETURN NEW;
END $$;
-- Backfill only new fields; the original line_total/tax_rate/discount_percent remain unchanged.
UPDATE public.invoice_lines SET discount_amount=round(quantity*unit_price*coalesce(discount_percent,0)/100,2),vat_rate=coalesce(tax_rate,0),vat_amount=round(line_total*coalesce(tax_rate,0)/100,2);
ALTER TABLE public.invoice_lines ALTER COLUMN discount_amount DROP DEFAULT;
ALTER TABLE public.invoice_lines ALTER COLUMN vat_rate DROP DEFAULT;
ALTER TABLE public.invoice_lines ALTER COLUMN vat_amount DROP DEFAULT;
CREATE TRIGGER erpx_invoice_line_aliases BEFORE INSERT OR UPDATE ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION public.erpx_invoice_line_aliases();

CREATE OR REPLACE FUNCTION public.complete_pos_sale(p_company_id uuid,p_branch_id uuid,p_cashier_id uuid,p_shift_id uuid,p_payment_method text,p_items jsonb,p_customer_id uuid DEFAULT NULL,p_discount_amount numeric DEFAULT 0,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Use checkout with a stable idempotency key; update the application before completing a sale' USING ERRCODE='22023'; END $$;
REVOKE ALL ON FUNCTION public.complete_pos_sale(uuid,uuid,uuid,uuid,text,jsonb,uuid,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_pos_sale(uuid,uuid,uuid,uuid,text,jsonb,uuid,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_company_account(p_company_name text, p_legal_name text, p_tax_id text, p_vat_number text, p_business_sector text, p_company_size text, p_country text, p_city text, p_address text, p_website text, p_branch_name text, p_branch_code text, p_subscription_plan text, p_billing_cycle text, p_max_branches integer, p_max_users integer, p_modules jsonb, p_full_name text, p_job_title text, p_mobile_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid;
    v_company_id uuid;
    v_branch_id uuid;
    v_admin_role_id uuid;
    v_existing_membership boolean;
BEGIN

    /*
     * 1. Current authenticated user
     */
    v_user_id := auth.uid();
    PERFORM 1 FROM auth.users WHERE id=v_user_id AND email_confirmed_at IS NOT NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A verified authenticated account is required'; END IF;
    IF EXISTS(SELECT 1 FROM public.users WHERE id=v_user_id AND status='active') THEN
      RETURN (SELECT jsonb_build_object('success',true,'already_registered',true,'user_id',u.id,'company_id',u.company_id,'branch_id',u.branch_id,'role_id',u.role_id,'tenant_id',c.tenant_id) FROM public.users u JOIN public.companies c ON c.id=u.company_id WHERE u.id=v_user_id);
    END IF;
    IF p_company_name IS NULL OR length(btrim(p_company_name)) NOT BETWEEN 1 AND 255 OR p_full_name IS NULL OR length(btrim(p_full_name)) NOT BETWEEN 1 AND 200 OR p_max_users IS NULL OR p_max_users NOT BETWEEN 1 AND 10000 OR p_max_branches IS NULL OR p_max_branches NOT BETWEEN 1 AND 1000 OR p_modules IS NULL OR jsonb_typeof(p_modules) NOT IN ('object','array') THEN RAISE EXCEPTION 'Invalid company registration details'; END IF;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    /*
     * 2. Prevent creating another first-company registration
     */
    SELECT EXISTS (
        SELECT 1
        FROM public.user_tenants
        WHERE user_id = v_user_id
    )
    INTO v_existing_membership;

    IF v_existing_membership THEN
        RAISE EXCEPTION 'User is already associated with a tenant';
    END IF;

    /*
     * 3. Verify admin system role exists
     */
    SELECT id
    INTO v_admin_role_id
    FROM public.roles
    WHERE name = 'admin' AND company_id IS NULL
      AND is_system_role = true
      AND status = 'active'
    LIMIT 1;

    IF v_admin_role_id IS NULL THEN
        RAISE EXCEPTION 'System admin role not found';
    END IF;

    /*
     * 4. Create Tenant
     */
    INSERT INTO public.tenants (
        name,
        status
    )
    VALUES (
        p_company_name,
        'active'
    )
    RETURNING id INTO v_tenant_id;

    /*
     * 5. Create Profile
     */
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        status
    )
    SELECT
        v_user_id,
        au.email,
        p_full_name,
        'active'
    FROM auth.users au
    WHERE au.id = v_user_id
    ON CONFLICT(id) DO NOTHING;

    IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_user_id) THEN
        RAISE EXCEPTION 'Authenticated user was not found';
    END IF;

    /*
     * 6. Connect user to Tenant
     */
    INSERT INTO public.user_tenants (
        user_id,
        tenant_id
    )
    VALUES (
        v_user_id,
        v_tenant_id
    );

    /*
     * 7. Create Company
     */
    INSERT INTO public.companies (
        name,
        legal_name,
        tax_id,
        currency,
        timezone,
        status,
        tenant_id,
        onboarding_owner_id,
        settings
    )
    VALUES (
        p_company_name,
        COALESCE(NULLIF(p_legal_name, ''), p_company_name),
        NULLIF(p_tax_id, ''),
        'SAR',
        'Asia/Riyadh',
        'active',
        v_tenant_id,
        v_user_id,
        jsonb_build_object(
            'vat_number', NULLIF(p_vat_number, ''),
            'business_sector', p_business_sector,
            'company_size', p_company_size,
            'country', p_country,
            'city', p_city,
            'address', p_address,
            'website', NULLIF(p_website, ''),
            'subscription', jsonb_build_object(
                'plan', p_subscription_plan,
                'billing_cycle', p_billing_cycle,
                'max_branches', p_max_branches,
                'max_users', p_max_users,
                'modules', COALESCE(p_modules, '[]'::jsonb),
                'started_at', now(), 'status', 'unpaid'
            )
        )
    )
    RETURNING id INTO v_company_id;

    /*
     * 8. Create Main Branch
     */
    INSERT INTO public.branches (
        company_id,
        name,
        code,
        city,
        country,
        is_headquarters,
        status
    )
    VALUES (
        v_company_id,
        COALESCE(NULLIF(p_branch_name, ''), 'Main Branch'),
        COALESCE(NULLIF(p_branch_code, ''), 'MAIN'),
        p_city,
        p_country,
        true,
        'active'
    )
    RETURNING id INTO v_branch_id;

    /*
     * 9. Create ERP User
     */
    INSERT INTO public.users (
        id,
        company_id,
        branch_id,
        role_id,
        email,
        first_name,
        last_name,
        phone_number,
        position,
        department,
        status
    )
    SELECT
        v_user_id,
        v_company_id,
        v_branch_id,
        v_admin_role_id,
        au.email,
        split_part(COALESCE(p_full_name, ''), ' ', 1),
        NULLIF(
            trim(
                substring(
                    COALESCE(p_full_name, '')
                    FROM length(split_part(COALESCE(p_full_name, ''), ' ', 1)) + 1
                )
            ),
            ''
        ),
        p_mobile_number,
        p_job_title,
        'Management',
        'active'
    FROM auth.users au
    WHERE au.id = v_user_id;

    /*
     * 10. Add RBAC role assignment
     */
    INSERT INTO public.user_roles (
        user_id,
        role_id
    )
    VALUES (
        v_user_id,
        v_admin_role_id
    );

    /*
     * 11. Return created structure
     */
    INSERT INTO public.warehouses(company_id,branch_id,name,code,is_active) VALUES(v_company_id,v_branch_id,'Main warehouse','MAIN',true);
    INSERT INTO public.audit_logs(company_id,user_id,action,entity_type,entity_id,new_values) VALUES(v_company_id,v_user_id,'register_company_account','companies',v_company_id,jsonb_build_object('subscription_status','unpaid','branch_id',v_branch_id));
    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'tenant_id', v_tenant_id,
        'company_id', v_company_id,
        'branch_id', v_branch_id,
        'role_id', v_admin_role_id
    );

EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Registration conflict: %', SQLERRM;

    WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'Registration relationship error: %', SQLERRM;

    WHEN OTHERS THEN
        RAISE EXCEPTION 'Company registration failed: %', SQLERRM;
END;
$function$;

REVOKE ALL ON FUNCTION public.register_company_account(text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,jsonb,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_company_account(text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,jsonb,text,text,text) TO authenticated;
DO $$ DECLARE t record; columns_sql text; checksum text; n bigint; BEGIN
 FOR t IN SELECT * FROM erpx_upgrade_original_rows LOOP
  SELECT string_agg(quote_ident(x),',') INTO columns_sql FROM unnest(t.column_names) x;
  EXECUTE format('SELECT md5(coalesce(jsonb_agg(x ORDER BY x::text)::text,''[]'')),count(*) FROM (SELECT to_jsonb(r) x FROM (SELECT %s FROM public.%I) r) s',columns_sql,t.table_name) INTO checksum,n;
  IF checksum IS DISTINCT FROM t.row_hash OR n IS DISTINCT FROM t.row_count THEN RAISE EXCEPTION 'Original data preservation failed on %',t.table_name; END IF;
 END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
