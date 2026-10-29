# Current database deployment

Updated 2026-10-29. The authoritative fresh installation is `supabase/migrations/` in filename order. Its nine migrations cover the canonical core, transactional POS, business workflows, integration quota, ZATCA submission records, company settings and authenticated company onboarding, plus role-write and security hardening.

For the **existing linked project**, the separate [reviewed upgrade](upgrades/20261026-existing-project/README.md) was applied on 2026-10-26 as Supabase migration `20261026163746`. The live schema now has 51 public base tables and 32 routines. All 43 original tables and 193 rows retained every original column value, verified before/after commit. Do not apply or mark the fresh baseline as deployed on this project.

Configuration follow-up `20261026165656` then linked the existing warehouse to its company's sole active branch and created one empty warehouse for the other branch, with two audit events. Both active branches now have warehouses; all business and inventory hashes remained unchanged. This deliberately changes warehouse routing metadata; it does not create opening stock or historical journals. `manage-users` was deployed as version 1 with JWT verification; `APP_SITE_URL` matches the project's existing HTTPS Auth site origin.

On 2026-10-27 the application was published directly to https://www.erpx-ai.com at the owner's request. AI gateway version 7 and ZATCA gateway version 1 were also deployed with JWT verification. New AI source was deployed as version 8 on 2026-10-29 and connected to the authenticated local Ollama/Qwen3 gateway; paid model use remains disabled. After publishing the five reviewed project secrets, fresh metadata reports current versions `ai` 9, `manage-users` 2, `zatca` 2 and the legacy function 4, all active with JWT verification. No other function source was intentionally redeployed in this activation. ZATCA taxpayer credentials/signing remain unconfigured. The production acceptance journeys use marked companies with dedicated confirmed Auth accounts; they send no email or external payment/tax request. Those fixtures are distinct from the original 193 business rows. See [implementation status](../docs/IMPLEMENTATION_STATUS.md) for release verification and acceptance results.

The published browser journey passed on 2026-10-28: receive 10, cash POS sale of 2 for 230, stock 8, issue a standalone 115 invoice, collect 40 + 75, verify five balanced native journals totaling 820 per side, and close the shift at 230 with zero difference. Independent read-only aggregates matched. An original-primary-key/column comparison after these test writes again found all 193 original rows preserved, with only the reviewed warehouse routing columns differing from the pre-upgrade backup. Acceptance covers this core journey, not every module, concurrent-client scenario or external provider.

After publishing and checking the display patch, the guarded acceptance finalizer suspended only the marked fixture company/tenant and both test identities, banned their Auth sign-in, and disabled further live mutations in the private receipt. It retained all test financial documents and journals with a finalization audit record. No originals were suspended and no transaction was deleted.

The 2026-10-29 AI activation applied no SQL migration. A separate empty marked company was provisioned for its hosted acceptance test, without reusing the finalized business fixture. The actual published assistant returned an Arabic zero-invoice answer with the configured model identity. Anonymous access returned 401, cashier access 403, and client-selected provider/model/company overrides 400. Invoices, sales, payments and journals were empty before and after the single chat. The guarded finalizer then suspended the new fixture and banned both test identities. The assistant reads authorized invoice aggregates; it has no tools for financial writes. Its local computer and temporary tunnel must remain online; see [AI operation](../docs/AI_ARCHITECTURE.md).

The alternate Firebase schema (`schema.sql`), `CREATE_*` repair scripts, old seed data and `database/migrations/001_rbac_*` scripts are historical alternatives. Do not mix them with the canonical installation. No shared user passwords or demo company are seeded.

## Local validation without a cloud account

```powershell
node database/build-migrations.mjs --check
npm.cmd --prefix database/tests install
node database/tests/transactions.mjs
node database/tests/business-workflows.mjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File database/apply-migrations.ps1
```

The last command lists the migration plan only. PostgreSQL tests run in an isolated PGlite instance and do not read application environment secrets or change Supabase. They exercise actual SQL, RLS, business permissions, transaction rollback, server prices/tax, native balanced journals, retries, receipts and onboarding. PGlite is a single-session engine; these checks do not replace concurrent-client, email, Edge Function or hosted Supabase acceptance tests.

The generated `000100_core` and `000200_transactional_sales` migrations come from the reviewed files listed in `migration-plan.mjs`. To revise an unreleased baseline, update those source files and run `node database/build-migrations.mjs`. Once a migration has been deployed, add a new upgrade migration instead of changing its contents.

## Fresh Supabase project

1. Create/sign in to the Supabase account and prepare a project. This repository does not provision a paid provider account.
2. Install PostgreSQL client tools (`psql`) or the Supabase CLI. Verify Auth email confirmation, allowed site URL and callback/invitation/reset redirects.
3. Review the migration plan. Set `DATABASE_URL` securely in the **process environment** to the administrative database connection string. Do not put it in `VITE_*`, commit it, paste it into logs or pass it as a command argument.
4. Apply with the privileged PostgreSQL client:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File database/apply-migrations.ps1 -Apply
```

The script checks connectivity, refuses an existing unversioned company schema, checks applied file hashes and runs each new migration plus its history entry in one transaction. It forwards PostgreSQL authentication through the child process environment, restores prior environment values afterwards and never prints the connection string. It needs a real administrative database credential; a browser anonymous key cannot apply DDL.

Alternatively, use the standard Supabase CLI migration workflow for a **fresh reviewed project** (`supabase link` followed by `supabase db push`). Choose one deployment/history workflow consistently. The PowerShell script maintains `public.erpx_migration_history`; Supabase CLI maintains its own history. Do not switch between them without reconciling both histories against the installed schema.

5. Configure `.env.local` using public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Deploy server functions and provider secrets separately; see `docs/IMPLEMENTATION_STATUS.md` and `.env.server.example`.
6. Register a real Auth account and verify its email. The authenticated `register_company_account` RPC creates only that caller's new company, scoped administrator, main branch and branch-linked warehouse. It is replayable and cannot select an existing company to join. Requested subscription options remain **unpaid**; registration neither charges nor activates a paid provider plan.
7. Add real products, receive stock, open a cashier shift and execute the staging acceptance journey before deployment to production.

## Existing database

Do **not** run the canonical core baseline over an existing schema. Start with a backup and restoration rehearsal, then inspect installed tables, constraints, policies, functions and migration history using an administrative connection. The existing project contains schema variants; `CREATE TABLE IF NOT EXISTS` does not reconcile their differing columns.

Prepare a separately reviewed additive upgrade for the actual installed schema. Relevant new source changes are in `007_schema_compatibility.sql` and `008_transactional_sales.sql`; they are not proof that every historical schema is compatible. In particular, resolve duplicate open cashier shifts before creating the unique partial index, and map active warehouses to their company branches before POS checkout. Do not delete or rewrite historical posted transactions to satisfy a migration.

The Firebase-auth schema is rejected by the compatibility bridge until identities are explicitly migrated. Canonical `users.id` must match Supabase `auth.users.id`. Legacy ERP roles use trusted `users.role_id -> roles`; alternate tenant/RBAC tables are not required by the canonical application fallback.

## Limits and release checks

- The owner supplied private Management API access. The target-specific upgrade passed 13 checks on a restored private local clone, then was applied atomically with a fresh verified DPAPI public-schema backup and an in-transaction original-data guard. Read-only live verification passed 12 role/tenant/privilege checks for each of the two existing users plus six platform/integrity checks. This is not a full Supabase platform backup or a cloud financial acceptance journey.
- Local tests do not prove remote schema state, multi-client concurrency, backup recovery, ZATCA certification or actual payment-gateway capture.
- POS takes catalog prices/rates, honours reservations, writes sale/invoice/payment/stock/native journal atomically and requires a stable request UUID. Its document discount is additional to line discounts; the current UI sends zero document discount.
- POS supports one full payment method per sale. Split tender, returns/credit-note workflows, and batch/serial allocation require further implementation; tracked products fail clearly instead of silently bypassing allocation.
- POS settlement entries record an operator-confirmed payment method. They do not call or capture money through a card/acquiring gateway.
- Validate two real companies and every role, competing sales for the last available unit, retry-after-timeout, shift cash counts, invoice issuance/partial receipts, stock receiving and all external services in isolated staging before release.

## Existing-project inspection tools

Use [inspection/README.md](inspection/README.md) for metadata-only export and offline comparison against the current application contract. The linked project was inspected under owner authorization; exact definitions and business rows were handled separately in private, gitignored artifacts. The live upgrade preserves global roles and the existing JSONB registration API rather than installing the fresh baseline.
