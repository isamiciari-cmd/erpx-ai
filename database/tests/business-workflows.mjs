import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
let entry;
try {
  entry = import.meta.resolve('@electric-sql/pglite');
} catch {
  entry = new URL(
    '../../.tmp/db-validation/node_modules/@electric-sql/pglite/dist/index.js',
    import.meta.url,
  ).href;
}
const { PGlite } = await import(entry);
const { uuid_ossp } = await import(new URL('./contrib/uuid_ossp.js', entry));
const { pgcrypto } = await import(new URL('./contrib/pgcrypto.js', entry));
const db = new PGlite({ extensions: { 'uuid-ossp': uuid_ossp, pgcrypto } });
let count = 0,
  sequence = 0;
const id = () => `70000000-0000-0000-0000-${String(++sequence).padStart(12, '0')}`;
const ids = Object.fromEntries(
  [
    'company',
    'otherCompany',
    'branch',
    'admin',
    'cashier',
    'otherAdmin',
    'customer',
    'product',
    'warehouse',
  ].map((key) => [key, id()]),
);
async function one(sql, params = []) {
  return (await db.query(sql, params)).rows[0];
}
async function test(name, fn) {
  await fn();
  console.log(`PASS ${name}`);
  count++;
}
async function user(uid, fn) {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid || '']);
  await db.exec(`SET ROLE ${uid ? 'authenticated' : 'anon'}`);
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)");
  }
}
const input = (module, extra = {}) => ({
  module,
  title: 'Test record',
  reference: '',
  record_date: '2026-10-26',
  amount: 100,
  data: {},
  status: 'draft',
  ...extra,
});
async function save(payload, record, company = ids.company) {
  return (
    await one('SELECT public.save_business_record($1,$2,$3,$4::jsonb) AS record', [
      company,
      record?.id || null,
      record?.version || null,
      JSON.stringify(payload),
    ])
  ).record;
}
async function move(record, status, data = record.data) {
  return save({ ...record, data, status }, record);
}
try {
  await db.exec(
    `CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO authenticated,anon;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;`,
  );
  const migrations = new URL('../../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(migrations)).filter((f) => f.endsWith('.sql')).sort())
    await db.exec(await readFile(new URL(file, migrations), 'utf8'));
  await db.exec(`INSERT INTO public.companies(id,name) VALUES('${ids.company}','Company A'),('${ids.otherCompany}','Company B');
    INSERT INTO public.branches(id,company_id,name,code) VALUES('${ids.branch}','${ids.company}','A','A');
    INSERT INTO auth.users VALUES('${ids.admin}'),('${ids.cashier}'),('${ids.otherAdmin}');
    INSERT INTO public.roles(id,name,permissions) VALUES('${id()}','cashier','{"pos_access":true}');
    INSERT INTO public.users(id,company_id,branch_id,role_id,email) VALUES('${ids.admin}','${ids.company}','${ids.branch}',(SELECT id FROM public.roles WHERE name='admin' LIMIT 1),'admin@a.test'),('${ids.cashier}','${ids.company}','${ids.branch}',(SELECT id FROM public.roles WHERE name='cashier' LIMIT 1),'cashier@a.test'),('${ids.otherAdmin}','${ids.otherCompany}',NULL,(SELECT id FROM public.roles WHERE name='admin' LIMIT 1),'admin@b.test');
    INSERT INTO public.customers(id,company_id,customer_code,company_name) VALUES('${ids.customer}','${ids.company}','C','Customer');
    INSERT INTO public.warehouses(id,company_id,branch_id,name,code) VALUES('${ids.warehouse}','${ids.company}','${ids.branch}','Warehouse','W');
    INSERT INTO public.products(id,company_id,sku,product_name,unit_price,cost_price,vat_rate) VALUES('${ids.product}','${ids.company}','P','Product',100,30,15);
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;GRANT USAGE ON SCHEMA public TO authenticated,anon;`);
  await test('anonymous, cashier and foreign company mutations are rejected', async () => {
    await user(null, () => assert.rejects(save(input('finance_expenses')), /permission denied/));
    await user(ids.cashier, () => assert.rejects(save(input('finance_expenses')), /permission/));
    await user(ids.otherAdmin, () => assert.rejects(save(input('finance_expenses')), /permission/));
  });
  let expense;
  await test('expense approval locks amount; payment adds evidence atomically', async () =>
    user(ids.admin, async () => {
      expense = await save(input('finance_expenses', { data: { receipt_reference: 'R-1' } }));
      expense = await move(expense, 'submitted');
      expense = await move(expense, 'approved');
      await assert.rejects(move(expense, 'paid'), /actual bank\/payment reference/);
      await assert.rejects(
        move({ ...expense, amount: 101 }, 'paid', { ...expense.data, payment_reference: 'BANK-1' }),
        /Save edits separately/,
      );
      expense = await move(expense, 'paid', { ...expense.data, payment_reference: 'BANK-1' });
      assert.equal(expense.status, 'paid');
      assert.equal(Number(expense.amount), 100);
      assert.equal(expense.version, 4);
      await assert.rejects(save({ ...expense, title: 'Edited' }, expense), /immutable/);
      assert.equal(
        Number(
          (
            await one('SELECT count(*) FROM public.business_record_events WHERE record_id=$1', [
              expense.id,
            ])
          ).count,
        ),
        4,
      );
    }));
  await test('stale workflow versions cannot overwrite saved changes', async () =>
    user(ids.admin, async () => {
      const draft = await save(input('projects'));
      await save({ ...draft, title: 'New title' }, draft);
      await assert.rejects(save({ ...draft, title: 'Stale title' }, draft), /Refresh/);
    }));
  await test('workflow records and history are isolated by company', async () =>
    user(ids.otherAdmin, async () => {
      assert.equal(Number((await one('SELECT count(*) FROM public.business_records')).count), 0);
      assert.equal(
        Number((await one('SELECT count(*) FROM public.business_record_events')).count),
        0,
      );
    }));
  await test('journal rejects unbalanced lines and posts balanced lines once to native ledger', async () =>
    user(ids.admin, async () => {
      const account = async (code, type) =>
        (
          await one('SELECT public.save_business_account($1,NULL,$2,$2,$3,true) AS account', [
            ids.company,
            code,
            type,
          ])
        ).account;
      const debit = await account('TEST-CASH', 'asset'),
        credit = await account('TEST-REVENUE', 'revenue');
      const lines = [
        {
          account_id: debit.id,
          account_code: debit.account_code,
          account_name: debit.account_name,
          debit: 100,
          credit: 0,
        },
        {
          account_id: credit.id,
          account_code: credit.account_code,
          account_name: credit.account_name,
          debit: 0,
          credit: 100,
        },
      ];
      await assert.rejects(
        save(
          input('finance_journal', { data: { lines: [lines[0], { ...lines[1], credit: 99 }] } }),
        ),
        /must balance/,
      );
      let journal = await save(input('finance_journal', { data: { lines } }));
      journal = await move(journal, 'submitted');
      journal = await move(journal, 'approved');
      journal = await move(journal, 'posted');
      const total = await one(
        'SELECT sum(l.debit_amount) AS debit,sum(l.credit_amount) AS credit FROM public.journal_entries j JOIN public.journal_entry_lines l ON l.journal_entry_id=j.id WHERE j.entry_number=$1',
        ['BR-' + journal.id],
      );
      assert.equal(Number(total.debit), 100);
      assert.equal(total.debit, total.credit);
      await assert.rejects(move(journal, 'posted'), /immutable/);
    }));
  let employee;
  await test('payroll computes net on server and rejects duplicate employee pay periods', async () =>
    user(ids.admin, async () => {
      employee = await save(input('hr_employees', { title: 'Employee', reference: 'EMP-1' }));
      employee = await move(employee, 'active');
      const data = {
        employee_id: employee.id,
        pay_period: '2026-10',
        base_salary: 1000.1,
        allowances: 0.2,
        deductions: 100.15,
      };
      const payroll = await save(input('hr_payroll', { amount: 999999, data }));
      assert.equal(Number(payroll.amount), 900.15);
      await assert.rejects(save(input('hr_payroll', { data })), /duplicate key/);
    }));
  await test('overlapping submitted leave dates are rejected', async () =>
    user(ids.admin, async () => {
      const data = { employee_id: employee.id, start_date: '2026-11-01', end_date: '2026-11-05' };
      const first = await save(input('hr_leave', { data }));
      await move(first, 'submitted');
      const second = await save(
        input('hr_leave', { data: { ...data, start_date: '2026-11-05', end_date: '2026-11-08' } }),
      );
      await assert.rejects(move(second, 'submitted'), /already has leave/);
    }));
  await test('invoice issuance and partial receipts are atomic, balanced and idempotent', async () =>
    user(ids.admin, async () => {
      const draft = (
        await one(
          'SELECT public.save_invoice_draft($1,$2,$3::jsonb,current_date+7,NULL,$4) AS draft',
          [
            ids.company,
            ids.customer,
            JSON.stringify([{ product_id: ids.product, quantity: 1 }]),
            id(),
          ],
        )
      ).draft;
      const invoiceId = draft.invoice_id;
      const issue = () => one('SELECT public.issue_invoice($1) AS invoice', [invoiceId]);
      const issued = (await issue()).invoice;
      assert.equal(issued.status, 'issued');
      assert.equal(Number(issued.amount_due), 115);
      await issue();
      const paymentId = id();
      const pay = (amount = 50, request = paymentId) =>
        one(
          "SELECT public.record_invoice_payment($1,$2,'bank_transfer','BANK-123',$3) AS invoice",
          [invoiceId, amount, request],
        );
      const partial = (await pay()).invoice;
      assert.equal(partial.status, 'partial');
      assert.equal(Number(partial.amount_due), 65);
      await pay();
      assert.equal(
        Number(
          (await one('SELECT count(*) FROM public.payments WHERE invoice_id=$1', [invoiceId]))
            .count,
        ),
        1,
      );
      await assert.rejects(pay(66, id()), /exceeds/);
      await pay(65, id());
      assert.equal(
        (await one('SELECT status FROM public.invoices WHERE id=$1', [invoiceId])).status,
        'paid',
      );
      const ledger = await one(
        'SELECT sum(debit_amount) AS debit,sum(credit_amount) AS credit FROM public.journal_entry_lines',
      );
      assert.equal(ledger.debit, ledger.credit);
    }));
  await test('goods receipt retries do not duplicate stock, audit movements or ledger', async () =>
    user(ids.admin, async () => {
      const request = id();
      const receive = () =>
        one("SELECT public.receive_stock($1,$2,$3,5,'DELIVERY-1',$4) AS movement", [
          ids.company,
          ids.product,
          ids.warehouse,
          request,
        ]);
      const first = await receive(),
        second = await receive();
      assert.equal(first.movement, second.movement);
      assert.equal(
        Number(
          (
            await one(
              'SELECT quantity_available FROM public.inventory WHERE product_id=$1 AND warehouse_id=$2',
              [ids.product, ids.warehouse],
            )
          ).quantity_available,
        ),
        5,
      );
      const ledger = await one(
        'SELECT sum(l.debit_amount) AS debit,sum(l.credit_amount) AS credit FROM public.journal_entries j JOIN public.journal_entry_lines l ON l.journal_entry_id=j.id WHERE j.entry_number=$1',
        ['REC-' + request],
      );
      assert.equal(Number(ledger.debit), 150);
      assert.equal(ledger.debit, ledger.credit);
    }));
  console.log(`\n${count} business PostgreSQL checks passed.`);
} catch (error) {
  console.error(`FAIL ${error.message}${error.where ? `\n${error.where}` : ''}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
