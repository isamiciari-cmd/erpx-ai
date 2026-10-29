# ERPX-AI database setup

The current backend is **Supabase Auth and PostgreSQL**. Use [database/DEPLOYMENT_CURRENT.md](database/DEPLOYMENT_CURRENT.md) as the authoritative setup and migration guide. The previous Firebase/Cloud SQL instructions in this file described a different architecture.

The linked existing project received the reviewed target-specific upgrade on 2026-10-26. Its original tables and rows were checked before and after the transaction. Its global roles and JSONB registration API differ from the canonical fresh installation, so do not replay the fresh baseline or historical seed/repair scripts against it.

For a **new empty project**, review and apply `supabase/migrations/` in filename order using the documented migration-history workflow. The PowerShell command below only prints the local plan unless `-Apply` is explicitly supplied:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File database/apply-migrations.ps1
```

For an **existing project**, first inspect its identity mapping, schema, RLS policies, functions and migration history, take a private backup and rehearse a separately reviewed upgrade. See [database/inspection/README.md](database/inspection/README.md), [security gates](database/inspection/security-gates.md) and the [reviewed existing-project upgrade](database/upgrades/20261026-existing-project/README.md).

Local PostgreSQL regression checks run in isolated PGlite databases and do not read application credentials or change the hosted project:

```powershell
node database/build-migrations.mjs --check
npm.cmd --prefix database/tests install
node database/tests/transactions.mjs
node database/tests/business-workflows.mjs
node database/tests/role-security.mjs
node database/tests/security-parity.mjs
```

The browser needs only public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Administrative database credentials, the Management API token and service-role keys belong in private server tooling or Supabase secrets. Never prefix them with `VITE_`, publish backup exports, or use shared seeded passwords.

Real account onboarding uses Supabase Auth and the authenticated `register_company_account` RPC. Invitations use the deployed `manage-users` function, a verified same-company administrator and its fixed `APP_SITE_URL`. Database role definitions and grants are maintained through controlled server code or reviewed migrations; the role matrix is read-only.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for website deployment, Auth redirects and post-deployment workflow checks. A frontend deployment alone does not create or migrate a database.
