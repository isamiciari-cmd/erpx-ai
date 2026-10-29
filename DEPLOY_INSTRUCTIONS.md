# Deploy ERPX-AI

Use the complete working tree at `C:\Users\LENOVO\erpx-ai`. The application is a Vite React SPA on Vercel with Supabase Auth, PostgreSQL and separately deployed Edge Functions.

The linked Vercel project is `code` (`prj_Xca6Agc2dDe9aRbA8CQ6EN913eG4`) in team `team_0FRlTvxOjZpXO6nIsgV0l5E1`, with root directory `.`. Verify the destination before publishing; linking another project does not move its database or Auth configuration.

1. Install the lockfile dependencies and validate the release:

   ```powershell
   pnpm install --frozen-lockfile
   pnpm run typecheck
   pnpm test
   pnpm run build
   ```

2. Verify the build embeds the intended public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The existing Vercel variables are Sensitive/Secret, so API read-back and pulls mask their values; a blank download does not prove the stored value is empty. The audited prebuilt release uses validated known public values from `.env` when those remote values are withheld, then verifies the compiled connection and scans the output. Keep `SUPABASE_ACCESS_TOKEN`, service-role keys, Vercel tokens and provider credentials out of every `VITE_*` variable. `vercel.json` contains no credential or environment overrides. See [Vercel's write-only variable behavior](https://vercel.com/docs/environment-variables/sensitive-environment-variables).

3. Use authenticated Vercel CLI access to publish to the verified project:

   ```powershell
   pnpm exec vercel --prod
   ```

   For an already prepared Vercel Build Output API artifact, use `pnpm exec vercel deploy --prebuilt --prod`. A plain `dist` folder is not a Build Output API artifact: it also needs the Vercel output configuration, SPA routing and headers. Keep the output static directory limited to audited `dist` files.

4. Open the returned production URL. Refresh `/login` and a nested application route, check that JavaScript and CSS load with their proper content types, sign in with an authorized real account, then verify role boundaries and the business workflow. The SPA fallback can return HTML for unknown paths, so HTTP 200 alone is not a health check.

`.vercelignore` limits source uploads to web build inputs and excludes local environment files, server functions, database backups, inspection files and test fixtures. It does not remove a secret already compiled into JavaScript; inspect the production artifact before uploading it.

Run `node scripts/check-deployment-safety.mjs` to repeat the 28 upload path checks, source deployment configuration checks and static artifact pattern scan. Use `--artifact .vercel/output/static` to scan a prepared release. This check reads no environment files; the private release preparer also compares actual credential values against the output.

Website publishing does not apply database migrations or deploy Supabase functions. The existing database has already received a separately reviewed upgrade; do not run the fresh installation baseline over it. See [database/DEPLOYMENT_CURRENT.md](database/DEPLOYMENT_CURRENT.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the current database, Auth origin, Edge Function and rollback procedures.
