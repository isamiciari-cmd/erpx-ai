// Deliberately scoped deployment tool. Running without --deploy is offline.
// Source multipart contract:
// https://supabase.com/docs/reference/api/v1-deploy-a-function
// https://supabase.com/changelog/33720-deploy-and-update-edge-functions-using-the-management-api
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROJECT_REF = 'svxmlejmhlocsjjtftxd';
export const SLUG = 'manage-users';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = Object.freeze([
  { local: 'supabase/functions/manage-users/index.ts', name: 'manage-users/index.ts' },
  { local: 'supabase/functions/manage-users/rules.ts', name: 'manage-users/rules.ts' },
  { local: 'supabase/functions/_shared/auth.ts', name: '_shared/auth.ts' },
]);
const METADATA = Object.freeze({ name: SLUG, entrypoint_path: 'manage-users/index.ts', verify_jwt: true });
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${SLUG}`;
const sha256 = content => createHash('sha256').update(content).digest('hex');

export function parseArguments(args) {
  if (args.length === 0 || (args.length === 1 && args[0] === '--plan')) return { deploy: false };
  if (args.length === 3 && args[0] === '--deploy' && args[1] === '--expected-sha256' && /^[a-f0-9]{64}$/.test(args[2])) {
    return { deploy: true, expectedHash: args[2] };
  }
  throw new Error('Usage: node scripts/deploy-manage-users.mjs [--plan | --deploy --expected-sha256 <reviewed-bundle-hash>]. Tokens and project overrides are not accepted as arguments.');
}

export function parsePrivateEnvironment(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(SUPABASE_ACCESS_TOKEN|SUPABASE_PROJECT_REF)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    if (Object.hasOwn(values, match[1])) throw new Error('Duplicate private deployment configuration key.');
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '').trim();
    values[match[1]] = value;
  }
  if (values.SUPABASE_PROJECT_REF !== PROJECT_REF) throw new Error('Private deployment project does not match the pinned linked project.');
  if (!/^sbp_[A-Za-z0-9_-]{20,4096}$/.test(values.SUPABASE_ACCESS_TOKEN ?? '')) throw new Error('A valid private SUPABASE_ACCESS_TOKEN is required in .env.server.local.');
  return { token: values.SUPABASE_ACCESS_TOKEN };
}

export function validateBundleImports(files) {
  const names = new Set(files.map(file => file.name));
  if (names.size !== 3 || !names.has(METADATA.entrypoint_path)) throw new Error('Unexpected deployment file inventory.');
  for (const file of files) {
    if (/\bimport\s*\(/.test(file.content)) throw new Error('Dynamic imports require a separate deployment review.');
    for (const match of file.content.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      if (specifier.startsWith('.')) {
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file.name), specifier));
        if (!names.has(resolved)) throw new Error('A relative import is outside the approved three-file deployment.');
      } else if (specifier !== 'npm:@supabase/supabase-js@2.106.1') {
        throw new Error('A dependency is outside the reviewed pinned package set.');
      }
    }
  }
}

export async function prepareDeployment(root = ROOT) {
  const linked = (await readFile(path.join(root, 'supabase/.temp/project-ref'), 'utf8')).trim();
  if (linked !== PROJECT_REF) throw new Error('Linked project changed; deployment is blocked.');
  const files = await Promise.all(SOURCES.map(async source => {
    const content = await readFile(path.join(root, source.local), 'utf8');
    return { ...source, content, bytes: Buffer.byteLength(content, 'utf8'), sha256: sha256(content) };
  }));
  if (files.reduce((total, file) => total + file.bytes, 0) > 256 * 1024) throw new Error('Deployment source exceeds its reviewed size limit.');
  validateBundleImports(files);
  const manifest = files.map(({ local, name, bytes, sha256: hash }) => ({ local, name, bytes, sha256: hash }));
  const bundleHash = sha256(JSON.stringify({ project_ref: PROJECT_REF, slug: SLUG, metadata: METADATA, files: manifest }));
  let proposedOrigin = null;
  let appSiteConfigured = null;
  try {
    const readiness = JSON.parse(await readFile(path.join(root, '.tmp/supabase-review/service-readiness.json'), 'utf8'));
    const candidate = new URL(readiness.auth?.site_url);
    if (candidate.protocol === 'https:' && !candidate.username && !candidate.password) proposedOrigin = candidate.origin;
    appSiteConfigured = readiness.configured_secret_names?.APP_SITE_URL === true;
  } catch { /* A missing cached readiness report must not trigger a network call. */ }
  return {
    files,
    plan: {
      mode: 'offline_plan', project_ref: PROJECT_REF, function: SLUG, endpoint: ENDPOINT, method: 'POST', metadata: METADATA,
      multipart_files: manifest, bundle_sha256: bundleHash,
      invitation_settings: { app_site_url_configured_in_cached_readiness: appSiteConfigured, proposed_https_origin_from_cached_auth_site_url: proposedOrigin, applied: false },
      changes: ['Create or replace the manage-users Edge Function from exactly the three reviewed local source files'],
      settings_or_secrets_modified: false, invitation_sent: false, other_functions_modified: false, database_modified: false,
    },
  };
}

export function createMultipart(files) {
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(METADATA)], { type: 'application/json' }));
  for (const file of files) form.append('file', new Blob([file.content], { type: 'application/typescript' }), file.name);
  return form;
}

export async function executeDeployment(prepared, privateEnvironment, fetchImpl = fetch) {
  const { token } = parsePrivateEnvironment(privateEnvironment);
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body: createMultipart(prepared.files), redirect: 'error', signal: AbortSignal.timeout(120000),
    });
  } catch {
    // Deployment may already have completed. Never retry a version-changing POST
    // automatically, and never echo exception text or request headers.
    throw new Error('Deployment outcome is unknown after a transport failure. Inspect manage-users status before deciding whether to retry.');
  }
  if (response.status !== 201) {
    await response.body?.cancel();
    throw new Error(`Management API deployment returned HTTP ${Number(response.status)}. Upstream body was withheld; inspect function status before retrying.`);
  }
  let body;
  try { body = await response.json(); }
  catch { throw new Error('The API accepted deployment but its response could not be verified. Inspect function status; do not retry automatically.'); }
  if (body?.slug !== SLUG || !Number.isInteger(body.version) || body.version < 1 || body.verify_jwt !== true) {
    throw new Error('The API accepted deployment but returned unexpected function metadata. Inspect manage-users status before any further action.');
  }
  return { project_ref: PROJECT_REF, slug: SLUG, version: body.version, status: body.status === 'ACTIVE' ? 'ACTIVE' : 'REQUIRES_REVIEW', verify_jwt: true, bundle_sha256: prepared.plan.bundle_sha256,
    settings_or_secrets_modified: false, invitation_sent: false };
}

export async function main(args) {
  const options = parseArguments(args);
  const prepared = await prepareDeployment();
  if (!options.deploy) return prepared.plan;
  if (options.expectedHash !== prepared.plan.bundle_sha256) throw new Error('Source bundle changed after review. Generate and review a fresh offline plan before deploying.');
  // The private file is read only after explicit deploy mode and hash validation.
  let privateEnvironment;
  try { privateEnvironment = await readFile(path.join(ROOT, '.env.server.local'), 'utf8'); }
  catch { throw new Error('Private .env.server.local deployment configuration is unavailable.'); }
  return executeDeployment(prepared, privateEnvironment);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try { console.log(JSON.stringify(await main(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Deployment preparation failed.'); process.exitCode = 1; }
}
