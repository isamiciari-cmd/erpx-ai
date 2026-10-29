# Isolated live acceptance fixture

These scripts prepare one new synthetic company in the linked Supabase project
`svxmlejmhlocsjjtftxd` for `scripts/live-workflow.mjs`. Preparation has been tested
with mocked APIs only. The commands containing `--apply` perform live writes and
are for the deployment operator after reviewing the production release.

The fixed reviewed production origin is
`https://code-isamiciari-5169s-projects.vercel.app`. A changed origin requires a
source review before execution. No project or credentials are accepted as CLI
arguments.

## Provision

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
