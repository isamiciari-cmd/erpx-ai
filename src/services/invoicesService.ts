import { supabase, isDemoMode } from '../lib/supabase';

export interface Invoice {
  id: string;
  uuid: string | null;
  company_id: string;
  branch_id: string | null;
  customer_id: string;
  sales_order_id: string | null;

  invoice_number: string;
  issue_date: string;
  issue_time: string | null;
  supply_date: string | null;
  due_date: string;

  reference_number: string | null;
  currency_code: string;
  tax_currency_code: string | null;

  invoice_type_code: string;
  invoice_subtype: string;

  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total_amount: number;

  taxable_amount: number;
  tax_exclusive_amount: number;
  tax_inclusive_amount: number;

  allowance_total_amount: number;
  charge_total_amount: number;

  amount_paid: number;
  amount_due: number;
  payable_amount: number;

  payment_status: string;
  status: string;

  previous_invoice_hash: string | null;
  invoice_hash: string | null;
  document_hash: string | null;
  cryptographic_stamp: string | null;

  clearance_status: string;
  reporting_status: string;
  zatca_uuid: string | null;
  submission_id: string | null;
  zatca_environment: string | null;

  qr_code: string | null;
  qr_code_base64: string | null;
  xml_content: string | null;

  last_submitted_at: string | null;
  last_response_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;

  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateInvoiceInput = {
  company_id: string;
  branch_id?: string | null;
  customer_id: string;
  sales_order_id?: string | null;

  invoice_number: string;
  issue_date: string;
  issue_time?: string | null;
  supply_date?: string | null;
  due_date: string;

  reference_number?: string | null;

  currency_code?: string;
  tax_currency_code?: string | null;

  invoice_type_code?: string;
  invoice_subtype?: string;

  subtotal: number;
  discount_amount?: number;
  vat_amount: number;
  total_amount: number;

  taxable_amount?: number;
  tax_exclusive_amount?: number;
  tax_inclusive_amount?: number;

  allowance_total_amount?: number;
  charge_total_amount?: number;

  amount_paid?: number;
  amount_due?: number;
  payable_amount?: number;

  payment_status?: string;
  status?: string;

  notes?: string | null;
  created_by: string;
};

export type UpdateInvoiceInput = Partial<{
  reference_number: string | null;
  due_date: string;
  notes: string | null;

  qr_code: string | null;
  qr_code_base64: string | null;
  xml_content: string | null;

  previous_invoice_hash: string | null;
  invoice_hash: string | null;
  document_hash: string | null;
  cryptographic_stamp: string | null;

  clearance_status: string;
  reporting_status: string;
  zatca_uuid: string | null;
  submission_id: string | null;
  zatca_environment: string | null;

  last_submitted_at: string | null;
  last_response_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;

  status: string;
}>;

export async function listInvoices(
  companyId: string,
  status?: string,
): Promise<Invoice[]> {
  if (isDemoMode) return [];

  const invoices: Invoice[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from('invoices').select('*, customer:customers(*)').eq('company_id', companyId).order('issue_date', { ascending: false }).order('id').range(offset, offset + 499);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Invoice[];
    invoices.push(...page);
    if (page.length < 500) break;
  }
  return invoices;
}

export async function getInvoice(
  invoiceId: string,
): Promise<Invoice | null> {
  if (isDemoMode) return null;

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(*),
      sales_order:sales_orders(*),
      lines:invoice_lines(*)
    `)
    .eq('id', invoiceId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] getInvoice error:', error);
    throw error;
  }

  return data as Invoice | null;
}

export async function createInvoice(
  invoiceData: CreateInvoiceInput,
): Promise<Invoice> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create invoices');
  }

  const payload = {
    ...invoiceData,
    currency_code: invoiceData.currency_code ?? 'SAR',
    invoice_type_code: invoiceData.invoice_type_code ?? '388',
    invoice_subtype: invoiceData.invoice_subtype ?? '01',

    discount_amount: invoiceData.discount_amount ?? 0,
    taxable_amount: invoiceData.taxable_amount ?? invoiceData.subtotal,
    tax_exclusive_amount:
      invoiceData.tax_exclusive_amount ?? invoiceData.subtotal,
    tax_inclusive_amount:
      invoiceData.tax_inclusive_amount ?? invoiceData.total_amount,

    allowance_total_amount:
      invoiceData.allowance_total_amount ?? 0,
    charge_total_amount:
      invoiceData.charge_total_amount ?? 0,

    amount_paid: invoiceData.amount_paid ?? 0,
    amount_due:
      invoiceData.amount_due ??
      Math.max(
        0,
        invoiceData.payable_amount ?? invoiceData.total_amount,
      ),

    payable_amount:
      invoiceData.payable_amount ?? invoiceData.total_amount,

    payment_status:
      invoiceData.payment_status ??
      (invoiceData.amount_paid && invoiceData.amount_paid > 0
        ? 'partial'
        : 'unpaid'),

    status: invoiceData.status ?? 'draft',
  };

  const { data, error } = await supabase
    .from('invoices')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] createInvoice error:', error);
    throw error;
  }

  return data as Invoice;
}

export async function updateInvoice(
  invoiceId: string,
  updates: UpdateInvoiceInput,
): Promise<Invoice> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot update invoices');
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] updateInvoice error:', error);
    throw error;
  }

  return data as Invoice;
}

export async function deleteInvoice(
  invoiceId: string,
): Promise<void> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot delete invoices');
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId);

  if (error) {
    console.error('[Supabase] deleteInvoice error:', error);
    throw error;
  }
}

export async function getInvoicesByCustomer(
  companyId: string,
  customerId: string,
): Promise<Invoice[]> {
  if (isDemoMode) return [];

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('company_id', companyId)
    .eq('customer_id', customerId)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error('[Supabase] getInvoicesByCustomer error:', error);
    throw error;
  }

  return (data ?? []) as Invoice[];
}

export async function getOutstandingInvoices(
  companyId: string,
): Promise<Invoice[]> {
  if (isDemoMode) return [];

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('company_id', companyId)
    .gt('amount_due', 0)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('[Supabase] getOutstandingInvoices error:', error);
    throw error;
  }

  return (data ?? []) as Invoice[];
}

/**
 * Payments are now the source of truth for settlement.
 * Do not directly modify amount_paid / amount_due here.
 */
export async function markInvoiceAsPaid(
  invoiceId: string,
  paymentAmount: number,
): Promise<Invoice> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create payments');
  }

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, company_id, branch_id, customer_id, amount_due')
    .eq('id', invoiceId)
    .single();

  if (invoiceError) {
    throw invoiceError;
  }

  if (paymentAmount > Number(invoice.amount_due ?? 0)) {
    throw new Error('Payment amount exceeds invoice outstanding amount');
  }

  const paymentNumber = `PAY-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      company_id: invoice.company_id,
      branch_id: invoice.branch_id,
      customer_id: invoice.customer_id,
      invoice_id: invoice.id,
      payment_number: paymentNumber,
      payment_date: new Date().toISOString(),
      payment_method: 'cash',
      amount: paymentAmount,
      currency_code: 'SAR',
      status: 'completed',
    });

  if (paymentError) {
    console.error('[Supabase] markInvoiceAsPaid payment error:', paymentError);
    throw paymentError;
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (error) {
    throw error;
  }

  return data as Invoice;
}
