export interface MetricInvoice { issue_date: string; status: string; subtotal: number; vat_amount: number; total_amount: number; amount_paid: number; invoice_type_code?: string }
export function invoiceMetrics(invoices: MetricInvoice[], now = new Date()) {
  const rows = invoices.filter(i => !['draft', 'cancelled', 'void', 'refunded'].includes(i.status.toLowerCase()));
  const signed = (i: MetricInvoice, key: 'subtotal' | 'vat_amount' | 'total_amount' | 'amount_paid') => (i.invoice_type_code === '381' ? -1 : 1) * Number(i[key] || 0);
  const sum = (key: 'subtotal' | 'vat_amount' | 'total_amount' | 'amount_paid') => rows.reduce((total, invoice) => total + signed(invoice, key), 0);
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    const key = date.toISOString().slice(0, 7);
    const matched = rows.filter(i => i.issue_date.slice(0, 7) === key);
    return { month: key, total: matched.reduce((sum, i) => sum + signed(i, 'total_amount'), 0), collected: matched.reduce((sum, i) => sum + signed(i, 'amount_paid'), 0) };
  });
  return { count: rows.length, net: sum('subtotal'), vat: sum('vat_amount'), total: sum('total_amount'), collected: sum('amount_paid'), outstanding: sum('total_amount') - sum('amount_paid'), months };
}
