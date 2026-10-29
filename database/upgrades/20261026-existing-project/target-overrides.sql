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
