import { readFile, readdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function createCanonicalDatabase() {
  let entry;
  try { entry = import.meta.resolve('@electric-sql/pglite'); }
  catch {
    const installed = new URL('../tests/node_modules/@electric-sql/pglite/dist/index.js', import.meta.url);
    try { await readFile(installed); entry = installed.href; }
    catch { entry = new URL('../../.tmp/db-validation/node_modules/@electric-sql/pglite/dist/index.js', import.meta.url).href; }
  }
  const { PGlite } = await import(entry);
  const { uuid_ossp } = await import(new URL('./contrib/uuid_ossp.js', entry));
  const { pgcrypto } = await import(new URL('./contrib/pgcrypto.js', entry));
  const db = new PGlite({ extensions: { 'uuid-ossp': uuid_ossp, pgcrypto } });
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon,authenticated,service_role;`);
    const directory = new URL('../../supabase/migrations/', import.meta.url);
    const migrations = (await readdir(directory)).filter(name => /^\d{14}_[a-z_]+\.sql$/.test(name)).sort();
    for (const file of migrations) await db.exec(await readFile(new URL(file, directory), 'utf8'));
    return { db, migrations };
  } catch (error) { await db.close(); throw error; }
}

export async function readSchemaCatalog(db) {
  const script = await readFile(new URL('./schema-audit.sql', import.meta.url), 'utf8');
  try {
    const results = await db.exec(script);
    const catalog = results.flatMap(result => result.rows).find(row => row.schema_catalog)?.schema_catalog;
    if (!catalog || catalog.format !== 'erpx_schema_catalog_v1') throw new Error('The schema audit did not return its expected JSON catalog');
    return catalog;
  } catch (error) {
    // End a failed audit transaction before allowing the local engine to close.
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function canonicalCatalog() {
  const { db, migrations } = await createCanonicalDatabase();
  try {
    const catalog = await readSchemaCatalog(db);
    return { ...catalog, canonical_source: { migrations, local_engine: 'PGlite', supabase_default_grants_simulated: true, live_database_inspected: false } };
  } finally { await db.close(); }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const output = process.argv[2];
  if (!output || process.argv.slice(2).length !== 1) { console.error('Usage: node database/inspection/canonical-catalog.mjs <output.json>'); process.exitCode = 1; }
  else {
    try {
      const catalog = await canonicalCatalog();
      await writeFile(output, JSON.stringify(catalog, null, 2) + '\n');
      console.log(`Wrote canonical catalog: ${catalog.tables.length} public relations, ${catalog.functions.length} routines, ${catalog.canonical_source.migrations.length} migrations. No live database connection was used.`);
    } catch (error) { console.error(`${error.message}${error.where ? `\n${error.where}` : ''}`); process.exitCode = 1; }
  }
}
