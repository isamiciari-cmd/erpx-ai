import { supabase, isDemoMode } from '../lib/supabase';

export interface InventoryItem {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity_available: number;
  quantity_reserved: number;
  last_counted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  category_id: string;
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

// List inventory items
export async function listInventory(warehouseId?: string): Promise<InventoryItem[]> {
  if (isDemoMode) {
    return [];
  }

  let query = supabase.from('inventory').select(`
      *,
      product:products(product_name, unit_price, min_stock_level),
      warehouse:warehouses(name)
    `);

  if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Supabase] listInventory error:', error);
    throw error;
  }

  return data || [];
}

// Update inventory quantity
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

  return data;
}

// Get low stock products
interface LowStockProduct extends InventoryItem {
  product: Pick<Product, 'id' | 'sku' | 'product_name' | 'min_stock_level' | 'reorder_point'>;
}

export async function getLowStockProducts(companyId: string): Promise<LowStockProduct[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('inventory')
    .select(
      `
      *,
      product:products!inner(id, sku, product_name, min_stock_level, reorder_point, company_id)
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
