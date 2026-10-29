# ERPX implementation and next steps

Updated 2026-10-29. This document supersedes historical claims that all modules or integrations are complete.

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
