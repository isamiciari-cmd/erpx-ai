// Fetch public static assets only. No Auth/environment files, API writes or body logs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

assert.equal(process.argv.length, 2, 'This check accepts no origin or credential overrides');
const root = new URL('../', import.meta.url);
const origin = 'https://code-isamiciari-5169s-projects.vercel.app';
const manifest = JSON.parse(await readFile(new URL('.tmp/release-acceptance/release-manifest.json', root), 'utf8'));
const markerBytes = await readFile(new URL('.vercel/output/static/release.json', root));
const marker = JSON.parse(markerBytes);
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(manifest.project_id, 'prj_Xca6Agc2dDe9aRbA8CQ6EN913eG4');
assert.deepEqual(marker, manifest.release, 'Local marker and reviewed manifest differ');
assert.equal(sha(JSON.stringify(manifest.files)), marker.artifact_sha256, 'The manifest hash differs from the release');
assert.equal(manifest.files.length, manifest.file_count);
const concurrency = 4;
const started = new Date().toISOString();

async function verify(item) {
  assert(/^(?:index\.html|release\.json|assets\/[A-Za-z0-9_.-]+)$/.test(item.path), 'Unexpected static asset path');
  try {
    const response = await fetch(`${origin}/${item.path}`, {
      headers: { 'Cache-Control': 'no-cache' }, redirect: 'error', signal: AbortSignal.timeout(25000),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    const type = (response.headers.get('content-type') || '').split(';')[0].trim();
    const expectedTypes = item.path.endsWith('.js') ? ['application/javascript', 'text/javascript'] :
      item.path.endsWith('.css') ? ['text/css'] : item.path.endsWith('.html') ? ['text/html'] : ['application/json'];
    const result = { path: item.path, status: response.status, bytes: bytes.length,
      sha256_matches: sha(bytes) === item.sha256, bytes_match: bytes.length === item.bytes,
      content_type: type, content_type_matches: expectedTypes.includes(type) };
    return { ...result, passed: result.status === 200 && result.sha256_matches && result.bytes_match && result.content_type_matches };
  } catch (error) {
    return { path: item.path, passed: false, error: ['TimeoutError', 'AbortError', 'TypeError'].includes(error.name) ? error.name : 'RequestError' };
  }
}

const markerItem = { path: 'release.json', bytes: markerBytes.length, sha256: sha(markerBytes) };
const markerBefore = await verify(markerItem);
let next = 0;
const results = new Array(manifest.files.length);
await Promise.all(Array.from({ length: concurrency }, async () => {
  for (;;) {
    const index = next++;
    if (index >= manifest.files.length) return;
    results[index] = await verify(manifest.files[index]);
  }
}));
const markerAfter = await verify(markerItem);
const report = {
  passed: markerBefore.passed && markerAfter.passed && results.every(result => result.passed),
  origin, project_id: manifest.project_id, release_id: marker.id, artifact_sha256: marker.artifact_sha256,
  started_at: started, checked_at: new Date().toISOString(), concurrency,
  payload_files_expected: manifest.files.length, payload_files_verified: results.filter(result => result.passed).length,
  payload_bytes_expected: manifest.bytes,
  marker_verified_before_and_after: markerBefore.passed && markerAfter.passed,
  marker: { before: markerBefore, after: markerAfter },
  failures: results.filter(result => !result.passed), files: results,
  network_writes_performed: false, authenticated_requests: false, response_bodies_stored: false,
};
await writeFile(new URL('.tmp/release-acceptance/production-all-assets.json', root), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, origin, release_id: marker.id, concurrency,
  payload_files_expected: report.payload_files_expected, payload_files_verified: report.payload_files_verified,
  payload_bytes_expected: report.payload_bytes_expected,
  marker_verified_before_and_after: report.marker_verified_before_and_after, failures: report.failures,
  evidence: '.tmp/release-acceptance/production-all-assets.json', network_writes_performed: false }, null, 2));
if (!report.passed) process.exitCode = 1;
