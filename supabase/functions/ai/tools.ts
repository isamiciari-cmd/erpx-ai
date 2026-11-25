import { AIError } from './config.ts';
import { decimal as amount, ISSUED_STATUSES, moneyCents } from './snapshot.ts';

const LIMIT = 1000;
type Row = Record<string, unknown>;
export interface ReadQuery {
  eq(column: string, value: string | number | boolean): ReadQuery;
  in(column: string, values: string[]): ReadQuery;
  gte(column: string, value: string): ReadQuery;
  lt(column: string, value: string): ReadQuery;
  gt(column: string, value: number): ReadQuery;
  limit(maximum: number): PromiseLike<{ data: Row[] | null; error: unknown; count: number | null }>;
}
export interface ReadDatabase {
  from(table: string): { select(columns: string, options: { count: 'exact' }): ReadQuery };
}
export type ToolContext = { db: ReadDatabase; company: string; branch: string | null; branchName?: string; user: string; role: string };
const NAV = {
  dashboard: '/dashboard', invoices: '/finance/invoicing', inventory: '/inventory/manage',
  pos: '/cashier/pos', reports: '/reports',
} as const;
const cashier = ['shift_summary', 'navigation', 'unavailable'];
const descriptions = {
  sales_summary: 'Summarize completed recorded sales by currency over the requested trailing UTC days (1 to 90).',
  find_invoice: 'Find an exact invoice number explicitly mentioned in the question and show collection status.',
  overdue_receivables: 'Summarize current overdue customer invoice balances by currency.',
  low_stock: 'List products whose total available quantity is at or below the configured minimum.',
  shift_summary: 'Summarize the current open shift for the authenticated cashier. No identifiers are accepted.',
  navigation: 'Find the app route for dashboard, invoices, inventory, pos, or reports.',
  unavailable: 'Use for unsupported questions, writes, unspecified exact invoice number, unsupported periods or other requests.',
} as const;
type Name = keyof typeof descriptions;
export function allowedTools(role: string) {
  return (Object.keys(descriptions) as Name[]).filter(name => role !== 'cashier' || cashier.includes(name));
}
export function definitions(role: string) {
  return allowedTools(role).map(name => {
    const properties = name === 'sales_summary' ? { days: { type: 'integer' } }
      : name === 'find_invoice' ? { invoice_number: { type: 'string' } }
      : name === 'navigation' ? { destination: { type: 'string', enum: role === 'cashier' ? ['pos'] : Object.keys(NAV) } } : {};
    return { type: 'function', name, description: descriptions[name], strict: true,
      parameters: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } };
  });
}
function reject(): never { throw new AIError(400, 'invalid_request', 'Unsupported or invalid assistant tool request.'); }
function unavailable(): never { throw new AIError(503, 'data_unavailable', 'The scoped data could not be verified or exceeded the result limit.'); }
async function rows(query: ReadQuery) {
  const result = await query.limit(LIMIT);
  if (result.error || !result.data || result.count !== result.data.length || result.data.length > LIMIT) return unavailable();
  return result.data;
}
function currency(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) return unavailable();
  return value;
}
function integer(value: unknown) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return unavailable();
  return value;
}
function group(input: Row[], read: (row: Row) => [string, unknown]) {
  const totals = new Map<string, bigint>();
  for (const row of input) {
    const [code, value] = read(row);
    totals.set(code, (totals.get(code) ?? 0n) + moneyCents(value));
  }
  return [...totals].map(([code, total]) => `${amount(total)} ${code}`);
}
export async function runTool(context: ToolContext, name: string, raw: unknown, question: string, now: Date, ar: boolean) {
  const spec = definitions(context.role).find(tool => tool.name === name);
  if (!spec || !raw || typeof raw !== 'object' || Array.isArray(raw)) return reject();
  const args = raw as Row;
  const expected = spec.parameters.required;
  if (Object.keys(args).length !== expected.length || expected.some(key => !Object.hasOwn(args, key))) return reject();
  const t = (english: string, arabic: string) => ar ? arabic : english;
  const scoped = (table: string, columns: string) => {
    const query = context.db.from(table).select(columns, { count: 'exact' }).eq('company_id', context.company);
    return context.branch ? query.eq('branch_id', context.branch) : query;
  };
  const branch = context.branchName ? `${context.branchName} (${context.branch})` : context.branch;
  const scope = `${t('Company', 'الشركة')}: ${context.company} · ${t('Branch', 'الفرع')}: ${branch ?? t('all visible branches', 'كل الفروع المرئية')}`;
  const empty = t('No matching records in this scope.', 'لا توجد سجلات مطابقة ضمن هذا النطاق.');
  const date = now.toISOString().slice(0, 10);
  if (name === 'unavailable') return { message: t('This request is unavailable. Ask for a supported read or navigation.', 'هذا الطلب غير متاح. اسأل عن إحدى خدمات القراءة أو التنقل.'), scope };
  if (name === 'navigation') {
    const destination = args.destination;
    if (typeof destination !== 'string' || !Object.hasOwn(NAV, destination)) return reject();
    if (context.role === 'cashier' && destination !== 'pos') return reject();
    const path = destination === 'pos' && context.role !== 'cashier' ? '/pos' : NAV[destination as keyof typeof NAV];
    return { message: t('Open the relevant workspace using the link below.', 'افتح مساحة العمل من الرابط أدناه.'), scope, path };
  }
  if (name === 'shift_summary') {
    const result = await rows(scoped('shifts', 'shift_number,opened_at,total_sales,total_refunds').eq('cashier_id', context.user).eq('status', 'open'));
    return { message: result.length ? result.map(r => `${r.shift_number} · ${r.opened_at} · ${t('Sales', 'المبيعات')}: ${amount(moneyCents(r.total_sales))} · ${t('Refunds', 'المرتجعات')}: ${amount(moneyCents(r.total_refunds))} (${t('currency absent from shift record', 'العملة غير مسجلة في الوردية')})`).join('\n') : empty, scope };
  }
  if (name === 'find_invoice') {
    const number = args.invoice_number;
    if (typeof number !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(number) || !question.includes(number)) return reject();
    const result = await rows(scoped('invoices', 'id,invoice_number,status,currency_code,total_amount,amount_paid,amount_due').eq('invoice_number', number));
    const labels: Record<string, string> = { issued: 'صادرة', sent: 'مرسلة', partial: 'مدفوعة جزئيًا', paid: 'مدفوعة', overdue: 'متأخرة', unpaid: 'غير مدفوعة', draft: 'مسودة', cancelled: 'ملغاة', void: 'ملغاة', refunded: 'مستردة' };
    const status = (value: unknown) => labels[String(value)] ?? t('Unknown', 'غير محددة');
    const id = result[0]?.id;
    const path = typeof id === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
      ? `/finance/invoicing?invoice=${id}` : '/finance/invoicing';
    return { message: result.length ? result.map(r => `${r.invoice_number} · ${ar ? status(r.status) : r.status} · ${t('Total / paid / due', 'الإجمالي / المدفوع / المتبقي')}: ${[r.total_amount,r.amount_paid,r.amount_due].map(value => amount(moneyCents(value))).join(' / ')} ${currency(r.currency_code)}`).join('\n') : empty, scope, path };
  }
  if (name === 'sales_summary') {
    const days = args.days;
    if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 90) return reject();
    const start = new Date(Date.parse(date) - (days - 1) * 86400000).toISOString();
    const end = new Date(Date.parse(date) + 86400000).toISOString();
    const result = await rows(scoped('sales', 'total_amount,invoices!fk_sales_invoice!inner(currency_code,company_id)').eq('invoices.company_id', context.company).eq('status', 'completed').gte('sale_date', start).lt('sale_date', end));
    const totals = group(result, r => [currency((r.invoices as Row | null)?.currency_code), r.total_amount]);
    return { message: `${t('Completed sales linked to invoices', 'المبيعات المكتملة المرتبطة بفواتير')}: ${result.length}\n${totals.length ? totals.join('\n') : empty}`, scope: `${scope} · ${start.slice(0, 10)} – ${date} (UTC)`, path: '/finance/invoicing' };
  }
  if (name === 'overdue_receivables') {
    const result = await rows(scoped('invoices', 'currency_code,amount_due').in('status', [...ISSUED_STATUSES, 'unpaid']).lt('due_date', date).gt('amount_due', 0));
    const totals = group(result, r => [currency(r.currency_code), r.amount_due]);
    return { message: result.length ? `${t('Overdue invoices', 'الفواتير المتأخرة')}: ${result.length}\n${totals.join('\n')}` : empty, scope: `${scope} · ${date} (UTC)`, path: '/finance/invoicing' };
  }
  const products = await rows(context.db.from('products').select('id,sku,min_stock_level', { count: 'exact' }).eq('company_id', context.company).eq('is_active', true));
  const inventory = context.db.from('inventory').select('product_id,quantity_available,products!inner(company_id),warehouses!inner(company_id,branch_id)', { count: 'exact' })
    .eq('products.company_id', context.company).eq('warehouses.company_id', context.company);
  const quantities = new Map<unknown, number>();
  for (const r of await rows(context.branch ? inventory.eq('warehouses.branch_id', context.branch) : inventory)) {
    quantities.set(r.product_id, integer((quantities.get(r.product_id) ?? 0) + integer(r.quantity_available ?? 0)));
  }
  const low = products.filter(r => (quantities.get(r.id) ?? 0) <= integer(r.min_stock_level ?? 0))
    .sort((a, b) => String(a.sku).localeCompare(String(b.sku)));
  return { message: low.length ? [`${t('Low stock products (showing up to 20)', 'الأصناف منخفضة المخزون (حتى 20 صنفًا)')}: ${low.length}`,
    ...low.slice(0, 20).map(r => `${r.sku}: ${quantities.get(r.id) ?? 0} / ${r.min_stock_level ?? 0}`)].join('\n') : empty, scope, path: '/inventory/manage' };
}
