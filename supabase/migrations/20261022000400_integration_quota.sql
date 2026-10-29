BEGIN;
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
COMMIT;
