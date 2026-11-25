import assert from 'node:assert/strict';
import { createAssistantReceiptFixture } from './assistant-receipt-fixture.mjs';

const db = await createAssistantReceiptFixture();
try {
  const invoice = await db.createInvoice('QA-RECEIPT-01');
  const review = () => db.act(db.actor, { action:'preview_receipt', invoiceNumber:'QA-RECEIPT-01' });
  const confirm = operationId => ({ action:'confirm_receipt', operationId, method:'cash' });
  const amounts = async () => {
    const { total, paid, due } = await db.read(db.actor, 'QA-RECEIPT-01');
    return [total,paid,due];
  };
  const first = (await review()).proposal;
  assert.deepEqual(await amounts(), ['115.00','40.00','75.00']);
  assert.equal(first.amount, '75.00');
  assert.deepEqual(await db.counts(invoice), { payments:1,journals:1 });
  assert.equal((await db.act(db.actor,{action:'cancel_receipt',operationId:first.operationId})).status,'cancelled');
  assert.equal((await db.act(db.actor,confirm(first.operationId))).status,'denied');
  assert.deepEqual(await db.counts(invoice), { payments:1,journals:1 });
  console.log('PASS review and cancellation create no receipt or journal entry');

  const pending = (await review()).proposal;
  assert.equal((await db.act(db.other,confirm(pending.operationId))).status,'denied');
  const original = await db.read(db.actor,'QA-RECEIPT-01');
  await assert.rejects(db.collect(db.other,original,pending.operationId,'cash',null), error => error.code === '42501');
  await db.act(db.actor,confirm(pending.operationId)); // Commit before dropping the reply.
  assert.equal((await db.act(db.actor,confirm(pending.operationId))).status,'confirmed');
  assert.deepEqual(await amounts(), ['115.00','115.00','0.00']);
  assert.deepEqual(await db.counts(invoice), { payments:2,journals:2 });
  console.log('PASS collect 75 SAR and replay after lost reply, one new receipt and one journal entry');

  const stale = await db.createInvoice('QA-RECEIPT-02');
  const old = (await db.act(db.actor,{action:'preview_receipt',invoiceNumber:'QA-RECEIPT-02'})).proposal;
  await db.pay(stale, 10);
  const changed = await db.act(db.actor,confirm(old.operationId));
  assert.equal(changed.status,'changed');
  assert.equal(changed.proposal.amount,'65.00');
  assert.notEqual(changed.proposal.operationId,old.operationId);
  assert.deepEqual(await db.counts(stale), { payments:2,journals:2 });
  assert.equal((await db.act(db.actor, confirm(changed.proposal.operationId))).status, 'confirmed');
  assert.equal((await db.read(db.actor,'QA-RECEIPT-02')).due,'0.00');
  console.log('PASS changed balance requires a new explicit confirmation');

  const protectedInvoice = await db.createInvoice('QA-RECEIPT-03');
  const protectedAction = (await db.act(db.actor,{action:'preview_receipt',invoiceNumber:'QA-RECEIPT-03'})).proposal;
  await db.revoke();
  await assert.rejects(db.act(db.actor,confirm(protectedAction.operationId)), error => error.code === '42501');
  assert.deepEqual(await db.counts(protectedInvoice), {payments:1,journals:1});
  console.log('PASS permission revocation and cross-company confirmation denied');
} finally { await db.close(); }
