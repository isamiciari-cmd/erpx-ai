BEGIN;
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
COMMIT;
