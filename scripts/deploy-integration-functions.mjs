// Offline by default. Only an explicit, reviewed per-function hash permits POST.
// https://supabase.com/docs/reference/api/v1-deploy-a-function
// https://supabase.com/docs/reference/api/v1-get-a-function-body
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PROJECT_REF, parsePrivateEnvironment } from './deploy-manage-users.mjs';

export { PROJECT_REF };
export const FUNCTIONS = Object.freeze(['ai', 'zatca']);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PINNED_NPM = 'npm:@supabase/supabase-js@2.106.1';
const sha256 = value => createHash('sha256').update(value).digest('hex');

function requireFunction(slug) {
  if (!FUNCTIONS.includes(slug)) throw new Error('Only the reviewed ai or zatca function can be selected.');
  return slug;
}

function sourceNames(slug) {
  requireFunction(slug);
  return slug === 'ai'
    ? ['ai/index.ts', 'ai/config.ts', 'ai/handler.ts', 'ai/provider.ts', 'ai/snapshot.ts', '_shared/auth.ts']
    : ['zatca/index.ts', '_shared/auth.ts', '_shared/zatcaPayload.ts'];
}

function metadata(slug) {
  return { name: requireFunction(slug), entrypoint_path: `${slug}/index.ts`, verify_jwt: true };
}

function endpoint(slug) {
  return `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${requireFunction(slug)}`;
}

export function parseArguments(args) {
  if (!args.length || (args.length === 1 && args[0] === '--plan')) return { deploy: false, functions: [...FUNCTIONS] };
  if (args.length === 3 && args[0] === '--plan' && args[1] === '--function') {
    return { deploy: false, functions: [requireFunction(args[2])] };
  }
  if (args.length === 5 && args[0] === '--deploy' && args[1] === '--function' && args[3] === '--expected-sha256' && /^[a-f0-9]{64}$/.test(args[4])) {
    return { deploy: true, functions: [requireFunction(args[2])], expectedHash: args[4] };
  }
  throw new Error('Usage: node scripts/deploy-integration-functions.mjs [--plan [--function ai|zatca] | --deploy --function ai|zatca --expected-sha256 <reviewed-bundle-hash>]. Project, token and provider settings cannot be supplied as arguments.');
}

export function validateBundleImports(slug, files) {
  const expected = sourceNames(slug);
  if (files.length !== expected.length || files.some((file, index) => file.name !== expected[index] || typeof file.content !== 'string')) {
    throw new Error('Function bundle differs from the fixed reviewed source inventory.');
  }
  const names = new Set(expected);
  for (const file of files) {
    if (/\b(?:import|require)\s*\(/.test(file.content)) throw new Error('Dynamic imports and require calls need a separate deployment review.');
    const specifiers = [
      ...file.content.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
      ...file.content.matchAll(/\bimport\s*['"]([^'"]+)['"]/g),
    ].map(match => match[1]);
    for (const specifier of specifiers) {
      if (specifier.startsWith('.')) {
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file.name), specifier));
        if (!names.has(resolved)) throw new Error('A relative import is outside the reviewed function source inventory.');
      } else if (specifier !== PINNED_NPM) {
        throw new Error('An import differs from the existing reviewed pinned npm package.');
      }
    }
    if (/\b(?:reference\s+(?:path|types)|importScripts\s*\(|new\s+Worker\s*\()/.test(file.content)) {
      throw new Error('Additional source-loading mechanisms need a separate deployment review.');
    }
  }
}

function manifestAndHash(slug, files) {
  validateBundleImports(slug, files);
  if (files.reduce((sum, file) => sum + Buffer.byteLength(file.content, 'utf8'), 0) > 256 * 1024) throw new Error('Deployment source exceeds the reviewed size limit.');
  const manifest = files.map(file => ({ local: `supabase/functions/${file.name}`, name: file.name, bytes: Buffer.byteLength(file.content, 'utf8'), sha256: sha256(file.content) }));
  return { manifest, bundleHash: sha256(JSON.stringify({ project_ref: PROJECT_REF, slug, metadata: metadata(slug), files: manifest })) };
}

export async function prepareDeployment(slug, root = ROOT) {
  requireFunction(slug);
  if ((await readFile(path.join(root, 'supabase/.temp/project-ref'), 'utf8')).trim() !== PROJECT_REF) throw new Error('Linked project changed; deployment is blocked.');
  const files = await Promise.all(sourceNames(slug).map(async name => ({ name, content: await readFile(path.join(root, 'supabase/functions', name), 'utf8') })));
  const { manifest, bundleHash } = manifestAndHash(slug, files);
  return {
    files,
    plan: {
      mode: 'offline_plan', project_ref: PROJECT_REF, function: slug, endpoint: endpoint(slug), method: 'POST', metadata: metadata(slug),
      multipart_files: manifest, bundle_sha256: bundleHash,
      snapshot_before_overwrite: { method: 'GET', metadata_endpoint: `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${slug}`, body_endpoint: `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${slug}/body`, performed: false },
      required_provider_secret_names: slug === 'ai' ? ['AI_PROVIDER', 'OLLAMA_BASE_URL', 'OLLAMA_API_KEY', 'OLLAMA_MODEL'] : ['ZATCA_COMPANY_CREDENTIALS'],
      optional_paid_provider_secret_names: slug === 'ai' ? ['AI_ALLOW_PAID_PROVIDER', 'OPENAI_API_KEY', 'OPENAI_MODEL'] : [],
      changes: [`Create or replace only the ${slug} Edge Function from the listed local source files`],
      provider_called: false, settings_or_secrets_modified: false, other_functions_modified: false, database_modified: false,
      activation_note: 'Publishing source does not configure or activate provider accounts, models, certificates or company credentials.',
    },
  };
}

export function createMultipart(slug, files) {
  validateBundleImports(slug, files);
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata(slug))], { type: 'application/json' }));
  for (const file of files) form.append('file', new Blob([file.content], { type: 'application/typescript' }), file.name);
  return form;
}

export async function executeDeployment(prepared, expectedHash, privateEnvironment, fetchImpl = fetch) {
  const slug = requireFunction(prepared?.plan?.function);
  const { bundleHash } = manifestAndHash(slug, prepared.files);
  if (expectedHash !== bundleHash || prepared.plan.bundle_sha256 !== bundleHash || prepared.plan.project_ref !== PROJECT_REF) throw new Error('Source bundle changed after review. Generate and review a fresh offline plan before deploying.');
  const { token } = parsePrivateEnvironment(privateEnvironment);
  let response;
  try {
    response = await fetchImpl(endpoint(slug), {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body: createMultipart(slug, prepared.files), redirect: 'error', signal: AbortSignal.timeout(120000),
    });
  } catch {
    throw new Error(`Deployment outcome is unknown after a transport failure. Inspect ${slug} status before deciding whether to retry.`);
  }
  if (response.status !== 201) {
    await response.body?.cancel();
    throw new Error(`Management API deployment returned HTTP ${Number(response.status)}. Upstream body was withheld; inspect ${slug} status before retrying.`);
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error('The API accepted deployment but its response could not be verified. Inspect function status; do not retry automatically.'); }
  if (result?.slug !== slug || !Number.isInteger(result.version) || result.version < 1 || result.verify_jwt !== true) throw new Error('The API accepted deployment but returned unexpected function metadata. Inspect function status before any further action.');
  return { project_ref: PROJECT_REF, slug, version: result.version, status: result.status === 'ACTIVE' ? 'ACTIVE' : 'REQUIRES_REVIEW', verify_jwt: true, bundle_sha256: bundleHash,
    provider_called: false, settings_or_secrets_modified: false, other_functions_modified: false, database_modified: false };
}

export async function main(args) {
  const options = parseArguments(args);
  const prepared = await Promise.all(options.functions.map(slug => prepareDeployment(slug)));
  if (!options.deploy) return prepared.length === 1 ? prepared[0].plan : { mode: 'offline_plan', project_ref: PROJECT_REF, functions: prepared.map(item => item.plan) };
  if (options.expectedHash !== prepared[0].plan.bundle_sha256) throw new Error('Source bundle changed after review. Generate and review a fresh offline plan before deploying.');
  let privateEnvironment;
  try { privateEnvironment = await readFile(path.join(ROOT, '.env.server.local'), 'utf8'); }
  catch { throw new Error('Private .env.server.local deployment configuration is unavailable.'); }
  return executeDeployment(prepared[0], options.expectedHash, privateEnvironment);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try { console.log(JSON.stringify(await main(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Deployment preparation failed.'); process.exitCode = 1; }
}
