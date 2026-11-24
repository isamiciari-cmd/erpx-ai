# Inspected existing-project upgrade

This is a separate deployment path for the existing project linked in `supabase/.temp/project-ref`. It is **not** a fresh-install baseline. Do not run `supabase db push` with the unrelated canonical fresh-install history against this existing database or mark those baseline migrations as applied.

The inspected baseline has 43 public tables and 193 rows, global unique role names, Auth UUIDs in `users.id`, legacy tax/discount aliases and JSONB company registration. The upgrade preserves those identities, role rows, signatures and historical financial values. It adds native accounting, transactional checkout, business registers, settings and integration submission/quota records. New entries are posted by new activity; historical journals/opening balances are not invented.

## Review and test

```powershell
node database/upgrades/20261026-existing-project/build-upgrade.mjs
node database/upgrades/20261026-existing-project/test-upgrade.mjs
```

The test restores the encrypted private public-schema backup into isolated PGlite and exercises real SQL/RLS. Decryption requires the same Windows user and an execution context with DPAPI access. It is not a live multi-client, email, Storage, Realtime or Edge Function test. Fourteen checks cover preservation of every original column in the main migration, warehouse configuration/replay safety, both existing primary admin roles, anonymous denial, cashier limits, stock/checkout idempotency, native balanced journals, receipts/overpayment, company boundaries, foreign references, verified registration and suspended-company denial. Once applied, the test pins the original pre-upgrade backup recorded in the private receipt.

`upgrade.sql` is generated from the reviewed source files plus `target-overrides.sql`. Its single transaction locks existing public tables briefly, captures original-column hashes and row counts, and aborts if any original value changes. Lock/statement timeouts are 3/45 seconds. Invoice alias backfill only populates new fields. Current web checkout supplies the required stable request UUID; the old nine-argument RPC now raises an upgrade-required error to avoid duplicate payments on retries.

## Apply once

```powershell
python database/upgrades/20261026-existing-project/apply-reviewed.py
```

This command is a **live write**, authorized by the project owner. It pins the reviewed project, verifies exact SQL against the successful local test hash, refuses baseline drift, makes a fresh verified encrypted backup, and calls the official [atomic Management API migration endpoint](https://supabase.com/docs/reference/api/v1-apply-a-migration). The endpoint owns the outer transaction and migration-history row. Credentials are loaded privately from `.env.server.local`; they are never command arguments or output. It refuses a second attempt when an apply receipt exists. On timeout/uncertain response, reconcile remote history and schema read-only before considering another action.

Private evidence under gitignored `.tmp/supabase-review/` includes the encrypted backup/manifest, test result, pre/post original-column fingerprints, API receipt and redacted catalog. The backup covers public base tables, exact public definitions, sequence configuration/state and Auth UUIDs only. **It is not a complete Supabase platform backup**: Auth passwords/tokens, Storage files and provider configuration are not captured. DPAPI recovery requires this Windows account; preserve its recovery/access arrangements.

## Recovery and verification

### Primary-role replacement (2026-11-23)

The company UI sends an update to `manage-users`. The function verifies the
actor's current primary role and company, checks the target and branch, and
updates `public.users.role_id`. On the linked legacy schema, explicit extra
grants reside in `user_roles(user_id, role_id)`, while memberships reside in
`user_tenants`. The deployed `get_user_roles` and `get_user_permissions`
combine the primary role with active in-scope grants. POS and stock RPCs
re-evaluate `user_has_permission` or `business_can_access` using the current
primary role on each request. These live helpers and the company fences agree
with the target-specific upgrade path. A clean canonical install has no
legacy grant table and the trigger safely does nothing there.

The migration retires only the link matching the replaced primary role, in the
same transaction. A separately granted different role is preserved. The two
legacy columns cannot distinguish an independent grant of the **same role** from
a mirror. For a single-company account the replacement revokes that old pair.
For a global role with another tenant membership and the old pair present, the
update aborts for manual review and neither membership or role is changed.
No historical grant cleanup or backfill is included.

Isolated PostgreSQL checks exercised the deployed role-resolution logic with
synthetic data. Both the same request identity and a newly initialized one
could sell after demotion and were denied stock receiving. PGlite models a
request JWT subject on a single database connection. The hosted verification
below uses the original access token and a second Auth sign-in. An open tab
can still display a cached role snapshot until access is fetched again. Reload
or sign in again to update the display. The database does not require token
renewal to enforce permissions.

Review the offline plan first. Apply only after approval and a fresh verified
DPAPI backup of the pinned project, using the existing backup procedure. The
writer targets only this migration through the Management API and reruns the
isolated tests before its one-time write. Do not use the fresh baseline.

```powershell
python database/upgrades/20261026-existing-project/apply-role-retirement.py
python database/upgrades/20261026-existing-project/apply-role-retirement.py --apply --backup ".tmp/supabase-review/<verified-backup>.dpapi"
```

After an approved apply, provision a **new synthetic** fixture and run the
hosted verification. The verifier uses the normal user-management endpoint to
demote a marked test administrator, then checks both sessions and keeps the
synthetic transactions. If it fails, inspect fixture state before retrying.

```powershell
python scripts/provision-live-fixture.py --apply-qa roles
node.exe scripts/verify-live-role-change.mjs
```

Before commit a failure rolls back both trigger creation and migration history.
After commit, use a separately approved corrective migration to drop trigger
`retire_replaced_primary_role` on `public.users`, then drop function
`public.retire_replaced_primary_role()`. This stops future retirement.
It does not recreate grants removed by intervening role changes. Reconcile
those pairs individually against the backup and approved role history. Never
regrant former administrator access automatically. An uncertain API response
requires a read-only history and trigger check before any further apply.

### Original upgrade recovery

Before commit, a failure rolls back the upgrade. After a successful commit, prefer a reviewed corrective migration; do not drop new accounting tables or reset the live database. For a genuine data incident, stop writes, preserve the current state, verify the backup SHA256/DPAPI archive, and restore it first in an isolated clone using `database/inspection/clone-live.mjs`. Reconcile original Auth IDs and later business activity before any owner-reviewed live restore. No destructive automatic rollback is supplied.

After applying, capture a new redacted catalog and application-contract report, compare original-column fingerprints, check role/tenant access read-only, and build/typecheck/test the application. Run financial smoke transactions only in a separate staging project or for an actual authorized business transaction. AI provider activation, taxpayer certificates/signing and payment acquiring remain separate external integrations.

## Applied configuration follow-up

Main migration `20261026163746` completed with every original value preserved. Follow-up `20261026165656` intentionally changed only warehouse configuration/audit data: the existing warehouse's `branch_id` was set to its company's sole active branch, one empty warehouse was added for the other active branch, and two audit events were recorded. All other public business and stock rows matched independent before/after hashes. No product quantities, invoices, payments or historical journal balances were changed. The current readiness check shows two branches, two active warehouses, and zero missing/foreign branch mappings or invalid stock counts.

The explicit one-time writer is `apply-warehouse-configuration.py`, gated by the tested `configure-warehouses.sql` SHA256, primary-upgrade receipt, and a fresh verified 51-table encrypted backup. It refuses ambiguous branch mapping and uncertain-response retries.

`manage-users` version 1 was deployed with `verify_jwt:true` using the three reviewed source files. `APP_SITE_URL` was created from the existing HTTPS Auth site URL; no Auth settings changed and no emails were sent. Names-only verification passed and an unauthenticated invocation was rejected with HTTP 401. The deployed AI function is an older version with no model/provider secrets; ZATCA remains undeployed without taxpayer setup. See the implementation status for remaining release work.
