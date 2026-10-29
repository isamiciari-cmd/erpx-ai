// Read-only Vercel diagnosis plus optional LOCAL preparation of two public-value
// PATCH bodies. This program has no remote mutation path and never prints values.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = 'prj_Xca6Agc2dDe9aRbA8CQ6EN913eG4';
const team = 'team_0FRlTvxOjZpXO6nIsgV0l5E1';
const ref = 'svxmlejmhlocsjjtftxd';
const names = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 1 && args[0] === '--prepare'),
  'Usage: node scripts/reconcile-vercel-public-env.mjs [--prepare]. No live write option exists.');
const directory = path.join(root, '.tmp/release-acceptance');
const cli = path.join(root, 'node_modules/vercel/dist/vc.js');

function api(endpoint) {
  // CLI owns its login credentials; do not read them or add tokens to arguments.
  assert(endpoint.startsWith(`/v10/projects/${project}/env?`) ||
    new RegExp(`^/v1/projects/${project}/env/[A-Za-z0-9_-]+\\?teamId=${team}$`).test(endpoint));
  const result = spawnSync(process.execPath, [cli, 'api', endpoint, '--method', 'GET', '--raw'], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 45000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', VERCEL_TELEMETRY_DISABLED: '1' },
  });
  if (result.error || result.status !== 0) {
    const network = /ENOTFOUND|EAI_AGAIN|EPERM|EACCES|fetch failed|connect.*(?:failed|refused)|network|socket/i.test(result.stderr || '');
    throw Error(`Read-only Vercel request failed (exit ${result.status ?? 'none'}, network/access failure: ${network}); response withheld.`);
  }
  try { return JSON.parse(result.stdout); }
  catch { throw Error('Read-only Vercel response was not JSON; raw output withheld.'); }
}

function publicValues(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) {
      try { value = JSON.parse(value); }
      catch { throw Error('The public configuration has invalid quoting; value withheld.'); }
    } else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  assert.equal(values.VITE_SUPABASE_URL, `https://${ref}.supabase.co`, 'Local public URL does not match the pinned project');
  let claims;
  try { claims = JSON.parse(Buffer.from(values.VITE_SUPABASE_ANON_KEY.split('.')[1], 'base64url')); }
  catch { throw Error('The expected local public anonymous key is missing/invalid; value withheld.'); }
  assert(claims.role === 'anon' && claims.ref === ref, 'Only the pinned project anonymous key may be prepared');
  return values;
}

const metadata = JSON.parse(await readFile(path.join(root, '.vercel/project.json'), 'utf8'));
assert(metadata.projectId === project && metadata.orgId === team, 'The Vercel project link differs from the reviewed destination');
const expected = publicValues(await readFile(path.join(root, '.env'), 'utf8'));
const listing = api(`/v10/projects/${project}/env?teamId=${team}&target=production&decrypt=false`);
assert(Array.isArray(listing.envs), 'Vercel environment metadata has an unrecognized shape');
const selected = listing.envs.filter(row => names.includes(row.key));
const checks = [];
const patches = [];
for (const key of names) {
  const rows = selected.filter(row => row.key === key);
  assert.equal(rows.length, 1, `Expected exactly one production record for ${key}`);
  const row = rows[0];
  assert(typeof row.id === 'string' && /^[A-Za-z0-9_-]+$/.test(row.id), 'Unexpected environment record ID');
  const target = Array.isArray(row.target) ? row.target : [row.target];
  assert(target.includes('production'), 'The environment record is outside production');
  const record = api(`/v1/projects/${project}/env/${row.id}?teamId=${team}`);
  assert(record.id === row.id && record.key === key, 'The public record read-back identity differs');
  const hidden = row.type === 'sensitive' || row.visibility === 'secret' || record.visibility === 'secret';
  const hasValue = hidden ? null : typeof record.value === 'string' && record.value.length > 0;
  const matches = hidden ? null : hasValue && record.value === expected[key];
  const productionOnly = target.length === 1 && target[0] === 'production' &&
    !row.gitBranch && !(row.customEnvironmentIds || []).length;
  const reviewedSharedTargets = target.length === 2 && target.includes('production') && target.includes('preview');
  const editable = (productionOnly || reviewedSharedTargets) && !row.gitBranch && !(row.customEnvironmentIds || []).length &&
    ['plain', 'encrypted', 'sensitive'].includes(row.type) && !row.configurationId;
  checks.push({ key, id: row.id, type: row.type, target, gitBranch: row.gitBranch || null,
    configurationId: row.configurationId || null, updatedAt: row.updatedAt || null,
    decrypted: record.decrypted === true, readback: hidden ? 'unreadable_sensitive_value' : 'readable',
    nonempty: hasValue, matches_expected_public_value: matches,
    safe_public_value_patch_preserving_targets: editable });
  if (args[0] === '--prepare' && !matches) {
    assert(editable, `Refusing to prepare ${key}: record differs from the reviewed targets/type or is integration/branch owned`);
    const filename = `${key}.public-patch.json`;
    const endpoint = `/v9/projects/${project}/env/${row.id}?teamId=${team}`;
    // Only these two validated public browser values are persisted, never the
    // API response, server variables, login credentials, or encrypted values.
    patches.push({ key, filename, endpoint, target,
      body: { ...(row.type === 'sensitive' ? {} : { key }), value: expected[key], type: row.type, target } });
  }
}
await mkdir(directory, { recursive: true });
const report = { project_id: project, team_id: team, inspected_at: new Date().toISOString(),
  remote_writes_performed: false, all_public_values_verified: checks.every(row => row.matches_expected_public_value === true),
  readback_limit: 'Sensitive/Secret values are write-only. A blank API value does not prove the stored value is empty; equality cannot be checked by read-back.',
  checks, prepared_patches: patches.map(({ key, filename, endpoint, target }) => ({ key, file: `.tmp/release-acceptance/${filename}`, method: 'PATCH', endpoint,
    target, preserves_existing_type_and_targets: true, public_values_only: true })),
  documentation: [
    'https://vercel.com/docs/rest-api/projects/retrieve-the-decrypted-value-of-an-environment-variable-of-a-project-by-id',
    'https://vercel.com/docs/rest-api/projects/edit-an-environment-variable',
    'https://vercel.com/docs/cli/api',
    'https://vercel.com/docs/environment-variables/sensitive-environment-variables',
  ] };
for (const patch of patches) await writeFile(path.join(directory, patch.filename), JSON.stringify(patch.body));
await writeFile(path.join(directory, 'vercel-public-env-inspection.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
