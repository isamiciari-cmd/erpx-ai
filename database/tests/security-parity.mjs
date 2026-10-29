import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
let entry;
try { entry = import.meta.resolve('@electric-sql/pglite'); }
catch { entry = new URL('../../.tmp/db-validation/node_modules/@electric-sql/pglite/dist/index.js', import.meta.url).href; }
const { PGlite } = await import(entry);
const { uuid_ossp } = await import(new URL('./contrib/uuid_ossp.js', entry));
const { pgcrypto } = await import(new URL('./contrib/pgcrypto.js', entry));
const db = new PGlite({ extensions: { 'uuid-ossp': uuid_ossp, pgcrypto } });
let sequence = 0, count = 0;
const key = () => '90000000-0000-4000-8000-' + String(++sequence).padStart(12, '0');
const ids = Object.fromEntries(['company', 'otherCompany', 'admin', 'viewer', 'otherAdmin', 'role', 'viewerRole', 'otherRole', 'product', 'otherProduct', 'customer', 'supplier', 'invoice', 'corruptInvoice', 'manualInvoice', 'saleOrder', 'purchaseOrder', 'journal', 'account', 'otherAccount'].map(name => [name, key()]));
async function one(sql, args = []) { return (await db.query(sql, args)).rows[0]; }
async function test(name, action) { await action(); count++; console.log('PASS ' + name); }
async function user(uid, action, role = uid ? 'authenticated' : 'anon') {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid ?? '']);
  await db.exec('SET ROLE ' + role);
  try { return await action(); }
  finally { await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)"); }
}
const admin = action => user(ids.admin, action);

try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated,anon,service_role;`);
  const migrations = new URL('../../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort())
    await db.exec(await readFile(new URL(file, migrations), 'utf8'));
  await db.exec(`
    INSERT INTO public.companies(id,name) VALUES('${ids.company}','Company A'),('${ids.otherCompany}','Company B');
    INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${ids.admin}','admin@a.test',now()),('${ids.viewer}','viewer@a.test',now()),('${ids.otherAdmin}','admin@b.test',now());
    INSERT INTO public.roles(id,company_id,name,permissions) VALUES
      ('${ids.role}','${ids.company}','admin','{"all":true}'),
      ('${ids.viewerRole}','${ids.company}','viewer','{"read":true}'),
      ('${ids.otherRole}','${ids.otherCompany}','admin','{"all":true}');
    INSERT INTO public.users(id,company_id,role_id,email) VALUES
      ('${ids.admin}','${ids.company}','${ids.role}','admin@a.test'),
      ('${ids.viewer}','${ids.company}','${ids.viewerRole}','viewer@a.test'),
      ('${ids.otherAdmin}','${ids.otherCompany}','${ids.otherRole}','admin@b.test');
    INSERT INTO public.products(id,company_id,sku,product_name,unit_price,vat_rate) VALUES
      ('${ids.product}','${ids.company}','A','Product A',100,15),('${ids.otherProduct}','${ids.otherCompany}','B','Product B',100,15);
    INSERT INTO public.customers(id,company_id,customer_code,company_name) VALUES('${ids.customer}','${ids.company}','A','Customer');
    INSERT INTO public.suppliers(id,company_id,supplier_code,company_name) VALUES('${ids.supplier}','${ids.company}','A','Supplier');
    INSERT INTO public.invoices(id,company_id,customer_id,invoice_number,issue_date,due_date,total_amount,status,created_by,currency_code) VALUES
      ('${ids.invoice}','${ids.company}','${ids.customer}','DRAFT-A',current_date,current_date+7,115,'draft','${ids.admin}','SAR'),
      ('${ids.corruptInvoice}','${ids.company}','${ids.customer}','DRAFT-CORRUPT',current_date,current_date+7,115,'draft','${ids.admin}','SAR'),
      ('${ids.manualInvoice}','${ids.company}','${ids.customer}','DRAFT-MANUAL',current_date,current_date+7,20,'draft','${ids.admin}','SAR');
    INSERT INTO public.invoice_lines(invoice_id,product_id,description,quantity,unit_price,line_total,line_number,vat_rate,discount_amount) VALUES
      ('${ids.invoice}','${ids.product}','Own product',1,100,100,1,15,0),
      ('${ids.corruptInvoice}','${ids.otherProduct}','Legacy invalid reference',1,100,100,1,15,0);
    INSERT INTO public.sales_orders(id,company_id,customer_id,order_number,order_date,total_amount,created_by) VALUES('${ids.saleOrder}','${ids.company}','${ids.customer}','A',current_date,100,'${ids.admin}');
    INSERT INTO public.purchase_orders(id,company_id,supplier_id,po_number,po_date,total_amount,created_by) VALUES('${ids.purchaseOrder}','${ids.company}','${ids.supplier}','A',current_date,100,'${ids.admin}');
    INSERT INTO public.journal_entries(id,company_id,entry_number,entry_date,status,created_by) VALUES('${ids.journal}','${ids.company}','DRAFT-A',current_date,'draft','${ids.admin}');
    INSERT INTO public.chart_of_accounts(id,company_id,account_code,account_name,account_type) VALUES
      ('${ids.account}','${ids.company}','A','Own account','asset'),('${ids.otherAccount}','${ids.otherCompany}','B','Other account','asset');
    INSERT INTO public.audit_logs(company_id,user_id,action,entity_type) VALUES
      ('${ids.company}','${ids.admin}','original','users'),('${ids.otherCompany}','${ids.otherAdmin}','other','users'),(NULL,NULL,'global','system');
  `);
  await test('canonical install needs neither tenants nor roles.status for active helpers', async () => {
    assert.equal((await one("SELECT to_regclass('public.tenants') AS table_name")).table_name, null);
    assert.equal(Number((await one("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='roles' AND column_name='status'")).count), 0);
    await admin(async () => {
      assert.equal((await one('SELECT public.get_user_company_id() AS company')).company, ids.company);
      assert.equal((await one("SELECT public.user_has_permission('finance') AS allowed")).allowed, true);
    });
  });
  await test('suspended company revokes tenant visibility and both normal and POS permission gates', async () => {
    await db.query("UPDATE public.companies SET status='suspended' WHERE id=$1", [ids.company]);
    await admin(async () => {
      assert.equal((await one('SELECT public.get_user_company_id() AS company')).company, null);
      assert.equal((await one("SELECT public.user_has_permission('finance') AS allowed")).allowed, false);
      assert.equal(Number((await one('SELECT count(*) FROM public.invoices')).count), 0);
      await assert.rejects(one('SELECT public.save_invoice_draft($1,$2,$3::jsonb,current_date+7,NULL,$4)', [ids.company, ids.customer, JSON.stringify([{ product_id: ids.product, quantity: 1 }]), key()]), /Invoice access denied/);
      await assert.rejects(one("SELECT public.complete_pos_sale($1,NULL,$2,NULL,'cash',$3,$4::jsonb,0,NULL,$5,NULL)", [ids.company, ids.admin, ids.customer, JSON.stringify([{ product_id: ids.product, quantity: 1 }]), key()]), /POS access denied/);
    });
    await db.query("UPDATE public.companies SET status='active' WHERE id=$1", [ids.company]);
  });
  await test('inactive profiles and cross-company primary roles cannot retain grants', async () => {
    await db.query("UPDATE public.users SET status='inactive' WHERE id=$1", [ids.admin]);
    await admin(async () => assert.equal((await one("SELECT public.user_has_permission('finance') AS allowed")).allowed, false));
    await db.query("UPDATE public.users SET status='active',role_id=$1 WHERE id=$2", [ids.otherRole, ids.admin]);
    await admin(async () => assert.equal((await one('SELECT public.get_user_company_id() AS company')).company, null));
    await db.query('UPDATE public.users SET role_id=$1 WHERE id=$2', [ids.role, ids.admin]);
  });
  await test('an unspecified company status cannot bypass the business RPC gate', async () => {
    await db.query('UPDATE public.companies SET status=NULL WHERE id=$1', [ids.company]);
    await admin(async () => {
      assert.equal((await one('SELECT public.get_user_company_id() AS company')).company, null);
      assert.equal((await one("SELECT public.business_can_access($1,'finance_journal',true) AS allowed", [ids.company])).allowed, false);
    });
    await db.query("UPDATE public.companies SET status='active' WHERE id=$1", [ids.company]);
  });
  await test('an optional inactive role status revokes both helper and business access', async () => {
    await db.exec("ALTER TABLE public.roles ADD COLUMN status text DEFAULT 'active'");
    await db.query("UPDATE public.roles SET status='inactive' WHERE id=$1", [ids.role]);
    await admin(async () => {
      assert.equal((await one('SELECT public.get_user_company_id() AS company')).company, null);
      assert.equal((await one("SELECT public.user_has_permission('finance') AS allowed")).allowed, false);
      assert.equal((await one("SELECT public.business_can_access($1,'finance_journal',true) AS allowed", [ids.company])).allowed, false);
    });
    await db.query("UPDATE public.roles SET status='active' WHERE id=$1", [ids.role]);
  });
  await test('anonymous users cannot read audit events and clients cannot forge them', async () => {
    await user(null, () => assert.rejects(db.query('SELECT * FROM public.audit_logs'), /permission denied/));
    await admin(() => assert.rejects(db.query("INSERT INTO public.audit_logs(company_id,user_id,action,entity_type) VALUES($1,$2,'forged','users')", [ids.company, ids.admin]), /permission denied/));
    assert.equal((await one("SELECT has_table_privilege('authenticated','public.audit_logs','TRUNCATE') AS allowed")).allowed, false);
  });
  await test('audit reads require audit permission and stay inside the active company', async () => {
    const events = await admin(() => db.query('SELECT action FROM public.audit_logs'));
    assert.deepEqual(events.rows.map(row => row.action), ['original']);
    assert.equal(Number((await user(ids.viewer, () => one('SELECT count(*) FROM public.audit_logs'))).count), 0);
  });
  await test('trusted service role can append audit events without browser privileges', async () => {
    await user(null, () => db.query("INSERT INTO public.audit_logs(company_id,user_id,action,entity_type) VALUES($1,$2,'server','users')", [ids.company, ids.admin]), 'service_role');
    assert.equal(Number((await one("SELECT count(*) FROM public.audit_logs WHERE action='server'")).count), 1);
  });
  await test('audit RLS still rejects client mutations after an accidental broad table grant', async () => {
    await db.exec('GRANT INSERT,UPDATE,DELETE ON public.audit_logs TO authenticated');
    await admin(async () => {
      await assert.rejects(db.query("INSERT INTO public.audit_logs(company_id,user_id,action,entity_type) VALUES($1,$2,'forged','users')", [ids.company, ids.admin]), /row-level security/);
      assert.equal((await db.query("UPDATE public.audit_logs SET action='forged' RETURNING id")).rows.length, 0);
      assert.equal((await db.query('DELETE FROM public.audit_logs RETURNING id')).rows.length, 0);
    });
    await db.exec('REVOKE INSERT,UPDATE,DELETE ON public.audit_logs FROM authenticated');
  });
  await test('invoice draft lines cannot acquire a foreign company product', async () => admin(async () => {
    await assert.rejects(db.query('UPDATE public.invoice_lines SET product_id=$1 WHERE invoice_id=$2', [ids.otherProduct, ids.invoice]), /row-level security/);
    await assert.rejects(db.query("INSERT INTO public.invoice_lines(invoice_id,product_id,description,quantity,unit_price,line_total,line_number) VALUES($1,$2,'Foreign',1,100,100,2)", [ids.invoice, ids.otherProduct]), /row-level security/);
  }));
  await test('sales and purchase lines also reject foreign company products', async () => admin(async () => {
    for (const [table, parent, id] of [['sales_order_lines', 'sales_order_id', ids.saleOrder], ['purchase_order_lines', 'purchase_order_id', ids.purchaseOrder]]) {
      await assert.rejects(db.query('INSERT INTO public.' + table + '(' + parent + ',product_id,quantity,unit_price,line_total,line_number) VALUES($1,$2,1,100,100,1)', [id, ids.otherProduct]), /row-level security/);
      await db.query('INSERT INTO public.' + table + '(' + parent + ',product_id,quantity,unit_price,line_total,line_number) VALUES($1,$2,1,100,100,1)', [id, ids.product]);
    }
  }));
  await test('draft journals reject foreign accounts and accept accounts in the same company', async () => admin(async () => {
    await assert.rejects(db.query('INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,line_number) VALUES($1,$2,100,0,1)', [ids.journal, ids.otherAccount]), /row-level security/);
    await db.query('INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,line_number) VALUES($1,$2,100,0,1)', [ids.journal, ids.account]);
  }));
  await test('SECURITY DEFINER issuance independently rejects an existing foreign product line', async () => {
    const before = Number((await one('SELECT count(*) FROM public.journal_entries')).count);
    await admin(() => assert.rejects(one('SELECT public.issue_invoice($1)', [ids.corruptInvoice]), /Invoice product must belong/));
    assert.equal((await one('SELECT status FROM public.invoices WHERE id=$1', [ids.corruptInvoice])).status, 'draft');
    assert.equal(Number((await one('SELECT count(*) FROM public.journal_entries')).count), before);
  });
  await test('manual null-product invoice lines still issue and post a balanced ledger once', async () => {
    await admin(async () => {
      await db.query("INSERT INTO public.invoice_lines(invoice_id,product_id,description,quantity,unit_price,line_total,line_number,vat_rate,discount_amount) VALUES($1,NULL,'Manual service',1,20,20,1,0,0)", [ids.manualInvoice]);
      const result = (await one('SELECT public.issue_invoice($1) AS invoice', [ids.manualInvoice])).invoice;
      assert.equal(result.status, 'issued');
      assert.equal(Number(result.total_amount), 20);
      await one('SELECT public.issue_invoice($1)', [ids.manualInvoice]);
    });
    const entry = await one('SELECT count(*) AS entries FROM public.journal_entries WHERE entry_number=$1', ['INV-' + ids.manualInvoice]);
    assert.equal(Number(entry.entries), 1);
    const totals = await one('SELECT sum(debit_amount) AS debit,sum(credit_amount) AS credit FROM public.journal_entry_lines WHERE journal_entry_id=(SELECT id FROM public.journal_entries WHERE entry_number=$1)', ['INV-' + ids.manualInvoice]);
    assert.equal(Number(totals.debit), 20); assert.equal(totals.debit, totals.credit);
  });
  await test('fresh-install security migration is repeatable without financial rewrites', async () => {
    const before = (await db.query("SELECT id,total_amount,status FROM public.invoices ORDER BY id")).rows;
    await db.exec(await readFile(new URL('20261026000200_security_parity.sql', migrations), 'utf8'));
    assert.deepEqual((await db.query("SELECT id,total_amount,status FROM public.invoices ORDER BY id")).rows, before);
  });
  console.log('\n' + count + ' canonical security parity PostgreSQL checks passed.');
} catch (error) {
  console.error('FAIL ' + error.message + (error.where ? '\n' + error.where : ''));
  process.exitCode = 1;
} finally { await db.close(); }
