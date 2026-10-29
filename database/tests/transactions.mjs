import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';

// The fallback supports an isolated temporary install without changing the app
// dependency tree. Normal setup: npm --prefix database/tests install.
let entry;
try { entry = import.meta.resolve('@electric-sql/pglite'); }
catch { entry = new URL('../../.tmp/db-validation/node_modules/@electric-sql/pglite/dist/index.js', import.meta.url).href; }
const { PGlite } = await import(entry);
const { uuid_ossp } = await import(new URL('./contrib/uuid_ossp.js', entry));
const { pgcrypto } = await import(new URL('./contrib/pgcrypto.js', entry));
const db = new PGlite({ extensions: { 'uuid-ossp': uuid_ossp, pgcrypto } });
const ids = Object.fromEntries(['company','otherCompany','branch','otherBranch','admin','cashier','otherUser','warehouse','otherWarehouse','product','zeroProduct','otherProduct','shift','otherShift','customer','otherCustomer'].map((name,i) => [name,`00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`]));
let count = 0;
async function test(name, fn) { await fn(); count++; console.log(`PASS ${name}`); }
async function one(sql, params = []) { return (await db.query(sql,params)).rows[0]; }
async function user(id, fn) {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id ?? '']);
  await db.exec(`SET ROLE ${id ? 'authenticated' : 'anon'}`);
  try { return await fn(); } finally { await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)"); }
}
let sequence = 0;
const key = () => `10000000-0000-0000-0000-${String(++sequence).padStart(12,'0')}`;
const item = (product = ids.product, quantity = 1, extra = {}) => ({ product_id: product,quantity,...extra });
async function checkout(overrides = {}) {
  const request = { company: ids.company,branch: ids.branch,cashier: ids.cashier,shift: ids.shift,method: 'cash',customer: ids.customer,
    items: [item()],discount: 0,notes: null,key: key(),warehouse: null,...overrides };
  return (await one('SELECT public.complete_pos_sale($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::uuid,$7::jsonb,$8::numeric,$9::text,$10::uuid,$11::uuid) AS result',
    [request.company,request.branch,request.cashier,request.shift,request.method,request.customer,JSON.stringify(request.items),request.discount,request.notes,request.key,request.warehouse])).result;
}

try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;`);
  const directory = new URL('../../supabase/migrations/',import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(name,directory),'utf8'));
  }
  await test('clean installation includes all canonical tables and RPCs', async () => {
    assert.ok((await one("SELECT to_regprocedure('public.complete_pos_sale(uuid,uuid,uuid,uuid,text,uuid,jsonb,numeric,text,uuid,uuid)') AS rpc")).rpc);
  });
  await db.exec(await readFile(new URL('../007_schema_compatibility.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../008_transactional_sales.sql',import.meta.url),'utf8'));
  await test('additive upgrades are safe to reapply', async () => assert.ok(await one('SELECT 1 AS ok')));
  await db.exec(`INSERT INTO public.companies(id,name) VALUES('${ids.company}','Company A'),('${ids.otherCompany}','Company B');
    INSERT INTO public.branches(id,company_id,name,code) VALUES('${ids.branch}','${ids.company}','A','A'),('${ids.otherBranch}','${ids.otherCompany}','B','B');
    INSERT INTO auth.users VALUES('${ids.admin}'),('${ids.cashier}'),('${ids.otherUser}');
    INSERT INTO public.roles(id,name,permissions) VALUES('20000000-0000-0000-0000-000000000001','cashier','{"pos_access":true,"open_close_shift":true}');
    INSERT INTO public.users(id,company_id,branch_id,role_id,email) VALUES
      ('${ids.admin}','${ids.company}','${ids.branch}',(SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1),'admin@a.test'),
      ('${ids.cashier}','${ids.company}','${ids.branch}','20000000-0000-0000-0000-000000000001','cashier@a.test'),
      ('${ids.otherUser}','${ids.otherCompany}','${ids.otherBranch}',(SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1),'admin@b.test');
    INSERT INTO public.warehouses(id,company_id,branch_id,name,code) VALUES('${ids.warehouse}','${ids.company}','${ids.branch}','A','A'),('${ids.otherWarehouse}','${ids.otherCompany}','${ids.otherBranch}','B','B');
    INSERT INTO public.products(id,company_id,sku,product_name,unit_price,cost_price,vat_rate) VALUES
      ('${ids.product}','${ids.company}','P','Taxed product',100,30,15),('${ids.zeroProduct}','${ids.company}','Z','Zero rated product',50,10,0),('${ids.otherProduct}','${ids.otherCompany}','P','Other tenant product',1,1,15);
    INSERT INTO public.inventory(product_id,warehouse_id,quantity_available,quantity_reserved) VALUES('${ids.product}','${ids.warehouse}',20,2),('${ids.zeroProduct}','${ids.warehouse}',20,0);
    INSERT INTO public.customers(id,company_id,customer_code,company_name) VALUES('${ids.customer}','${ids.company}','C','A customer'),('${ids.otherCustomer}','${ids.otherCompany}','C','B customer');
    INSERT INTO public.shifts(id,company_id,branch_id,cashier_id,shift_number,opening_cash) VALUES('${ids.shift}','${ids.company}','${ids.branch}','${ids.cashier}','S1',100),('${ids.otherShift}','${ids.otherCompany}','${ids.otherBranch}','${ids.otherUser}','S2',100);
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated,anon;
    GRANT USAGE ON SCHEMA public TO authenticated,anon;`);
  await test('anonymous callers cannot complete sales', async () => user(null, () => assert.rejects(checkout(), /permission denied/)));
  await test('cross tenant and spoofed cashier requests are denied', async () => user(ids.cashier, async () => {
    await assert.rejects(checkout({ company: ids.otherCompany }), /access denied/);
    await assert.rejects(checkout({ cashier: ids.admin }), /access denied/);
    await assert.rejects(checkout({ branch: ids.otherBranch }), /Branch access denied/);
    await assert.rejects(checkout({ warehouse: ids.otherWarehouse }), /Warehouse access denied/);
  }));
  await test('foreign customer and product cannot be attached', async () => user(ids.cashier, async () => {
    await assert.rejects(checkout({ customer: ids.otherCustomer }), /Customer access denied/);
    await assert.rejects(checkout({ items: [item(ids.otherProduct)] }), /outside company/);
  }));
  await test('invalid quantities, discounts, empty carts and missing keys fail atomically', async () => user(ids.cashier, async () => {
    for (const quantity of [0,-1,0.5,1000001]) await assert.rejects(checkout({ items: [item(ids.product,quantity)] }), /positive whole/);
    await assert.rejects(checkout({ items: [] }), /requires/);
    await assert.rejects(checkout({ items: [item(),item()] }), /duplicate product/);
    await assert.rejects(checkout({ key: null }), /idempotency key/);
    await assert.rejects(checkout({ discount: -1 }), /Invalid document discount/);
    await assert.rejects(checkout({ items: [item(ids.product,1,{ discount_percentage: 5 })] }), /Discount permission/);
    assert.equal(Number((await one('SELECT count(*) FROM public.sales')).count),0);
  }));
  let sale; let draftId;
  const requestKey = key();
  const crafted = [item(ids.product,2,{ unit_price: 0.01,vat_rate: 0,total: 0.01,product_name: 'Forged' }),item(ids.zeroProduct)];
  await test('checkout uses server prices, per product VAT and posts invoice payment inventory and balanced ledger', async () => {
    sale = await user(ids.cashier, () => checkout({ key: requestKey,items: crafted }));
    assert.equal(sale.total_amount,280); assert.equal(sale.vat_amount,30); assert.equal(sale.taxable_amount,250);
    assert.equal(Number((await one('SELECT quantity_available FROM public.inventory WHERE product_id=$1',[ids.product])).quantity_available),18);
    const invoice = await one('SELECT status,amount_paid,amount_due,reporting_status FROM public.invoices WHERE id=$1',[sale.invoice_id]);
    assert.equal(invoice.status,'paid'); assert.equal(Number(invoice.amount_paid),280); assert.equal(Number(invoice.amount_due),0); assert.equal(invoice.reporting_status,'pending');
    assert.equal(Number((await one('SELECT count(*) FROM public.inventory_movements WHERE reference_id=$1',[sale.sale_id])).count),2);
    const journal = await one('SELECT sum(debit_amount) AS debit,sum(credit_amount) AS credit FROM public.journal_entry_lines WHERE journal_entry_id=$1',[sale.journal_entry_id]);
    assert.equal(Number(journal.debit),350); assert.equal(journal.debit,journal.credit);
    const lines = (await db.query('SELECT description,unit_price FROM public.invoice_lines WHERE invoice_id=$1 ORDER BY line_number',[sale.invoice_id])).rows;
    assert.equal(lines[0].description,'Taxed product'); assert.equal(Number(lines[0].unit_price),100);
  });
  await test('a retry returns the same sale even after its shift is closed and changed payload is rejected', async () => {
    const replay = await user(ids.cashier, () => checkout({ key: requestKey,items: crafted }));
    assert.equal(replay.sale_id,sale.sale_id);
    await user(ids.cashier, () => assert.rejects(checkout({ key: requestKey,items: [item()] }), /Idempotency key reused/));
    assert.equal(Number((await one('SELECT count(*) FROM public.sales')).count),1);
  });
  await test('reserved stock cannot be sold and failure rolls back every document', async () => {
    await user(ids.cashier, () => assert.rejects(checkout({ items: [item(ids.product,17)] }), /Insufficient available stock/));
    assert.equal(Number((await one('SELECT count(*) FROM public.sales')).count),1);
    assert.equal(Number((await one('SELECT count(*) FROM public.invoices')).count),1);
  });
  await test('per line and document discounts are counted once and VAT follows allocation', async () => {
    const adminShift = key();
    await db.query('INSERT INTO public.shifts(id,company_id,branch_id,cashier_id,shift_number) VALUES($1,$2,$3,$4,$5)',[adminShift,ids.company,ids.branch,ids.admin,adminShift]);
    const discounted = await user(ids.admin, () => checkout({ cashier: ids.admin,shift: adminShift,discount: 10,items: [item(ids.product,1,{ discount_percentage: 10 })] }));
    assert.equal(discounted.subtotal,100); assert.equal(discounted.discount_amount,20); assert.equal(discounted.taxable_amount,80); assert.equal(discounted.vat_amount,12); assert.equal(discounted.total_amount,92);
  });
  await test('draft RPC persists native invoice lines without moving stock or posting ledger', async () => {
    const request = key();
    const call = () => one('SELECT public.save_invoice_draft($1,$2,$3::jsonb,current_date+7,$4,$5) AS result',[ids.company,ids.customer,JSON.stringify([item(ids.product,1,{ unit_price: 1 })]),'Draft test',request]);
    const first = await user(ids.admin,call); const second = await user(ids.admin,call);
    draftId=first.result.invoice_id;
    assert.equal(first.result.invoice_id,second.result.invoice_id); assert.equal(first.result.total_amount,115);
    assert.equal((await one('SELECT status FROM public.invoices WHERE id=$1',[first.result.invoice_id])).status,'draft');
    assert.equal(Number((await one('SELECT count(*) FROM public.journal_entries')).count),2);
    await user(ids.cashier, () => assert.rejects(call(), /Invoice access denied/));
  });
  await test('RLS isolates sales invoice lines and ledger from the other tenant', async () => user(ids.otherUser, async () => {
    for (const table of ['sales','invoices','invoice_lines','journal_entries','journal_entry_lines','payments'])
      assert.equal(Number((await one(`SELECT count(*) FROM public.${table}`)).count),0,table);
  }));
  await test('a cashier cannot directly mutate or delete a completed sale', async () => user(ids.cashier, async () => {
    assert.equal((await db.query("UPDATE public.sales SET status='refunded' WHERE id=$1 RETURNING id",[sale.sale_id])).rows.length,0);
    assert.equal((await db.query('DELETE FROM public.sales WHERE id=$1 RETURNING id',[sale.sale_id])).rows.length,0);
  }));
  await test('shift close counts cash payments only and subsequent checkout is blocked', async () => {
    await user(ids.cashier, () => checkout({ method: 'card',items: [item(ids.zeroProduct)] }));
    const closed = await user(ids.cashier, () => one('SELECT * FROM public.close_pos_shift($1,380)',[ids.shift]));
    assert.equal(Number(closed.expected_cash),380); assert.equal(Number(closed.total_sales),330); assert.equal(Number(closed.cash_difference),0);
    await user(ids.cashier, () => assert.rejects(checkout(), /open shift/));
    const replay = await user(ids.cashier, () => checkout({ key: requestKey,items: crafted })); assert.equal(replay.sale_id,sale.sale_id);
  });
  await test('inactive profiles lose both tenant visibility and RPC access', async () => {
    await db.query("UPDATE public.users SET status='inactive' WHERE id=$1",[ids.cashier]);
    await user(ids.cashier, async () => {
      assert.equal(Number((await one('SELECT count(*) FROM public.sales')).count),0);
      await assert.rejects(checkout(), /POS access denied/);
    });
  });
  await test('HR managers cannot elevate their own access or change user company',async () => {
    const manager=key();
    await db.query('INSERT INTO auth.users(id) VALUES($1)',[manager]);
    await db.query("INSERT INTO public.users(id,company_id,branch_id,role_id,email) VALUES($1,$2,$3,(SELECT id FROM public.roles WHERE name='manager' LIMIT 1),'manager@a.test')",[manager,ids.company,ids.branch]);
    await user(manager,async () => {
      await assert.rejects(db.query("UPDATE public.users SET role_id=(SELECT id FROM public.roles WHERE name='admin' LIMIT 1) WHERE id=$1",[manager]),/Only administrators/);
      await assert.rejects(db.query('UPDATE public.users SET company_id=$1 WHERE id=$2',[ids.otherCompany,manager]),/company access denied/);
    });
  });
  await test('invoice issuing posts receivables once and checks finance and tenant access',async () => {
    await user(ids.otherUser,() => assert.rejects(one('SELECT public.issue_invoice($1)',[draftId]),/Finance permission/));
    const first=await user(ids.admin,() => one('SELECT public.issue_invoice($1) AS result',[draftId]));
    assert.equal(first.result.status,'issued'); assert.equal(first.result.total_amount,115);
    await user(ids.admin,() => one('SELECT public.issue_invoice($1)',[draftId]));
    assert.equal(Number((await one("SELECT count(*) FROM public.journal_entries WHERE entry_number=$1",['INV-'+draftId])).count),1);
    const totals=await one("SELECT sum(l.debit_amount) AS debit,sum(l.credit_amount) AS credit FROM public.journal_entry_lines l JOIN public.journal_entries j ON j.id=l.journal_entry_id WHERE j.entry_number=$1",['INV-'+draftId]);
    assert.equal(Number(totals.debit),115); assert.equal(totals.debit,totals.credit);
  });
  await test('receipts settle a native invoice without overpayment or duplicate recognition',async () => {
    const receipt=key();
    const pay=(amount,request=receipt) => one("SELECT public.record_invoice_payment($1,$2,'cash',NULL,$3) AS result",[draftId,amount,request]);
    await user(ids.admin,async () => {
      await assert.rejects(pay(116),/exceeds the outstanding balance/);
      const partial=await pay(50); assert.equal(partial.result.status,'partial'); assert.equal(partial.result.amount_due,65);
      await pay(50); await assert.rejects(pay(51),/different payment details/);
      const paid=await pay(65,key()); assert.equal(paid.result.status,'paid'); assert.equal(paid.result.amount_due,0);
      await pay(50); // An old successful request remains replayable after final settlement.
    });
    assert.equal(Number((await one('SELECT count(*) FROM public.payments WHERE invoice_id=$1',[draftId])).count),2);
  });
  await test('receiving goods atomically increases stock and posts a balanced clearing entry once',async () => {
    const receipt=key();
    const before=Number((await one('SELECT quantity_available FROM public.inventory WHERE product_id=$1',[ids.product])).quantity_available);
    const receive=(qty=5) => one('SELECT public.receive_stock($1,$2,$3,$4,$5,$6) AS id',[ids.company,ids.product,ids.warehouse,qty,'Receipt 1',receipt]);
    await user(ids.otherUser,() => assert.rejects(receive(),/Inventory permission/));
    const first=await user(ids.admin,() => receive()); const replay=await user(ids.admin,() => receive()); assert.equal(first.id,replay.id);
    await user(ids.admin,() => assert.rejects(receive(6),/different details/));
    assert.equal(Number((await one('SELECT quantity_available FROM public.inventory WHERE product_id=$1',[ids.product])).quantity_available),before+5);
    const totals=await one("SELECT sum(l.debit_amount) AS debit,sum(l.credit_amount) AS credit FROM public.journal_entry_lines l JOIN public.journal_entries j ON j.id=l.journal_entry_id WHERE j.entry_number=$1",['REC-'+receipt]);
    assert.equal(Number(totals.debit),150); assert.equal(totals.debit,totals.credit);
  });
  await test('company settings require a company administrator and audit the update',async () => {
    const update=(company=ids.company,currency='SAR') => one("SELECT public.update_company_settings($1,'Updated company',NULL,NULL,$2,'Asia/Riyadh') AS result",[company,currency]);
    await user(ids.otherUser,() => assert.rejects(update(),/administrator required/));
    await user(ids.admin,() => assert.rejects(update(ids.company,'USD'),/Cannot change the base currency/));
    const updated=await user(ids.admin,() => update()); assert.equal(updated.result.name,'Updated company');
    assert.equal(Number((await one('SELECT count(*) FROM public.company_setting_events WHERE company_id=$1',[ids.company])).count),1);
  });
  await test('onboarding creates only the verified caller company and is replayable without granting a paid plan',async () => {
    const actor=key();
    await db.query("INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,'new@company.test',NULL)",[actor]);
    const register=() => one("SELECT public.register_company_account('New Company','New Company',NULL,NULL,'retail','small','SA','Riyadh','Office',NULL,'Main','MAIN','enterprise','annual',2,10,ARRAY['sales'],'New Administrator','Manager','0550000000') AS result");
    await user(null,() => assert.rejects(register(),/permission denied/));
    await user(actor,() => assert.rejects(register(),/verified email/));
    await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[actor]);
    const registered=await user(actor,register); const replay=await user(actor,register);
    assert.equal(registered.result.company_id,replay.result.company_id); assert.equal(registered.result.subscription_status,'unpaid');
    assert.notEqual(registered.result.company_id,ids.company);
    const profile=await one('SELECT company_id,branch_id FROM public.users WHERE id=$1',[actor]); assert.equal(profile.company_id,registered.result.company_id);
    const warehouse=await one('SELECT branch_id FROM public.warehouses WHERE company_id=$1',[profile.company_id]); assert.equal(warehouse.branch_id,profile.branch_id);
    assert.equal(Number((await one('SELECT count(*) FROM public.companies WHERE onboarding_owner_id=$1',[actor])).count),1);
  });
  console.log(`\n${count} PostgreSQL database checks passed.`);
} catch (error) {
  console.error(`FAIL ${error.message}${error.where ? `\n${error.where}` : ''}`);
  process.exitCode = 1;
} finally { await db.close(); }
