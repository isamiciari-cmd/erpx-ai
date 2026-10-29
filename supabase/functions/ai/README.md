# AI provider contract

The browser calls the authenticated Supabase `ai` function. It cannot select a
tenant, provider URL, model or key. The function uses the existing trusted active
company/profile and role checks, then reads invoice summaries with the caller's
database session. It has no business mutation tools. Quota consumption is the
only database write in a chat request.

The default path is Ollama through a protected HTTPS gateway. That gateway
authenticates the Edge Function, pins one installed model, and forwards only
`/api/chat` to loopback Ollama. Connecting the hosted Edge Function to a gateway
requires the separately approved gateway/public connection setup. These source
files do not start processes, expose local ports, deploy functions or set secrets.

## Server configuration

| Setting | Ollama | Future explicit OpenAI |
| --- | --- | --- |
| `AI_PROVIDER` | `ollama` (default) | `openai` |
| Model | `OLLAMA_MODEL`, initially `qwen3:1.7b` | `OPENAI_MODEL` |
| Credential | `OLLAMA_API_KEY`, high-entropy bearer | `OPENAI_API_KEY` |
| Endpoint | `OLLAMA_BASE_URL`, HTTPS origin only | Fixed OpenAI Responses API |
| Paid opt-in | None | `AI_ALLOW_PAID_PROVIDER=true` required |

These values belong only in server configuration. No `VITE_*` provider secrets
are supported. Missing, invalid or unavailable Ollama never falls back to a paid
provider. Upgrading the local model requires matching model configuration on
both Edge Function and gateway, with that model installed locally. A future
OpenAI switch requires both explicit selection and the paid opt-in.

## Requests and responses

`POST {"action":"status"}` requires the same company/role authorization as
chat. It consumes no quota and reads no invoices. It returns:

```json
{
  "ok": true,
  "provider": "ollama",
  "model": "qwen3:1.7b",
  "configured": true,
  "available": true,
  "deploymentMode": "local_gateway",
  "healthChecked": true,
  "healthScope": "gateway",
  "inferenceVerified": false,
  "readOnly": true,
  "mode": "generative",
  "dataScope": "...",
  "limits": {"invoiceLimit": 1000, "messageCharacters": 4000, "responseTokens": 512, "currencyGroups": 16}
}
```

For Ollama, a three-second authenticated health probe must confirm the exact
configured model is installed. This proves gateway reachability/model presence,
not a successful inference or permanent availability. Missing configuration
returns `provider: unconfigured`, null model and false availability. Future
OpenAI status checks configuration only (`healthChecked: false`,
`healthScope: configuration`); status never makes a paid generation request.

`POST {"message":"..."}` (optional `action: chat`) allows up to 4,000
characters and a 16 KiB inbound body. Unknown fields are rejected. Success adds
`message`, `provider`, `model`, `deploymentMode`, `readOnly: true`,
`mode: generative`, `dataScope`, `generatedAt` and `limits`. Errors return
`{ok:false,code,error}` with a safe code: `configuration_required`,
`provider_unavailable`, `rate_limited`, `auth_error`, `invalid_request`, or
`data_unavailable`. Provider bodies, tokens and private URLs are never echoed.

## Snapshot and gateway wire

The query filters issued/sent/partial/paid/overdue invoices by the trusted company
ID before limiting. It orders issue date, creation time and ID descending,
requests 1,001 rows, and uses the last row only as a truncation sentinel. It also
requests the exact eligible count, so truncation remains truthful when the REST
project row limit clamps that request to 1,000 rows. Missing/invalid counts fail
verification. At most 1,000 invoices contribute to the summary. Decimal amounts are validated/capped
and summed using integer cents, then formatted as exact decimal strings.
Credit notes reduce amounts once. Different currencies remain separate. Invalid
amounts, statuses or currencies fail the request instead of generating invented
totals. Only counts and currency aggregates reach the provider; invoice IDs,
customer names, company IDs, individual rows and Auth data do not.

This snapshot supports invoice questions only. It is not a general ledger,
profit/cash balance, forecast or HR report. No such data is fabricated.

Ollama request:

```json
{"model":"qwen3:1.7b","messages":[{"role":"system","content":"<rules and verified invoice aggregate>"},{"role":"user","content":"<question>"}],"stream":false}
```

The bearer is sent only in the header. The gateway enforces `think:false`,
`num_predict:512`, `num_ctx:4096`, temperature 0.2, its own pinned model and one
concurrent inference. Edge caps outbound JSON at 16 KiB, responses at 128 KiB,
and request time at 90 seconds. Redirects are forbidden. It accepts only complete
assistant text for the matching model and makes no automatic retries/fallbacks.

## Validation

```powershell
deno check --cached-only supabase/functions/ai/index.ts
deno test --cached-only supabase/functions/ai/ai_test.ts
```

Tests use mocked fetch/database/authentication only. They cover paid opt-in,
gateway origin restrictions, trusted tenant query, quota/auth failures, status
without quota, decimal totals/credits/currencies/truncation, response bounds,
actual abort deadlines and sanitized errors. They do not contact a provider.

The REST row limit and exact-count option are documented in the official
[Supabase select reference](https://supabase.com/docs/reference/javascript/select).
