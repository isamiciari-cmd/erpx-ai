import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

let entry;
try { entry = import.meta.resolve('@electric-sql/pglite'); }
catch { entry = new URL('../../.tmp/db-validation/node_modules/@electric-sql/pglite/dist/index.js', import.meta.url).href; }
const { PGlite } = await import(entry);
const { uuid_ossp } = await import(new URL('./contrib/uuid_ossp.js', entry));
const { pgcrypto } = await import(new URL('./contrib/pgcrypto.js', entry));
const db = new PGlite({ extensions: { 'uuid-ossp': uuid_ossp, pgcrypto } });
const ids = Object.fromEntries(['company', 'otherCompany', 'admin', 'viewer', 'role', 'viewerRole', 'newUser'].map((name, index) => [name, '80000000-0000-4000-8000-' + String(index + 1).padStart(12, '0')]));
let count = 0;
async function one(sql, params = []) { return (await db.query(sql, params)).rows[0]; }
async function test(name, action) { await action(); count++; console.log('PASS ' + name); }
async function asRole(role, uid, action) {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid ?? '']);
  await db.exec('SET ROLE ' + role);
  try { return await action(); }
  finally { await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)"); }
}
const asUser = action => asRole('authenticated', ids.admin, action);

try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon,service_role;`);
  const migrations = new URL('../../supabase/migrations/', import.meta.url);
  const hardening = '20261026000100_role_write_hardening.sql';
  const files = (await readdir(migrations)).filter(file => file.endsWith('.sql')).sort();
  for (const file of files.filter(file => file < hardening))
    await db.exec(await readFile(new URL(file, migrations), 'utf8'));
  await db.exec(`
    INSERT INTO public.companies(id,name) VALUES('${ids.company}','Company A'),('${ids.otherCompany}','Company B');
    INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
      ('${ids.admin}','admin@example.test',now()),('${ids.viewer}','viewer@example.test',now()),
      ('${ids.newUser}','new@example.test',now());
    INSERT INTO public.roles(id,company_id,name,permissions) VALUES
      ('${ids.role}','${ids.company}','admin','{"all":true}'),
      ('${ids.viewerRole}','${ids.company}','employee','{"read":true}');
    INSERT INTO public.users(id,company_id,role_id,email) VALUES
      ('${ids.admin}','${ids.company}','${ids.role}','admin@example.test'),
      ('${ids.viewer}','${ids.company}','${ids.viewerRole}','viewer@example.test');
    GRANT USAGE ON SCHEMA public TO authenticated,anon,service_role;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated,anon,service_role;
    GRANT INSERT,UPDATE,DELETE ON public.roles TO PUBLIC,authenticated,anon;
    GRANT INSERT(name,permissions),UPDATE(name,permissions) ON public.roles TO PUBLIC,authenticated,anon;
  `);
  await test('fixture reproduces company-admin reserved-role rename before the upgrade', async () => {
    const changed = await asUser(() => one("UPDATE public.roles SET name='owner' WHERE id=$1 RETURNING name", [ids.role]));
    assert.equal(changed.name, 'owner');
    await db.query("UPDATE public.roles SET name='admin' WHERE id=$1", [ids.role]);
  });
  const beforeHelpers = (await db.query("SELECT proname,pg_get_functiondef(oid) AS definition,proacl::text FROM pg_proc WHERE oid IN ('public.get_user_company_id()'::regprocedure,'public.user_has_permission(text)'::regprocedure) ORDER BY proname")).rows;
  const sql = await readFile(new URL(hardening, migrations), 'utf8');
  await db.exec(sql);
  await test('upgrade preserves role SELECT while removing table and column client writes', async () => {
    for (const role of ['anon', 'authenticated']) {
      assert.equal((await one("SELECT has_table_privilege($1,'public.roles','SELECT') AS allowed", [role])).allowed, true);
      for (const action of ['INSERT', 'UPDATE', 'DELETE'])
        assert.equal((await one("SELECT has_table_privilege($1,'public.roles',$2) AS allowed", [role, action])).allowed, false);
      for (const action of ['INSERT', 'UPDATE'])
        assert.equal((await one("SELECT has_any_column_privilege($1,'public.roles',$2) AS allowed", [role, action])).allowed, false);
    }
    assert.equal((await asUser(() => one('SELECT name FROM public.roles WHERE id=$1', [ids.role]))).name, 'admin');
  });
  await test('company administrator cannot rename a role to owner or developer', async () => asUser(async () => {
    for (const name of ['owner', 'developer'])
      await assert.rejects(db.query('UPDATE public.roles SET name=$1 WHERE id=$2', [name, ids.role]), /permission denied for table roles/);
  }));
  await test('company administrator cannot rewrite own or other role permissions', async () => asUser(async () => {
    for (const role of [ids.role, ids.viewerRole])
      await assert.rejects(db.query('UPDATE public.roles SET permissions=$1::jsonb WHERE id=$2', ['{"all":true,"owner.override":true}', role]), /permission denied for table roles/);
  }));
  await test('clients cannot create or delete roles, even with old permissive RLS policies', async () => asUser(async () => {
    await assert.rejects(db.query("INSERT INTO public.roles(company_id,name,permissions) VALUES($1,'owner','{\"all\":true}')", [ids.company]), /permission denied for table roles/);
    await assert.rejects(db.query('DELETE FROM public.roles WHERE id=$1', [ids.viewerRole]), /permission denied for table roles/);
  }));
  await test('anonymous and regular user sessions cannot mutate roles', async () => {
    await asRole('anon', null, () => assert.rejects(db.query("UPDATE public.roles SET name='owner' WHERE id=$1", [ids.role]), /permission denied/));
    await asRole('authenticated', ids.viewer, () => assert.rejects(db.query("UPDATE public.roles SET permissions='{\"all\":true}' WHERE id=$1", [ids.viewerRole]), /permission denied for table roles/));
  });
  await test('trusted service-role and database-owner role maintenance still work', async () => {
    const updated = await asRole('service_role', null, () => one("UPDATE public.roles SET display_name='Server managed' WHERE id=$1 RETURNING display_name", [ids.role]));
    assert.equal(updated.display_name, 'Server managed');
    await db.query("UPDATE public.roles SET display_name='DB owner managed' WHERE id=$1", [ids.role]);
  });
  await test('verified company onboarding creates its role through SECURITY DEFINER without client INSERT', async () => {
    const register = () => one("SELECT public.register_company_account('New Company','New Company',NULL,NULL,'retail','small','SA','Riyadh','Office',NULL,'Main','MAIN','enterprise','annual',1,5,ARRAY['sales'],'New Administrator','Manager','0550000000') AS result");
    const result = (await asRole('authenticated', ids.newUser, register)).result;
    assert.equal(result.success, true);
    assert.equal((await one('SELECT name FROM public.roles WHERE id=$1', [result.role_id])).name, 'admin');
    assert.equal((await one('SELECT company_id FROM public.users WHERE id=$1', [ids.newUser])).company_id, result.company_id);
    const replay = (await asRole('authenticated', ids.newUser, register)).result;
    assert.equal(replay.company_id, result.company_id);
  });
  await test('known business workflows reject suspended companies and inactive optional role status', async () => {
    await db.query("UPDATE public.companies SET status='suspended' WHERE id=$1", [ids.company]);
    assert.equal((await asUser(() => one("SELECT public.business_can_access($1,'finance_journal',true) AS allowed", [ids.company]))).allowed, false);
    await db.query("UPDATE public.companies SET status='active' WHERE id=$1", [ids.company]);
    // Some existing deployments have roles.status; canonical base does not.
    await db.exec("ALTER TABLE public.roles ADD COLUMN status text DEFAULT 'active'");
    await db.query("UPDATE public.roles SET status='inactive' WHERE id=$1", [ids.role]);
    assert.equal((await asUser(() => one("SELECT public.business_can_access($1,'finance_journal',true) AS allowed", [ids.company]))).allowed, false);
    await db.query("UPDATE public.roles SET status='active' WHERE id=$1", [ids.role]);
  });
  await test('upgrade is repeatable and leaves existing permission helpers unchanged', async () => {
    await db.exec(sql);
    const afterHelpers = (await db.query("SELECT proname,pg_get_functiondef(oid) AS definition,proacl::text FROM pg_proc WHERE oid IN ('public.get_user_company_id()'::regprocedure,'public.user_has_permission(text)'::regprocedure) ORDER BY proname")).rows;
    assert.deepEqual(afterHelpers, beforeHelpers);
  });
  console.log('\n' + count + ' role security PostgreSQL checks passed.');
} catch (error) {
  console.error('FAIL ' + error.message + (error.where ? '\n' + error.where : ''));
  process.exitCode = 1;
} finally { await db.close(); }
