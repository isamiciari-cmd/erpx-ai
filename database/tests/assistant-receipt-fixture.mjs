import { readFile, readdir } from 'node:fs/promises';
import { createReceiptActions } from '../../scripts/ai/receipt-actions.ts';

async function openPGlite() {
  let entry;
  try { entry = import.meta.resolve('@electric-sql/pglite'); }
  catch { entry = new URL('../../.tmp/db-validation/node_modules/@electric-sql/pglite/dist/index.js', import.meta.url).href; }
  const { PGlite } = await import(entry);
  const { uuid_ossp } = await import(new URL('./contrib/uuid_ossp.js', entry));
  const { pgcrypto } = await import(new URL('./contrib/pgcrypto.js', entry));
  return new PGlite({ extensions: { 'uuid-ossp': uuid_ossp, pgcrypto } });
}

export async function createAssistantReceiptFixture(open = openPGlite) {
  if (process.env.AI_LOCAL_PREVIEW !== 'true') throw new Error('AI_LOCAL_PREVIEW=true required.');
  const db = await open();
  const id = n => `b0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const actor = { user: id(1), company: id(2), branch: id(3), branchName: 'فرع اختبار التحصيل' };
  const peer = { ...actor, user: id(10) };
  const accountant = { ...actor, user: id(12), role: 'accountant' };
  const cashier = { ...actor, user: id(13), role: 'cashier' };
  const other = { user: id(4), company: id(5), branch: id(6), branchName: 'فرع اختبار آخر' };
  const customer = id(7), product = id(8), cashierRole = id(9);
  const one = async (conn, sql, params = []) => (await conn.query(sql, params)).rows[0];
  const as = (who, run) => db.transaction(async tx => {
    await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [who.user]);
    await tx.exec('SET LOCAL ROLE authenticated');
    return run(tx);
  });
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;`);
    const dir = new URL('../../supabase/migrations/', import.meta.url);
    for (const file of (await readdir(dir)).filter(file => file.endsWith('.sql')).sort())
      await db.exec(await readFile(new URL(file, dir), 'utf8'));
    await db.exec(await readFile(new URL('./assistant-receipt.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('./assistant-purchase.sql', import.meta.url), 'utf8'));
    await db.exec(`
      INSERT INTO companies(id,name) VALUES('${actor.company}','Synthetic receipts'),('${other.company}','Other QA');
      INSERT INTO branches(id,company_id,name,code) VALUES('${actor.branch}','${actor.company}','${actor.branchName}','A'),('${other.branch}','${other.company}','${other.branchName}','B');
      INSERT INTO auth.users(id) VALUES('${actor.user}'),('${other.user}'),('${peer.user}'),('${accountant.user}'),('${cashier.user}');
      INSERT INTO roles(id,name,permissions) VALUES('${cashierRole}','cashier','{}');
      INSERT INTO roles(id,company_id,name,permissions) VALUES('${id(15)}','${actor.company}','accountant','{"finance":true}');
      INSERT INTO public.users(id,company_id,branch_id,role_id,email) VALUES
        ('${actor.user}','${actor.company}','${actor.branch}',(SELECT id FROM roles WHERE name='admin' LIMIT 1),'receipt-a@example.test'),
        ('${other.user}','${other.company}','${other.branch}',(SELECT id FROM roles WHERE name='admin' LIMIT 1),'receipt-b@example.test'),
        ('${peer.user}','${peer.company}','${peer.branch}',(SELECT id FROM roles WHERE name='admin' LIMIT 1),'receipt-peer@example.test'),
        ('${accountant.user}','${actor.company}','${actor.branch}','${id(15)}','accountant@example.test'),
        ('${cashier.user}','${actor.company}','${actor.branch}','${cashierRole}','cashier@example.test');
      INSERT INTO customers(id,company_id,customer_code,company_name) VALUES('${customer}','${actor.company}','QA','QA customer');
      INSERT INTO products(id,company_id,sku,product_name,unit_price,cost_price,vat_rate)
      VALUES('${product}','${actor.company}','QA','QA item',100,25,15);
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
    `);
    const warehouse = id(11);
    await db.query("INSERT INTO warehouses(id,company_id,branch_id,name,code) VALUES($1,$2,$3,'QA warehouse','QA')",
      [warehouse,actor.company,actor.branch]);
    await db.query('UPDATE products SET min_stock_level=5 WHERE id=$1',[product]);
    await db.query('INSERT INTO inventory(product_id,warehouse_id,quantity_available) VALUES($1,$2,2)',[product,warehouse]);
    const purchaseStock = who => as(who, async tx => (await tx.query(
      'SELECT * FROM public.preview_purchase_stock($1,$2)',[who.company,who.branch])).rows);
    const savePurchase = (who, body) => as(who, tx => one(tx,
      'SELECT public.save_preview_purchase($1,$2,$3,$4,$5,$6,$7::jsonb) AS id',
      [who.company,who.branch,body.warehouse,body.operationId,body.supplier,body.requester,JSON.stringify(body.lines)]));
    const purchases = who => as(who, async tx => (await tx.query(
      "SELECT * FROM business_records WHERE company_id=$1 AND module='purchases_requests'",[who.company])).rows);
    const purchaseCounts = () => one(db,`SELECT quantity_available AS available,
      (SELECT count(*)::int FROM inventory_movements) AS movements,
      (SELECT count(*)::int FROM journal_entries) AS journals
      FROM inventory WHERE product_id=$1 AND warehouse_id=$2`,[product,warehouse]);
    const seedAssistantDemo = async invoice => {
      const { id: shift } = await one(db,
        "INSERT INTO shifts(company_id,branch_id,cashier_id,shift_number,total_sales) VALUES($1,$2,$3,'QA-SHIFT-01',115) RETURNING id",
        [actor.company,actor.branch,cashier.user]);
      await db.query(`INSERT INTO sales(company_id,branch_id,cashier_id,shift_id,invoice_id,sale_number,payment_method,subtotal,vat_amount,total_amount)
        VALUES($1,$2,$3,$4,$5,'QA-SALE-01','cash',100,15,115)`,[actor.company,actor.branch,cashier.user,shift,invoice]);
    };
    const assistantSales = (who, start, end) => as(who, tx => one(tx,
      `SELECT coalesce(sum(s.total_amount),0)::text total, i.currency_code AS currency FROM sales s JOIN invoices i ON i.id=s.invoice_id
      WHERE s.company_id=$1 AND s.branch_id=$2 AND s.status='completed' AND s.sale_date >= $3 AND s.sale_date < $4 GROUP BY i.currency_code`,
      [who.company,who.branch,start,end]));
    const assistantShift = who => as(who, tx => one(tx,
      "SELECT shift_number,total_sales::text,opened_at FROM shifts WHERE company_id=$1 AND branch_id=$2 AND cashier_id=$3 AND status='open'",
      [who.company,who.branch,who.user]));
    const assistantOverdue = who => as(who, async tx => (await tx.query(
      `SELECT currency_code, sum(amount_due)::text total FROM invoices WHERE company_id=$1 AND branch_id=$2
      AND due_date<current_date AND status IN ('issued','sent','partial','overdue','unpaid') AND amount_due>0 GROUP BY currency_code`,
      [who.company,who.branch])).rows);
    const assistantInvoices = who => as(who, async tx => (await tx.query(
      'SELECT * FROM invoices WHERE company_id=$1 AND branch_id=$2',[who.company,who.branch])).rows);
    const moveBranch = async who => {
      const branch = id(14);
      await db.query("INSERT INTO branches(id,company_id,name,code) VALUES($1,$2,'Other preview branch','SHIFTED')",[branch,who.company]);
      await db.query('UPDATE users SET branch_id=$1 WHERE id=$2',[branch,who.user]);
    };
    const changeWorkspace = (who, target) => db.query(
      'UPDATE users SET company_id=$1,branch_id=$2 WHERE id=$3',[target.company,target.branch,who.user]);
    const resolveActor = who => as(who, tx => one(tx,
      `SELECT u.id AS "user",u.company_id AS company,u.branch_id AS branch,b.name AS "branchName",r.name AS role
      FROM users u JOIN branches b ON b.id=u.branch_id AND b.company_id=u.company_id
      JOIN roles r ON r.id=u.role_id JOIN companies c ON c.id=u.company_id
      WHERE u.id=auth.uid() AND u.status='active' AND b.status='active' AND c.status='active'`, []));
    const purchaseProposals = new Map();
    const actPurchase = async (who, body) => {
      if (body.action === 'preview_purchase') {
        for (const [id, entry] of purchaseProposals) {
          if (entry.expires < Date.now()) purchaseProposals.delete(id);
        }
        const stock = await purchaseStock(who);
        if (!stock.length) return null;
        const operationId = crypto.randomUUID();
        purchaseProposals.set(operationId, { who, stock, expires: Date.now() + 15 * 60_000 });
        return { operationId, branch: who.branchName, stock };
      }
      const entry = purchaseProposals.get(body.operationId);
      const deny = () => { throw Object.assign(new Error('Purchase scope denied'), { code: '42501' }); };
      if (!entry || entry.expires < Date.now() || entry.who.user !== who.user ||
          entry.who.company !== who.company || entry.who.branch !== who.branch) return deny();
      if (body.action === 'cancel_purchase' && !entry.attempted) {
        purchaseProposals.delete(body.operationId);
        return { status: 'cancelled' };
      }
      if (body.action !== 'confirm_purchase' || !body.lines || typeof body.lines !== 'object' || Array.isArray(body.lines) ||
          !Object.keys(body.lines).length || !Object.entries(body.lines).every(([id, qty]) =>
            Number.isInteger(qty) && qty > 0 && qty <= 999999 &&
            entry.stock.some(row => row.product_id === id && row.warehouse_id === body.warehouse))) return deny();
      entry.attempted = true;
      return { status: 'confirmed', ...await savePurchase(who, body) };
    };
    const pay = (invoice, amount, operation = crypto.randomUUID(), who = actor) => as(who, tx => one(tx,
      "SELECT public.record_invoice_payment($1,$2,'cash',NULL,$3) AS result", [invoice, amount, operation]));
    const createInvoice = async number => {
      const draft = await as(actor, tx => one(tx,
        'SELECT public.save_invoice_draft($1,$2,$3::jsonb,current_date+10,NULL,$4) AS result',
        [actor.company, customer, JSON.stringify([{ product_id: product, quantity: 1 }]), crypto.randomUUID()]));
      const invoice = draft.result.invoice_id;
      await db.query('UPDATE invoices SET branch_id=$1,invoice_number=$2 WHERE id=$3',[actor.branch,number,invoice]);
      await as(actor, tx => one(tx, 'SELECT public.issue_invoice($1) AS result', [invoice]));
      await pay(invoice,40);
      return invoice;
    };
    const read = (who, number) => as(who, tx => one(tx, `SELECT id,invoice_number AS number,total_amount::text AS total,
      amount_paid::text AS paid, amount_due::text AS due,currency_code AS currency FROM invoices
      WHERE company_id=$1 AND branch_id=$2 AND invoice_number=$3`, [who.company,who.branch,number]));
    const collect = async (who, invoice, operation, method, reference) => {
      const { result } = await as(who, tx => one(tx,
        'SELECT public.confirm_preview_invoice_receipt($1,$2,$3,$4,$5,$6,$7,$8) AS result',
        [invoice.id,who.company,who.branch,invoice.due,invoice.currency,method,reference,operation]));
      return result.status === 'changed' ? { ...result, due: Number(result.due).toFixed(2) } : result;
    };
    const act = createReceiptActions({ read, collect });
    const counts = async invoice => {
      const result = await one(db, `SELECT (SELECT count(*) FROM payments p WHERE invoice_id=$1)::int AS payments,
        (SELECT count(*) FROM journal_entries j JOIN payments p ON p.payment_number=j.entry_number
          AND p.company_id=j.company_id WHERE p.invoice_id=$1)::int AS journals`, [invoice]);
      return result;
    };
    const revoke = (who = actor) => db.query('UPDATE public.users SET role_id=$1 WHERE id=$2',[cashierRole,who.user]);
    return { actor, peer, other, accountant, cashier, seedAssistantDemo, assistantSales, assistantShift, assistantOverdue,
      assistantInvoices, moveBranch, changeWorkspace, resolveActor, createInvoice, read, collect, act, counts, pay, revoke,
      purchaseStock, savePurchase, purchases, purchaseCounts, actPurchase, close: () => db.close() };
  } catch (error) { await db.close(); throw error; }
}
