export type ReceiptActor = { user: string; company: string; branch: string; branchName: string };
export type ReceiptInvoice = { id: string; number: string; due: string; currency: string };
type Method = 'cash' | 'card' | 'mada' | 'apple_pay' | 'bank_transfer';
const methods: readonly string[] = ['cash', 'card', 'mada', 'apple_pay', 'bank_transfer'];
const validAmount = (value: string) => /^(?:0|[1-9]\d{0,12})\.\d{2}$/.test(value);
type Result = { status: 'changed'; due: string; currency: string; invoiceStatus: string } | { status: 'confirmed' };
type Store = {
  read: (actor: ReceiptActor, number: string) => Promise<ReceiptInvoice | null>;
  collect: (actor: ReceiptActor, invoice: ReceiptInvoice, id: string, method: Method, reference: string | null) => Promise<Result>;
};
export function createReceiptActions(store: Store) {
  const proposals = new Map<string, { actor: ReceiptActor; invoice: ReceiptInvoice; expiry: number; busy: boolean; immutable?: string }>();
  function proposal(actor: ReceiptActor, invoice: ReceiptInvoice) {
    for (const [id, entry] of proposals) if (!entry.busy && entry.expiry < Date.now()) proposals.delete(id);
    if (proposals.size >= 100 || !validAmount(invoice.due) || invoice.due === '0.00' || !/^[A-Z]{3}$/.test(invoice.currency)) return null;
    const operationId = crypto.randomUUID();
    proposals.set(operationId, { actor: { ...actor }, invoice, expiry: Date.now() + 15 * 60_000, busy: false });
    return { operationId, invoiceNumber: invoice.number, branch: actor.branchName, amount: invoice.due, currency: invoice.currency };
  }
  return async function act(actor: ReceiptActor, body: Record<string, unknown>) {
    if (body.action === 'preview_receipt') {
      if (typeof body.invoiceNumber !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(body.invoiceNumber) ||
          Object.keys(body).some(key => !['action','invoiceNumber'].includes(key))) return { status: 'invalid' };
      const invoice = await store.read(actor, body.invoiceNumber);
      return { status: 'preview', proposal: invoice ? proposal(actor, invoice) : null };
    }
    if (typeof body.operationId !== 'string') return { status: 'invalid' };
    const entry = proposals.get(body.operationId);
    if (!entry || entry.expiry < Date.now() || entry.actor.user !== actor.user ||
        entry.actor.company !== actor.company || entry.actor.branch !== actor.branch) return { status: 'denied' };
    if (entry.busy) return { status: 'busy' };
    if (body.action === 'cancel_receipt' && Object.keys(body).length === 2) {
      // Once a confirm could have committed, only a retry of those details can resolve it.
      if (entry.immutable) return { status: 'busy' };
      proposals.delete(body.operationId);
      return { status: 'cancelled' };
    }
    if (body.action !== 'confirm_receipt' || typeof body.method !== 'string' || !methods.includes(body.method) ||
        Object.keys(body).some(key => !['action','operationId','method','reference'].includes(key))) return { status: 'invalid' };
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    if (reference.length > 100 || (body.method !== 'cash' && !reference)) return { status: 'invalid' };
    const details = JSON.stringify([body.method, reference]);
    if (entry.immutable && entry.immutable !== details) return { status: 'invalid' };
    entry.immutable = details;
    entry.busy = true;
    try {
      const result = await store.collect(actor, entry.invoice, body.operationId, body.method as Method, reference || null);
      if (result.status === 'confirmed') return { status: 'confirmed', operationId: body.operationId };
      proposals.delete(body.operationId);
      if (result.due === '0.00' && result.invoiceStatus === 'paid') return { status: 'settled', currentDue: result.due };
      return { status: 'changed', currentDue: result.due,
        proposal: proposal(actor, { ...entry.invoice, due: result.due, currency: result.currency }) };
    } finally { entry.busy = false; }
  };
}
