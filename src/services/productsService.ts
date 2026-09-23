import { supabase, isDemoMode } from '../lib/supabase';

export type ProductType = 'GOODS' | 'SERVICE' | 'ASSET';
export type TrackingMethod = 'NONE' | 'BATCH' | 'SERIAL';

export interface Product {
  id: string;
  company_id: string;

  // Identification
  item_code: string | null;
  sku: string;
  barcode: string | null;

  // Basic information
  product_name: string;
  description: string | null;
  category_id: string | null;
  unit_of_measure: string | null;
  product_type: ProductType;
  tracking_method: TrackingMethod;

  // Pricing
  unit_price: number;
  cost_price: number;
  vat_rate: number;

  // Inventory policy
  min_stock_level: number;
  max_stock_level: number | null;
  reorder_point: number | null;
  track_inventory: boolean;

  // Status / metadata
  is_active: boolean;
  images: unknown[];
  attributes: Record<string, unknown>;

  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;

  // Calculated field - not stored in products
  stock?: number;
}

export interface CreateProductInput {
  company_id: string;
  sku: string;
  product_name: string;

  category_id?: string | null;
  barcode?: string | null;
  description?: string | null;
  unit_of_measure?: string | null;

  product_type?: ProductType;
  tracking_method?: TrackingMethod;

  unit_price?: number;
  cost_price?: number;
  vat_rate?: number;

  min_stock_level?: number;
  max_stock_level?: number | null;
  reorder_point?: number | null;
  track_inventory?: boolean;

  is_active?: boolean;
  images?: unknown[];
  attributes?: Record<string, unknown>;

  created_by?: string | null;
  updated_by?: string | null;
}

export type UpdateProductInput = Partial<
  Omit<CreateProductInput, 'company_id'>
> & {
  updated_by?: string | null;
};

// List all products for a company.
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

  return (data ?? []) as Product[];
}

// Get a single product.
export async function getProduct(productId: string): Promise<Product | null> {
  if (isDemoMode) {
    return null;
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase] getProduct error:', error);
    throw error;
  }

  return data as Product | null;
}

// Create a product.
//
// item_code is intentionally NOT supplied here.
// PostgreSQL generates it through the database trigger.
export async function createProduct(
  productData: CreateProductInput | Partial<Product>,
): Promise<Product> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create products');
  }

  const payload = {
    ...productData,
  };

  delete (payload as Partial<Product>).id;
  delete (payload as Partial<Product>).item_code;
  delete (payload as Partial<Product>).created_at;
  delete (payload as Partial<Product>).updated_at;

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[Supabase] createProduct error:', error);
    throw error;
  }

  return data as Product;
}

// Update a product.
export async function updateProduct(
  productId: string,
  updates: UpdateProductInput | Partial<Product>,
): Promise<Product> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot update products');
  }

  const payload = {
    ...updates,
  };

  // System-managed fields must never be changed by the UI.
  delete (payload as Partial<Product>).id;
  delete (payload as Partial<Product>).company_id;
  delete (payload as Partial<Product>).item_code;
  delete (payload as Partial<Product>).created_at;
  delete (payload as Partial<Product>).updated_at;

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', productId)
    .select('*')
    .single();

  if (error) {
    console.error('[Supabase] updateProduct error:', error);
    throw error;
  }

  return data as Product;
}

// Archive/deactivate a product instead of physically deleting it.
export async function archiveProduct(productId: string): Promise<Product> {
  return updateProduct(productId, {
    is_active: false,
  });
}

// Kept for backward compatibility with existing diagnostic tools.
//
// New production UI should use archiveProduct() instead.
export async function deleteProduct(productId: string): Promise<void> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot delete products');
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    console.error('[Supabase] deleteProduct error:', error);
    throw error;
  }
}

// Search products by name, SKU, Item Code, barcode, or description.
export async function searchProducts(
  companyId: string,
  searchTerm: string,
): Promise<Product[]> {
  if (isDemoMode) {
    return [];
  }

  const term = searchTerm.trim();

  if (!term) {
    return listProducts(companyId);
  }

  const escapedTerm = term.replace(/[%_]/g, '\\$&');

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .or(
      [
        `product_name.ilike.%${escapedTerm}%`,
        `sku.ilike.%${escapedTerm}%`,
        `item_code.ilike.%${escapedTerm}%`,
        `barcode.ilike.%${escapedTerm}%`,
        `description.ilike.%${escapedTerm}%`,
      ].join(','),
    )
    .order('product_name', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[Supabase] searchProducts error:', error);
    throw error;
  }

  return (data ?? []) as Product[];
}

// Get product by barcode.
// Falls back to SKU because barcode scanners may sometimes provide
// an SKU/internal code depending on the device or integration.
export async function getProductByBarcode(
  companyId: string,
  barcode: string,
): Promise<Product | null> {
  if (isDemoMode) {
    return null;
  }

  const value = barcode.trim();

  if (!value) {
    return null;
  }

  const { data: barcodeProduct, error: barcodeError } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .eq('barcode', value)
    .eq('is_active', true)
    .maybeSingle();

  if (barcodeError) {
    console.error(
      '[Supabase] getProductByBarcode barcode lookup error:',
      barcodeError,
    );
    throw barcodeError;
  }

  if (barcodeProduct) {
    return barcodeProduct as Product;
  }

  const { data: skuProduct, error: skuError } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .eq('sku', value)
    .eq('is_active', true)
    .maybeSingle();

  if (skuError) {
    console.error(
      '[Supabase] getProductByBarcode SKU lookup error:',
      skuError,
    );
    throw skuError;
  }

  return skuProduct as Product | null;
}

// Get products with stock information.
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

  if (!data) {
    return [];
  }

  return data.map((product) => {
    const inventory = product.inventory ?? [];

    const stock = warehouseId
      ? inventory
          .filter((item: { warehouse_id: string }) => item.warehouse_id === warehouseId)
          .reduce(
            (sum: number, item: { quantity_available: number | null }) =>
              sum + (item.quantity_available ?? 0),
            0,
          )
      : inventory.reduce(
          (sum: number, item: { quantity_available: number | null }) =>
            sum + (item.quantity_available ?? 0),
          0,
        );

    const { inventory: _inventory, ...productData } = product;

    return {
      ...productData,
      stock,
    } as Product;
  });
}
