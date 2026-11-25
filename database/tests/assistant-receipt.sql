-- Isolated preview only. Apply to an in-memory fixture, never to a hosted project.
CREATE FUNCTION public.confirm_preview_invoice_receipt(
  invoice_id uuid, expected_company uuid, expected_branch uuid, expected_due numeric,
  expected_currency text, method text, reference text, operation_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE invoice public.invoices%ROWTYPE; existing public.payments%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.users u JOIN public.branches b ON b.id=u.branch_id AND b.company_id=u.company_id
    JOIN public.companies c ON c.id=u.company_id
    WHERE u.id=auth.uid() AND u.status='active' AND b.status='active' AND c.status='active'
      AND u.company_id=expected_company AND u.branch_id=expected_branch
    FOR SHARE OF u,b,c;
  IF NOT FOUND OR NOT public.business_can_access(expected_company,'finance_receivables',true) THEN
    RAISE EXCEPTION 'Receipt permission denied.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO invoice FROM public.invoices i WHERE i.id=invoice_id
    AND i.company_id=expected_company AND i.branch_id=expected_branch FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receipt scope denied.' USING ERRCODE='42501'; END IF;
  SELECT * INTO existing FROM public.payments p WHERE p.company_id=expected_company AND p.payment_number='RCPT-'||operation_id::text;
  IF FOUND THEN
    IF existing.created_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Receipt owner denied.' USING ERRCODE='42501'; END IF;
  ELSIF invoice.amount_due IS DISTINCT FROM expected_due OR invoice.currency_code IS DISTINCT FROM expected_currency THEN
    RETURN jsonb_build_object('status','changed','due',invoice.amount_due,'currency',invoice.currency_code,'invoiceStatus',invoice.status);
  END IF;
  RETURN jsonb_build_object('status','confirmed','invoice',
    public.record_invoice_payment(invoice_id,expected_due,method,reference,operation_id));
END $$;
REVOKE ALL ON FUNCTION public.confirm_preview_invoice_receipt(uuid,uuid,uuid,numeric,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_preview_invoice_receipt(uuid,uuid,uuid,numeric,text,text,text,uuid) TO authenticated;
