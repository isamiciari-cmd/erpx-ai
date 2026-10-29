import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Read only web configuration and the selected static artifact. Never load env
// files: the private release preparer separately checks exact credential values.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--artifact'),
  'Usage: node scripts/check-deployment-safety.mjs [--artifact <workspace path>]');
const artifact = path.resolve(root, args[1] || 'dist');
const within = (base, candidate) => {
  const relative = path.relative(base, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
assert(within(root, artifact), 'The static artifact must be inside this workspace');

const excluded = [
  '.env', '.env.local', '.env.server.local', '.env.server.example',
  '.tmp/supabase-review/live-catalog.json', '.tmp/supabase-review/public-backup.dpapi',
  'database/tests/transactions.mjs', 'supabase/functions/manage-users/index.ts',
  'reports/output.html', 'src/lib/authSession.test.ts', 'src/__fixtures__/user.json',
  'src/secrets.pem', 'src/view.tsx.backup',
];
const required = [
  'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.npmrc', '.pnpmrc',
  '.pnpmfile.cjs', 'index.html', 'vite.config.ts', 'postcss.config.mjs', 'tsconfig.json',
  'src/main.tsx', 'src/app/App.tsx', 'src/i18n/ar.json', 'src/styles/erpx-v2.css',
  'utils/supabase/info.tsx',
];

function git(cwd, command, input) {
  const result = spawnSync('git', ['-C', cwd, ...command], {
    input, encoding: 'utf8', windowsHide: true,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(cwd, 'no-global-config') },
  });
  assert(!result.error && result.status === 0, 'Local Git exclusion verification failed');
  return result.stdout;
}

// Use Git's real pattern matcher rather than duplicating .gitignore semantics.
// Its isolated worktree has no application files, user data or environment file.
fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
const tempRoot = fs.realpathSync(path.join(root, '.tmp'));
const temp = fs.mkdtempSync(path.join(tempRoot, 'deployment-safety-'));
let exclusionsChecked = false;
try {
  fs.writeFileSync(path.join(temp, '.gitignore'), fs.readFileSync(path.join(root, '.vercelignore')));
  git(temp, ['init', '--quiet']);
  const matches = new Set(git(temp, ['check-ignore', '--no-index', '--stdin'],
    [...excluded, ...required].join('\n') + '\n').trim().split(/\r?\n/));
  for (const name of excluded) assert(matches.has(name), `Sensitive path is not excluded: ${name}`);
  for (const name of required) {
    assert(!matches.has(name), `Required build input is excluded: ${name}`);
    assert(fs.existsSync(path.join(root, name)), `Required build input is absent: ${name}`);
  }
  exclusionsChecked = true;
} finally {
  // Resolve and verify the deletion target, even though mkdtemp created it.
  assert(within(tempRoot, fs.realpathSync(temp)), 'Unsafe temporary cleanup path');
  fs.rmSync(temp, { recursive: true, force: false });
}

const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
assert.equal(config.framework, 'vite');
assert.equal(config.buildCommand, 'pnpm run build');
assert.equal(config.installCommand, 'pnpm install --frozen-lockfile');
assert.equal(config.outputDirectory, 'dist');
assert(!Object.hasOwn(config, 'public'), 'Do not use the unsupported public configuration property');
assert(!config.env && !config.build?.env, 'Do not embed environment overrides in Vercel configuration');
assert(!config.cleanUrls, 'The /index.html fallback must not use cleanUrls');
assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
assert(config.headers?.some(rule => rule.source === '/(.*)' && rule.headers.some(header =>
  header.key.toLowerCase() === 'cache-control' && /(?:^|,)\s*max-age=0(?:,|$)/.test(header.value)
  && /must-revalidate/.test(header.value))), 'HTML must revalidate across deployments');

const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), 'The static artifact must not contain symlinks');
    if (entry.isDirectory()) walk(filename);
    else if (entry.isFile()) files.push(filename);
  }
}
assert(fs.statSync(artifact).isDirectory(), 'The static artifact directory is absent');
assert(within(root, fs.realpathSync(artifact)), 'The static artifact resolves outside this workspace');
walk(artifact);
assert(files.some(file => path.relative(artifact, file) === 'index.html'), 'Static index.html is absent');
const findings = [];
const jwtRoles = { anon: 0, service_role: 0, authenticated: 0, other: 0 };
let bytes = 0;
for (const filename of files) {
  const relative = path.relative(artifact, filename).split(path.sep).join('/');
  if (/(?:^|\/)(?:\.env[^/]*|\.git|\.tmp|\.vercel|node_modules|__fixtures__|fixtures|database)(?:\/|$)|\.(?:dpapi|dump|backup|bak|map|pem|key|p12|pfx)$|\.(?:test|spec)\.[^/]+$/i.test(relative)) {
    findings.push({ file: relative, kind: 'private-or-test-artifact' });
  }
  const buffer = fs.readFileSync(filename);
  bytes += buffer.length;
  const source = buffer.toString('utf8');
  for (const [kind, pattern] of [
    ['management-token', /sbp_[A-Za-z0-9]{25,}/],
    ['secret-api-key', /sb_secret_[A-Za-z0-9_-]{15,}/],
    ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
    ['server-env-reference', /SUPABASE_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY|VERCEL_TOKEN/],
  ]) {
    if (pattern.test(source)) findings.push({ file: relative, kind });
  }
  for (const match of source.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString('utf8'));
      const role = ['anon', 'service_role', 'authenticated'].includes(payload.role) ? payload.role : 'other';
      jwtRoles[role] += 1;
      if (role !== 'anon') findings.push({ file: relative, kind: 'non-public-jwt' });
    } catch {
      // JWT-like documentation placeholders are not parsed credentials.
    }
  }
}

console.log(JSON.stringify({
  passed: findings.length === 0 && exclusionsChecked,
  uploadPathChecks: { excluded: excluded.length, required: required.length },
  configuration: 'Vite SPA, no environment overrides, upload exclusions, revalidating HTML',
  artifact: { path: path.relative(root, artifact).split(path.sep).join('/'), files: files.length, bytes, jwtRoles },
  findings,
  scope: 'Pattern and upload-policy checks only; release preparation separately compares actual private credential values.',
}, null, 2));
assert.equal(findings.length, 0, 'The static artifact failed deployment safety checks');
