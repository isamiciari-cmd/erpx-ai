# Production deployment

ERPX-AI deploys its React/Vite website to Vercel. Supabase provides Auth, PostgreSQL and Edge Functions. Deploying the website changes browser assets only; database upgrades, server functions and provider secrets have their own release steps.

## Destination and build

The local Vercel repository link identifies project `code`, ID `prj_Xca6Agc2dDe9aRbA8CQ6EN913eG4`, team `team_0FRlTvxOjZpXO6nIsgV0l5E1`, root directory `.`. Confirm the authenticated account has access to this destination before publishing. Do not create a second project just because local authentication expires.

Use the package manager declared in `package.json` and the committed lockfile:

```powershell
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run build
```

CI validation is defined in [`.github/workflows/validate.yml`](../.github/workflows/validate.yml), including SQL and browser security regressions. Check required validation results before publishing; Vercel's `build` command alone does not run that workflow.

On the observed Windows Node 24.20.0 environment, a build through plain process pipes sometimes completed Vite output and then failed during Node/libuv handle teardown. The same command succeeded in a terminal/PTY. Treat the failing exit code as a failed command; do not add `exit 0`, suppress errors or assume partially generated assets are a validated release.

## Browser and server configuration

The browser build uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the linked Vercel project's Production environment. Verify the actual values are nonempty and identify the intended project; checking variable names alone is insufficient. `vercel.json` contains no credential or environment values. Rebuild after a public environment change because Vite substitutes these values into JavaScript at build time. [Vite environment documentation](https://vite.dev/guide/env-and-mode)

The existing Vercel records for these two public variables are classified as Sensitive/Secret and target Production and Preview together. Vercel deliberately withholds such values from API read-back and environment pulls; an empty downloaded value does not establish that the stored value is empty. For local prebuilt releases, the release preparer validates the known public values from `.env` against the fixed Supabase project and the resulting bundle. Do not replace valid local public configuration with a masked downloaded value. Secret-to-Config conversion requires recreating the selected records, so do not change their classification as an incidental deployment fix. [Vercel Config and Secret behavior](https://vercel.com/docs/environment-variables/sensitive-environment-variables)

`node scripts/reconcile-vercel-public-env.mjs` performs only read-only API diagnosis through authenticated Vercel CLI access and prints metadata plus comparison booleans. `--prepare` additionally writes local PATCH bodies containing only the two validated public values, preserving their existing type and Production/Preview targets. It never executes those writes. The report explicitly distinguishes hidden values from a proven mismatch; it cannot prove equality for write-only values.

All `VITE_*` values are public. Keep Management API tokens, Vercel credentials, database passwords, service-role keys, AI provider keys, payment credentials and ZATCA credentials in their server environment. `.env.server.local` is a private local tooling file; the frontend never imports it.

The production demo switch must remain disabled. Demo access is restricted to explicit local development and cannot supply real hosted Auth users or company permissions. Use real authorized accounts for acceptance checks.

`.vercelignore` uploads only web build inputs. It excludes environment files, `.tmp` inspections/backups, database scripts, server functions, reports, source tests and fixture directories. Vite's `dist` output must contain only the intended static assets. Scan the built files as well as the source upload; exclusions cannot undo an embedded secret. See [Vercel upload exclusions](https://vercel.com/docs/deployments/vercel-ignore).

`node scripts/check-deployment-safety.mjs` verifies 13 excluded paths, 15 required web build inputs, the deployment routing/configuration and the current `dist` artifact. Add `--artifact .vercel/output/static` to scan prepared output. It reads no environment files and prints only findings by filename/category and aggregate counts. Its credential pattern scan complements the private release preparer's comparisons against actual secret values; neither scan should be described as proof against every possible transformed secret.

## Publish

With authorized Vercel access and the destination verified:

```powershell
pnpm exec vercel --prod
```

For a release prepared through the Vercel Build Output API, use:

```powershell
pnpm exec vercel deploy --prebuilt --prod
```

An audited prebuilt release contains static files under `.vercel/output/static` and routing/headers in `.vercel/output/config.json`. Preserve the SPA fallback and HTML revalidation when preparing that configuration; `vercel.json` source-build settings do not automatically configure a manually assembled artifact.

The repository's pinned release preparer requires the reviewed current production ID for rollback evidence: `node scripts/prepare-production-release.mjs --previous-production-id <current-deployment-id>`. It builds, validates the public connection, scans actual local private credential values against the output, and packages only the static build plus a release marker. Use a PTY for the build on this Windows/Node environment and require a successful process exit before deployment. Verify the production marker/files with `scripts/verify-production-release.mjs` and `scripts/verify-all-production-assets.mjs` after publishing.

The source configuration uses the Vite preset, `pnpm run build`, output directory `dist`, a fallback to `/index.html`, and `Cache-Control: public, max-age=0, must-revalidate`. This supports refreshed nested routes and avoids retaining stale HTML across releases. Source upload exclusions and static-only prebuilt packaging protect local files; the unsupported `public` configuration property is omitted. [Vercel Vite SPA configuration](https://vercel.com/docs/frameworks/frontend/vite)

## Database and Edge Functions

Use [database/DEPLOYMENT_CURRENT.md](../database/DEPLOYMENT_CURRENT.md). The existing linked database received the separately reviewed upgrade; the canonical fresh-install migrations must not be replayed over that schema. Do not run historical Firebase, RBAC, repair or demo-user scripts as a deployment shortcut.

The deployed `manage-users` function requires a verified JWT, a canonical active administrator, same-company role/branch references and a fixed `APP_SITE_URL`. Its existing configured origin is `https://code-isamiciari-5169s-projects.vercel.app`. If the production hostname changes, review the server secret and Supabase Auth URL configuration together before invitations or password resets. A function deployment does not automatically configure AI, payments, SMTP or ZATCA providers. See [implementation status](IMPLEMENTATION_STATUS.md) for service limitations.

Set Supabase Auth Site URL to the verified production origin and allow the exact callback/reset/invitation URLs used by that deployment. Add only intentional development/preview origins; a wildcard covering every `*.vercel.app` site trusts unrelated deployments.

## Verify on the actual URL

1. Open `/`, `/login` and a refreshed nested route. Confirm the React page renders and the JS/CSS responses have correct content types. An arbitrary `/health` URL is not an API health endpoint; the SPA fallback can return HTML for it.
2. Sign in with a real active account. Check the correct company and permissions; another company's data and administrator pages must stay inaccessible to unauthorized roles.
3. Run the agreed production workflow using identified test records: real inventory receipt, cashier shift, stock-limited checkout with a stable retry key, invoice/journal/payment verification and shift reconciliation as applicable. Record created document IDs and resulting balances. An operator-confirmed card method is not evidence of payment-gateway capture.
4. Test invitations/email, AI and ZATCA only when their services are configured and the specific operation is authorized. Website availability alone does not demonstrate these external integrations.

Inspect browser errors, Vercel deployment logs and Supabase logs when a check fails. Do not publish raw session tokens, credentials, exported personal rows or private backups in reports.

## Rollback

Record the previous production deployment before promotion. If the website release fails, restore that verified deployment through Vercel and repeat the affected checks. A frontend rollback does not reverse database or provider changes. Preserve posted financial documents and use a reviewed forward fix or a separately rehearsed restore for database failures; never replay a guessed rollback script over production data.
