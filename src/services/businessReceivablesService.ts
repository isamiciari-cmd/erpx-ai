import { supabase, isDemoMode } from '../lib/supabase';
import type { Invoice } from './invoicesService';

function live() {
  if (isDemoMode) throw new Error('Connect Supabase to use invoice accounting and receipts.');
}
export async function issueBusinessInvoice(invoiceId: string): Promise<Invoice> {
  live();
  const { data, error } = await supabase.rpc('issue_invoice', { p_invoice_id: invoiceId });
  if (error) throw new Error(error.message);
  return data as Invoice;
}
export async function recordBusinessReceipt(
  invoiceId: string,
  amount: number,
  method: string,
  reference: string,
  requestId: string,
): Promise<Invoice> {
  live();
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a positive payment amount.');
  const { data, error } = await supabase.rpc('record_invoice_payment', {
    p_invoice_id: invoiceId,
    p_amount: amount,
    p_method: method,
    p_reference: reference,
    p_request_id: requestId,
  });
  if (error) throw new Error(error.message);
  return data as Invoice;
}
export async function listBusinessReceipts(companyId: string, invoiceId: string) {
  live();
  const { data, error } = await supabase
    .from('payments')
    .select('id,payment_number,payment_date,payment_method,amount,reference_number,status')
    .eq('company_id', companyId)
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
