-- Fresh-install security parity. Existing target-specific upgrades remain separate.
-- No tenant/RBAC schema, legacy RPC overload or existing financial row is changed.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.company_id
  FROM public.users u
  JOIN public.companies c ON c.id = u.company_id
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = auth.uid() AND u.status = 'active' AND c.status = 'active'
    AND (r.company_id IS NULL OR r.company_id = u.company_id)
    AND coalesce(to_jsonb(r)->>'status', 'active') = 'active';
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND u.company_id = public.get_user_company_id()
      AND (r.company_id IS NULL OR r.company_id = u.company_id)
      AND coalesce(to_jsonb(r)->>'status', 'active') = 'active'
      AND (r.permissions->>'all' = 'true' OR r.permissions->>perm = 'true')
  );
$$;
REVOKE ALL ON FUNCTION public.get_user_company_id(), public.user_has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(), public.user_has_permission(text) TO authenticated;

-- Business RPCs use the same active identity gate instead of independently
-- treating a NULL company status as active. Existing module grants are retained.
CREATE OR REPLACE FUNCTION public.business_can_access(p_company uuid, p_module text, p_write boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND u.company_id = p_company
      AND u.company_id = public.get_user_company_id() AND u.status = 'active'
      AND (r.company_id IS NULL OR r.company_id = u.company_id)
      AND coalesce(to_jsonb(r)->>'status', 'active') = 'active'
      AND (
        lower(r.name) IN ('admin','super_admin','owner','developer','manager')
        OR r.permissions->>'all' = 'true' OR r.permissions->>'*' = 'true'
        OR r.permissions->>split_part(p_module, '_', 1) = 'true'
        OR r.permissions->>p_module = 'true'
        OR r.permissions->>(split_part(p_module, '_', 1) || CASE WHEN p_write THEN '.write' ELSE '.read' END) = 'true'
        OR (jsonb_typeof(r.permissions) = 'array' AND r.permissions ? (split_part(p_module, '_', 1) || CASE WHEN p_write THEN '.write' ELSE '.read' END))
        OR (NOT p_write AND split_part(p_module, '_', 1) NOT IN ('finance','hr') AND r.permissions->>'read' = 'true')
        OR (split_part(p_module, '_', 1) = 'finance' AND lower(r.name) IN ('accountant','finance_manager'))
        OR (split_part(p_module, '_', 1) = 'hr' AND lower(r.name) IN ('hr_manager','hr'))
      )
  );
$$;
REVOKE ALL ON FUNCTION public.business_can_access(uuid,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.business_can_access(uuid,text,boolean) TO authenticated;

-- Audit events are written by reviewed SECURITY DEFINER functions or server code.
-- RLS fences also keep events immutable if broad client grants are later restored.
REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.audit_logs FROM authenticated;
DO $$
DECLARE columns_sql text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum)
  INTO columns_sql FROM pg_catalog.pg_attribute
  WHERE attrelid = 'public.audit_logs'::regclass AND attnum > 0 AND NOT attisdropped;
  IF columns_sql IS NOT NULL THEN
    EXECUTE format('REVOKE INSERT (%s), UPDATE (%s) ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated', columns_sql, columns_sql);
  END IF;
END $$;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS erpx_audit_company_read_fence ON public.audit_logs;
CREATE POLICY erpx_audit_company_read_fence ON public.audit_logs AS RESTRICTIVE
FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company_id()
  AND (public.user_has_permission('admin') OR public.user_has_permission('audit') OR public.user_has_permission('audit.view'))
);
DROP POLICY IF EXISTS erpx_audit_no_client_insert ON public.audit_logs;
CREATE POLICY erpx_audit_no_client_insert ON public.audit_logs AS RESTRICTIVE
FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS erpx_audit_no_client_update ON public.audit_logs;
CREATE POLICY erpx_audit_no_client_update ON public.audit_logs AS RESTRICTIVE
FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS erpx_audit_no_client_delete ON public.audit_logs;
CREATE POLICY erpx_audit_no_client_delete ON public.audit_logs AS RESTRICTIVE
FOR DELETE TO authenticated USING (false);

-- Parent ownership alone is insufficient for cross-company reference integrity.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['invoice_lines', 'sales_order_lines', 'purchase_order_lines'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS erpx_product_company_reference ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY erpx_product_company_reference ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (true) WITH CHECK (product_id IS NULL OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.company_id = public.get_user_company_id()))', t
    );
  END LOOP;
END $$;
DROP POLICY IF EXISTS erpx_account_company_reference ON public.journal_entry_lines;
CREATE POLICY erpx_account_company_reference ON public.journal_entry_lines AS RESTRICTIVE
FOR ALL TO authenticated USING (true)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.chart_of_accounts a
    WHERE a.id = account_id AND a.company_id = public.get_user_company_id())
);

-- The RPC is SECURITY DEFINER and must enforce product scope independently of RLS.
CREATE OR REPLACE FUNCTION public.issue_invoice(p_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
    IF v_line.product_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = v_line.product_id AND p.company_id = v_invoice.company_id
    ) THEN RAISE EXCEPTION 'Invoice product must belong to this company' USING ERRCODE = '42501'; END IF;
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



COMMIT;
