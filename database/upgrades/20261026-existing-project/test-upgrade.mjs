import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {cloneLive} from '../../inspection/clone-live.mjs';
const root=new URL('../../../',import.meta.url);
const qi=s=>'"'+s.replaceAll('"','""')+'"';
let db,stage='restore',count=0;
async function one(sql,args=[]){return (await db.query(sql,args)).rows[0];}
async function test(name,fn){stage=name;await fn();count++;console.log('PASS '+name);}
async function user(id,fn){await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('SET ROLE '+(id?'authenticated':'anon'));try{return await fn();}finally{await db.exec("RESET ROLE;SELECT set_config('request.jwt.claim.sub','',false)");}}
let seq=0;const key=()=>`a0000000-0000-0000-0000-${String(++seq).padStart(12,'0')}`;
try{
 let backupPath;try{backupPath=JSON.parse(await readFile(new URL('.tmp/supabase-review/upgrade-apply-receipt.json',root),'utf8')).backup;}catch(e){if(e.code!=='ENOENT')throw e;}
 const restored=await cloneLive({backupPath});db=restored.db;
 const fingerprints={};
 for(const t of restored.schema.tables){const cols=t.columns.map(c=>qi(c.name)).join(',');fingerprints[t.name]=await one(`SELECT md5(coalesce(jsonb_agg(x ORDER BY x::text)::text,'[]')) AS hash,count(*)::int AS count FROM (SELECT to_jsonb(r) x FROM (SELECT ${cols} FROM public.${qi(t.name)}) r) s`);}
 stage='apply target upgrade';const upgrade=await readFile(new URL('./upgrade.sql',import.meta.url),'utf8');await db.exec(upgrade);
 await test('all original 43 tables and 193 rows retain every original column value',async()=>{
  for(const t of restored.schema.tables){const cols=t.columns.map(c=>qi(c.name)).join(',');const actual=await one(`SELECT md5(coalesce(jsonb_agg(x ORDER BY x::text)::text,'[]')) AS hash,count(*)::int AS count FROM (SELECT to_jsonb(r) x FROM (SELECT ${cols} FROM public.${qi(t.name)}) r) s`);assert.deepEqual(actual,fingerprints[t.name],t.name);}
 });
 await test('new checkout has no optional arguments and old JSONB onboarding remains unique',async()=>{
  assert.equal((await one("SELECT pronargdefaults FROM pg_proc WHERE oid='public.complete_pos_sale(uuid,uuid,uuid,uuid,text,uuid,jsonb,numeric,text,uuid,uuid)'::regprocedure")).pronargdefaults,0);
  assert.equal(Number((await one("SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='register_company_account'")).count),1);
 });
 const warehouseConfiguration=await readFile(new URL('./configure-warehouses.sql',import.meta.url),'utf8');
 await test('existing warehouses are mapped only to an unambiguous branch; missing branch warehouses start empty',async()=>{
  const stock=await one('SELECT md5(coalesce(jsonb_agg(to_jsonb(i) ORDER BY id)::text,\'[]\')) AS hash FROM public.inventory i');
  await db.exec(warehouseConfiguration);
  assert.equal(Number((await one("SELECT count(*) FROM public.warehouses w WHERE is_active AND branch_id IS NULL")).count),0);
  assert.equal(Number((await one("SELECT count(*) FROM public.branches b WHERE status='active' AND NOT EXISTS(SELECT 1 FROM public.warehouses w WHERE w.branch_id=b.id AND w.company_id=b.company_id AND w.is_active)")).count),0);
  assert.deepEqual(await one('SELECT md5(coalesce(jsonb_agg(to_jsonb(i) ORDER BY id)::text,\'[]\')) AS hash FROM public.inventory i'),stock);
  const countBefore=await one('SELECT (SELECT count(*) FROM public.warehouses) AS warehouses,(SELECT count(*) FROM public.audit_logs) AS events');await db.exec(warehouseConfiguration);assert.deepEqual(await one('SELECT (SELECT count(*) FROM public.warehouses) AS warehouses,(SELECT count(*) FROM public.audit_logs) AS events'),countBefore);
 });
 const admins=(await db.query("SELECT u.id,u.company_id,u.branch_id,r.name FROM public.users u JOIN public.roles r ON r.id=u.role_id WHERE u.status='active' ORDER BY r.name")).rows;
 await test('both existing primary roles can resolve login permissions and read their role',async()=>{
  for(const a of admins)await user(a.id,async()=>{assert.equal((await one('SELECT public.get_user_company_id() AS id')).id,a.company_id);assert.equal((await one('SELECT public.user_has_permission(\'finance\') AS ok')).ok,true);assert.ok((await db.query('SELECT * FROM public.get_user_roles($1)',[a.id])).rows.length);assert.ok((await db.query('SELECT * FROM public.get_user_permissions($1)',[a.id])).rows.some(p=>p.permission_key==='finance.view'));assert.ok((await db.query('SELECT id FROM public.roles WHERE id=(SELECT role_id FROM public.users WHERE id=$1)',[a.id])).rows.length);});
 });
 await test('anonymous access to checkout and RBAC RPCs is denied',async()=>user(null,async()=>{await assert.rejects(db.query('SELECT * FROM public.get_user_roles($1)',[admins[0].id]),/permission denied/);}));
 const ids=Object.fromEntries(['company','otherCompany','branch','otherBranch','admin','cashier','otherAdmin','product','warehouse','customer','shift','manager'].map(n=>[n,key()]));
 stage='synthetic fixtures';
 await db.query('INSERT INTO public.companies(id,name) VALUES($1,\'Local validation A\'),($2,\'Local validation B\')',[ids.company,ids.otherCompany]);
 await db.query('INSERT INTO public.branches(id,company_id,name,code) VALUES($1,$2,\'A\',\'A\'),($3,$4,\'B\',\'B\')',[ids.branch,ids.company,ids.otherBranch,ids.otherCompany]);
 for(const [name,role,company,branch]of [['admin','admin',ids.company,ids.branch],['cashier','cashier',ids.company,ids.branch],['otherAdmin','admin',ids.otherCompany,ids.otherBranch],['manager','manager',ids.company,ids.branch]]){
  await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[ids[name],name+'@local-validation.test']);
  await db.query('INSERT INTO public.users(id,company_id,branch_id,role_id,email) VALUES($1,$2,$3,(SELECT id FROM public.roles WHERE name=$4),$5)',[ids[name],company,branch,role,name+'@local-validation.test']);
 }
 await db.query("INSERT INTO public.warehouses(id,company_id,branch_id,name,code) VALUES($1,$2,$3,'Local validation','V')",[ids.warehouse,ids.company,ids.branch]);
 await db.query("INSERT INTO public.products(id,company_id,sku,product_name,unit_price,cost_price,vat_rate) VALUES($1,$2,'LOCAL-TEST','Local validation',100,30,15)",[ids.product,ids.company]);
 await db.query("INSERT INTO public.customers(id,company_id,customer_code,company_name) VALUES($1,$2,'LOCAL-TEST','Local validation')",[ids.customer,ids.company]);
 await db.query("INSERT INTO public.shifts(id,company_id,branch_id,cashier_id,shift_number) VALUES($1,$2,$3,$4,'LOCAL-TEST')",[ids.shift,ids.company,ids.branch,ids.cashier]);
 const items=JSON.stringify([{product_id:ids.product,quantity:1,unit_price:0.01,vat_rate:0}]);
 await test('stock receipt is atomic and idempotent with a balanced ledger',async()=>user(ids.admin,async()=>{
  const request=key(),call=()=>one("SELECT public.receive_stock($1,$2,$3,5,'LOCAL-TEST',$4) AS movement",[ids.company,ids.product,ids.warehouse,request]);
  assert.equal((await call()).movement,(await call()).movement);assert.equal(Number((await one('SELECT quantity_available FROM public.inventory WHERE product_id=$1',[ids.product])).quantity_available),5);
  const ledger=await one('SELECT sum(debit_amount) AS d,sum(credit_amount) AS c FROM public.journal_entry_lines WHERE journal_entry_id=(SELECT id FROM public.journal_entries WHERE entry_number=$1)',['REC-'+request]);assert.equal(Number(ledger.d),150);assert.equal(ledger.d,ledger.c);
 }));
 let sale;const saleKey=key();const checkout=(company=ids.company,request=saleKey,cart=items)=>one("SELECT public.complete_pos_sale($1::uuid,$2::uuid,$3::uuid,$4::uuid,'cash'::text,$5::uuid,$6::jsonb,0::numeric,NULL::text,$7::uuid,$8::uuid) AS sale",[company,ids.branch,ids.cashier,ids.shift,ids.customer,cart,request,ids.warehouse]);
 await test('POS-only cashier cannot grant discounts or create finance invoice drafts',async()=>user(ids.cashier,async()=>{
  assert.equal((await one("SELECT public.user_has_permission('sales') AS ok")).ok,false);
  await assert.rejects(checkout(ids.company,key(),JSON.stringify([{product_id:ids.product,quantity:1,discount_percentage:10}])),/Discount permission/);
  await assert.rejects(one('SELECT public.save_invoice_draft($1,$2,$3::jsonb,current_date+7,NULL,$4)',[ids.company,ids.customer,items,key()]),/Invoice access denied/);
 }));
 await test('POS prices and VAT come from the server and retries do not duplicate stock or documents',async()=>user(ids.cashier,async()=>{
  sale=(await checkout()).sale;assert.equal(sale.total_amount,115);assert.equal(sale.vat_amount,15);assert.equal((await checkout()).sale.sale_id,sale.sale_id);
  assert.equal(Number((await one('SELECT quantity_available FROM public.inventory WHERE product_id=$1',[ids.product])).quantity_available),4);
  const invoice=await one('SELECT status,amount_due FROM public.invoices WHERE id=$1',[sale.invoice_id]);assert.equal(invoice.status,'paid');assert.equal(Number(invoice.amount_due),0);
  const line=await one('SELECT vat_rate,tax_rate,vat_amount FROM public.invoice_lines WHERE invoice_id=$1',[sale.invoice_id]);assert.equal(Number(line.tax_rate),15);assert.equal(Number(line.vat_rate),15);assert.equal(Number(line.vat_amount),15);
  const ledger=await one('SELECT sum(debit_amount) AS d,sum(credit_amount) AS c FROM public.journal_entry_lines WHERE journal_entry_id=$1',[sale.journal_entry_id]);assert.equal(Number(ledger.d),145);assert.equal(ledger.d,ledger.c);
  await assert.rejects(checkout(ids.otherCompany,key()),/access denied/);await assert.rejects(checkout(ids.company,key(),JSON.stringify([{product_id:ids.product,quantity:5}])),/Insufficient available stock/);
 }));
 await test('legacy checkout without a stable request key is rejected without creating a sale',async()=>user(ids.cashier,async()=>{
  const before=await one('SELECT (SELECT count(*) FROM public.sales)::int AS sales,(SELECT count(*) FROM public.invoices)::int AS invoices,(SELECT count(*) FROM public.payments)::int AS payments,(SELECT sum(amount) FROM public.payments) AS amount,(SELECT sum(quantity_available) FROM public.inventory) AS stock');
  await assert.rejects(one("SELECT public.complete_pos_sale($1::uuid,$2::uuid,$3::uuid,$4::uuid,'cash'::text,$5::jsonb,$6::uuid,0::numeric,NULL::text) AS sale",[ids.company,ids.branch,ids.cashier,ids.shift,items,ids.customer]),/stable idempotency key/);
  assert.equal(Number((await one('SELECT count(*) FROM public.sales WHERE company_id=$1',[ids.company])).count),1);
  assert.deepEqual(await one('SELECT (SELECT count(*) FROM public.sales)::int AS sales,(SELECT count(*) FROM public.invoices)::int AS invoices,(SELECT count(*) FROM public.payments)::int AS payments,(SELECT sum(amount) FROM public.payments) AS amount,(SELECT sum(quantity_available) FROM public.inventory) AS stock'),before);
 }));
 await test('invoice issuance and partial/full receipts balance and reject overpayment',async()=>user(ids.admin,async()=>{
  const draft=(await one('SELECT public.save_invoice_draft($1,$2,$3::jsonb,current_date+7,NULL,$4) AS draft',[ids.company,ids.customer,items,key()])).draft;
  const issued=(await one('SELECT public.issue_invoice($1) AS invoice',[draft.invoice_id])).invoice;assert.equal(issued.status,'issued');assert.equal(Number(issued.amount_due),115);
  const request=key(),pay=(amount=50,id=request)=>one("SELECT public.record_invoice_payment($1,$2,'bank_transfer','LOCAL-TEST',$3) AS invoice",[draft.invoice_id,amount,id]);
  assert.equal(Number((await pay()).invoice.amount_due),65);await pay();await assert.rejects(pay(66,key()),/exceeds/);assert.equal((await pay(65,key())).invoice.status,'paid');
 }));
 await test('company boundaries and direct write restrictions protect ledgers and inventory',async()=>{
  await user(ids.otherAdmin,async()=>{for(const t of ['sales','invoices','payments','journal_entries','chart_of_accounts'])assert.equal(Number((await one(`SELECT count(*) FROM public.${t} WHERE company_id=$1`,[ids.company])).count),0,t);assert.equal((await one('SELECT public.business_can_access($1,\'finance_expenses\',true) AS ok',[ids.company])).ok,false);});
  await user(ids.admin,()=>assert.rejects(db.query('UPDATE public.inventory SET quantity_available=999 WHERE product_id=$1',[ids.product]),/permission denied/));
  await user(ids.admin,async()=>{assert.ok((await db.query('SELECT * FROM public.permissions')).rows.length);assert.ok((await db.query('SELECT * FROM public.role_permissions')).rows.length);await assert.rejects(db.query("INSERT INTO public.audit_logs(company_id,user_id,action,entity_type) VALUES($1,$2,'forged','sales')",[ids.company,ids.admin]),/permission denied/);});
  await user(ids.manager,()=>assert.rejects(db.query("UPDATE public.users SET role_id=(SELECT id FROM public.roles WHERE name='admin') WHERE id=$1",[ids.manager]),/Only administrators/));
 });
 await test('draft lines cannot attach another company product or ledger account',async()=>{
  const foreignProduct=key(),foreignAccount=key();await db.query("INSERT INTO public.products(id,company_id,sku,product_name,unit_price) VALUES($1,$2,'FOREIGN','Foreign validation',1)",[foreignProduct,ids.otherCompany]);
  await db.query("INSERT INTO public.chart_of_accounts(id,company_id,account_code,account_name,account_type) VALUES($1,$2,'FOREIGN','Foreign validation','asset')",[foreignAccount,ids.otherCompany]);
  let invoice;await user(ids.admin,async()=>{
   invoice=(await one('SELECT public.save_invoice_draft($1,$2,$3::jsonb,current_date+7,NULL,$4) AS draft',[ids.company,ids.customer,items,key()])).draft.invoice_id;
   await assert.rejects(db.query('UPDATE public.invoice_lines SET product_id=$1 WHERE invoice_id=$2',[foreignProduct,invoice]),/row-level security/);
   assert.equal((await db.query("UPDATE public.invoice_lines SET product_id=NULL,description='Manual validation' WHERE invoice_id=$1 RETURNING id",[invoice])).rows.length,1);
  });
  await db.query('UPDATE public.invoice_lines SET product_id=$1 WHERE invoice_id=$2',[foreignProduct,invoice]);
  await user(ids.admin,()=>assert.rejects(one('SELECT public.issue_invoice($1)',[invoice]),/product must belong/));
  const journal=key();await db.query("INSERT INTO public.journal_entries(id,company_id,entry_number,entry_date,status,created_by) VALUES($1,$2,'LOCAL-DRAFT',current_date,'draft',$3)",[journal,ids.company,ids.admin]);
  await db.exec('GRANT INSERT ON public.journal_entry_lines TO authenticated');
  await user(ids.admin,()=>assert.rejects(db.query('INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,line_number) VALUES($1,$2,1,0,1)',[journal,foreignAccount]),/row-level security/));
 });
 await test('verified JSONB onboarding handles preexisting profiles and retries without granting paid status',async()=>{
  const actor=key();await db.query("INSERT INTO auth.users VALUES($1,'onboarding@local-validation.test',now())",[actor]);await db.query("INSERT INTO public.profiles(id,email) VALUES($1,'onboarding@local-validation.test')",[actor]);
  await user(actor,async()=>{const call=()=>one("SELECT public.register_company_account('Local new company',NULL,NULL,NULL,'retail','small','SA','Riyadh','Address',NULL,'Main','MAIN','enterprise','annual',3,10,'{}'::jsonb,'Local Admin','Manager','0500000000') AS result");const result=(await call()).result;assert.equal(result.success,true);assert.equal((await call()).result.company_id,result.company_id);assert.equal((await one("SELECT settings->'subscription'->>'status' AS status FROM public.companies WHERE id=$1",[result.company_id])).status,'unpaid');assert.equal(Number((await one('SELECT count(*) FROM public.warehouses WHERE company_id=$1',[result.company_id])).count),1);});
 });
 await test('disabled companies or tenants lose both visibility and workflow access',async()=>{
  await db.query("UPDATE public.companies SET status='suspended' WHERE id=$1",[ids.company]);await user(ids.admin,async()=>{assert.equal((await one('SELECT public.get_user_company_id() AS id')).id,null);assert.equal((await one('SELECT public.business_can_access($1,\'finance_expenses\',true) AS ok',[ids.company])).ok,false);});
 });
 console.log(`Target upgrade: ${count} acceptance checks passed on private local clone; no live writes.`);
 await writeFile(new URL('.tmp/supabase-review/upgrade-test.json',root),JSON.stringify({passed:true,checks:count,originalTables:43,originalRows:193,liveWrites:false,upgrade_sha256:createHash('sha256').update(upgrade).digest('hex'),warehouse_configuration_sha256:createHash('sha256').update(warehouseConfiguration).digest('hex'),checkedAt:new Date().toISOString()},null,2));
}catch(e){await writeFile(new URL('.tmp/supabase-review/upgrade-error.private.json',root),JSON.stringify({stage,message:e.message,code:e.code,detail:e.detail,position:e.position,query:e.query},null,2));console.error('FAIL '+stage+' (SQLSTATE '+(e.code||'n/a')+'); private diagnostic saved.');process.exitCode=1;}finally{await db?.close();}
