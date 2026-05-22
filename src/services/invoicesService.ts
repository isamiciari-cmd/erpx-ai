import { supabase, isDemoMode } from '../lib/supabase';

export interface Invoice {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  qr_code: string | null;
  is_zatca_compliant: boolean;
  created_at: string;
  updated_at: string;
}

// List invoices
export async function listInvoices(companyId: string, status?: string): Promise<Invoice[]> {
  if (isDemoMode) {
    return [];
  }

  let query = supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(company_name)
    `)
    .eq('company_id', companyId)
    .order('issue_date', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Supabase] listInvoices error:', error);
    throw error;
  }

  return data || [];
}

// Get single invoice
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  if (isDemoMode) {
    return null;
  }

  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('id', invoiceId)
    .single();

  if (error) {
    console.error('[Supabase] getInvoice error:', error);
    throw error;
  }

  return data;
}

// Create invoice
export async function createInvoice(invoiceData: Partial<Invoice>): Promise<Invoice> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create invoices');
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert(invoiceData)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] createInvoice error:', error);
    throw error;
  }

  return data;
}

// Update invoice
export async function updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<Invoice> {
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

  return data;
}

// Delete invoice
export async function deleteInvoice(invoiceId: string): Promise<void> {
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

// Mark invoice as paid
export async function markInvoiceAsPaid(invoiceId: string, paymentAmount: number): Promise<Invoice> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot update invoices');
  }

  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'PAID',
      amount_paid: paymentAmount,
      amount_due: 0
    })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] markInvoiceAsPaid error:', error);
    throw error;
  }

  return data;
}
