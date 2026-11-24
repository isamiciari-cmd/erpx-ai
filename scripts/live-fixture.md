# Isolated live acceptance fixture

These scripts prepare one new synthetic company in the linked Supabase project
`svxmlejmhlocsjjtftxd` for `scripts/live-workflow.mjs`. Preparation has been tested
with mocked APIs only. The commands containing `--apply` perform live writes and
are for the deployment operator after reviewing the production release.

The fixed reviewed production origin is
`https://code-isamiciari-5169s-projects.vercel.app`. A changed origin requires a
source review before execution. No project or credentials are accepted as CLI
arguments.

## Staging-only last-unit race

Use a separate hosted Supabase project with the current schema and a fresh,
dedicated company whose name starts with `ERPX RELEASE ACCEPTANCE `. Use one
active branch, a warehouse assigned to it, one administrator and two distinct
ordinary cashiers with POS permission assigned to that branch. Use a new
synthetic company for each run. The runner retains the test product, shifts
and transaction records for verification, including on failure.

Save a private copy of this example as `.tmp/staging/last-unit.private.json`.
Replace the example values locally. Supply a publishable key or a project-scoped
anon key and the three ordinary Auth accounts. The runner requires an ignored
configuration under `.tmp/`, verifies the expected project against the
canonical hosted origin and refuses the current ERPX-AI project before sign-in.

```json
{
  "expectedProjectRef": "abcdefghijklmnopqrst",
  "supabaseUrl": "https://abcdefghijklmnopqrst.supabase.co",
  "supabaseAnonKey": "sb_publishable_REPLACE_LOCALLY",
  "allowStagingWrites": true,
  "companyName": "ERPX RELEASE ACCEPTANCE Last unit",
  "companyId": "00000000-0000-4000-8000-000000000001",
  "branchId": "00000000-0000-4000-8000-000000000002",
  "warehouseId": "00000000-0000-4000-8000-000000000003",
  "admin": {
    "userId": "00000000-0000-4000-8000-000000000004",
    "email": "admin@example.test",
    "password": "REPLACE_LOCALLY"
  },
  "cashiers": [
    {
      "userId": "00000000-0000-4000-8000-000000000005",
      "email": "cashier-one@example.test",
      "password": "REPLACE_LOCALLY"
    },
    {
      "userId": "00000000-0000-4000-8000-000000000006",
      "email": "cashier-two@example.test",
      "password": "REPLACE_LOCALLY"
    }
  ]
}
```

From the repository root in PowerShell:

```powershell
node.exe scripts/last-unit-race.mjs --config .tmp/staging/last-unit.private.json
```

This runner sends two direct `complete_pos_sale` RPC calls in parallel. It
compares company-scoped counts before and after and verifies the winning
sale's payment, stock movement and posted journal. A pass proves the RPC
result and database effects. If a staging UI is available, use a separate fresh
fixture to verify the visible cashier rejection on `/cashier/pos` using two
independent browser contexts connected to the same staging project.

## Explicit QA on the current project

Run these commands only for authorized synthetic acceptance on the pinned
project. The provisioner uses the existing onboarding flow and creates separate
marked companies and four Auth identities per receipt. Each company has an
administrator, an accountant and two cashiers. The original fixture path remains
separate. Keep both QA receipts private under `.tmp/release-acceptance/`.

```powershell
python scripts/provision-live-fixture.py --apply-qa race
node.exe scripts/last-unit-race.mjs --config .tmp/release-acceptance/qa-race.private.json --allow-current-project-qa
python scripts/provision-live-fixture.py --apply-qa workflow
node.exe scripts/live-workflow.mjs --config .tmp/release-acceptance/qa-workflow.private.json --base-url https://code-isamiciari-5169s-projects.vercel.app --drop-committed-replies
```

The race runner refuses the current project by default. With the explicit flag
it verifies the project, company and Auth ownership markers, branch, warehouse,
roles and empty transaction baseline before writing. After the RPC race, it
checks the cashier message on the local app. The workflow uses a second clean
company, checks isolation against the first and drops the successful sale and
first receipt responses before the user-facing retry. Both scripts retain the
synthetic transactions. Inspect the report and fixture state before any retry.

## Provision the original live fixture

```powershell
python scripts/provision-live-fixture.py --plan
python scripts/test_live_fixture.py
# Run only when the production deployment is ready:
python scripts/provision-live-fixture.py --apply
```

The apply command privately imports `management-read.configuration()`, checks
the linked project, and obtains its service-role key from the Management API in
memory. `.env` / `.env.local` supply only the pinned public browser URL and key.
The PAT, service-role key and session JWT are never printed or stored.

The command creates two confirmed Auth users through the admin API with
generated passwords and unique reserved `@example.test` addresses. It does not
send invitation/confirmation email. The admin signs in and calls the existing
JSONB `register_company_account` RPC to create an unpaid trial company named
`ERPX RELEASE ACCEPTANCE <unique-run-id>`. It attaches a unique company/Auth
marker, connects the cashier to the trusted global cashier role, and creates one
active customer. The onboarding warehouse must be the single active warehouse
in the fixture branch. Shared roles and original company rows are never changed.

The sole private receipt is
`.tmp/release-acceptance/live-fixture.private.json`, covered by `.gitignore`.
Its Windows ACL is restricted to the current Windows identity and SYSTEM before
credentials are written; Unix permissions are `0600`. It contains the flat
browser-runner configuration, generated fixture credentials and IDs, plus
`metadata.runId`, lifecycle state and ownership marker. Do not print, commit,
attach or upload it. The lock file prevents concurrent provisioning/finalizing.

Rerunning provisioning verifies and reuses only the same ready fixture without
writes. A finalized/suspended fixture is never reactivated. If an Auth creation
response is lost, the receipt records the uncertain attempt and refuses an
automatic retry. Inspect that exact synthetic account privately before any
recovery; do not remove the receipt or search/mutate original accounts.

## Run acceptance and finalize

Provisioning creates no products, stock, shifts, invoices, sales or journal
entries. The browser runner requires that fresh state and writes only inside
the marked fixture company:

```powershell
node scripts/live-workflow.mjs --config .tmp/release-acceptance/live-fixture.private.json --base-url https://code-isamiciari-5169s-projects.vercel.app
```

If the recorded attempt created only its tagged product through the UI and
stopped before receiving any stock, `--resume-unposted-product` can reuse that
exact product. Preserve the previous report/screenshots separately first. This
mode verifies the same prior failed receipt step, run, company and origin,
exact catalog values, zero product inventory/movements, and no company sales,
invoices, journals or shifts. It refuses posted data; it is not a general replay
or recovery mode.

After the acceptance result is reviewed, use the nonsecret `run_id` printed by
provisioning to explicitly select the receipt for finalization:

```powershell
python scripts/finalize-live-fixture.py --expected-run-id <receipt-run-id> --plan
# Explicitly suspend the verified fixture after acceptance:
python scripts/finalize-live-fixture.py --expected-run-id <receipt-run-id> --apply
```

Finalization rechecks the exact company owner, name, Auth markers, roles,
memberships and resource company IDs. It refuses a shared tenant. It suspends
that company, tenant and the two ERP/profile accounts, bans their Auth sign-in,
and writes one idempotent finalization audit record. It retains the complete test
transaction and journal history; there are no deletion requests or password/email
changes. The receipt is retained with mutations disabled and lifecycle state
`finalized`. A repeated successful finalization performs verification only.

Provisioning/finalization use multiple provider transactions. A provider error
can leave a partial isolated fixture; it is not a rollback of all prior calls.
The private receipt supports guarded retries where outcomes are known. An
unfinished provisioning run requires operator review before suspension.

API contracts: [project API keys](https://supabase.com/docs/reference/api/v1-get-project-api-keys),
[Auth admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser).
