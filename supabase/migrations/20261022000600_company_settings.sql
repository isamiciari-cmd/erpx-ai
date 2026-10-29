BEGIN;
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
COMMIT;
