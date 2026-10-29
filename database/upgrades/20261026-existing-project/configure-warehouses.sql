-- Configuration follow-up: preserve financial rows and physical quantities.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
LOCK TABLE public.warehouses,public.branches IN SHARE ROW EXCLUSIVE MODE;
DO $$ DECLARE item record; branch record; target uuid; n integer; warehouse uuid; BEGIN
 FOR item IN SELECT w.* FROM public.warehouses w JOIN public.companies c ON c.id=w.company_id WHERE w.is_active AND w.branch_id IS NULL AND c.status='active' LOOP
  SELECT count(*),(array_agg(id ORDER BY id))[1] INTO n,target FROM public.branches WHERE company_id=item.company_id AND status='active';
  IF n<>1 THEN RAISE EXCEPTION 'Warehouse branch mapping requires an explicit business choice'; END IF;
  UPDATE public.warehouses SET branch_id=target WHERE id=item.id;
  INSERT INTO public.audit_logs(company_id,user_id,action,entity_type,entity_id,old_values,new_values)
   VALUES(item.company_id,NULL,'warehouse_branch_aligned','warehouses',item.id,jsonb_build_object('branch_id',NULL),jsonb_build_object('branch_id',target,'source','reviewed_configuration_20261026'));
 END LOOP;
 FOR branch IN SELECT b.* FROM public.branches b JOIN public.companies c ON c.id=b.company_id WHERE b.status='active' AND c.status='active' AND NOT EXISTS(SELECT 1 FROM public.warehouses w WHERE w.company_id=b.company_id AND w.branch_id=b.id AND w.is_active) LOOP
  INSERT INTO public.warehouses(company_id,branch_id,name,code,is_active) VALUES(branch.company_id,branch.id,'Main warehouse','ERPX-'||replace(branch.id::text,'-',''),true) RETURNING id INTO warehouse;
  INSERT INTO public.audit_logs(company_id,user_id,action,entity_type,entity_id,new_values)
   VALUES(branch.company_id,NULL,'branch_warehouse_created','warehouses',warehouse,jsonb_build_object('branch_id',branch.id,'source','reviewed_configuration_20261026','opening_stock_added',false));
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
