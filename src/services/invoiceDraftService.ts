import { supabase, isDemoMode } from '../lib/supabase';
export interface InvoiceDraftInput { companyId: string; customerId: string; items: { product_id: string; quantity: number; discount_percentage: number }[]; dueDate: string; notes: string; requestId: string }
export async function saveInvoiceDraft(input: InvoiceDraftInput) {
  if (isDemoMode) throw new Error('Connect your company database to create invoices.');
  if (!input.companyId || !input.customerId || !input.items.length || input.items.some(i => !i.product_id || !Number.isFinite(i.quantity) || i.quantity <= 0)) throw new Error('Choose a customer and valid invoice items.');
  const { data, error } = await supabase.rpc('save_invoice_draft', { p_company_id: input.companyId, p_customer_id: input.customerId, p_items: input.items, p_due_date: input.dueDate, p_notes: input.notes, p_request_id: input.requestId });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error('The invoice draft was not saved.');
  return data as { success: boolean; invoice_id: string; invoice_number: string; total_amount: number };
}
