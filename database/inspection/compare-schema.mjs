import { readFile, writeFile, realpath, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { canonicalCatalog } from './canonical-catalog.mjs';

export function parseCatalog(text) {
  if (Buffer.byteLength(text, 'utf8') > 25 * 1024 * 1024) throw new Error('Catalog file exceeds the 25 MiB inspection limit');
  let value = JSON.parse(text.replace(/^\uFEFF/, ''));
  for (let depth = 0; depth < 5; depth++) {
    if (typeof value === 'string') value = JSON.parse(value);
    else if (Array.isArray(value) && value.length === 1) value = value[0];
    else if (value && typeof value === 'object' && 'schema_catalog' in value) value = value.schema_catalog;
    else break;
  }
  if (!value || value.format !== 'erpx_schema_catalog_v1' || value.schema !== 'public' || !Array.isArray(value.tables) || !Array.isArray(value.functions)) {
    throw new Error('Expected a public erpx_schema_catalog_v1 JSON object or a one-row SQL Editor schema_catalog export');
  }
  return value;
}

const key = item => item.name;
const routineKey = item => `${item.name}(${item.identity_arguments})`;
const object = (item, fields) => Object.fromEntries(fields.map(field => [field, item?.[field] ?? null]));
const string = value => JSON.stringify(value);

export async function validateComparisonPaths(input, output) {
  const normalize = value => process.platform === 'win32' ? value.toLowerCase() : value;
  const sourcePath = await realpath(resolve(input));
  let outputPath;
  try { outputPath = await realpath(resolve(output)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; outputPath = resolve(output); }
  if (normalize(sourcePath) === normalize(outputPath)) throw new Error('Input and output must be different files; the original schema export must be preserved');
  try {
    const [source, destination] = await Promise.all([stat(sourcePath), stat(outputPath)]);
    if (source.ino && destination.ino && source.dev === destination.dev && source.ino === destination.ino) throw new Error('Input and output refer to the same file; the original schema export must be preserved');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

export function compareCatalogs(expected, actual) {
  const differences = [];
  const compareItems = (kind, prefix, expectedItems, actualItems, fields, getKey = key) => {
    const expectedMap = new Map((expectedItems ?? []).map(item => [getKey(item), item]));
    const actualMap = new Map((actualItems ?? []).map(item => [getKey(item), item]));
    for (const name of [...new Set([...expectedMap.keys(), ...actualMap.keys()])].sort()) {
      const e = expectedMap.get(name); const a = actualMap.get(name); const id = `${prefix}${name}`;
      if (!e || !a) {
        differences.push({ kind, object: id, difference: e ? 'missing_in_observed' : 'extra_in_observed',
          canonical: e ? object(e, fields) : null, observed: a ? object(a, fields) : null,
          instruction: e ? 'Review an additive change against the observed schema before preparing SQL' : 'Preserve until its purpose and dependencies have been reviewed; no deletion is proposed' });
      } else {
        const changed = fields.filter(field => string(e[field] ?? null) !== string(a[field] ?? null));
        if (changed.length) differences.push({ kind, object: id, difference: 'changed', fields: changed, canonical: object(e, changed), observed: object(a, changed), instruction: 'Review compatibility and dependencies; no automatic replacement is proposed' });
      }
    }
  };
  compareItems('relation', '', expected.tables, actual.tables, ['kind', 'rls_enabled', 'rls_forced', 'persistence', 'is_partition', 'partition_key_hash', 'view_definition_hash']);
  const actualTables = new Map(actual.tables.map(table => [table.name, table]));
  for (const table of expected.tables) {
    const observed = actualTables.get(table.name);
    if (!observed) continue;
    const prefix = `${table.name}.`;
    compareItems('column', prefix, table.columns, observed.columns, ['data_type', 'udt_schema', 'udt_name', 'nullable', 'default_hash', 'identity', 'generated', 'collation']);
    compareItems('constraint', prefix, table.constraints, observed.constraints, ['type', 'validated', 'deferrable', 'initially_deferred', 'columns', 'referenced_schema', 'referenced_table', 'referenced_columns', 'update_action', 'delete_action', 'match_type', 'definition_hash']);
    compareItems('index', prefix, table.indexes, observed.indexes, ['unique', 'primary', 'valid', 'ready', 'definition_hash']);
    compareItems('policy', prefix, table.policies, observed.policies, ['command', 'roles', 'permissive', 'using_hash', 'with_check_hash']);
    compareItems('trigger', prefix, table.triggers, observed.triggers, ['enabled', 'function_schema', 'function_name', 'function_identity_arguments', 'deferrable', 'initially_deferred', 'definition_hash']);
  }
  // Supabase and PGlite may ship different extension versions; custom routines
  // are the application contract. Extension metadata remains in both catalogs.
  compareItems('function', '', expected.functions.filter(fn => !fn.extension), actual.functions.filter(fn => !fn.extension),
    ['result', 'kind', 'language', 'security_definer', 'volatility', 'parallel', 'strict', 'leakproof', 'definition_hash', 'config_keys', 'config_hash'], routineKey);
  compareItems('sequence', '', expected.sequences, actual.sequences, ['data_type', 'start', 'increment', 'minimum', 'maximum', 'cache', 'cycle']);
  compareItems('enum', '', expected.enums, actual.enums, ['label_count', 'labels_hash']);
  const grantDifferences = [];
  for (const kind of ['schemas', 'tables', 'columns', 'functions', 'default_privileges']) {
    const normalize = entries => (entries ?? []).filter(item => ['PUBLIC', 'anon', 'authenticated', 'service_role'].includes(item.grantee))
      .map(({ grantor, owner, ...rest }) => rest).map(string).sort();
    const e = new Set(normalize(expected.grants?.[kind])); const a = new Set(normalize(actual.grants?.[kind]));
    for (const entry of [...new Set([...e, ...a])].sort()) if (e.has(entry) !== a.has(entry)) grantDifferences.push({ kind, difference: e.has(entry) ? 'missing_in_observed' : 'extra_in_observed', grant: JSON.parse(entry) });
  }
  return {
    format: 'erpx_schema_comparison_v1', mode: 'read_only_review', live_connection_used_by_comparator: false, automatic_migration_generated: false,
    summary: { schema_differences: differences.length, grant_differences: grantDifferences.length, canonical_relations: expected.tables.length, observed_relations: actual.tables.length,
      canonical_custom_routines: expected.functions.filter(fn => !fn.extension).length, observed_custom_routines: actual.functions.filter(fn => !fn.extension).length },
    cautions: ['This comparison is metadata only and never proves business data compatibility or absence of orphan identities.',
      'Definition hashes identify textual drift, not semantic incompatibility; exported definitions have literals/comments redacted.',
      'Role ownership, platform default grants and extension versions vary by environment and need a separate privilege review.',
      'Missing objects do not establish which historical baseline was installed. Extra objects are retained, never marked for deletion.',
      'Do not apply the fresh canonical baseline to an existing database based on this report. Prepare a reviewed additive upgrade and backup/restore plan.'],
    canonical_source: expected.canonical_source ?? null, observed_capture: { captured_at: actual.captured_at, server_version: actual.server_version, read_only: actual.read_only },
    differences, grant_differences: grantDifferences, migration_history: actual.migration_history, identity_review: actual.identity_review,
  };
}

export async function compareFiles(args) {
  if (args.length !== 2 || !args[0] || !args[1]) throw new Error('Usage: node database/inspection/compare-schema.mjs <observed-catalog.json> <report.json>');
  const [input, output] = args;
  await validateComparisonPaths(input, output);
  const observed = parseCatalog(await readFile(input, 'utf8'));
  const expected = await canonicalCatalog();
  const report = compareCatalogs(expected, observed);
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const report = await compareFiles(process.argv.slice(2));
    console.log(`Metadata comparison written: ${report.summary.schema_differences} schema differences, ${report.summary.grant_differences} environment-sensitive grant differences. No live connection or schema changes.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
