import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createAssistantReceiptFixture } from './assistant-receipt-fixture.mjs';
import { openLocalReceiptPostgres, waitForReceiptSessions } from './assistant-receipt-postgres.mjs';

const database = await openLocalReceiptPostgres();
const fixture = await createAssistantReceiptFixture(() => database);
const propose = async (actor, number) => {
  const result = await fixture.act(actor, { action:'preview_receipt', invoiceNumber:number });
  assert.equal(result.proposal.amount,'75.00');
  return result.proposal;
};
const confirm = (actor, proposal) => fixture.act(actor, { action:'confirm_receipt', operationId:proposal.operationId, method:'cash' });

try {
  const number = 'QA-RECEIPT-11';
  const invoice = await fixture.createInvoice(number);
  const initial = await fixture.read(fixture.actor,number);
  assert.deepEqual([initial.total,initial.paid,initial.due],['115.00','40.00','75.00']);
  const [a,b] = await Promise.all([propose(fixture.actor,number),propose(fixture.peer,number)]);
  assert.notEqual(a.operationId,b.operationId);
  const blocker = await database.pool.connect();
  let pending, sessions;
  try {
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM invoices WHERE id=$1 FOR UPDATE',[invoice]);
    pending = Promise.allSettled([confirm(fixture.actor,a),confirm(fixture.peer,b)]);
    // Verify PostgreSQL backend processes are both waiting, rather than timing JavaScript promises.
    sessions = await waitForReceiptSessions(database);
    await blocker.query('COMMIT');
  } finally {
    await blocker.query('ROLLBACK').catch(()=>{});
    blocker.release();
  }
  const completed = await pending;
  assert.equal(new Set(sessions).size,2);
  const outcomes = completed.map(result => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
  assert.deepEqual(outcomes.map(result=>result.status).sort(),['confirmed','settled']);
  const losing = outcomes.find(result=>result.status==='settled');
  assert.equal(losing.currentDue,'0.00');
  assert.equal(losing.proposal,undefined);
  assert.deepEqual(await fixture.counts(invoice),{ payments:2,journals:2 });
  assert.equal((await fixture.read(fixture.actor,number)).due,'0.00');

  const changedNumber = 'QA-RECEIPT-12';
  const changedInvoice = await fixture.createInvoice(changedNumber);
  const review = await propose(fixture.actor,changedNumber);
  await fixture.pay(changedInvoice,10,crypto.randomUUID(),fixture.peer);
  const stale = await confirm(fixture.actor,review);
  assert.equal(stale.status,'changed');
  assert.equal(stale.proposal.amount,'65.00');
  assert.notEqual(stale.proposal.operationId,review.operationId);
  assert.deepEqual(await fixture.counts(changedInvoice),{ payments:2,journals:2 });
  assert.equal((await confirm(fixture.actor,stale.proposal)).status,'confirmed');
  assert.equal((await fixture.read(fixture.actor,changedNumber)).due,'0.00');
  assert.deepEqual(await fixture.counts(changedInvoice),{ payments:3,journals:3 });
  const evidence = {
    postgres: (await database.query('SHOW server_version')).rows[0].server_version,
    race: { sessions, outcomes: outcomes.map(item=>item.status), confirmedAmount:75, finalDue:0, newReceipts:1, newJournals:1, loserProposal:false },
    normalReceipt: { amount:10, refreshedDue:65, writesFromStaleConfirmation:0, explicitlyConfirmed:65, finalDue:0, newReceipts:2, newJournals:2 },
  };
  await mkdir('.tmp/assistant-receipt-race',{recursive:true});
  await writeFile('.tmp/assistant-receipt-race/report.json',JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
} finally {
  await fixture.close();
}
