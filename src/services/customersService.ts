import { supabase, isDemoMode } from '../lib/supabase';

export interface Customer {
  id: string;
  company_id: string;
  customer_code: string | null;
  company_name: string;
  contact_person: string | null;
  email: string;
  phone_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  credit_limit: number;
  payment_terms: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// List all customers for a company
export async function listCustomers(companyId: string): Promise<Customer[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('company_id', companyId)
    .order('company_name', { ascending: true });

  if (error) {
    console.error('[Supabase] listCustomers error:', error);
    throw error;
  }

  return data || [];
}

// Get single customer
export async function getCustomer(customerId: string): Promise<Customer | null> {
  if (isDemoMode) {
    return null;
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error) {
    console.error('[Supabase] getCustomer error:', error);
    throw error;
  }

  return data;
}

// Create customer
export async function createCustomer(customerData: Partial<Customer>): Promise<Customer> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create customers');
  }

  const { data, error } = await supabase.from('customers').insert(customerData).select().single();

  if (error) {
    console.error('[Supabase] createCustomer error:', error);
    throw error;
  }

  return data;
}

// Update customer
export async function updateCustomer(
  customerId: string,
  updates: Partial<Customer>,
): Promise<Customer> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot update customers');
  }

  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] updateCustomer error:', error);
    throw error;
  }

  return data;
}

// Delete customer
export async function deleteCustomer(customerId: string): Promise<void> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot delete customers');
  }

  const { error } = await supabase.from('customers').delete().eq('id', customerId);

  if (error) {
    console.error('[Supabase] deleteCustomer error:', error);
    throw error;
  }
}

// Search customers
export async function searchCustomers(companyId: string, searchTerm: string): Promise<Customer[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('company_id', companyId)
    .or(`company_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .limit(20);

  if (error) {
    console.error('[Supabase] searchCustomers error:', error);
    throw error;
  }

  return data || [];
}
