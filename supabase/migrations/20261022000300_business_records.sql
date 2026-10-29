-- Company-scoped business workflows. All mutations go through a validated,
-- version-checked RPC; immutable events retain the audit trail.
BEGIN;

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
    WHERE u.id=auth.uid() AND u.company_id=p_company AND u.status='active'
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
COMMIT;
