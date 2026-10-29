-- Role inspection remains available through existing SELECT grants and RLS.
-- Role grants and reserved role names are configured by trusted server code or
-- controlled database migrations, never by a browser's table write privileges.
BEGIN;

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

COMMIT;
