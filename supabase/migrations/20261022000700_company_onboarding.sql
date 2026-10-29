-- No paid subscription or platform privilege is granted by self registration.
BEGIN;
CREATE OR REPLACE FUNCTION public.register_company_account(
  p_company_name text,p_legal_name text,p_tax_id text,p_vat_number text,
  p_business_sector text,p_company_size text,p_country text,p_city text,p_address text,p_website text,
  p_branch_name text,p_branch_code text,p_subscription_plan text,p_billing_cycle text,
  p_max_branches integer,p_max_users integer,p_modules text[],p_full_name text,p_job_title text,p_mobile_number text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid(); company uuid; branch uuid; role uuid; warehouse uuid;
  email text; verified timestamptz; profile public.users%ROWTYPE; full_name text;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sign in to a verified account before registering a company' USING ERRCODE='42501'; END IF;
  SELECT u.email,u.email_confirmed_at INTO email,verified FROM auth.users u WHERE u.id=actor FOR UPDATE;
  IF NOT FOUND OR email IS NULL OR verified IS NULL THEN RAISE EXCEPTION 'A verified email address is required' USING ERRCODE='42501'; END IF;
  SELECT * INTO profile FROM public.users u WHERE u.id=actor;
  IF FOUND THEN
    IF profile.status <> 'active' THEN RAISE EXCEPTION 'This account is inactive' USING ERRCODE='42501'; END IF;
    RETURN jsonb_build_object('success',true,'company_id',profile.company_id,'tenant_id',profile.company_id,'branch_id',profile.branch_id,'role_id',profile.role_id,'user_id',actor,'already_registered',true);
  END IF;
  IF p_company_name IS NULL OR length(btrim(p_company_name)) NOT BETWEEN 1 AND 255
    OR p_full_name IS NULL OR length(btrim(p_full_name)) NOT BETWEEN 1 AND 200
    OR p_branch_name IS NULL OR length(btrim(p_branch_name)) NOT BETWEEN 1 AND 255
    OR p_branch_code IS NULL OR p_branch_code !~ '^[A-Za-z0-9_-]{1,50}$'
    OR length(coalesce(p_legal_name,''))>255 OR length(coalesce(p_tax_id,''))>100
    OR length(coalesce(p_vat_number,''))>50 OR length(coalesce(p_address,''))>1000
    OR length(coalesce(p_city,''))>100 OR length(coalesce(p_country,''))>100
    OR length(coalesce(p_website,''))>500 OR length(coalesce(p_mobile_number,''))>50
    OR length(coalesce(p_job_title,''))>100 OR length(coalesce(p_business_sector,''))>100
    OR length(coalesce(p_company_size,''))>100 OR cardinality(coalesce(p_modules,ARRAY[]::text[]))>100
    OR p_max_branches IS NULL OR p_max_branches NOT BETWEEN 1 AND 1000
    OR p_max_users IS NULL OR p_max_users NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'Invalid company registration details'; END IF;
  full_name:=btrim(p_full_name);
  INSERT INTO public.companies(name,legal_name,tax_id,vat_number,currency,timezone,status,onboarding_owner_id,settings)
    VALUES(btrim(p_company_name),nullif(btrim(p_legal_name),''),nullif(btrim(p_tax_id),''),nullif(btrim(p_vat_number),''),'SAR','Asia/Riyadh','active',actor,
      jsonb_build_object('business_sector',p_business_sector,'company_size',p_company_size,'country',p_country,'city',p_city,'address',p_address,'website',p_website,
        'subscription',jsonb_build_object('status','unpaid','requested_plan',left(p_subscription_plan,100),'requested_billing_cycle',left(p_billing_cycle,100),'requested_branches',p_max_branches,'requested_users',p_max_users,'requested_modules',p_modules))) RETURNING id INTO company;
  INSERT INTO public.branches(company_id,name,code,city,country,is_headquarters,status)
    VALUES(company,btrim(p_branch_name),p_branch_code,p_city,p_country,true,'active') RETURNING id INTO branch;
  INSERT INTO public.roles(company_id,name,display_name,permissions,is_system_role)
    VALUES(company,'admin','Company administrator','{"all":true}',false) RETURNING id INTO role;
  INSERT INTO public.users(id,company_id,branch_id,role_id,email,first_name,last_name,phone_number,position,status)
    VALUES(actor,company,branch,role,email,split_part(full_name,' ',1),CASE WHEN strpos(full_name,' ')>0 THEN substr(full_name,strpos(full_name,' ')+1) ELSE '' END,p_mobile_number,p_job_title,'active');
  INSERT INTO public.warehouses(company_id,branch_id,name,code,is_active)
    VALUES(company,branch,'Main warehouse','MAIN',true) RETURNING id INTO warehouse;
  INSERT INTO public.audit_logs(company_id,user_id,action,entity_type,entity_id,new_values)
    VALUES(company,actor,'register_company_account','companies',company,jsonb_build_object('branch_id',branch,'warehouse_id',warehouse,'subscription_status','unpaid'));
  RETURN jsonb_build_object('success',true,'company_id',company,'tenant_id',company,'branch_id',branch,'warehouse_id',warehouse,'role_id',role,'user_id',actor,'subscription_status','unpaid');
END $$;
REVOKE ALL ON FUNCTION public.register_company_account(text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text[],text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_company_account(text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text[],text,text,text) TO authenticated;
COMMIT;
