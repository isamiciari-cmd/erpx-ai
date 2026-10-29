// Compare local metadata files only. This program has no database/network client
// and never changes either the application or the inspected schema.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

function splitArguments(value) {
  const result = [];
  let start = 0,
    depth = 0,
    quoted = false;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === '"') quoted = !quoted;
    if (quoted) continue;
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === ',' && depth === 0) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (value.slice(start).trim()) result.push(value.slice(start).trim());
  return result;
}
function argumentNames(value) {
  return splitArguments(value || '').flatMap((argument) => {
    if (/^OUT\s/i.test(argument)) return [];
    const match = argument.match(
      /^(?:(?:IN|INOUT|VARIADIC)\s+)?(?:"([^"]+)"|([a-zA-Z_]\w*))\s+.+$/i,
    );
    return match ? [match[1] || match[2]] : [];
  });
}
const core = (entry) => entry.requirement === 'core' || entry.requirement === 'registration';
export function compareCatalog(contract, catalog) {
  if (contract.format !== 'erpx_app_contract_v1')
    throw new Error('Unsupported app contract format.');
  if (
    catalog.format !== 'erpx_schema_catalog_v1' ||
    catalog.schema !== 'public' ||
    !Array.isArray(catalog.tables) ||
    !Array.isArray(catalog.functions)
  )
    throw new Error(
      'Expected an erpx_schema_catalog_v1 public-schema export with tables and functions arrays.',
    );
  const blockers = [],
    warnings = [];
  const roles = catalog.tables.find((table) => table.name === 'roles');
  const hasLegacyGrants = roles?.columns?.some((column) => column.name === 'permissions') === true;
  const hasRolesRpc = catalog.functions.some((fn) => fn.name === 'get_user_roles');
  const hasPermissionsRpc = catalog.functions.some((fn) => fn.name === 'get_user_permissions');
  if (hasRolesRpc !== hasPermissionsRpc)
    blockers.push({
      code: 'incomplete_rbac_rpc_pair',
      message:
        'Exactly one authorization RPC is present; active authentication rejects this partial RBAC deployment.',
    });
  if (!hasRolesRpc && !hasPermissionsRpc && !hasLegacyGrants)
    blockers.push({
      code: 'missing_authorization_model',
      message: 'Neither the paired authorization RPCs nor roles.permissions JSON are present.',
    });
  const requiredTable = (entry) =>
    core(entry) || (entry.requirement === 'conditional_rbac' && !hasLegacyGrants);
  const add = (required, code, message, details = {}) =>
    (required ? blockers : warnings).push({ code, message, ...details });
  for (const expected of contract.tables) {
    const table = catalog.tables.find((table) => table.name === expected.name);
    if (!table) {
      add(requiredTable(expected), 'missing_table', `Missing public.${expected.name}`, {
        requirement: expected.requirement,
      });
      continue;
    }
    if (!Array.isArray(table.columns))
      throw new Error(`Catalog table ${table.name} has no columns array.`);
    const columns = new Set(table.columns.map((column) => column.name));
    const missing = expected.columns.filter(
      (column) =>
        !columns.has(column) &&
        !(expected.accepted_column_aliases?.[column] || []).some((alias) => columns.has(alias)),
    );
    if (missing.length)
      add(
        requiredTable(expected),
        'missing_columns',
        `Missing columns on public.${expected.name}`,
        { columns: missing, requirement: expected.requirement },
      );
    if (expected.rls_required && table.rls_enabled !== true)
      add(
        requiredTable(expected),
        'rls_not_enabled',
        `RLS is not confirmed enabled on public.${expected.name}`,
        { requirement: expected.requirement },
      );
    const declaredMissing = (expected.declared_only_columns || []).filter(
      (column) => !columns.has(column),
    );
    if (declaredMissing.length)
      add(
        false,
        'declared_only_columns',
        `Retained service/type fields differ on public.${expected.name}; review callers before changing schema.`,
        { columns: declaredMissing },
      );
  }
  for (const expected of contract.functions) {
    const candidates = catalog.functions.filter((fn) => fn.name === expected.name);
    if (!candidates.length) {
      add(core(expected), 'missing_rpc', `Missing public.${expected.name}`, {
        arguments: expected.arguments,
        requirement: expected.requirement,
      });
      continue;
    }
    const exact = candidates.filter((fn) => {
      const names = argumentNames(fn.identity_arguments);
      return (
        names.length === expected.arguments.length &&
        expected.arguments.every((name) => names.includes(name))
      );
    });
    if (!exact.length) {
      const superset = candidates.some((fn) =>
        expected.arguments.every((name) => argumentNames(fn.identity_arguments).includes(name)),
      );
      add(
        core(expected) && !superset,
        superset ? 'rpc_extra_parameters' : 'rpc_argument_mismatch',
        `RPC argument names differ for public.${expected.name}${superset ? '; verify defaults for extra parameters' : ''}`,
        {
          expected: expected.arguments,
          observed: candidates.map((fn) => ({
            identity_arguments: fn.identity_arguments,
            names: argumentNames(fn.identity_arguments),
          })),
          requirement: expected.requirement,
        },
      );
      continue;
    }
    if (exact.length > 1)
      add(
        false,
        'rpc_overloads',
        `Multiple overloads share the client argument names for public.${expected.name}; verify PostgREST resolution.`,
      );
    const fields = expected.returns?.fields || [];
    if (fields.length) {
      const tableShape = exact
        .map((fn) => String(fn.result || '').match(/^TABLE\s*\((.*)\)$/is))
        .find(Boolean);
      if (tableShape) {
        const available = argumentNames(tableShape[1]);
        const missing = fields.filter((field) => !available.includes(field));
        if (missing.length)
          add(
            core(expected),
            'rpc_return_columns',
            `Declared result columns differ for public.${expected.name}`,
            { fields: missing },
          );
      } else
        add(
          false,
          'rpc_return_shape_unverified',
          `Metadata cannot prove the JSON/composite return fields of public.${expected.name}; run an authenticated acceptance test.`,
          { expected_fields: fields },
        );
    } else if (
      expected.returns?.kind === 'boolean' &&
      !exact.some((fn) => /^boolean$/i.test(String(fn.result)))
    )
      add(core(expected), 'rpc_return_type', `public.${expected.name} must return a boolean.`);
  }
  for (const relationship of contract.relationships) {
    const table = catalog.tables.find((table) => table.name === relationship.table);
    if (!table) continue;
    const foreignKey = (table.constraints || []).some(
      (constraint) =>
        constraint.referenced_table === relationship.referenced_table &&
        (!constraint.referenced_schema || constraint.referenced_schema === relationship.schema) &&
        (constraint.columns || []).includes(relationship.column) &&
        (constraint.referenced_columns || []).includes(relationship.referenced_column),
    );
    if (!foreignKey)
      blockers.push({
        code: 'missing_relationship',
        message: `PostgREST relationship is not confirmed: ${relationship.table}.${relationship.column} -> ${relationship.referenced_table}.${relationship.referenced_column}`,
      });
  }
  warnings.push({
    code: 'semantic_checks_required',
    message:
      'Presence checks do not verify data mappings, function-body safety, tenant isolation, grants, triggers, accounting invariants or provider configuration.',
  });
  return {
    format: 'erpx_app_contract_report_v1',
    compatible_by_presence: blockers.length === 0,
    checked_tables: contract.tables.length,
    checked_rpcs: contract.functions.length,
    blockers,
    warnings,
  };
}

async function selfTest(contract) {
  const catalog = {
    format: 'erpx_schema_catalog_v1',
    schema: 'public',
    tables: contract.tables.map((table) => ({
      name: table.name,
      rls_enabled: true,
      columns: table.columns.map((name) => ({ name })),
      constraints: contract.relationships
        .filter((fk) => fk.table === table.name)
        .map((fk) => ({
          columns: [fk.column],
          referenced_schema: 'public',
          referenced_table: fk.referenced_table,
          referenced_columns: [fk.referenced_column],
        })),
    })),
    functions: contract.functions.map((fn) => ({
      name: fn.name,
      identity_arguments: fn.arguments.map((name) => `${name} uuid`).join(', '),
      result: fn.returns.kind === 'boolean' ? 'boolean' : 'jsonb',
    })),
  };
  assert.equal(compareCatalog(contract, catalog).compatible_by_presence, true);
  const legacyPermissionNames = structuredClone(catalog);
  legacyPermissionNames.tables.find((table) => table.name === 'permissions').columns =
    legacyPermissionNames.tables
      .find((table) => table.name === 'permissions')
      .columns.map((column) => ({
        ...column,
        name:
          column.name === 'permission_key'
            ? 'key'
            : column.name === 'permission_name'
              ? 'name'
              : column.name,
      }));
  assert.equal(compareCatalog(contract, legacyPermissionNames).compatible_by_presence, true);
  const missingPermissionNames = structuredClone(catalog);
  missingPermissionNames.tables.find((table) => table.name === 'permissions').columns =
    missingPermissionNames.tables
      .find((table) => table.name === 'permissions')
      .columns.filter((column) => !['permission_key', 'key'].includes(column.name));
  assert.ok(
    compareCatalog(contract, missingPermissionNames).blockers.some(
      (problem) => problem.code === 'missing_columns' && problem.columns.includes('permission_key'),
    ),
  );
  const missingId = structuredClone(catalog);
  missingId.tables.find((table) => table.name === 'users').columns = missingId.tables
    .find((table) => table.name === 'users')
    .columns.filter((column) => column.name !== 'id');
  assert.ok(
    compareCatalog(contract, missingId).blockers.some(
      (problem) => problem.code === 'missing_columns' && problem.columns.includes('id'),
    ),
  );
  const wrongRpc = structuredClone(catalog);
  wrongRpc.functions.find((fn) => fn.name === 'complete_pos_sale').identity_arguments =
    'company_id uuid';
  assert.ok(
    compareCatalog(contract, wrongRpc).blockers.some(
      (problem) => problem.code === 'rpc_argument_mismatch',
    ),
  );
  const optionalMissing = structuredClone(catalog);
  optionalMissing.functions = optionalMissing.functions.filter(
    (fn) => !['get_user_roles', 'get_user_permissions', 'can_access_tenant'].includes(fn.name),
  );
  optionalMissing.tables
    .find((table) => table.name === 'roles')
    .columns.push({ name: 'permissions' });
  assert.equal(compareCatalog(contract, optionalMissing).compatible_by_presence, true);
  const partialRbac = structuredClone(catalog);
  partialRbac.functions = partialRbac.functions.filter((fn) => fn.name !== 'get_user_roles');
  assert.ok(
    compareCatalog(contract, partialRbac).blockers.some(
      (problem) => problem.code === 'incomplete_rbac_rpc_pair',
    ),
  );
  const wrongFk = structuredClone(catalog);
  wrongFk.tables.find((table) => table.name === 'inventory').constraints = [];
  assert.ok(
    compareCatalog(contract, wrongFk).blockers.some(
      (problem) => problem.code === 'missing_relationship',
    ),
  );
  assert.deepEqual(argumentNames('p_amount numeric(15,2), p_ids uuid[], "p_key" text'), [
    'p_amount',
    'p_ids',
    'p_key',
  ]);
  assert.throws(() => compareCatalog(contract, { format: 'unknown' }), /Expected/);
  console.log('PASS 10 offline app-contract checker checks. No database was contacted.');
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase()
) {
  try {
    const contract = JSON.parse(
      await readFile(new URL('./app-contract.json', import.meta.url), 'utf8'),
    );
    const path = process.argv[2];
    if (path === '--self-test') await selfTest(contract);
    else {
      if (!path)
        throw new Error(
          'Usage: node database/inspection/check-app-contract.mjs <catalog.json> | --self-test',
        );
      const catalog = JSON.parse(await readFile(path, 'utf8'));
      const report = compareCatalog(contract, catalog);
      console.log(JSON.stringify(report, null, 2));
      if (!report.compatible_by_presence) process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
