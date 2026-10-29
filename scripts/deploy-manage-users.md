# Prepared manage-users deployment

This tool prepares one Edge Function deployment for the pinned linked project `svxmlejmhlocsjjtftxd`. It does not deploy when run without the explicit deployment arguments.

```powershell
node scripts/deploy-manage-users.mjs --plan
node --test scripts/deploy-manage-users.test.mjs
```

The reviewed write is a single multipart `POST` to:

`https://api.supabase.com/v1/projects/svxmlejmhlocsjjtftxd/functions/deploy?slug=manage-users`

Metadata:

```json
{"name":"manage-users","entrypoint_path":"manage-users/index.ts","verify_jwt":true}
```

The only uploaded source files are `manage-users/index.ts`, `manage-users/rules.ts` and `_shared/auth.ts`. The local entrypoint import `../_shared/auth.ts` resolves inside that bundle. The pinned npm package remains `@supabase/supabase-js@2.106.1`; no environment file, token, local dependency folder, private database backup or unrelated function is uploaded.

The multipart metadata JSON Blob and repeated named TypeScript file parts follow the [Supabase deploy API](https://supabase.com/docs/reference/api/v1-deploy-a-function), its [official deployment example](https://supabase.com/changelog/33720-deploy-and-update-edge-functions-using-the-management-api) and the [Supabase MCP deployment serializer](https://github.com/supabase-community/supabase-mcp/blob/main/packages/mcp-server-supabase/src/platform/api-platform.ts). The runtime performs its own authenticated user/company/role checks as well as the configured gateway JWT verification.

The operator should review the current offline plan and then, only when deployment is authorized, use its exact `bundle_sha256` value:

```powershell
node scripts/deploy-manage-users.mjs --deploy --expected-sha256 <hash-from-reviewed-plan>
```

The script reads `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` privately from `.env.server.local` only after deployment mode and source-hash validation. It checks both the linked ref and private project ref against the pinned target, rejects token/project overrides in arguments, follows no HTTP redirects and never prints upstream response bodies or credentials. The write is not retried automatically after a timeout or failure because a deployment might already have created a function version.

No Auth configuration, secret, database, other function or user account is changed. The deployment itself does not send an invitation. The cached readiness report currently lacks `APP_SITE_URL`; invitations remain blocked until the root workflow separately reviews and configures it. The HTTPS Auth origin `https://code-isamiciari-5169s-projects.vercel.app` is a **proposal only**, derived from the cached Auth `site_url` and never applied by this tool.

Local validation completed with six isolated mocked deployment tests and a cached Deno `check --cached-only` of `supabase/functions/manage-users/index.ts` (including its imported rules/shared auth). Deno is available in the local npm executable cache but is not on `PATH`; no installation or network fetch was needed for the check. API bundling/deployment and a real authenticated invocation remain unverified until the root workflow executes them.
