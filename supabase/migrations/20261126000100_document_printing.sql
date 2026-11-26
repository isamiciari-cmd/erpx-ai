BEGIN;

CREATE TABLE public.company_logos (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  image_data text NOT NULL CHECK (
    length(image_data) <= 350000 AND image_data ~ '^data:image/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$'
  )
);

CREATE FUNCTION public.can_edit_company_logo(target_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND u.company_id = target_company AND u.company_id = public.get_user_company_id() AND u.status = 'active'
      AND (r.company_id IS NULL OR r.company_id = u.company_id)
      AND r.name IN ('owner', 'super_admin', 'admin')
  )
$$;
REVOKE ALL ON FUNCTION public.can_edit_company_logo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_company_logo(uuid) TO authenticated;

ALTER TABLE public.company_logos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_logos FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_logos TO authenticated;
CREATE POLICY company_logo_read ON public.company_logos FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());
CREATE POLICY company_logo_manage ON public.company_logos FOR ALL TO authenticated
  USING (public.can_edit_company_logo(company_id))
  WITH CHECK (public.can_edit_company_logo(company_id));

CREATE TABLE public.printed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 500),
  html text NOT NULL CHECK (octet_length(html) <= 2097152),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.printed_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.printed_documents FROM anon, authenticated;
GRANT SELECT, INSERT ON public.printed_documents TO authenticated;
-- A printed snapshot may contain filtered reports or cashier data. The link
-- identifies the snapshot but access stays with the member who printed it.
CREATE POLICY printed_document_read ON public.printed_documents FOR SELECT TO authenticated
  USING (created_by = auth.uid() AND company_id = public.get_user_company_id());
CREATE POLICY printed_document_create ON public.printed_documents FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND company_id = public.get_user_company_id());

COMMIT;
