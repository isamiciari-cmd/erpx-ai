import { supabase, isDemoMode } from '../lib/supabase';

export interface DashboardAnalytics {
  invoices: any[];
  salesOrders: any[];
  inventory: any[];
}

// Get dashboard analytics data
export async function getDashboardAnalytics(companyId: string): Promise<DashboardAnalytics> {
  if (isDemoMode) {
    // Return mock data for demo mode
    return {
      invoices: [],
      salesOrders: [],
      inventory: [],
    };
  }

  // Fetch invoices
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select(
      `
      *,
      customer:customers(company_name)
    `,
    )
    .eq('company_id', companyId)
    .order('issue_date', { ascending: false })
    .limit(100);

  if (invoicesError) {
    console.error('[Supabase] getDashboardAnalytics invoices error:', invoicesError);
    throw invoicesError;
  }

  // Fetch sales orders
  const { data: salesOrders, error: salesOrdersError } = await supabase
    .from('sales_orders')
    .select('*')
    .eq('company_id', companyId)
    .order('order_date', { ascending: false })
    .limit(100);

  if (salesOrdersError) {
    console.error('[Supabase] getDashboardAnalytics salesOrders error:', salesOrdersError);
    throw salesOrdersError;
  }

  // Fetch inventory
  const { data: inventory, error: inventoryError } = await supabase
    .from('inventory')
    .select(
      `
      *,
      product:products(product_name, unit_price)
    `,
    )
    .limit(100);

  if (inventoryError) {
    console.error('[Supabase] getDashboardAnalytics inventory error:', inventoryError);
    throw inventoryError;
  }

  return {
    invoices: invoices || [],
    salesOrders: salesOrders || [],
    inventory: inventory || [],
  };
}
