import { supabase, isDemoMode } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity_available: number;
  quantity_reserved: number;
  quantity_on_order?: number;
  last_counted_at: string | null;
  created_at: string;
  updated_at: string;

  product?: {
    id?: string;
    product_name: string;
    unit_price: number;
    min_stock_level: number;
    company_id?: string;
  };

  warehouse?: {
    name: string;
  };
}

export interface Product {
  id: string;
  company_id: string;
  category_id: string | null;
  sku: string;
  product_name: string;
  description: string | null;
  unit_price: number;
  cost_price: number;
  vat_rate: number;
  min_stock_level: number;
  reorder_point: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// List inventory items for a specific company.
export async function listInventory(
  companyId: string,
  warehouseId?: string,
): Promise<InventoryItem[]> {
  if (isDemoMode) {
    return [];
  }

  let query = supabase
    .from('inventory')
    .select(`
      *,
      product:products!inner(
        id,
        product_name,
        unit_price,
        min_stock_level,
        company_id
      ),
      warehouse:warehouses(name)
    `)
    .eq('product.company_id', companyId);

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Supabase] listInventory error:', error);
    throw error;
  }

  return (data ?? []) as InventoryItem[];
}

// Update inventory quantity.
export async function updateInventoryQuantity(
  inventoryId: string,
  quantityAvailable: number,
  quantityReserved: number,
): Promise<InventoryItem> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot update inventory');
  }

  const { data, error } = await supabase
    .from('inventory')
    .update({
      quantity_available: quantityAvailable,
      quantity_reserved: quantityReserved,
      last_counted_at: new Date().toISOString(),
    })
    .eq('id', inventoryId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] updateInventoryQuantity error:', error);
    throw error;
  }

  return data as InventoryItem;
}

// Get low stock products for a specific company.
interface LowStockProduct extends InventoryItem {
  product: {
    id: string;
    company_id: string;
    sku: string;
    product_name: string;
    min_stock_level: number;
    reorder_point: number | null;
  };
}

export async function getLowStockProducts(
  companyId: string,
): Promise<LowStockProduct[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('inventory')
    .select(
      `
      *,
      product:products!inner(
        id,
        sku,
        product_name,
        min_stock_level,
        reorder_point,
        company_id
      )
    `,
    )
    .eq('product.company_id', companyId);

  if (error) {
    console.error('[Supabase] getLowStockProducts error:', error);
    throw error;
  }

  return (data ?? []).filter(
    (item) => item.quantity_available < item.product.min_stock_level,
  ) as LowStockProduct[];
}
