import { supabase, isDemoMode } from '../lib/supabase';

export interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount?: number;
  subtotal: number;
  total: number;
  vat_rate?: number;
  vat_amount?: number;
}

export interface Sale {
  id?: string;
  company_id: string;
  branch_id: string;
  cashier_id: string;
  shift_id?: string | null;
  customer_id?: string | null;
  invoice_id?: string | null;
  sale_number: string;
  sale_date: string;
  payment_method:
    | 'cash'
    | 'card'
    | 'mada'
    | 'apple_pay'
    | 'bank_transfer'
    | 'split'
    | 'credit';
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  items: SaleItem[];
  status:
    | 'draft'
    | 'completed'
    | 'cancelled'
    | 'refunded'
    | 'on_hold';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Shift {
  id?: string;
  company_id: string;
  branch_id: string;
  cashier_id: string;
  shift_number: string;
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number;
  closing_cash?: number | null;
  expected_cash?: number | null;
  cash_difference?: number | null;
  total_sales?: number;
  total_refunds?: number;
  status: 'open' | 'closed' | 'cancelled';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id?: string;
  company_id: string;
  branch_id?: string | null;
  customer_id?: string | null;
  invoice_id?: string | null;
  sales_order_id?: string | null;
  sale_id?: string | null;
  payment_number: string;
  payment_date: string;
  payment_method:
    | 'cash'
    | 'card'
    | 'mada'
    | 'apple_pay'
    | 'bank_transfer'
    | 'credit';
  amount: number;
  currency_code?: string;
  reference_number?: string | null;
  gateway?: string | null;
  gateway_transaction_id?: string | null;
  status:
    | 'pending'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'refunded';
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface CompletePOSSaleInput {
  company_id: string;
  branch_id: string;
  cashier_id: string;
  shift_id?: string | null;
  customer_id?: string | null;
  payment_method:
    | 'cash'
    | 'card'
    | 'mada'
    | 'apple_pay'
    | 'bank_transfer';
  items: SaleItem[];
  discount_amount?: number;
  notes?: string | null;
  /** Reuse this UUID when retrying an uncertain checkout response. */
  idempotency_key?: string;
  warehouse_id?: string | null;
}

export interface CompletePOSSaleResult {
  success: boolean;
  sale_id: string;
  sale_number: string;
  invoice_id: string;
  invoice_number: string;
  payment_id: string;
  payment_number: string;
  customer_id: string;
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  vat_amount: number;
  total_amount: number;
  journal_entry_id?: string;
  items?: SaleItem[];
}

const checkoutKeys = new Map<string, string>();
const inFlightCheckouts = new Map<string, Promise<CompletePOSSaleResult>>();

function checkoutPayload(input: CompletePOSSaleInput) {
  if (!input.company_id || !input.branch_id || !input.cashier_id || !input.shift_id) {
    throw new Error('Company, branch, cashier and an open shift are required');
  }
  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 500) {
    throw new Error('A sale requires 1 to 500 products');
  }
  const seen = new Set<string>();
  for (const item of input.items) {
    if (!item.product_id || seen.has(item.product_id)) throw new Error('Combine duplicate product lines before checkout');
    seen.add(item.product_id);
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.quantity > 1_000_000) {
      throw new Error('Quantity must be a positive whole number');
    }
    if (!Number.isFinite(item.discount_percentage) || item.discount_percentage < 0 || item.discount_percentage > 100) {
      throw new Error('Line discount must be between 0 and 100');
    }
  }
  const discount = input.discount_amount ?? 0;
  if (!Number.isFinite(discount) || discount < 0 || Math.abs(discount * 100 - Math.round(discount * 100)) > 1e-7) {
    throw new Error('Document discount must be a nonnegative monetary amount');
  }
  return {
    p_company_id: input.company_id,
    p_branch_id: input.branch_id,
    p_cashier_id: input.cashier_id,
    p_shift_id: input.shift_id,
    p_payment_method: input.payment_method,
    p_customer_id: input.customer_id ?? null,
    // Send intent only. The database reads catalog prices and taxes itself.
    p_items: input.items.map(item => ({ product_id: item.product_id, quantity: item.quantity, discount_percentage: item.discount_percentage })),
    p_discount_amount: discount,
    p_notes: input.notes ?? null,
    p_warehouse_id: input.warehouse_id ?? null,
  };
}

export async function completePOSSale(
  input: CompletePOSSaleInput,
): Promise<CompletePOSSaleResult> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot complete POS sales');
  }

  const payload = checkoutPayload(input);
  const fingerprint = JSON.stringify({ ...payload, explicitKey: input.idempotency_key });
  const pending = inFlightCheckouts.get(fingerprint);
  if (pending) return pending;
  const requestKey = input.idempotency_key ?? checkoutKeys.get(fingerprint) ?? crypto.randomUUID();
  checkoutKeys.set(fingerprint, requestKey);
  const request = (async () => {
    const { data, error } = await supabase.rpc('complete_pos_sale', { ...payload, p_idempotency_key: requestKey });
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') {
        throw new Error('The transactional POS migration has not been deployed to this database');
      }
      throw error;
    }
    if (!data || data.success !== true) throw new Error('POS transaction failed');
    checkoutKeys.delete(fingerprint);
    return data as CompletePOSSaleResult;
  })();
  inFlightCheckouts.set(fingerprint, request);
  try { return await request; }
  finally { inFlightCheckouts.delete(fingerprint); }
}

export async function createSale(
  saleData: Omit<Sale, 'id' | 'created_at' | 'updated_at' | 'sale_number'>,
): Promise<Sale> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create sales');
  }

  const saleNumber = `POS-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

  const { data, error } = await supabase
    .from('sales')
    .insert({
      ...saleData,
      sale_number: saleNumber,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] createSale error:', error);
    throw error;
  }

  return data as Sale;
}

export async function getSale(saleId: string): Promise<Sale | null> {
  if (isDemoMode) return null;

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('id', saleId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] getSale error:', error);
    throw error;
  }

  return data as Sale | null;
}

export async function getSales(
  companyId: string,
  options?: {
    branchId?: string;
    status?: Sale['status'];
    from?: string;
    to?: string;
  },
): Promise<Sale[]> {
  if (isDemoMode) return [];

  let query = supabase
    .from('sales')
    .select('*')
    .eq('company_id', companyId)
    .order('sale_date', { ascending: false });

  if (options?.branchId) {
    query = query.eq('branch_id', options.branchId);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.from) {
    query = query.gte('sale_date', options.from);
  }

  if (options?.to) {
    query = query.lte('sale_date', options.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Supabase] getSales error:', error);
    throw error;
  }

  return (data ?? []) as Sale[];
}

export async function getSalesByShift(
  companyId: string,
  shiftId: string,
): Promise<Sale[]> {
  if (isDemoMode) return [];

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('company_id', companyId)
    .eq('shift_id', shiftId)
    .order('sale_date', { ascending: true });

  if (error) throw error;

  return (data ?? []) as Sale[];
}

export async function updateSale(
  saleId: string,
  updates: Partial<Pick<Sale, 'status' | 'notes' | 'customer_id' | 'invoice_id'>>,
): Promise<Sale> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot update sales');
  }

  const { data, error } = await supabase
    .from('sales')
    .update(updates)
    .eq('id', saleId)
    .select()
    .single();

  if (error) throw error;

  return data as Sale;
}

export async function cancelSale(saleId: string): Promise<Sale> {
  return updateSale(saleId, { status: 'cancelled' });
}

export async function deleteSale(saleId: string): Promise<void> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot delete sales');
  }

  const { data, error } = await supabase
    .from('sales')
    .delete()
    .eq('id', saleId)
    .select('id');

  if (error) throw error;
  if (!data?.length) throw new Error('This draft is unavailable or was resumed on another terminal');
}

export async function openShift(
  shiftData: Omit<Shift, 'id' | 'created_at' | 'updated_at'>,
): Promise<Shift> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot open shifts');
  }

  const { data, error } = await supabase
    .from('shifts')
    .insert(shiftData)
    .select()
    .single();

  if (error) throw error;

  return data as Shift;
}

export async function getCurrentShift(
  companyId: string,
  branchId: string,
  cashierId: string,
): Promise<Shift | null> {
  if (isDemoMode) return null;

  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('company_id', companyId)
    .eq('branch_id', branchId)
    .eq('cashier_id', cashierId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data as Shift | null;
}
export async function closeShift(
  shiftId: string,
  closingCash: number,
): Promise<Shift> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot close shifts');
  }

  if (!Number.isFinite(closingCash) || closingCash < 0) throw new Error('Closing cash must be a nonnegative amount');
  const { data, error } = await supabase.rpc('close_pos_shift', { p_shift_id: shiftId, p_closing_cash: closingCash });
  if (error) throw error;
  return data as Shift;
}

export async function getShiftSummary(
  companyId: string,
  shiftId: string,
): Promise<{
  totalSales: number;
  totalRefunds: number;
  transactionCount: number;
  paymentBreakdown: Record<string, number>;
}> {
  if (isDemoMode) {
    return {
      totalSales: 0,
      totalRefunds: 0,
      transactionCount: 0,
      paymentBreakdown: {},
    };
  }

  const { data: sales, error } = await supabase
    .from('sales')
    .select('id, total_amount, status')
    .eq('company_id', companyId)
    .eq('shift_id', shiftId);

  if (error) throw error;

  const completedSales = (sales ?? []).filter(
    (sale) => sale.status === 'completed',
  );

  const totalSales = completedSales.reduce(
    (sum, sale) => sum + Number(sale.total_amount ?? 0),
    0,
  );

  const totalRefunds = (sales ?? [])
    .filter((sale) => sale.status === 'refunded')
    .reduce(
      (sum, sale) => sum + Number(sale.total_amount ?? 0),
      0,
    );

  const { data: payments, error: paymentError } = await supabase
    .from('payments')
    .select('payment_method, amount')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .in(
      'sale_id',
      completedSales.map((sale) => sale.id),
    );

  if (paymentError) throw paymentError;

  const paymentBreakdown: Record<string, number> = {};

  for (const payment of payments ?? []) {
    const method = payment.payment_method;
    paymentBreakdown[method] =
      (paymentBreakdown[method] ?? 0) + Number(payment.amount ?? 0);
  }

  return {
    totalSales,
    totalRefunds,
    transactionCount: completedSales.length,
    paymentBreakdown,
  };
}

export async function createPayment(
  paymentData: Omit<Payment, 'id' | 'created_at'>,
): Promise<Payment> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create payments');
  }

  const paymentNumber =
    paymentData.payment_number ||
    `PAY-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...paymentData,
      payment_number: paymentNumber,
    })
    .select()
    .single();

  if (error) throw error;

  return data as Payment;
}

export async function getPaymentsBySale(
  companyId: string,
  saleId: string,
): Promise<Payment[]> {
  if (isDemoMode) return [];

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('company_id', companyId)
    .eq('sale_id', saleId)
    .order('payment_date', { ascending: true });

  if (error) throw error;

  return (data ?? []) as Payment[];
}

export async function getPaymentsByInvoice(
  companyId: string,
  invoiceId: string,
): Promise<Payment[]> {
  if (isDemoMode) return [];

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('company_id', companyId)
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: true });

  if (error) throw error;

  return (data ?? []) as Payment[];
}

export async function createSplitPayments(
  payments: Array<Omit<Payment, 'id' | 'created_at'>>,
): Promise<Payment[]> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create payments');
  }

  if (payments.length === 0) {
    throw new Error('At least one payment is required');
  }

  const payload = payments.map((payment) => ({
    ...payment,
    payment_number:
      payment.payment_number ||
      `PAY-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`,
  }));

  const { data, error } = await supabase
    .from('payments')
    .insert(payload)
    .select();

  if (error) throw error;

  return (data ?? []) as Payment[];
}

export async function refundPayment(
  paymentId: string,
): Promise<Payment> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot refund payments');
  }

  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'refunded' })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;

  return data as Payment;
}

export async function holdSale(saleId: string): Promise<Sale> {
  return updateSale(saleId, { status: 'on_hold' });
}

export async function getHeldSales(companyId: string): Promise<Sale[]> {
  return getSales(companyId, { status: 'on_hold' });
}





