-- Hosted legacy installations can mirror the primary role in user_roles.
-- Retire only the replaced primary-role link in the same transaction.
CREATE OR REPLACE FUNCTION public.retire_replaced_primary_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  mirrored boolean;
  ambiguous_global_grant boolean;
BEGIN
  IF pg_catalog.to_regclass('public.user_roles') IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = $1 AND role_id = $2)'
    INTO mirrored USING OLD.id, OLD.role_id;
  IF NOT mirrored THEN
    RETURN NEW;
  END IF;

  -- A legacy user_roles row has no tenant or grant provenance. If another
  -- membership could use this global grant, require an explicit review.
  IF pg_catalog.to_regclass('public.user_tenants') IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.roles WHERE id = OLD.role_id AND company_id IS NULL
  ) THEN
    EXECUTE $check$
      SELECT EXISTS (
        SELECT 1
        FROM public.user_tenants membership
        JOIN public.companies company ON company.id = $2
        WHERE membership.user_id = $1
          AND membership.tenant_id::text IS DISTINCT FROM pg_catalog.to_jsonb(company)->>'tenant_id'
      )
    $check$ INTO ambiguous_global_grant USING OLD.id, OLD.company_id;
    IF ambiguous_global_grant THEN
      RAISE EXCEPTION 'Review the old global role across company memberships before reassigning it.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  EXECUTE 'DELETE FROM public.user_roles WHERE user_id = $1 AND role_id = $2'
    USING OLD.id, OLD.role_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.retire_replaced_primary_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS retire_replaced_primary_role ON public.users;
CREATE TRIGGER retire_replaced_primary_role
AFTER UPDATE OF role_id ON public.users
FOR EACH ROW
WHEN (OLD.role_id IS DISTINCT FROM NEW.role_id)
EXECUTE FUNCTION public.retire_replaced_primary_role();
