import { supabase, isDemoMode } from '../lib/supabase';
import type { Product } from './productsService';
import type { InventoryItem } from './inventoryService';
export async function listBusinessProducts(companyId: string): Promise<Product[]> {
  if (isDemoMode) throw new Error('Connect Supabase to manage inventory.');
  const rows: Product[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .order('product_name')
      .order('id')
      .range(offset, offset + 499);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Product[];
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows;
}
export async function listBusinessInventory(companyId: string): Promise<InventoryItem[]> {
  if (isDemoMode) throw new Error('Connect Supabase to manage inventory.');
  const rows: InventoryItem[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('inventory')
      .select(
        '*,product:products!inner(id,product_name,unit_price,min_stock_level,company_id),warehouse:warehouses(name)',
      )
      .eq('product.company_id', companyId)
      .order('id')
      .range(offset, offset + 499);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as InventoryItem[];
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows;
}
export interface BusinessWarehouse {
  id: string;
  name: string;
  branch_id: string | null;
}
export async function listBusinessWarehouses(companyId: string): Promise<BusinessWarehouse[]> {
  if (isDemoMode) throw new Error('Connect Supabase to manage inventory.');
  const { data, error } = await supabase
    .from('warehouses')
    .select('id,name,branch_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function receiveBusinessStock(
  companyId: string,
  productId: string,
  warehouseId: string,
  quantity: number,
  reference: string,
  requestId: string,
) {
  if (isDemoMode) throw new Error('Connect Supabase to receive stock.');
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new Error('Quantity must be a positive whole number.');
  const { data, error } = await supabase.rpc('receive_stock', {
    p_company_id: companyId,
    p_product_id: productId,
    p_warehouse_id: warehouseId,
    p_quantity: quantity,
    p_reference: reference,
    p_request_id: requestId,
  });
  if (error) throw new Error(error.message);
  return data;
}
