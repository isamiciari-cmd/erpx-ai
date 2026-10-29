import { supabase, isDemoMode } from '../lib/supabase';

export interface Customer {
  id: string;
  company_id: string;
  customer_code: string | null;
  company_name: string;
  contact_name?: string | null;
  contact_person: string | null;
  email: string | null;
  phone?: string | null;
  phone_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  credit_limit: number | null;
  payment_terms: string | number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

type CustomerRow = Omit<Customer, 'contact_name' | 'contact_person' | 'phone' | 'phone_number'> &
  Partial<Pick<Customer, 'contact_name' | 'contact_person' | 'phone' | 'phone_number'>>;

/** Keep UI aliases while respecting the existing database's canonical fields. */
export function normalizeCustomer(row: CustomerRow): Customer {
  const contact = Object.hasOwn(row, 'contact_name')
    ? (row.contact_name ?? null)
    : (row.contact_person ?? null);
  const phone = Object.hasOwn(row, 'phone') ? (row.phone ?? null) : (row.phone_number ?? null);
  return { ...row, contact_name: contact, contact_person: contact, phone, phone_number: phone };
}

function customerWritePayload(input: Partial<Customer>, creating: boolean) {
  const payload: Record<string, unknown> = {};
  const columns = [
    'customer_code',
    'company_name',
    'email',
    'address',
    'city',
    'country',
    'credit_limit',
    'payment_terms',
    'status',
    ...(creating ? ['company_id'] : []),
  ];
  for (const column of columns) {
    if (Object.hasOwn(input, column) && input[column as keyof Customer] !== undefined) {
      payload[column] = input[column as keyof Customer];
    }
  }
  for (const [canonical, alias] of [
    ['contact_name', 'contact_person'],
    ['phone', 'phone_number'],
  ] as const) {
    const current = Object.hasOwn(input, canonical) && input[canonical] !== undefined;
    const legacy = Object.hasOwn(input, alias) && input[alias] !== undefined;
    if (current && legacy && input[canonical] !== input[alias]) {
      throw new Error(
        `Conflicting ${canonical} and ${alias} values. Submit one field or matching values.`,
      );
    }
    if (current || legacy) payload[canonical] = current ? input[canonical] : input[alias];
  }
  // Never send UI aliases, IDs, timestamps or a tenant change to PostgREST.
  return payload;
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

  return (data || []).map(normalizeCustomer);
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

  return data ? normalizeCustomer(data) : null;
}

// Create customer
export async function createCustomer(customerData: Partial<Customer>): Promise<Customer> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create customers');
  }

  const { data, error } = await supabase
    .from('customers')
    .insert(customerWritePayload(customerData, true))
    .select()
    .single();

  if (error) {
    console.error('[Supabase] createCustomer error:', error);
    throw error;
  }

  return normalizeCustomer(data);
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
    .update(customerWritePayload(updates, false))
    .eq('id', customerId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] updateCustomer error:', error);
    throw error;
  }

  return normalizeCustomer(data);
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

  return (data || []).map(normalizeCustomer);
}
