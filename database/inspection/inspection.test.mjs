import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, link, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createCanonicalDatabase, readSchemaCatalog } from './canonical-catalog.mjs';
import { compareCatalogs, compareFiles, parseCatalog } from './compare-schema.mjs';

const { db, migrations } = await createCanonicalDatabase();
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
const one = async (sql, values = []) => (await db.query(sql, values)).rows[0];
const canaries = ['PRIVATE_ROW_719853', 'AUTH_EMAIL_719853', 'SINGLE_LITERAL_719853', 'NESTED_DOLLAR_719853', 'ESCAPED_QUOTE_719853', 'LINE_COMMENT_719853', 'BLOCK_COMMENT_719853', 'NESTED_COMMENT_719853', 'DEFAULT_LITERAL_719853', 'CHECK_LITERAL_719853', 'VIEW_LITERAL_719853', 'FUNCTION_DEFAULT_719853', 'MIGRATION_STATEMENT_719853', 'MIGRATION_BAD_VERSION_719853', 'TOKEN_CLAIM_719853'];
try {
  const canonical = await readSchemaCatalog(db);
  await test('audit installs every current migration and returns one read-only public metadata catalog', async () => {
    assert.ok(migrations.includes('20261026000100_role_write_hardening.sql'));
    assert.equal(canonical.format, 'erpx_schema_catalog_v1');
    assert.equal(canonical.read_only, 'on'); assert.equal(canonical.schema, 'public');
    assert.equal(canonical.scope.business_rows_read, false); assert.equal(canonical.scope.auth_rows_read, false);
    assert.ok(canonical.tables.find(table => table.name === 'users').columns.find(column => column.name === 'id'));
    assert.ok(canonical.functions.find(fn => fn.name === 'complete_pos_sale'));
    assert.equal((await one("SELECT current_setting('transaction_read_only') AS state")).state, 'off');
  });
  await test('an identical canonical snapshot has zero schema and grant differences', async () => {
    const comparison = compareCatalogs(canonical, canonical);
    assert.equal(comparison.summary.schema_differences, 0); assert.equal(comparison.summary.grant_differences, 0);
    assert.equal(comparison.automatic_migration_generated, false);
  });
  await test('SQL Editor JSON wrappers are parsed as data and other formats are rejected', async () => {
    assert.equal(parseCatalog(JSON.stringify([{ schema_catalog: JSON.stringify(canonical) }])).format, canonical.format);
    assert.throws(() => parseCatalog('{"tables":[]}'), /Expected a public/);
  });
  await test('comparison CLI rejects extra arguments and source/output aliases before changing any file', async () => {
    const directory = await mkdtemp(new URL('./.inspection-fixture-',import.meta.url));
    const source = join(directory,'source.json'); const output = join(directory,'report.json'); const alias = join(directory,'source-alias.json');
    const original = JSON.stringify(canonical); const report = 'Original report must be preserved';
    let linked = false;
    try {
      await writeFile(source,original); await writeFile(output,report);
      await assert.rejects(compareFiles([source,output,'unexpected']),/Usage:/);
      await assert.rejects(compareFiles([source,source]),/different files/);
      if (process.platform === 'win32') await assert.rejects(compareFiles([source,source.toUpperCase()]),/different files/);
      await link(source,alias); linked = true;
      await assert.rejects(compareFiles([source,alias]),/same file/);
      assert.equal(await readFile(source,'utf8'),original); assert.equal(await readFile(output,'utf8'),report);
    } finally {
      if (linked) await unlink(alias);
      await unlink(source); await unlink(output); await rmdir(directory);
    }
  });
  await db.exec(String.raw`
    CREATE TABLE public.inspection_private_probe(payload text DEFAULT 'DEFAULT_LITERAL_719853',
      CONSTRAINT probe_check CHECK(payload <> 'CHECK_LITERAL_719853'));
    REVOKE ALL ON public.inspection_private_probe FROM anon,authenticated;
    INSERT INTO public.inspection_private_probe VALUES('PRIVATE_ROW_719853');
    INSERT INTO auth.users(id,email) VALUES('70000000-0000-0000-0000-000000000001','AUTH_EMAIL_719853');
    CREATE VIEW public.inspection_view_probe AS SELECT 'VIEW_LITERAL_719853'::text AS placeholder;
    CREATE FUNCTION public.inspection_function_probe(p_input text DEFAULT 'FUNCTION_DEFAULT_719853') RETURNS text LANGUAGE plpgsql AS $outer$
    DECLARE first_literal text := 'SINGLE_LITERAL_719853';
      nested_literal text := $inner$NESTED_DOLLAR_719853$inner$;
      escaped_literal text := E'prefix\'ESCAPED_QUOTE_719853';
    -- LINE_COMMENT_719853
    /* BLOCK_COMMENT_719853 */
    /* nested /* inner */ NESTED_COMMENT_719853 */
    BEGIN RETURN first_literal || nested_literal || escaped_literal; END;
    $outer$;
    CREATE TABLE public.erpx_migration_history(version text PRIMARY KEY,sha256 text,applied_at timestamptz DEFAULT now());
    INSERT INTO public.erpx_migration_history(version,sha256) VALUES('20261026000100_role_write_hardening',repeat('a',64)),('MIGRATION_BAD_VERSION_719853','not-a-valid-hash');
    CREATE SCHEMA supabase_migrations;
    CREATE TABLE supabase_migrations.schema_migrations(version text,statements text[],name text);
    INSERT INTO supabase_migrations.schema_migrations VALUES('20261026000100',ARRAY['MIGRATION_STATEMENT_719853'],'MIGRATION_STATEMENT_719853');
    SELECT set_config('request.jwt.claim.access_token','TOKEN_CLAIM_719853',false);
  `);
  const observed = await readSchemaCatalog(db);
  await test('literal defaults, function literals, nested dollars, comments and business/Auth rows do not appear in export', async () => {
    const serialized = JSON.stringify(observed);
    for (const canary of canaries) assert.ok(!serialized.includes(canary), `Canary leaked: ${canary}`);
    const fn = observed.functions.find(fn => fn.name === 'inspection_function_probe');
    assert.ok(fn.definition.includes('__BODY_START__')); assert.ok(fn.definition.includes('__DOLLAR_LITERAL__'));
    assert.ok(fn.definition_hash); assert.ok(observed.tables.find(table => table.name === 'inspection_private_probe').columns[0].default_hash);
  });
  await test('migration history includes validated version/checksum metadata and excludes names and statement bodies', async () => {
    const tracker = observed.migration_history.public_tracker;
    assert.equal(tracker.entries.length, 1); assert.equal(tracker.entries[0].version, '20261026000100_role_write_hardening');
    assert.equal(tracker.entries[0].checksum, 'a'.repeat(64));
    assert.deepEqual(observed.migration_history.supabase_tracker.entries, [{ version: '20261026000100' }]);
  });
  await test('audit neither executes public routines nor reads inaccessible private application tables', async () => {
    await db.exec('SET ROLE authenticated');
    try {
      await assert.rejects(db.query('SELECT * FROM public.inspection_private_probe'), /permission denied/);
      const unprivileged = await readSchemaCatalog(db);
      assert.equal(unprivileged.read_only, 'on'); assert.ok(unprivileged.tables.find(table => table.name === 'inspection_private_probe'));
      assert.ok(!JSON.stringify(unprivileged).includes('PRIVATE_ROW_719853'));
    } finally { await db.exec('RESET ROLE'); }
    assert.equal(Number((await one('SELECT count(*) FROM public.inspection_private_probe')).count), 1);
  });
  await test('metadata-only identity review distinguishes foreign-key links without reporting orphan counts', async () => {
    assert.equal(observed.identity_review.orphan_rows_checked, false);
    const identity = observed.identity_review.candidates.find(candidate => candidate.table_name === 'users' && candidate.column_name === 'id');
    assert.equal(identity.references_auth_users, true);
    assert.ok(!('orphan_count' in identity));
  });
  await test('comparison identifies additive gaps and changed policies without generating destructive SQL', async () => {
    const altered = structuredClone(canonical);
    altered.tables.find(table => table.name === 'users').columns = altered.tables.find(table => table.name === 'users').columns.filter(column => column.name !== 'branch_id');
    altered.tables.find(table => table.name === 'sales').rls_enabled = false;
    altered.functions = altered.functions.filter(fn => fn.name !== 'complete_pos_sale');
    const comparison = compareCatalogs(canonical, altered);
    assert.ok(comparison.differences.some(diff => diff.object === 'users.branch_id' && diff.difference === 'missing_in_observed'));
    assert.ok(comparison.differences.some(diff => diff.object === 'sales' && diff.fields.includes('rls_enabled')));
    assert.ok(comparison.differences.some(diff => diff.kind === 'function' && diff.object.startsWith('complete_pos_sale(')));
    assert.equal(comparison.mode, 'read_only_review'); assert.equal(comparison.automatic_migration_generated, false);
  });
  await test('an unknown or RLS-protected migration tracker is catalogued without querying its rows', async () => {
    await db.exec('ALTER TABLE public.erpx_migration_history ENABLE ROW LEVEL SECURITY');
    const protectedHistory = await readSchemaCatalog(db);
    assert.equal(protectedHistory.migration_history.public_tracker.present, true);
    assert.equal(protectedHistory.migration_history.public_tracker.supported, false);
    assert.deepEqual(protectedHistory.migration_history.public_tracker.entries, []);
  });
  console.log(`\n${passed} metadata inspection checks passed; ${migrations.length} canonical migrations included. No live database connection was used.`);
} catch (error) {
  console.error(`${error.message}${error.where ? `\n${error.where}` : ''}`); process.exitCode = 1;
} finally { await db.close(); }
