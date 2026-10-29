import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROJECT_REF, parseArguments, prepareDeployment, createMultipart, executeDeployment, validateBundleImports, main } from './deploy-integration-functions.mjs';

const token = 'sbp_FAKE_OFFLINE_TEST_VALUE_NOT_AN_ACTUAL_SECRET_12345';
const environment = `SUPABASE_PROJECT_REF=${PROJECT_REF}\nSUPABASE_ACCESS_TOKEN=${token}\n`;

test('default plan selects both slugs; deploy requires one allowed function and a reviewed hash', () => {
  assert.deepEqual(parseArguments([]), { deploy:false, functions:['ai','zatca'] });
  assert.deepEqual(parseArguments(['--plan','--function','ai']), { deploy:false, functions:['ai'] });
  assert.equal(parseArguments(['--deploy','--function','zatca','--expected-sha256','a'.repeat(64)]).deploy,true);
  for (const args of [['--deploy'], ['--deploy','--function','manage-users','--expected-sha256','a'.repeat(64)], ['--token',token], ['--plan','--function','ai','extra']]) assert.throws(() => parseArguments(args));
});

test('plans and multipart use exact slug-specific source inventories and JWT metadata', async () => {
  for (const slug of ['ai','zatca']) {
    const prepared = await prepareDeployment(slug);
    const names = slug === 'ai'
      ? ['ai/index.ts','ai/config.ts','ai/handler.ts','ai/provider.ts','ai/snapshot.ts','_shared/auth.ts']
      : ['zatca/index.ts','_shared/auth.ts','_shared/zatcaPayload.ts'];
    assert.deepEqual(prepared.files.map(file=>file.name),names);
    assert.equal(prepared.plan.metadata.verify_jwt,true);
    assert.equal(prepared.plan.metadata.entrypoint_path,`${slug}/index.ts`);
    const form = createMultipart(slug,prepared.files);
    assert.deepEqual(form.getAll('file').map(file=>file.name),names);
    assert.deepEqual(JSON.parse(await form.get('metadata').text()),prepared.plan.metadata);
    assert.equal(prepared.plan.provider_called,false);
    assert.equal(prepared.plan.settings_or_secrets_modified,false);
    assert.match(prepared.plan.bundle_sha256,/^[a-f0-9]{64}$/);
    assert.ok(prepared.plan.snapshot_before_overwrite.body_endpoint.endsWith(`/${slug}/body`));
  }
});

test('the two real offline plans differ and do not read private deployment configuration', async () => {
  const plan = await main([]);
  assert.equal(plan.mode,'offline_plan');
  assert.equal(plan.functions.length,2);
  assert.notEqual(plan.functions[0].bundle_sha256,plan.functions[1].bundle_sha256);
  assert.ok(!JSON.stringify(plan).includes(token));
});

test('dynamic, side-effect, export, unpinned npm and cross-bundle imports fail closed', async () => {
  const prepared = await prepareDeployment('ai');
  for (const statement of ["import '../../.env.server.local';", "export { value } from '../_shared/zatcaPayload.ts';", "import { value } from 'npm:unapproved@1';", "import('https://unapproved.invalid/x.ts');", "require('./hidden.ts')"]) {
    const files = structuredClone(prepared.files); files[0].content += `\n${statement}`;
    assert.throws(() => validateBundleImports('ai',files));
  }
  assert.throws(() => validateBundleImports('ai',[...prepared.files,prepared.files[0]]),/inventory/);
});

test('mock deployment posts only the selected pinned endpoint and sanitizes returned metadata', async () => {
  for (const slug of ['ai','zatca']) {
    const prepared = await prepareDeployment(slug); let calls=0;
    const result = await executeDeployment(prepared,prepared.plan.bundle_sha256,environment,async(url,init)=>{
      calls++; assert.equal(url,`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${slug}`);
      assert.equal(init.method,'POST'); assert.equal(init.redirect,'error');
      assert.equal(init.headers.Authorization,`Bearer ${token}`); assert.ok(!Object.hasOwn(init.headers,'Content-Type'));
      return new Response(JSON.stringify({slug,version:2,status:'ACTIVE',verify_jwt:true,private_echo:token}),{status:201});
    });
    assert.equal(calls,1); assert.equal(result.slug,slug); assert.ok(!JSON.stringify(result).includes(token));
  }
});

test('wrong hash, modified source or wrong private project cause zero network calls', async () => {
  const prepared = await prepareDeployment('ai'); let calls=0;
  const network=async()=>{calls++; throw new Error('must never run');};
  await assert.rejects(executeDeployment(prepared,'0'.repeat(64),environment,network),/changed after review/);
  const altered=structuredClone(prepared); altered.files[0].content+='\n// changed source';
  await assert.rejects(executeDeployment(altered,prepared.plan.bundle_sha256,environment,network),/changed after review/);
  await assert.rejects(executeDeployment(prepared,prepared.plan.bundle_sha256,environment.replace(PROJECT_REF,'other-project'),network),/does not match/);
  assert.equal(calls,0);
});

test('upstream errors and unknown transport outcomes are sanitized without retries', async () => {
  const prepared = await prepareDeployment('ai'); let calls=0;
  await assert.rejects(executeDeployment(prepared,prepared.plan.bundle_sha256,environment,async()=>{calls++; return new Response(token,{status:500});}),error=>/HTTP 500/.test(error.message)&&!error.message.includes(token));
  assert.equal(calls,1);
  await assert.rejects(executeDeployment(prepared,prepared.plan.bundle_sha256,environment,async()=>{calls++; throw new Error(token);}),error=>/outcome is unknown/.test(error.message)&&!error.message.includes(token));
  assert.equal(calls,2);
});

test('unexpected slug or disabled JWT in accepted response is never reported as verified', async () => {
  const prepared = await prepareDeployment('zatca');
  for (const result of [{slug:'ai',version:2,verify_jwt:true},{slug:'zatca',version:2,verify_jwt:false}]) {
    await assert.rejects(executeDeployment(prepared,prepared.plan.bundle_sha256,environment,async()=>new Response(JSON.stringify(result),{status:201})),/unexpected function metadata/);
  }
});
