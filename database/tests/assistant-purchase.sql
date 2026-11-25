-- Installed only in the isolated assistant acceptance database.
CREATE FUNCTION public.preview_purchase_stock(p_company uuid, p_branch uuid, p_warehouse uuid DEFAULT NULL)
RETURNS TABLE(warehouse_id uuid, warehouse text, product_id uuid, sku text, available integer, minimum integer)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT business_can_access(p_company, 'purchases_requests', true) OR NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.company_id=p_company AND u.branch_id=p_branch AND u.status='active'
  ) THEN RAISE EXCEPTION 'Purchase access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT w.id, w.name::text, p.id, p.sku::text, i.quantity_available, p.min_stock_level
    FROM inventory i JOIN warehouses w ON w.id=i.warehouse_id JOIN products p ON p.id=i.product_id
    WHERE w.company_id=p_company AND w.branch_id=p_branch AND w.is_active
      AND (p_warehouse IS NULL OR w.id=p_warehouse)
      AND p.company_id=p_company AND p.is_active AND i.quantity_available<=p.min_stock_level
    ORDER BY w.name, p.sku, p.id LIMIT 100;
END;
$$;

CREATE FUNCTION public.save_preview_purchase(p_company uuid, p_branch uuid, p_warehouse uuid,
  p_operation uuid, p_supplier text, p_requester text, p_lines jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  v_ref text := 'AI-PURCHASE-' || p_operation;
  v_description text;
  v_input jsonb;
  v_existing business_records%ROWTYPE;
BEGIN
  IF NOT business_can_access(p_company, 'purchases_requests', true) OR NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.company_id=p_company AND u.branch_id=p_branch AND u.status='active'
  ) THEN RAISE EXCEPTION 'Purchase access denied' USING ERRCODE='42501'; END IF;
  IF p_warehouse IS NULL OR p_operation IS NULL OR coalesce(length(trim(p_supplier)),0) NOT BETWEEN 1 AND 120
    OR coalesce(length(trim(p_requester)),0) NOT BETWEEN 1 AND 120 OR jsonb_typeof(p_lines) IS DISTINCT FROM 'object'
    OR p_lines = '{}'::jsonb THEN RAISE EXCEPTION 'Invalid purchase details' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_company::text), hashtext(v_ref));
  SELECT * INTO v_existing FROM business_records WHERE company_id=p_company AND module='purchases_requests' AND reference=v_ref;
  v_input := jsonb_build_object('supplier_name',trim(p_supplier),'requested_by',trim(p_requester),
    'branch_id',p_branch,'warehouse_id',p_warehouse,'assistant_lines',p_lines);
  IF FOUND THEN
    IF v_existing.created_by IS DISTINCT FROM auth.uid() OR NOT coalesce(v_existing.data @> v_input,false)
      OR v_existing.data->'assistant_lines' IS DISTINCT FROM p_lines THEN
      RAISE EXCEPTION 'Invalid purchase retry' USING ERRCODE='42501';
    END IF;
    RETURN v_existing.id;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each_text(p_lines) l WHERE l.value !~ '^[1-9][0-9]{0,5}$') THEN
    RAISE EXCEPTION 'Invalid purchase quantity' USING ERRCODE='22023';
  END IF;
  SELECT string_agg(s.sku || ' × ' || l.value, E'\n' ORDER BY s.sku) INTO v_description
  FROM jsonb_each_text(p_lines) l JOIN preview_purchase_stock(p_company,p_branch,p_warehouse) s ON s.product_id::text=l.key
  HAVING count(*)=(SELECT count(*) FROM jsonb_each(p_lines));
  IF v_description IS NULL THEN RAISE EXCEPTION 'Review the current warehouse stock' USING ERRCODE='22023'; END IF;
  RETURN (save_business_record(p_company,NULL,NULL,jsonb_build_object(
    'module','purchases_requests','title','Purchase request','reference',v_ref,'status','draft',
    'record_date',current_date,'amount',0,'data',v_input || jsonb_build_object('items_description',v_description)
  ))->>'id')::uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.preview_purchase_stock(uuid,uuid,uuid),
  public.save_preview_purchase(uuid,uuid,uuid,uuid,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_purchase_stock(uuid,uuid,uuid),
  public.save_preview_purchase(uuid,uuid,uuid,uuid,text,text,jsonb) TO authenticated;
