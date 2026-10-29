# Existing Supabase security and upgrade gates

This is a local code audit. It does not establish the contents, configuration or
security of the remote Supabase project. Do not apply the fresh-install baseline
to an existing database until its object definitions and data have been compared.

## Local protection added after the audit

Migration `20261026000100_role_write_hardening.sql` removes direct
`INSERT`, `UPDATE` and `DELETE` privileges on `public.roles` from
`PUBLIC`, `anon` and `authenticated`. It also removes existing column-level
`INSERT`/`UPDATE` grants, which table-level revocation alone does not remove.
Existing SELECT privileges and SELECT policies are unchanged. The trusted
`service_role` retains role maintenance; database owners and reviewed
SECURITY DEFINER onboarding continue to work with their own privileges.

The prior canonical company-role policy permitted a company administrator to
rename their existing role to `owner` or `developer`, or rewrite its JSON
permissions, without changing `users.role_id`. The user-assignment trigger
`erpx_guard_user_security_fields` did not cover this separate write path.
Client role mutation is now unnecessary because the role/matrix screens only
read applied grants. Role names and permission definitions must be maintained
through controlled migrations or explicitly authorized server code. User
assignment through the guarded `manage-users` endpoint is a separate operation.

`node database/tests/role-security.mjs` exercises the previous exploit, table
and column grant revocation, client creation/deletion denial, trusted server
maintenance, verified onboarding and migration repeatability. It also tests the
existing `business_can_access` checks for suspended companies and an optional
inactive role status. It does **not** establish those status checks for every
older helper or POS path. No existing permission helper is replaced by this
hardening migration.

## Gates before an existing-schema upgrade

Fresh installations additionally apply
`20261026000200_security_parity.sql`. It aligns tenant/permission/business
helpers on active company and role checks without requiring `tenants` or a
`roles.status` column. It blocks client audit forgery and anonymous audit
reads, restricts audit viewing to authorized company staff, and validates
product/account company references in line policies and invoice issuance.
`node database/tests/security-parity.mjs` verifies those fresh-install
protections, including safe manual lines without a catalog product and trusted
server audit writes. This additive migration does not alter the separately
reviewed target-specific upgrade or any previously signed document values.

1. **Resolve identity keys before enabling new authentication/onboarding.**
   `readAccessSnapshot`, Edge authentication, `get_user_company_id` and new
   mutations require `public.users.id = auth.users.id = auth.uid()`. Historical
   files also describe random ERP IDs with `firebase_uid`, and
   `usersService.getCurrentUser` still queries an `auth_id` bridge. Inventory
   actual users/profiles keys and every referring FK. The compatibility
   migration only rejects `firebase_uid NOT NULL`; it does not migrate any
   identity model. Preserve existing IDs and build an explicit mapping instead
   of recreating users or replacing primary keys in place.

2. **Resolve the two authorization models.** Existing `get_user_roles` and
   `get_user_permissions` RPCs take precedence in frontend authorization, while
   new database mutations use `users.role_id` and `roles.permissions`.
   Compare `user_roles`, `role_permissions`, role JSON values and primary role
   assignments. Empty new JSON grants must not silently replace populated RBAC
   assignments. Do not drop old assignment tables or expose a fallback after a
   denied RPC. Historical global `roles.name` uniqueness also conflicts with
   company onboarding creating another tenant's `admin` role; adding
   `company_id` does not remove that constraint.

3. **Treat the core as a fresh-install baseline.**
   `20261022000100_core.sql` contains unconditional table, policy and trigger
   creation. Blanket `IF NOT EXISTS` substitutions would conceal incompatible
   existing columns/FKs. Inspect both
   `supabase_migrations.schema_migrations` and `erpx_migration_history`;
   do not mark the baseline applied until equivalent objects are demonstrated.
   Build a new additive upgrade from the actual live schema.

4. **Compare permission helpers and complete policy sets.** Export definitions,
   owners, argument names, return types, search paths and ACLs for
   `get_user_company_id`, `user_has_permission`, RBAC helpers,
   `complete_pos_sale`, `create_inventory_movement`,
   `recalculate_invoice_payment_state` and `register_company_account`.
   `CREATE OR REPLACE` retains explicit grants and cannot freely change
   signatures. The canonical company/permission helpers do not check company
   suspension or optional role status, unlike `business_can_access`; never
   overwrite a stricter live implementation without reconciling this difference.
   Existing permissive policies with other names survive and combine with OR.
   The new restrictive fences do not cover every users/roles/order relationship.

5. **Check SECURITY DEFINER exposure and schema ownership.** Inspect all
   overloads, including old functions left outside the canonical plan.
   `REVOKE FROM PUBLIC` does not remove a separate `anon` or
   `authenticated` grant. Review `public` schema CREATE privileges and older
   definer functions with unqualified relation names and
   `search_path=public`, including `create_inventory_movement`. Check table,
   column, inherited-role and default privileges, not only RLS expressions.
   Keep service keys server-only. Future blanket table/column grants can undo
   the role privilege hardening and must be reviewed.

6. **Preserve existing posting/provisioning triggers.** Inventory triggers on
   `auth.users`, `users`, `payments`, `invoices`, `sales`, `shifts` and
   inventory. Compare `payment_recalculate_invoice`,
   `erpx_guard_user_security_fields` and update timestamp triggers with any
   differently named live triggers. Two posting or profile-provisioning
   implementations can cause duplicate accounting or conflicting membership.
   Do not disable triggers or use `DROP ... CASCADE` to get past a conflict.

7. **Check data before indexes, constraints or defaults.** Count duplicate open
   shifts before `shifts_one_open_per_cashier`, duplicate invoice UUIDs before
   `uq_invoices_uuid`, orphan `sales.invoice_id` before its FK, and unsupported
   statuses/amounts before invoice checks. Verify exact uniqueness required by
   inventory `ON CONFLICT(product_id,warehouse_id)`, account
   `(company_id,account_code)` and customer `(company_id,customer_code)`.
   Review collisions with reserved `ERPX-POS-*`, `ERPX-AR` and walk-in
   customer codes rather than repurposing existing accounts. Keep fractional
   quantities, original tax values and currency precision intact.

8. **Preserve document and audit history.** Reconcile existing `uuid` and
   `zatca_uuid` before adding UUID defaults; never generate a new identity for
   an already signed invoice. Preserve hashes, XML, signatures, payment links
   and posted entries. Map canonical audit columns
   `company_id/entity_type/entity_id/old_values/new_values` to historical
   `tenant_id/table_name/record_id/old_data/new_data` without discarding events.
   Review historical audit/notification INSERT policies that use
   `WITH CHECK(true)`; RLS does not prove event integrity if clients can forge
   those rows.

## Data protection and rollback boundaries

Before replacing an object, retain its definition, ACL, policies, triggers and
the associated migration version/checksum. Verify a recoverable snapshot of the
actual database, including identity relationships, outside this source tree.
Run the reconciled upgrade on a restored copy first. Stop on invalid existing
rows; do not auto-delete shifts, round stock, rewrite invoice amounts or replay
historical posting to force constraints to pass.

Keep DDL and its migration-history entry transactional. The local apply script
commits migrations separately, so a failure in a later file does not undo
earlier committed files. After new transactions exist, do not drop added
tables/columns or blindly restore previous posting/RLS definitions. A forward
correction may be required to retain new references and avoid duplicate
postings. Restore backups into a separate database for comparison before any
data replacement. Authentication invitations and external ZATCA/payment actions
are not undone by a PostgreSQL transaction; do not exercise them as migration
probes against production.
