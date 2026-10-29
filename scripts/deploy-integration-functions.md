# Deploy reviewed AI and ZATCA source

This helper deploys only `ai` or `zatca` to linked project
`svxmlejmhlocsjjtftxd`. Preparation and tests perform no network requests.
Publishing the code does not configure provider credentials or invoke OpenAI or
ZATCA. The endpoints continue to require user JWTs and server authorization.

```powershell
node --test scripts/deploy-integration-functions.test.mjs
node scripts/deploy-integration-functions.mjs --plan
node scripts/deploy-integration-functions.mjs --plan --function ai
node scripts/deploy-integration-functions.mjs --plan --function zatca
```

Each plan lists its exact source files, individual SHA-256 values, JWT metadata,
and a distinct `bundle_sha256`. AI includes `ai/index.ts`, `ai/config.ts`,
`ai/handler.ts`, `ai/provider.ts`, `ai/snapshot.ts` and `_shared/auth.ts` only.
Tests and documentation are excluded. ZATCA contains `zatca/index.ts`,
`_shared/auth.ts` and `_shared/zatcaPayload.ts`. The existing npm
dependency is pinned to `npm:@supabase/supabase-js@2.106.1`. Unexpected imports,
source files, dynamic source loading, project overrides and token arguments are
rejected.

Before overwriting an existing function, the operator should make a private
snapshot using the official Management API's read-only endpoints:

- `GET /v1/projects/svxmlejmhlocsjjtftxd/functions/ai`
- `GET /v1/projects/svxmlejmhlocsjjtftxd/functions/ai/body`

Repeat for ZATCA if it already exists. Privately load the PAT from
`.env.server.local`; do not put it in command arguments, transcripts or files
beside the snapshot. Save metadata plus the raw body bytes to new restricted
files under ignored `.tmp/supabase-review/`, recording their hashes and the
returned content type. Do not assume the body is JSON or print/extract its
contents: the API describes a downloadable body and does not specify its format.
These GET requests need `edge_functions:read`; they do not invoke the function.
Verify snapshot retrieval before replacement. A failed snapshot needs review,
and a raw snapshot is not a verified automated rollback procedure.

After reviewing the plan and snapshots, the deployment operator can explicitly
deploy one function at a time with its own reviewed hash:

```powershell
node scripts/deploy-integration-functions.mjs --deploy --function ai --expected-sha256 <ai-bundle-sha256>
node scripts/deploy-integration-functions.mjs --deploy --function zatca --expected-sha256 <zatca-bundle-sha256>
```

Only explicit deploy mode reads `.env.server.local`. It uses the existing
private PAT parser and checks both the private project ref and linked project.
The only write is a multipart Management API deployment POST for the selected
slug, with `verify_jwt: true` and the fixed entrypoint. It changes no secrets,
Auth settings, database rows or other functions. Errors omit provider response
bodies, credentials and headers. Unknown deployment outcomes are never retried
automatically; inspect the selected function's version/status first.

The initial AI provider is the authenticated local Ollama gateway configured by
`AI_PROVIDER`, `OLLAMA_BASE_URL`, `OLLAMA_API_KEY` and `OLLAMA_MODEL`. A future paid
OpenAI selection also requires explicit `AI_ALLOW_PAID_PROVIDER=true`,
`AI_PROVIDER=openai`, `OPENAI_API_KEY` and `OPENAI_MODEL`. No automatic paid
fallback exists. Public local-model connectivity is a separate approved action;
see [AI architecture](../docs/AI_ARCHITECTURE.md). ZATCA requires
the company-specific `ZATCA_COMPANY_CREDENTIALS` mapping and valid prepared,
signed invoice material. This script does not provision these values, change
certificates, send invoices, or make paid provider requests.

Official contracts: [multipart deployment](https://supabase.com/docs/reference/api/v1-deploy-a-function),
[deployment example](https://supabase.com/changelog/33720-deploy-and-update-edge-functions-using-the-management-api),
[retrieve function body](https://supabase.com/docs/reference/api/v1-get-a-function-body).
