import { supabase, isDemoMode } from '../lib/supabase';

export interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  subtotal: number;
  total: number;
}

export interface Sale {
  id?: string;
  company_id: string;
  branch_id: string;
  cashier_id: string;
  sale_number: string;
  sale_date: string;
  payment_method: 'cash' | 'card' | 'mada' | 'apple_pay' | 'bank_transfer' | 'split';
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  items: SaleItem[];
  status: 'completed' | 'cancelled' | 'refunded' | 'on_hold';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Shift {
  id?: string;
  cashier_id: string;
  branch_id: string;
  shift_number: string;
  start_time: string;
  end_time?: string;
  starting_cash: number;
  ending_cash?: number;
  total_sales?: number;
  total_cash?: number;
  total_card?: number;
  total_transactions?: number;
  status: 'open' | 'closed';
  created_at?: string;
  updated_at?: string;
}

/**
 * Generate a unique sale number
 */
function generateSaleNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `SALE-${timestamp}-${random}`.toUpperCase();
}

/**
 * Create a new sale
 */
export async function createSale(
  sale: Omit<Sale, 'id' | 'created_at' | 'updated_at' | 'sale_number'>,
): Promise<Sale> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create sales');
  }

  const saleNumber = generateSaleNumber();

  const { data, error } = await supabase
    .from('sales')
    .insert({
      ...sale,
      sale_number: saleNumber,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] createSale error:', error);
    throw error;
  }

  return data;
}

/**
 * Get sales for a specific cashier/shift
 */
export async function getSalesByShift(shiftId: string): Promise<Sale[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('shift_id', shiftId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] getSalesByShift error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get sales for a specific date range
 */
export async function getSalesByDateRange(
  companyId: string,
  startDate: string,
  endDate: string,
): Promise<Sale[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('company_id', companyId)
    .gte('sale_date', startDate)
    .lte('sale_date', endDate)
    .order('sale_date', { ascending: false });

  if (error) {
    console.error('[Supabase] getSalesByDateRange error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Open a new shift
 */
export async function openShift(
  cashierId: string,
  branchId: string,
  startingCash: number,
): Promise<Shift> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot open shift');
  }

  const shiftNumber = `SHIFT-${Date.now()}`;

  const { data, error } = await supabase
    .from('shifts')
    .insert({
      cashier_id: cashierId,
      branch_id: branchId,
      shift_number: shiftNumber,
      start_time: new Date().toISOString(),
      starting_cash: startingCash,
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] openShift error:', error);
    throw error;
  }

  return data;
}

/**
 * Close a shift
 */
export async function closeShift(
  shiftId: string,
  endingCash: number,
  summary: {
    total_sales: number;
    total_cash: number;
    total_card: number;
    total_transactions: number;
  },
): Promise<Shift> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot close shift');
  }

  const { data, error } = await supabase
    .from('shifts')
    .update({
      end_time: new Date().toISOString(),
      ending_cash: endingCash,
      ...summary,
      status: 'closed',
    })
    .eq('id', shiftId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] closeShift error:', error);
    throw error;
  }

  return data;
}

/**
 * Get current open shift for cashier
 */
export async function getCurrentShift(cashierId: string): Promise<Shift | null> {
  if (isDemoMode) {
    return null;
  }

  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('cashier_id', cashierId)
    .eq('status', 'open')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No open shift found
      return null;
    }
    console.error('[Supabase] getCurrentShift error:', error);
    throw error;
  }

  return data;
}

/**
 * Get shift summary
 */
export async function getShiftSummary(shiftId: string): Promise<{
  shift: Shift;
  sales: Sale[];
  totalSales: number;
  totalCash: number;
  totalCard: number;
  totalTransactions: number;
}> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot get shift summary');
  }

  // Get shift details
  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('*')
    .eq('id', shiftId)
    .single();

  if (shiftError) {
    console.error('[Supabase] getShiftSummary shift error:', shiftError);
    throw shiftError;
  }

  // Get all sales for this shift
  const sales = await getSalesByShift(shiftId);

  // Calculate totals
  const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalCash = sales
    .filter((s) => s.payment_method === 'cash')
    .reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalCard = sales
    .filter((s) => ['card', 'mada', 'apple_pay'].includes(s.payment_method))
    .reduce((sum, sale) => sum + sale.total_amount, 0);

  return {
    shift,
    sales,
    totalSales,
    totalCash,
    totalCard,
    totalTransactions: sales.length,
  };
}

/**
 * Hold a sale (save for later)
 */
export async function holdSale(
  sale: Omit<Sale, 'id' | 'created_at' | 'updated_at' | 'sale_number'>,
): Promise<Sale> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot hold sales');
  }

  const saleNumber = generateSaleNumber();

  const { data, error } = await supabase
    .from('sales')
    .insert({
      ...sale,
      sale_number: saleNumber,
      status: 'on_hold',
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] holdSale error:', error);
    throw error;
  }

  return data;
}

/**
 * Get held sales for cashier
 */
export async function getHeldSales(cashierId: string): Promise<Sale[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('cashier_id', cashierId)
    .eq('status', 'on_hold')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] getHeldSales error:', error);
    throw error;
  }

  return data || [];
}
