-- READ ONLY. This query is tailored to live-catalog.json captured 2026-10-26.
-- It returns counts only: no identities, emails, tokens, passwords or row payloads.
-- Run in a transaction with transaction_read_only=on through the reviewed runner.
SELECT jsonb_build_object(
  'format', 'erpx_live_security_counts_v1',
  'metadata_only', false,
  'personal_rows_returned', false,
  'identity', jsonb_build_object(
    'erp_users', (SELECT count(*) FROM public.users),
    'erp_users_missing_auth_id_fk_target', (SELECT count(*) FROM public.users u LEFT JOIN auth.users a ON a.id=u.id WHERE a.id IS NULL),
    'erp_users_auth_id_present', (SELECT count(*) FROM public.users WHERE auth_id IS NOT NULL),
    'erp_users_auth_id_differs_from_primary_id', (SELECT count(*) FROM public.users WHERE auth_id IS NOT NULL AND auth_id<>id),
    'erp_users_auth_id_missing_auth_target', (SELECT count(*) FROM public.users u LEFT JOIN auth.users a ON a.id=u.auth_id WHERE u.auth_id IS NOT NULL AND a.id IS NULL),
    'duplicate_auth_id_groups', (SELECT count(*) FROM (SELECT auth_id FROM public.users WHERE auth_id IS NOT NULL GROUP BY auth_id HAVING count(*)>1) duplicate_ids),
    'profiles', (SELECT count(*) FROM public.profiles),
    'profiles_missing_auth_target', (SELECT count(*) FROM public.profiles p LEFT JOIN auth.users a ON a.id=p.id WHERE a.id IS NULL),
    'erp_users_missing_profile', (SELECT count(*) FROM public.users u LEFT JOIN public.profiles p ON p.id=u.id WHERE p.id IS NULL),
    'profiles_missing_erp_user', (SELECT count(*) FROM public.profiles p LEFT JOIN public.users u ON u.id=p.id WHERE u.id IS NULL),
    'user_role_assignments_missing_erp_user', (SELECT count(*) FROM public.user_roles ur LEFT JOIN public.users u ON u.id=ur.user_id WHERE u.id IS NULL),
    'user_tenant_assignments_missing_erp_user', (SELECT count(*) FROM public.user_tenants ut LEFT JOIN public.users u ON u.id=ut.user_id WHERE u.id IS NULL),
    'users_primary_role_not_in_user_roles', (SELECT count(*) FROM public.users u WHERE NOT EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=u.id AND ur.role_id=u.role_id)),
    'users_additional_rbac_role', (SELECT count(*) FROM public.users u WHERE EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=u.id AND ur.role_id<>u.role_id)),
    'companies_without_tenant', (SELECT count(*) FROM public.companies WHERE tenant_id IS NULL),
    'users_missing_company_tenant_membership', (SELECT count(*) FROM public.users u JOIN public.companies c ON c.id=u.company_id WHERE c.tenant_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.user_tenants ut WHERE ut.user_id=u.id AND ut.tenant_id=c.tenant_id)),
    'users_with_multiple_tenant_memberships', (SELECT count(*) FROM (SELECT user_id FROM public.user_tenants GROUP BY user_id HAVING count(DISTINCT tenant_id)>1) multiple_tenants)
  ),
  'authorization', jsonb_build_object(
    'users_without_primary_role', (SELECT count(*) FROM public.users u LEFT JOIN public.roles r ON r.id=u.role_id WHERE r.id IS NULL),
    'users_with_role_from_another_company', (SELECT count(*) FROM public.users u JOIN public.roles r ON r.id=u.role_id WHERE r.company_id IS NOT NULL AND r.company_id IS DISTINCT FROM u.company_id),
    'rbac_assignments_with_role_from_another_company', (SELECT count(*) FROM public.user_roles ur JOIN public.users u ON u.id=ur.user_id JOIN public.roles r ON r.id=ur.role_id WHERE r.company_id IS NOT NULL AND r.company_id IS DISTINCT FROM u.company_id),
    'users_with_branch_from_another_company', (SELECT count(*) FROM public.users u JOIN public.branches b ON b.id=u.branch_id WHERE b.company_id IS DISTINCT FROM u.company_id),
    'inactive_or_unspecified_users', (SELECT count(*) FROM public.users WHERE coalesce(status,'')<>'active'),
    'active_users_in_inactive_companies', (SELECT count(*) FROM public.users u JOIN public.companies c ON c.id=u.company_id WHERE u.status='active' AND coalesce(c.status,'')<>'active'),
    'active_users_with_inactive_role', (SELECT count(*) FROM public.users u JOIN public.roles r ON r.id=u.role_id WHERE u.status='active' AND coalesce(r.status,'')<>'active'),
    'roles_permissions_null', (SELECT count(*) FROM public.roles WHERE permissions IS NULL),
    'roles_permissions_object', (SELECT count(*) FROM public.roles WHERE jsonb_typeof(permissions)='object'),
    'roles_permissions_array', (SELECT count(*) FROM public.roles WHERE jsonb_typeof(permissions)='array'),
    'roles_permissions_other_shape', (SELECT count(*) FROM public.roles WHERE permissions IS NOT NULL AND jsonb_typeof(permissions) NOT IN ('object','array')),
    'roles_boolean_all_grant', (SELECT count(*) FROM public.roles WHERE permissions->'all'='true'::jsonb),
    'company_scoped_platform_named_roles', (SELECT count(*) FROM public.roles WHERE company_id IS NOT NULL AND lower(name) IN ('owner','developer','super_admin'))
  ),
  'tenant_relationships', jsonb_build_object(
    'inventory_product_warehouse_company_mismatch', (SELECT count(*) FROM public.inventory i JOIN public.products p ON p.id=i.product_id JOIN public.warehouses w ON w.id=i.warehouse_id WHERE p.company_id IS DISTINCT FROM w.company_id),
    'invoice_customer_company_mismatch', (SELECT count(*) FROM public.invoices i JOIN public.customers c ON c.id=i.customer_id WHERE i.company_id IS DISTINCT FROM c.company_id),
    'invoice_line_product_company_mismatch', (SELECT count(*) FROM public.invoice_lines l JOIN public.invoices i ON i.id=l.invoice_id JOIN public.products p ON p.id=l.product_id WHERE i.company_id IS DISTINCT FROM p.company_id),
    'sale_cashier_company_mismatch', (SELECT count(*) FROM public.sales s JOIN public.users u ON u.id=s.cashier_id WHERE s.company_id IS DISTINCT FROM u.company_id),
    'sale_invoice_company_mismatch', (SELECT count(*) FROM public.sales s JOIN public.invoices i ON i.id=s.invoice_id WHERE s.company_id IS DISTINCT FROM i.company_id),
    'payment_invoice_company_mismatch', (SELECT count(*) FROM public.payments p JOIN public.invoices i ON i.id=p.invoice_id WHERE p.company_id IS DISTINCT FROM i.company_id)
  ),
  'upgrade_constraints', jsonb_build_object(
    'duplicate_open_shift_groups', (SELECT count(*) FROM (SELECT company_id,branch_id,cashier_id FROM public.shifts WHERE status='open' GROUP BY company_id,branch_id,cashier_id HAVING count(*)>1) duplicate_shifts),
    'open_shifts_without_branch', (SELECT count(*) FROM public.shifts WHERE status='open' AND branch_id IS NULL),
    'duplicate_invoice_uuid_groups', (SELECT count(*) FROM (SELECT uuid FROM public.invoices WHERE uuid IS NOT NULL GROUP BY uuid HAVING count(*)>1) duplicate_invoices),
    'invoice_uuid_zatca_uuid_disagree', (SELECT count(*) FROM public.invoices WHERE uuid IS NOT NULL AND zatca_uuid IS NOT NULL AND uuid<>zatca_uuid),
    'invoices_with_xml_or_stamp', (SELECT count(*) FROM public.invoices WHERE nullif(xml_content,'') IS NOT NULL OR nullif(cryptographic_stamp,'') IS NOT NULL),
    'negative_invoice_amounts', (SELECT count(*) FROM public.invoices WHERE subtotal<0 OR discount_amount<0 OR vat_amount<0 OR total_amount<0 OR amount_paid<0 OR amount_due<0),
    'invoice_lines_invalid_quantity_or_price', (SELECT count(*) FROM public.invoice_lines WHERE quantity IS NULL OR quantity<=0 OR unit_price IS NULL OR unit_price<0),
    'invoice_lines_invalid_legacy_rate_or_discount', (SELECT count(*) FROM public.invoice_lines WHERE tax_rate<0 OR tax_rate>100 OR discount_percent<0 OR discount_percent>100),
    'fractional_inventory_rows', (SELECT count(*) FROM public.inventory WHERE quantity_available<>trunc(quantity_available) OR quantity_reserved<>trunc(quantity_reserved)),
    'invalid_product_vat_rates', (SELECT count(*) FROM public.products WHERE vat_rate IS NULL OR vat_rate<0 OR vat_rate>100)
  )
) AS security_counts;
