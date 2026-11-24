# ERPX implementation and next steps

Updated 2026-11-23. This document supersedes historical claims that all modules or integrations are complete.

## First customer acceptance — one branch (2026-11-23)

The workspace was based on Git `485df4dcf` with local changes. The November
acceptance used the published application for the main browser journey, the
local worktree for the cashier rejection message, and the linked Supabase
project with two newly marked synthetic companies. The worktree was not
published as part of acceptance. Run ID `20261123T140809Z-d5b63a035835`.
The local report is
`.tmp/release-acceptance/20261123T140809Z-d5b63a035835/report.json`.

- The browser journey passed all 11 steps with no browser errors, HTTP
  failures or blocked mutation attempts. Administrator, cashier and
  accountant each saw their own company. Cross-company reads and stock writes
  were denied, and the targeted synthetic stock stayed unchanged.
- Received 10 units and sold 2 for SAR 230 cash, leaving 8. Issued a separate
  SAR 115 invoice and collected SAR 40 then 75, leaving zero receivable.
  Shift expected and counted cash were both SAR 230. The five journals
  balanced at SAR 820 on each side.
- Two cashier sessions raced for one unit using distinct keys. One sale
  completed, one request was rejected for insufficient stock and final stock
  was zero. There was one sale payment, one outbound movement and one sales
  journal. The independent browser check showed the stock rejection and left
  those totals unchanged.
- In the browser, the successful sale response and first receipt response
  were dropped after commit. Each persisted result was checked before retry.
  The UI reused each request key, leaving one sale, three payments, two
  inventory movements (receipt and sale) and five journals in the workflow
  company. Independent read-only Supabase counts matched.
- Test credentials were kept in Git-ignored files under
  `.tmp/release-acceptance/`. No file under `.tmp/` was tracked in the
  reviewed worktree.
- The current local registration form was submitted in a browser as a
  confirmed synthetic Auth user with no ERP profile. The published Supabase
  RPC created an active company, its main branch and branch-linked warehouse,
  and assigned the signed-in user the administrator role. The UI reached
  the registration-success screen and the authenticated session independently
  verified the persisted records. Signup email delivery was outside this
  check. Evidence is in `.tmp/release-acceptance/first-client-ui-report.json`.
  Registration now sends enabled module names as an array, which is accepted
  by the hosted JSONB signature and matches the canonical `text[]` signature.
- A live administration UI change of a synthetic cashier to accountant
  saved the new primary role and preserved the branch. A fresh Auth session
  still returned the old cashier grant from the legacy `user_roles` table.
  The original cashier role was restored through the UI. Migration
  `supabase/migrations/20261123000100_retire_replaced_primary_role.sql` is
  prepared and tested locally. It retires the replaced primary-role link
  atomically and preserves unrelated explicit grants. It does not remove
  historical links for accounts that are not changed. It blocks a role
  change when the old global link might be shared across memberships.
  Isolated tests verified cashier checkout and immediate denial of former
  administrator writes with an unchanged request identity and a new one.
  Applied to the linked Supabase project on 2026-11-23 after confirming that
  the six reviewed authorization definitions matched and verifying DPAPI backup
  `public-backup-20261123T143520Z.dpapi`. The live role-QA run
  `20261123T143624Z-0808121a59a0` verified one cashier sale and one denied
  stock receipt with each of the unchanged token and a new Auth session.
  The independent accountant grant was preserved. A separate synthetic
  global-role change was refused while its two tenant memberships stayed
  intact. The open tab retained the administrator UI until reload, then
  redirected to cashier POS. See the
  [application and verification runbook](../database/upgrades/20261026-existing-project/README.md#primary-role-replacement-2026-11-23).
- Post-change local verification passed TypeScript, the production build,
  346 Vitest tests, 59 isolated PostgreSQL checks and 9 browser security checks.

### First customer sign-off

| Scope | Status and owner |
| --- | --- |
| Company, one branch, warehouse and staff | **Company bootstrap and single-company role reassignment passed technical acceptance.** Development reviews ambiguous legacy grants individually when needed. The branch manager approves the staff roster and verifies sign-in and branch access on each terminal. Test invitation email and password recovery separately if used for this customer. |
| Catalog and opening inventory | **Receipt flow passed with synthetic data.** The branch manager approves SKUs, barcodes, units and the physical count. The customer's accountant signs quantities, unit costs, valuation date and the opening inventory/clearing treatment before posting. Development verifies repeat submissions and the reconciliation to the approved opening ledger. |
| Opening ledger and daily/period close | **Cash sale, individual receivable and shift closing passed.** The customer's accountant approves the opening trial balance, opening cash/bank, receivables and payables by account and document, and reconciles cash, bank and receivables. The accountant signs the daily close, period close, corrections and settlements. An opening goods receipt uses an inventory/clearing journal; any opening reclassification needs approval. |
| Cashier hardware | **Physical acceptance pending.** The branch manager tests the actual receipt printer and paper size, Arabic layout and reprint, popup permissions, and the scanner's SKU/barcode entry on the POS terminal. Development resolves hardware or browser integration issues. |
| Returns, credit notes and mixed payments | **Outside the accepted flow.** One full payment method is supported per POS sale. Credit-note domain types and validation exist. A transactional return, linked credit note, inventory reversal, refund and accounting reconciliation still require an end-to-end implementation. The branch manager identifies required scenarios, the accountant approves treatment and development implements and verifies the flows required before use. |
| ZATCA | **Gateway implemented. Integration acceptance pending.** The accountant confirms taxpayer identity and applicable invoice flows. Development configures the establishment/device and certificate lifecycle, generates compliant UBL XML, computes hashes and applies the required cryptographic signing and QR, then verifies clearance/reporting and reconciliation in simulation before production enablement. |

The ZATCA page lists invoice statuses and enables submission for issued
invoices with XML. The Edge function requires a prepared signed XML document,
UUID and SHA-256 hash, selects clearance or reporting, and records authority
responses and uncertain outcomes. It does not generate or sign the XML.
No registration, certificate provisioning, submission or activation with
ZATCA was performed in this acceptance. See the
[ZATCA technical guideline](https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Documents/E-invoicing-Detailed-Technical-Guideline.pdf).

### First branch rehearsal

Use the approved branch and warehouse throughout. The branch manager checks
SKU, barcode, unit, VAT category and physical quantity against the signed
opening catalog. The accountant signs the valuation date and unit costs,
then reconciles opening stock to the inventory/clearing journal and approves
the opening trial balance, cash/bank, receivables by invoice and settlements.
Enter the counted opening drawer cash when opening the shift. Record each
payment and reconcile the shift to counted cash and the ledger before closing.

The rehearsal on the existing synthetic workflow company received **3 units
at SAR 25**, with **SAR 75** on each side of the opening inventory journal.
The cashier opened with **SAR 50**, entered the test SKU through Scan, sold
one unit for **SAR 115** (including SAR 15 VAT), and closed at **SAR 165
expected and counted**, difference **SAR 0**. Final stock was **2** and
receivables were **SAR 0** before and after. The browser invoked print and
the generated receipt showed the item, VAT and paid amount. The branch
manager still needs to test the physical thermal printer, paper width,
Arabic rendering, scanner and Enter suffix on the actual workstation.
Evidence is in `.tmp/release-acceptance/first-branch-rehearsal-report.json`.

The local app reuses the authenticated access snapshot refresh on focus,
visibility, every 30 seconds while visible, and when a write is denied.
When access is lost, the app keeps edited inputs from the protected forms in
memory for the same session. The recovery panel is read-only and is cleared
on logout or when the user dismisses it.
The two-session live browser test reopened the role-QA subject as an
administrator, edited the legal name and demoted the subject from a separate
administrator session. The real settings RPC rejected the stale save. The
same browser document hid the administrator page and reached cashier POS.
The edited legal name was recoverable and the company record stayed unchanged.
The synthetic account ended on its original cashier role. Evidence is in
`.tmp/release-acceptance/first-branch-access-ui-report.json`.

| Conditional workflow | Acceptance required before use |
| --- | --- |
| Returns | No approved end-to-end return exists. Development must test full and partial returns against an original sale, stock/COGS reversal, refund, drawer/ledger/receivable reconciliation and replay without duplicate effects. The accountant approves the accounting and the branch manager verifies the return at the counter. |
| Credit notes | Document types and validation exist. Development must test original invoice linkage, partial and full credit, tax and receivable adjustments, audit trail and the required electronic output. The accountant signs the values, reference and treatment. |
| Split tender | POS accepts one full payment method. If the branch needs mixed tender, development must test cash plus card, zero remainder, failed or retried second payment, and matching the two payments to a single sale and drawer/clearing journals. The branch manager supplies scenarios and the accountant approves reconciliation. |
| ZATCA simulation | The accountant supplies the legal seller name, VAT number (and group/member identifiers if applicable), national address and branch, activity and standard/simplified invoice scenarios. Development supplies the EGS unit name, unique serial, software/provider version and invoice capability for the CSR, then prepares test credentials, signed XML, hash and QR as applicable. Check tax categories, references and both clearance/reporting paths in simulation before any production activation. Keep private keys and credentials in secure configuration. No ZATCA activation or submission was made in this rehearsal. |

[ZATCA security features and CSR fields](https://www.zatca.gov.sa/ar/E-Invoicing/SystemsDevelopers/Documents/20230519_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards_vF.pdf)

## Local AI pilot activated (2026-10-29)

At the owner's request, company setup was deferred and the AI architecture was
extended for a free local beginning and a later explicitly enabled hosted model.
Qwen3 1.7B is installed under a portable, loopback-only Ollama runtime and has
generated three real Arabic answers using synthetic invoice data. Manual review
matched the sample figures and checked missing-HR/read-only explanations. No paid
provider was called and no real company records were sent in these tests.

The published backend separates provider configuration/transport, authenticated
request handling and precise tenant-scoped invoice aggregation. The UI displays
actual provider/model status instead of fabricated availability or answers.
Validation: 306 app tests, TypeScript, 25 mocked Edge checks, 18 gateway boundary
checks, eight mocked deployment checks and a successful PTY production build.
The browser package passed actual credential-value and upload-policy scans.

The owner explicitly approved the protected temporary Cloudflare gateway and
production publication. Exactly five reviewed AI server settings are live;
`AI_PROVIDER=ollama`, `OLLAMA_MODEL=qwen3:1.7b` and
`AI_ALLOW_PAID_PROVIDER=false`, plus the private gateway origin and bearer.
Fresh metadata at 13:30 UTC on October 29 identifies the active AI function as
version 9 with JWT verification enabled.

Web release `erpx-20261028T115053746Z-48c4d95d69` is published at
https://code-376hkg8u8-isamiciari-5169s-projects.vercel.app and the stable production
alias. The audited output has 70 payload files, 71 including the release marker,
totaling 1,701,637 bytes. Initial asset checks and remote SHA-256 verification of
all 70 payload files passed.

The current release manifest records the preceding production deployment
`dpl_2GzLnCCaLJMJHQiqfbwKPs1QLxfn` as the rollback target.

Authenticated inference through the hosted application passed the separate
isolated-account acceptance run on October 29. Anonymous AI access returned 401,
cashier access 403, administrator status 200 with exact `qwen3:1.7b` local-model
identity, and provider/model/company override attempts each returned 400. The
published `/finance/ai-assistant` UI rendered an actual Arabic answer explicitly
stating zero/no issued invoices. Browser errors and blocked requests were zero;
invoices, sales, payments and journal entries were empty before and after the
single chat. Evidence: `.tmp/ai-runtime/published-ai-verification.json` and its
masked assistant screenshot, for new isolated run
`20261029T132657Z-6edf506741c0`.

After the successful AI test, the new fixture was finalized and its two test
accounts suspended. Its receipt is `finalized` and must not be reused.
Independent read-only verification at 13:33:05 UTC confirmed company/tenant
suspension, two suspended ERP users and two suspended profiles, two Auth bans,
exactly one matching finalization audit, and zero rows in all ten checked
financial/catalog/stock/shift tables. Evidence:
`.tmp/supabase-review/ai-finalization-verification-20261029.json`.
A fresh post-finalization preservation check also confirmed all 193 original rows
across 43 tables: 42 tables matched exactly, and the original warehouse retained
only the previously reviewed routing changes.

The earlier three successful Arabic generations were local tests. These small
checks do not establish broad answer accuracy or continuous availability. The
temporary pilot requires the laptop, local services and network to stay on and
has no SLA; it is not an always-on hosted inference service. A future paid
provider requires explicit provider and paid-use opt-ins; local failure does not
trigger paid fallback. See [AI architecture and setup](AI_ARCHITECTURE.md).

## Historical business release (2026-10-28)

- Production: https://www.erpx-ai.com. The root domain redirects to it; the stable Vercel production alias is https://code-isamiciari-5169s-projects.vercel.app.
- Historical release `erpx-20261028T110749363Z-4c09af94cd`, deployment https://code-68wqz1tog-isamiciari-5169s-projects.vercel.app, superseded by the October 29 AI release above. The audited prebuilt output contains 71 public files, 1,692,986 bytes, including the release marker. Private configuration, database exports and source maps are excluded. Its manifest recorded the then-previous deployment `dpl_3CoAk2tAc94p6TFf1coL9mWPhcYq` for rollback; the current rollback target is documented above.
- All three production origins returned the same release marker and application HTML. All 70 payload files, including lazy route chunks, matched the local SHA-256 manifest, lengths and content types on the stable production alias. The release marker also matched before and after that read-only check. Evidence is private in `.tmp/release-acceptance/production-verification.json` and `production-all-assets.json`.
- Vercel public connection variables are stored as sensitive environment variables. Empty readback values indicate masking; they do not establish that the remote values were absent. The published browser bundle was built with the validated public Supabase URL and anonymous key. No administrative key is bundled.
- At that historical business release, `manage-users` version 1, `ai` version 7 and `zatca` version 1 were deployed with JWT verification. The current AI activation is version 9, documented above. The previous AI implementation was downloaded and encrypted with Windows DPAPI before replacement.
- A fresh read-only comparison against the encrypted original backup found all 193 original rows across 43 tables. Values in 42 tables matched exactly; the original warehouse differed only in the reviewed `branch_id` and `updated_at` routing changes. Newly created fixture rows were excluded by original primary keys. Evidence: `.tmp/supabase-review/release-original-preservation-20261027.json`.
- At the owner's request, business acceptance ran against the published production application using a separate marked company and two dedicated test accounts. It sent no invitations, tax documents or external payment requests. See the completed journey below.

## Published business acceptance (2026-10-28)

All 11 browser workflow steps passed with authenticated, read-only database assertions, no browser runtime/HTTP errors and no blocked mutation attempts. The product had been created through the published UI on October 27; the resumed run verified the exact tagged product and zero stock or posted transactions before continuing. Earlier runner failures were label/guard mismatches, corrected without changing business records. The prior attempt's report/screenshots were retained separately.

| Scenario | Verified result |
| --- | --- |
| Catalog and stock receipt | Price 100, cost 30, VAT 15%; received 10 units; receipt journal 300 debit/credit |
| Cashier shift and POS | Opened with zero cash; sold 2 units for 230, including VAT 30; one sale, invoice and payment |
| Stock after checkout | 8 units on hand, zero reserved |
| Standalone invoice | Issued for 115; receivable journal balanced; no stock dispatch, which remains a separate workflow |
| Partial and final receipts | 40 then 75; due 75 then zero; invoice changed from partial to paid |
| Ledger and cash reconciliation | 5 posted journals, total debit 820 = credit 820; shift closed with expected/count cash 230 and difference zero |

An independent company-scoped live query confirmed one product, one sale, two fully paid invoices totaling 345, three payments totaling 345, zero invalid journals, open shifts, negative stock or foreign-company product references. A fresh original-only comparison after the business test again confirmed all 193 original rows and no value changes beyond the reviewed warehouse routing follow-up. Private evidence: `.tmp/release-acceptance/20261027T125148Z-8377c4cc66a4/report.json`, `.tmp/supabase-review/release-fixture-metrics-20261028.json` and `release-original-preservation-20261028.json`.

Visual review then identified ineffective dark-mode utility styles caused by separately compiled CSS entries, missing cashier branch metadata, and a corrupted product placeholder. The published patch combines the CSS entry, retrieves optional company-scoped display metadata without changing permissions, and uses the existing Package icon. All 279 tests across 27 files, TypeScript and the PTY production build passed. The artifact passed credential and upload-policy checks; its dark selectors now respond to the application theme class.

Read-only browser checks on that patched production release passed in both dark and light themes with the browser set to a light system preference. Ledger heading/cell contrast against the application background measured 17.86 and 16.76 respectively; the cashier showed the actual assigned branch and Package icon. No additional shift, financial write, browser error, HTTP failure or blocked request occurred. This targeted check is not a full accessibility audit. Evidence: `.tmp/release-acceptance/display-verification.json` and the masked screenshots in the run directory.

After these checks, guarded finalization completed successfully for this test run only: the fixture company/tenant and its two ERP/profile identities were suspended and Auth sign-in banned. Test invoices, payments, stock and journals were retained with a finalization audit event; no records were deleted. The private receipt is marked `finalized` with live mutations disabled. The fixture must not be reused.

Independent read-only verification confirmed both Auth bans, all fixture suspension states, exactly one matching finalization audit, and unchanged financial/stock totals. Evidence: `.tmp/supabase-review/finalization-verification-20261028.json`. Fresh Edge metadata on October 28 confirmed all deployed functions were active with JWT verification; provider key/model and taxpayer credential names were absent at that time. AI provider settings were subsequently activated on October 29 as documented above.

## Implemented application behavior

- Server-verified auth profile/roles, every required role enforced, production demo fallback removed.
- Versioned tenant-scoped business workflow records with server validation and immutable audit events.
- Native draft invoices, server-priced transactional POS, stock locks, idempotency, native journal/receipt integration.
- Finance/HR registers, native ledger reports, product catalog and goods receiving.
- Persisted CRM/projects/service/helpdesk/form records. These are registers, not full specialist engines.
- Invoice-derived dashboards, lazy route loading, CSV/print exports.
- Authenticated AI provider gateway using aggregated invoice data, with the protected local Ollama connection published on October 29 and one actual Arabic UI answer verified in the separate hosted acceptance run. No fabricated growth/forecast figures.
- ZATCA submission gateway accepts already prepared signed XML, uses per-company credentials and actual authority responses, and retains uncertain outcomes for reconciliation.

## Acceptance scope and remaining verification

1. The published core UI journey for the existing upgraded schema passed. The fresh canonical migration path has separate local acceptance coverage; it was not applied over this existing production project.
2. Test two companies and all user roles, invoice issuance/receipts, competing POS sales, stock reservation, retry and offline/error behavior.
3. Review accounting policy, fiscal close, expense/payroll posting and corrections with the business owner. Some registers require a separate balanced journal; marking them paid is not a bank transfer.
4. Rehearse full provider-level disaster recovery and deployment rollback. The encrypted public-schema backup has already been restored locally and registration tested against the actual public schema plus a minimal Auth stub; this does not prove full hosted Auth/email/Storage recovery.
5. Complete visual QA in Arabic/English, mobile viewport and actual POS hardware.

## External setup not completed

The owner supplied private Supabase Management API access, and the existing database upgrade is deployed. Fresh metadata at 13:30 UTC on October 29 shows active JWT-verified functions `manage-users` version 2, `ai` version 9 and `zatca` version 2. The reviewed user-management bundle has three files; its unauthenticated invocation returned HTTP 401. `APP_SITE_URL` was set to the existing HTTPS Auth site origin, whose reset path is already covered by the current redirect allowlist. No invitation was sent. The AI gateway has the five approved local-provider settings; the separate hosted inference acceptance passed on October 29. The ZATCA gateway has no provider credentials. Deploying that code does not activate authority service or establish taxpayer compliance.

The live schema upgrade used additive migration `20261026163746` and warehouse configuration follow-up `20261026165656`. Original identity, role and financial data were preserved during those upgrades. The production acceptance fixture is a new explicitly marked company with its own accounts, branch, warehouse and customer; subsequent test transactions belong only to that company. No invitation was sent.

- Supabase: existing schema aligned with application contracts; see [deployment evidence](../database/upgrades/20261026-existing-project/README.md). The current Auth config auto-confirms email. Configure/test the production mail provider and intended confirmation policy before public onboarding; no email delivery or real invitation has been tested. The published acceptance journey does not cover every role, company combination or concurrency scenario.
- AI: local Qwen3 1.7B through Ollama has no per-inference model-provider fee. The protected temporary Cloudflare gateway, five server settings and provider-aware frontend/backend were published on October 29 with paid use disabled. Three local Arabic generations and the separate hosted inference/UI acceptance passed. The laptop and network must stay on, the temporary tunnel has no SLA, and its hostname changes on restart. Continuous multi-user operation needs a stable endpoint and broader quality, error and concurrency testing. OpenAI is a later optional hosted upgrade with explicit provider and paid-use gates, account/model/budget and server-only credentials; local failure never enables it automatically.
- ZATCA: taxpayer onboarding, device certificates/credentials, compliant UBL preparation and cryptographic signing, simulation validation and production enablement remain necessary. The gateway does not itself implement a certified signing engine or prove compliance.
- Billing: subscription records do not charge customers. A real payment gateway and verified webhooks are not configured.
- BMS/CCTV: saved configuration/readings do not connect to physical devices or prove recording.
- Mobile: `ERPX` is a legacy React Native source file; a full Expo project is absent. A separate mobile implementation and device testing remain.
- MRP/PLM: saved planning/change registers are not a bill-of-materials explosion, capacity planner or version-controlled engineering release engine.
- Review rules run on demand; production scheduling is not configured.

## Setup files

`.env.example`: public browser config only. `.env.server.example`: server-secret names only. Never put service keys or certificate secrets in VITE_ values. No secrets should be committed or sent through chat.

Official integration references:
- OpenAI Responses: https://developers.openai.com/api/docs/guides/text
- ZATCA endpoint reference: https://zatca1.discourse.group/t/e-invoicing-api-endpoints/487

Local unit and PostgreSQL checks are necessary but are not cloud deployment or acceptance evidence. Record exact final test counts with the release, not assumptions from earlier runs.

## Latest local verification (2026-10-26)

- Production Vite build: passed; main application chunk about 169.24 kB before gzip (previous audit: 885.26 kB).
- Windows tooling observation: the final identical build passed with a PTY and exit 0. Two preceding plain-pipe runs generated the complete bundle, then failed with a native Node 24 Windows handle assertion during shutdown. Those were failed command runs; the exact cause is unproven and no exit-code suppression or package/config workaround was introduced.
- TypeScript: passed.
- Vitest: 27 files, 274 tests passed. Standalone database acceptance scripts are excluded from the Vitest app test glob and run separately.
- Fresh PostgreSQL acceptance: 55 checks passed using PGlite (21 transaction, 9 business, 10 role, 15 security parity).
- Browser authentication/security: all 9 full production/demo/lifecycle checks passed.
- Deno type checks: ai, zatca and manage-users passed.
- Generated migration drift check: passed.

## Existing Supabase upgrade verification (2026-10-26)

- Public schema: 43 to 51 base tables, 16 to 32 routines.
- Preserved every original column of all 193 existing records in 43 tables; checked inside the migration and through independent before/after hashes.
- Fourteen target-specific acceptance checks passed on an isolated restore of the actual public schema/data, including the warehouse follow-up; the initial live migration was gated by 13 checks. No live financial test writes.
- Read-only live checks passed for both current user accounts (12 assertions each) and six platform/integrity assertions.
- Added native ledgers/business workflows, role reads and paired login RPCs; corrected user identity lookup and customer/permission column aliases.
- Closed cashier discount escalation, direct inventory/audit writes, anonymous audit reads, unsafe legacy checkout retries and foreign-company invoice/account references.
- DPAPI backup scope: public data/definitions and sequence state, Auth UUIDs only. Platform Auth secrets/Storage/provider settings are outside this backup.
- Final current-schema encrypted backup restored successfully into a 51-table, 196-row isolated clone. Warehouse follow-up linked the original warehouse, created one empty warehouse and two audit events, preserving all other business/stock rows. Both active branches now have active warehouses; negative/reserved-stock and foreign-branch checks returned zero problems.
- Application presence contract: zero core blockers across 25 tables and 16 RPC contracts. Optional platform emergency/developer-access features remain absent; return-shape and concurrency checks still require hosted staging acceptance.
- Deployment tooling checks: six mocked Edge deployment tests, nine mocked app-origin tests, Deno cached-only check for `manage-users`, ten metadata inspection checks and ten contract-checker checks passed.

These results include an actual additive live database upgrade and read-only access verification. They do not establish provider activation, taxpayer certification, concurrent-client correctness or a complete cloud staging business acceptance run.
