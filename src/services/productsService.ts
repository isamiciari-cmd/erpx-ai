import { supabase, isDemoMode } from '../lib/supabase';

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
  barcode?: string;
  stock?: number;
  created_at: string;
  updated_at: string;
}

// List all products for a company
export async function listProducts(companyId: string): Promise<Product[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .order('product_name', { ascending: true });

  if (error) {
    console.error('[Supabase] listProducts error:', error);
    throw error;
  }

  return data || [];
}

// Get single product
export async function getProduct(productId: string): Promise<Product | null> {
  if (isDemoMode) {
    return null;
  }

  const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();

  if (error) {
    console.error('[Supabase] getProduct error:', error);
    throw error;
  }

  return data;
}

// Create product
export async function createProduct(productData: Partial<Product>): Promise<Product> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create products');
  }

  const { data, error } = await supabase.from('products').insert(productData).select().single();

  if (error) {
    console.error('[Supabase] createProduct error:', error);
    throw error;
  }

  return data;
}

// Update product
export async function updateProduct(
  productId: string,
  updates: Partial<Product>,
): Promise<Product> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot update products');
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] updateProduct error:', error);
    throw error;
  }

  return data;
}

// Delete product
export async function deleteProduct(productId: string): Promise<void> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot delete products');
  }

  const { error } = await supabase.from('products').delete().eq('id', productId);

  if (error) {
    console.error('[Supabase] deleteProduct error:', error);
    throw error;
  }
}

// Search products
export async function searchProducts(companyId: string, searchTerm: string): Promise<Product[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .or(
      `product_name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
    )
    .limit(20);

  if (error) {
    console.error('[Supabase] searchProducts error:', error);
    throw error;
  }

  return data || [];
}

// Get product by barcode/SKU
export async function getProductByBarcode(
  companyId: string,
  barcode: string,
): Promise<Product | null> {
  if (isDemoMode) {
    return null;
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .eq('sku', barcode)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('[Supabase] getProductByBarcode error:', error);
    return null;
  }

  return data;
}

// Get products with stock information
export async function getProductsWithStock(
  companyId: string,
  warehouseId?: string,
): Promise<Product[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      *,
      inventory (
        quantity_available,
        warehouse_id
      )
    `,
    )
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('product_name', { ascending: true });

  if (error) {
    console.error('[Supabase] getProductsWithStock error:', error);
    throw error;
  }

  if (!data) return [];

  // Calculate stock for each product
  return data.map((product: any) => {
    const inventory = product.inventory || [];
    let totalStock = 0;

    if (warehouseId) {
      const warehouseInventory = inventory.find((inv: any) => inv.warehouse_id === warehouseId);
      totalStock = warehouseInventory?.quantity_available || 0;
    } else {
      totalStock = inventory.reduce(
        (sum: number, inv: any) => sum + (inv.quantity_available || 0),
        0,
      );
    }

    return {
      ...product,
      stock: totalStock,
      inventory: undefined, // Remove inventory array from result
    };
  });
}
