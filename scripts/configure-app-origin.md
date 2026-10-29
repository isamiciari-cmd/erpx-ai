# Prepared APP_SITE_URL configuration

This script changes only the Edge secret `APP_SITE_URL` for pinned project `svxmlejmhlocsjjtftxd`. Its default mode performs fresh read-only API checks and prints a filtered plan:

```powershell
python scripts/configure-app-origin.py
python scripts/test_configure_app_origin.py
```

The private token is obtained through the existing `database/inspection/management-read.py` `configuration()` loader. The script accepts no token, project or origin arguments, checks the linked project again, follows no redirects, and prints neither secret values/digests nor Auth SMTP/provider credentials.

Every run obtains the current Auth configuration and validates that `site_url` is HTTPS, without credentials/query/fragment, at the reviewed origin `https://code-isamiciari-5169s-projects.vercel.app`. It reads the current secret-name inventory and refuses to continue if `APP_SITE_URL` already exists, regardless of its value.

When the root workflow elects to apply the reviewed action:

```powershell
python scripts/configure-app-origin.py --apply
```

The script repeats the names-only check immediately before one [Supabase secrets API](https://supabase.com/docs/reference/api/v1-bulk-create-secrets) request:

```text
POST https://api.supabase.com/v1/projects/svxmlejmhlocsjjtftxd/secrets
[{"name":"APP_SITE_URL","value":"https://code-isamiciari-5169s-projects.vercel.app"}]
```

It then verifies that the name is listed. No email or invitation is sent, no Auth configuration/redirect allowlist is modified, and no other secret is created or changed. Provider response bodies are withheld on errors; uncertain writes are never retried automatically.

The provider endpoint supports upsert and does not document atomic create-only semantics. The two names checks refuse observed existing values but cannot prevent a concurrent administrator writing the same name between check and POST. Execute without another administrator changing this secret concurrently. This limitation is included in the review plan.

Validation: nine mocked tests cover read-only default behavior, the exact fixed single-secret write, existing/concurrently appearing names, origin and project rejection, credential-safe argument/error handling, endpoint restrictions and no retry on an uncertain outcome. These tests use a fake private loader and transport; they neither read the real PAT nor contact Supabase. No apply action was executed while preparing these artifacts.
