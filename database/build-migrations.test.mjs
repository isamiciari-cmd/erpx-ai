import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const testRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../.tmp/migration-generator-tests');
const migrationName = '20261022000100_synthetic.sql';
const first = '-- First source\n\nBEGIN;\n\nSELECT 1;\n\nCOMMIT;\n\n-- Post-transaction comment\n';
const second = '-- Second source\n\nBEGIN;\nSELECT 2;\nCOMMIT;\n';
const crlf = value => value.replace(/\n/g, '\r\n');
async function fixture(work) {
  await mkdir(testRoot, { recursive: true });
  const root = await mkdtemp(join(testRoot, 'case-'));
  await mkdir(join(root, 'database'));
  await mkdir(join(root, 'supabase', 'migrations'), { recursive: true });
  await writeFile(join(root, 'database', 'build-migrations.mjs'), await readFile(new URL('./build-migrations.mjs', import.meta.url)));
  await writeFile(join(root, 'database', 'migration-plan.mjs'), `export const migrationGroups = [{ name: '${migrationName}', files: ['first.sql', 'second.sql'] }];\n`);
  const sources = async (a, b) => { await writeFile(join(root, 'database', 'first.sql'), a); await writeFile(join(root, 'database', 'second.sql'), b); };
  const run = (...args) => execFileSync(process.execPath, [join(root, 'database', 'build-migrations.mjs'), ...args], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  const output = join(root, 'supabase', 'migrations', migrationName);
  try { await sources(first, second); await work({ sources, run, output }); }
  finally {
    // Delete only this exact mkdtemp child of the explicitly named test root.
    assert.equal(dirname(root), testRoot);
    await rm(root, { recursive: true, force: true });
  }
}

test('LF, CRLF and mixed source checkouts generate byte-identical LF migrations', async () => {
  await fixture(async ({ sources, run, output }) => {
    run();
    const canonical = await readFile(output, 'utf8');
    assert.ok(canonical.includes('-- Post-transaction comment\n'));
    assert.ok(canonical.indexOf('-- SOURCE: database/first.sql') < canonical.indexOf('-- SOURCE: database/second.sql'));
    assert.equal(canonical.match(/^BEGIN;$/gm)?.length, 1);
    assert.equal(canonical.match(/^COMMIT;$/gm)?.length, 1);
    for (const [a, b] of [[crlf(first), crlf(second)], [crlf(first), second], [first, crlf(second)]]) {
      await sources(a, b);
      run();
      assert.equal(await readFile(output, 'utf8'), canonical);
    }
    assert.equal(canonical.includes('\r'), false);
  });
});

test('--check accepts Git CRLF output checkouts and remains read-only', async () => {
  await fixture(async ({ sources, run, output }) => {
    run();
    const windowsOutput = crlf(await readFile(output, 'utf8'));
    await writeFile(output, windowsOutput);
    await sources(crlf(first), second);
    assert.match(run('--check'), /Verified 20261022000100_synthetic\.sql/);
    assert.equal(await readFile(output, 'utf8'), windowsOutput);
  });
});

test('--check still rejects a changed SQL statement and does not rewrite output', async () => {
  await fixture(async ({ sources, run, output }) => {
    run();
    const before = await readFile(output, 'utf8');
    await sources(crlf(first.replace('SELECT 1;', 'SELECT 9;')), second);
    assert.throws(() => run('--check'), error => error.status === 1 && /Stale migration:/.test(String(error.stderr)));
    assert.equal(await readFile(output, 'utf8'), before);
  });
});
