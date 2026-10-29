SELECT jsonb_build_object(
 'active_branches',(SELECT count(*) FROM public.branches WHERE status='active'),
 'active_warehouses',(SELECT count(*) FROM public.warehouses WHERE is_active),
 'warehouses_without_branch',(SELECT count(*) FROM public.warehouses WHERE is_active AND branch_id IS NULL),
 'warehouse_foreign_branch',(SELECT count(*) FROM public.warehouses w JOIN public.branches b ON b.id=w.branch_id WHERE w.company_id<>b.company_id),
 'branches_without_active_warehouse',(SELECT count(*) FROM public.branches b WHERE b.status='active' AND NOT EXISTS(SELECT 1 FROM public.warehouses w WHERE w.company_id=b.company_id AND w.branch_id=b.id AND w.is_active)),
 'stock_below_reserved',(SELECT count(*) FROM public.inventory WHERE quantity_available<quantity_reserved),
 'negative_stock',(SELECT count(*) FROM public.inventory WHERE quantity_available<0),
 'active_cashiers_without_branch',(SELECT count(*) FROM public.users u JOIN public.roles r ON r.id=u.role_id WHERE u.status='active' AND r.name='cashier' AND u.branch_id IS NULL),
 'unbalanced_posted_journals',(SELECT count(*) FROM (SELECT j.id FROM public.journal_entries j JOIN public.journal_entry_lines l ON l.journal_entry_id=j.id WHERE j.status='posted' GROUP BY j.id HAVING sum(l.debit_amount)<>sum(l.credit_amount)) bad)
) AS readiness;
