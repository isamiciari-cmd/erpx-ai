import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROJECT_REF, parseArguments, parsePrivateEnvironment, prepareDeployment, createMultipart, executeDeployment, validateBundleImports } from './deploy-manage-users.mjs';

const fixtureToken = 'sbp_FAKE_TEST_VALUE_NEVER_A_REAL_CREDENTIAL_1234';
const privateFixture = `SUPABASE_PROJECT_REF=${PROJECT_REF}\nSUPABASE_ACCESS_TOKEN=${fixtureToken}\n`;
test('only plan or an explicit hash-pinned deployment is accepted; token arguments are rejected', () => {
  assert.equal(parseArguments([]).deploy, false);
  assert.equal(parseArguments(['--plan']).deploy, false);
  assert.equal(parseArguments(['--deploy','--expected-sha256','a'.repeat(64)]).deploy, true);
  assert.throws(() => parseArguments(['--deploy']), /Usage:/);
  assert.throws(() => parseArguments(['--token',fixtureToken]), /Usage:/);
});
test('private PAT parser requires the pinned project and rejects duplicate configuration without reflecting values', () => {
  assert.equal(parsePrivateEnvironment(privateFixture).token, fixtureToken);
  assert.throws(() => parsePrivateEnvironment(privateFixture.replace(PROJECT_REF,'different-project')), /does not match/);
  assert.throws(() => parsePrivateEnvironment(privateFixture+'SUPABASE_ACCESS_TOKEN=duplicate'), /Duplicate/);
});
test('offline plan and multipart contain exactly the entrypoint, rules, shared auth, and pinned JWT metadata', async () => {
  const prepared = await prepareDeployment();
  assert.equal(prepared.plan.project_ref, PROJECT_REF);
  assert.deepEqual(prepared.files.map(file => file.name), ['manage-users/index.ts','manage-users/rules.ts','_shared/auth.ts']);
  assert.equal(prepared.plan.metadata.entrypoint_path,'manage-users/index.ts'); assert.equal(prepared.plan.metadata.verify_jwt,true);
  assert.match(prepared.plan.bundle_sha256,/^[a-f0-9]{64}$/);
  const form = createMultipart(prepared.files);
  assert.deepEqual(form.getAll('file').map(file => file.name),prepared.files.map(file => file.name));
  assert.deepEqual(JSON.parse(await form.get('metadata').text()),prepared.plan.metadata);
  assert.equal(prepared.plan.settings_or_secrets_modified,false); assert.equal(prepared.plan.invitation_sent,false);
});
test('an import outside the fixed bundle or pinned npm dependency is rejected', async () => {
  const prepared = await prepareDeployment();
  const files = structuredClone(prepared.files); files[0].content += "\nimport { value } from '../../.env.server.local';";
  assert.throws(() => validateBundleImports(files), /outside the approved/);
});
test('mock deployment uses the single pinned endpoint and never returns or logs private credentials', async () => {
  const prepared = await prepareDeployment(); let calls=0;
  const result = await executeDeployment(prepared,privateFixture,async (url,init) => {
    calls++; assert.equal(url,prepared.plan.endpoint); assert.equal(init.method,'POST'); assert.equal(init.redirect,'error');
    assert.equal(init.headers.Authorization,`Bearer ${fixtureToken}`); assert.ok(!('Content-Type' in init.headers));
    return new Response(JSON.stringify({ slug:'manage-users',version:1,status:'ACTIVE',verify_jwt:true,private_echo:fixtureToken }),{ status:201 });
  });
  assert.equal(calls,1); assert.ok(!JSON.stringify(result).includes(fixtureToken)); assert.equal(result.slug,'manage-users');
});
test('upstream errors and transport failures are sanitized and never automatically retried', async () => {
  const prepared = await prepareDeployment(); let calls=0;
  await assert.rejects(executeDeployment(prepared,privateFixture,async () => { calls++; return new Response(fixtureToken,{ status:500 }); }),error => /HTTP 500/.test(error.message) && !error.message.includes(fixtureToken));
  assert.equal(calls,1);
  await assert.rejects(executeDeployment(prepared,privateFixture,async () => { calls++; throw new Error(fixtureToken); }),error => /outcome is unknown/.test(error.message) && !error.message.includes(fixtureToken));
  assert.equal(calls,2);
});
