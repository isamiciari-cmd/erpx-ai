# Current application database contract

This is a read-only source audit, not a claim about the existing Supabase project. No application/schema/data changes are made. The detailed column lists, exact RPC argument names, expected return fields and source hashes are in [app-contract.json](app-contract.json). Rebuild with `node database/inspection/build-app-contract.mjs`.

## Resolved compatibility adaptations

- **canonical_user_identity**: Profile lookup uses users.id = Auth UUID; a nullable legacy auth_id is not needed.
- **customer_contact_normalization**: Customer reads expose aliases while writes use existing contact_name/phone only. Explicit clears and payment_terms strings are preserved; conflicting aliases are rejected.
- **permission_catalog_normalization**: Permission display deduplicates trusted JSON and relational grants. It accepts permission_key and optional older key/name aliases; absent labels default to the permission key.

Customer contact_person/phone_number and permission key/name are optional compatibility aliases, not extra required database columns.

## Remaining integration considerations

- **json_business_vs_native_modules**: Current HR employee/payroll/attendance/leave screens and several finance workflows use business_records.module/data, not legacy employees/payroll/attendance/leaves/budgets tables. Existing native records will not appear automatically. Plan an explicit reviewed import or application mapping; preserve IDs, tenant scope and employee_id references.
- **retained_direct_finance_writers**: Retained createInvoice/updateInvoice/markInvoiceAsPaid and salesService.createPayment functions perform direct table writes; current accounting UI uses atomic RPCs instead. Do not loosen RLS/grants to make unused direct writers bypass accounting/stock validation. Confirm call reachability before removing or adapting them.

The active identity contract is **public.users.id = auth.users.id**. Authorization requires an active company profile and server-owned role assignment. Do not derive authority from Auth user metadata.

## Required current business tables

| Public table | Required columns | Main source |
|---|---:|---|
| companies | 7 | src/app/pages/TenantManagementPage.tsx |
| users | 14 | src/lib/authSession.ts |
| roles | 2 | src/lib/authSession.ts |
| branches | 4 | src/services/adminDirectoryService.ts |
| customers | 15 | src/services/customersService.ts |
| products | 25 | src/services/productsService.ts |
| inventory | 9 | src/services/inventoryService.ts |
| warehouses | 5 | src/services/businessInventoryService.ts |
| sales | 21 | src/services/salesService.ts |
| shifts | 17 | src/services/salesService.ts |
| payments | 19 | src/services/salesService.ts |
| invoices | 50 | src/services/invoicesService.ts |
| invoice_lines | 11 | src/services/invoicesService.ts |
| chart_of_accounts | 6 | src/services/businessRecordsService.ts |
| journal_entries | 6 | src/services/businessRecordsService.ts |
| journal_entry_lines | 4 | src/services/businessRecordsService.ts |
| business_records | 13 | src/services/businessRecordsService.ts |
| business_record_events | 8 | src/services/businessRecordsService.ts |

Conditional RBAC and platform tables are profiles, permissions, role_permissions, developer_access_logs, emergency_access_logs and audit_logs; their exact requirements are documented in JSON. sales_orders is a retained service/embedded-join dependency. inventory.company_id and products.stock are **not** required storage columns: scope comes through products and stock is computed.

## RPC coverage

| RPC | Requirement | Named input arguments |
|---|---|---|
| complete_pos_sale | core | p_company_id, p_branch_id, p_cashier_id, p_shift_id, p_payment_method, p_customer_id, p_items, p_discount_amount, p_notes, p_warehouse_id, p_idempotency_key |
| close_pos_shift | core | p_shift_id, p_closing_cash |
| save_invoice_draft | core | p_company_id, p_customer_id, p_items, p_due_date, p_notes, p_request_id |
| issue_invoice | core | p_invoice_id |
| record_invoice_payment | core | p_invoice_id, p_amount, p_method, p_reference, p_request_id |
| receive_stock | core | p_company_id, p_product_id, p_warehouse_id, p_quantity, p_reference, p_request_id |
| save_business_record | core | p_company_id, p_id, p_expected_version, p_record |
| save_business_account | core | p_company_id, p_id, p_code, p_name, p_type, p_active |
| update_company_settings | core | p_company_id, p_name, p_legal_name, p_tax_id, p_currency, p_timezone |
| register_company_account | registration | p_company_name, p_legal_name, p_tax_id, p_vat_number, p_business_sector, p_company_size, p_country, p_city, p_address, p_website, p_branch_name, p_branch_code, p_subscription_plan, p_billing_cycle, p_max_branches, p_max_users, p_modules, p_full_name, p_job_title, p_mobile_number |
| get_user_roles | conditional_rbac | p_user_id |
| get_user_permissions | conditional_rbac | p_user_id |
| can_access_tenant | optional_tenants | p_user_id, p_tenant_id |
| log_developer_access | platform_admin | p_action, p_details |
| grant_emergency_access | platform_admin | p_user_id, p_reason, p_duration_hours |
| revoke_emergency_access | platform_admin | p_access_id |

The paired get_user_roles/get_user_permissions RPCs may both be explicitly missing when roles.permissions JSON is present. A denial, malformed result, network error or only one missing RPC must fail closed. The can_access_tenant fallback is limited to the profile company ID when that RPC is explicitly missing.

## Module storage

Current module screens use business_records.module and business_records.data. Their JSON keys are not SQL columns. Stored modules currently include:

`camera_connections`, `company_preferences`, `crm`, `currency_rates`, `delivery_orders`, `energy_readings`, `field_service`, `finance_assets`, `finance_budgets`, `finance_expenses`, `finance_journal`, `finance_payables`, `helpdesk`, `hr_attendance`, `hr_employees`, `hr_leave`, `hr_payroll`, `hr_recruitment`, `integration_cases`, `material_plans`, `product_lifecycle`, `projects`, `purchases_requests`, `review_rules`, `review_tasks`, `studio_definitions`, `subscriptions`, `timesheets`. Studio also generates `custom_<definition UUID without hyphens>`.

Employee IDs in HR payloads reference employee records in this same table. Existing native employees/payroll/attendance/leave tables are not auto-synchronized. Posted manual journals, POS sales, invoice issuance, receipts and goods receipts share the native journal_entries/journal_entry_lines ledger. Payable/expense/payroll approvals retain workflow/payment evidence and still require their corresponding accounting journals.

## Compare an inspection export

Run `node database/inspection/check-app-contract.mjs <catalog.json>` against an erpx_schema_catalog_v1 metadata export. The checker performs no network calls and writes no files. Missing core tables/columns/RPC signatures or required PostgREST relationships are blockers; optional/legacy expectations and unenforceable return shapes are warnings. It does not authorize automatic migrations. Test RLS and accounting behavior separately with authenticated acceptance tests.
