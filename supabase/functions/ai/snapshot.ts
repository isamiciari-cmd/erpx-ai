import { AIError, AI_LIMITS } from './config.ts';
export const ISSUED_STATUSES = ['issued', 'sent', 'partial', 'paid', 'overdue'];
export const DATA_SCOPE = 'Read-only invoice summary: up to the newest 1,000 issued/sent/partial/paid/overdue invoices, ordered by issue date, creation time and ID; draft/void/cancelled invoices excluded. Credit notes reduce amounts. Currencies are separate. This is not a general ledger, profit, cash balance, forecast or HR report.';
const MAX_CENTS = 999999999999999n;
const FIELDS = ['subtotal', 'vat_amount', 'total_amount', 'amount_paid'] as const;
type InvoiceRow = Record<string, unknown>;
export interface InvoiceQuery {
  eq(column: string, value: string): InvoiceQuery;
  in(column: string, values: string[]): InvoiceQuery;
  order(column: string, options: { ascending: boolean; nullsFirst: boolean }): InvoiceQuery;
  limit(count: number): PromiseLike<{ data: unknown[] | null; error: unknown; count: number | null }>;
}
export interface AIDatabase {
  from(table: 'invoices'): { select(columns: string, options: { count: 'exact' }): InvoiceQuery };
  rpc(name: 'consume_integration_quota', values: { p_kind: 'ai' }): PromiseLike<{ error: unknown }>;
}
function dataError(): never { throw new AIError(503, 'data_unavailable', 'Invoice amounts could not be verified. No analysis was generated.'); }
/** Decimal parsing avoids binary floating-point accumulation and unsafe totals. */
export function moneyCents(value: unknown): bigint {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'number' && !Number.isFinite(value))) return dataError();
  const text = typeof value === 'number' && Math.abs(value) < 0.000001 ? '0' : String(value);
  if (text.length > 64) return dataError();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return dataError();
  const fraction = (match[3] || '').padEnd(3, '0');
  let cents = BigInt(match[2]) * 100n + BigInt(fraction.slice(0, 2));
  if (fraction[2] >= '5') cents += 1n;
  if (cents > MAX_CENTS) return dataError();
  return match[1] ? -cents : cents;
}
function decimal(cents: bigint): string {
  const absolute = cents < 0n ? -cents : cents;
  return (cents < 0n ? '-' : '') + (absolute / 100n).toString() + '.' + (absolute % 100n).toString().padStart(2, '0');
}
export function invoiceSnapshot(input: unknown[], eligibleCount = input.length) {
  if (!Array.isArray(input) || input.length > AI_LIMITS.invoiceLimit + 1) return dataError();
  if (!Number.isSafeInteger(eligibleCount) || eligibleCount < input.length) return dataError();
  const rows = input.slice(0, AI_LIMITS.invoiceLimit);
  const totals = new Map<string, { count: number; subtotal: bigint; vat_amount: bigint; total_amount: bigint; amount_paid: bigint }>();
  let creditNoteCount = 0;
  for (const item of rows) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return dataError();
    const row = item as InvoiceRow;
    if (!ISSUED_STATUSES.includes(String(row.status))) return dataError();
    const currency = row.currency_code;
    if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) return dataError();
    const credit = String(row.invoice_type_code) === '381';
    if (credit) creditNoteCount++;
    const group = totals.get(currency) || { count: 0, subtotal: 0n, vat_amount: 0n, total_amount: 0n, amount_paid: 0n };
    group.count++;
    for (const field of FIELDS) {
      const cents = moneyCents(row[field]);
      group[field] += credit ? -(cents < 0n ? -cents : cents) : cents;
    }
    totals.set(currency, group);
    if (totals.size > AI_LIMITS.currencyGroups) return dataError();
  }
  return { invoiceCount: rows.length, eligibleInvoiceCount: eligibleCount, creditNoteCount, truncated: eligibleCount > rows.length,
    currencies: [...totals].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([currency, amounts]) => ({ currency, invoiceCount: amounts.count,
      subtotal: decimal(amounts.subtotal), vat: decimal(amounts.vat_amount), total: decimal(amounts.total_amount), collected: decimal(amounts.amount_paid) })), scope: DATA_SCOPE };
}
export type InvoiceSnapshot = ReturnType<typeof invoiceSnapshot>;
export async function loadInvoiceSnapshot(db: AIDatabase, companyId: string): Promise<InvoiceSnapshot> {
  const { data, error, count } = await db.from('invoices')
    .select('id,issue_date,created_at,subtotal,vat_amount,total_amount,amount_paid,status,invoice_type_code,currency_code', { count: 'exact' })
    .eq('company_id', companyId).in('status', ISSUED_STATUSES)
    .order('issue_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false, nullsFirst: false }).limit(AI_LIMITS.invoiceLimit + 1);
  if (error || !data || count === null || !Number.isSafeInteger(count)) throw new AIError(503, 'data_unavailable', 'Invoice data is unavailable. No analysis was generated.');
  return invoiceSnapshot(data, count);
}
