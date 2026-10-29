# Existing-database inspection

The catalog/comparison tools below inspect metadata read-only. `management-read.py` connects to the owner-authorized linked project with a private token. `backup-live.py` separately captures public business rows into a verified Windows DPAPI archive; `clone-live.mjs` restores it locally. Neither applies live changes. The separately reviewed [existing-project upgrade](../upgrades/20261026-existing-project/README.md) contains the explicit one-time live writer and deployment evidence.

## Capture the existing schema

Preferred: use an owner-authorized connected Supabase tool when available. The fallback is the project's **SQL Editor**:

1. Open the intended Supabase project and SQL Editor.
2. Run the entire [schema-audit.sql](schema-audit.sql) file. It starts a repeatable-read, read-only transaction with a 20-second statement timeout, 2-second lock timeout and 30-second idle transaction timeout.
3. Copy/download the one JSON value in the `schema_catalog` result cell into a local file, for example `database/inspection/observed.local.json`. A one-row SQL Editor JSON download containing `schema_catalog` is also accepted by the comparison utility.
4. If the query fails, run `ROLLBACK;` before retrying. A failure or missing privilege is not evidence that application tables are absent.

With PostgreSQL client tools, the same script can be run through `psql`. Use connection environment variables or a local credential manager; do not put a password/token in a command argument or paste it into chat.

```powershell
psql --no-psqlrc --set=ON_ERROR_STOP=on --tuples-only --no-align --quiet --file database/inspection/schema-audit.sql --output database/inspection/observed.local.json
```

`--quiet` excludes transaction/SET command status lines; the output is the single JSON catalog. Choose a new output path to preserve any earlier export. No Supabase service key is needed by the local comparison utility. Running the metadata SQL itself requires authorized database access; frontend anonymous configuration is not administrative access.

## What is included

- Public tables/views, columns/types/default expressions, constraints, indexes, partition keys and sequence configuration. Sequence current values are excluded.
- RLS flags/policies, trigger definitions, routine signatures/definitions/security properties, object/column/default grants and enum metadata hashes.
- Known migration history: validated version/checksum/date metadata from `public.erpx_migration_history`, and validated versions from `supabase_migrations.schema_migrations`. Stored SQL statement arrays and names are never selected. Missing, inaccessible, RLS-protected or unsupported tracker layouts are reported instead of queried.
- Identity-like columns and FK relationships to `auth.users`/`public.users`. This is a structural review signal; **no orphan rows or counts are checked**.

Business rows, Auth rows, Storage objects, tokens and connection secrets are not queried. Definitions have SQL literals, nested dollar payloads and comments redacted, with hashes of the originals retained for drift detection. Non-SQL function bodies are omitted rather than attempting language-specific redaction. Redacted definitions are review material, not executable replacement SQL. Identifiers and grants remain architecture metadata; do not embed secrets in schema identifiers.

By default the policy inventory is public-only. To include **Storage policy metadata**, set `include_storage_policies` to `true` in the options CTE before running; this still reads no Storage object rows. Migration-version metadata is the only explicit exception to the public application-schema scope.

## Compare locally

Install the isolated PostgreSQL test engine once, then run the comparator:

```powershell
npm.cmd --prefix database/tests install
node database/inspection/compare-schema.mjs database/inspection/observed.local.json database/inspection/comparison.local.json
node database/inspection/check-app-contract.mjs database/inspection/observed.local.json
```

The comparator accepts **exactly two paths**: observed input, report output. They must refer to different files, including case variants and hard links. It builds an ephemeral PGlite database from **every current canonical migration in filename order**, exports the same catalog and writes a review report. It does not use network access or database environment credentials. Supabase public default grants are simulated locally; grant differences and extension/owner variations require environment-specific review.

To export the current canonical catalog separately:

```powershell
node database/inspection/canonical-catalog.mjs database/inspection/canonical.local.json
```

The catalog includes its source migration list and explicitly states that no live database was inspected. Application contract checks are described in [app-contract.md](app-contract.md); local privilege gates are described in [security-gates.md](security-gates.md).

## Private backup and restore for an authorized live review

`backup-live.py` uses the reviewed private catalog/schema, checks current table-column metadata for drift, and saves a current-user Windows DPAPI archive. For a later schema snapshot, pass `--catalog <private-catalog-filename> --schema <private-schema-filename>`; both must be inside `.tmp/supabase-review/`. Capture exact schema definitions separately before backing up. The backup includes public rows, schema/catalog and sequence state, plus Auth UUIDs only; it excludes Auth credentials, Storage files and service settings. It is not a full provider backup.

`node database/inspection/clone-live.mjs [relative-private-backup.dpapi]` decrypts the selected archive privately and restores that archive's own schema/catalog/data into isolated PGlite. With no path it selects the newest archive. It never restores to the live database. Run under the same Windows account with DPAPI access; the target-upgrade acceptance runner pins its pre-upgrade archive separately. The final 51-table, 196-row snapshot was restored successfully after the live warehouse configuration.

## Validation and interpretation

```powershell
node database/inspection/inspection.test.mjs
node database/inspection/check-app-contract.mjs --self-test
```

Inspection tests exercise the real SQL audit on PostgreSQL/PGlite, validate literal/comment/dollar redaction using canaries, prove private application/Auth fixture values are absent, verify migration-history filtering and read-only transaction behavior, compare deliberately changed metadata and reject file-overwrite mistakes.

Missing objects do not identify which historical baseline was deployed. Extra objects are preserved for review. Definition hashes detect textual changes and do not prove semantic incompatibility. No destructive SQL or automatic migration is generated. After live capture, reconcile application contracts and privileges, review existing data separately under authorization, and prepare a specific additive upgrade with a backup/restore plan. Do not apply the fresh core baseline to an existing database based on a metadata comparison alone.
## Verify original production rows after isolated acceptance

`verify-original-preservation.py` is scoped to the reviewed existing project and
its verified pre-upgrade encrypted backup (43 tables, 193 rows). It decrypts that
DPAPI archive in memory, selects only original primary-key tuples and original
columns, and requests read-only counts/hashes. New acceptance rows are excluded.
The output contains no row values. It checks warehouse columns separately to
distinguish the reviewed `branch_id`/`updated_at` routing changes. It refuses to
overwrite an existing report and fails on unexpected differences.

```powershell
node --test database/inspection/verify-original-preservation.test.mjs
python database/inspection/verify-original-preservation.py --output <new-hash-report.json>
```

The live command requires the original Windows DPAPI identity and privately
configured Management API access. It never modifies the database or decrypts a
backup to disk. The local PostgreSQL regression verifies that added rows are
excluded, original edits/missing keys are detected, and changed warehouse column
names are reported without their values.
