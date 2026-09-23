import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Clock,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Archive,
  RefreshCw,
  X,
} from 'lucide-react';

import { useInventory, useProducts } from '../../hooks/useSupabaseQuery';
import { archiveProduct, createProduct, type CreateProductInput, type Product } from '../../services/productsService';
import type { InventoryItem } from '../../services/inventoryService';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { useAuth } from '../../contexts/AuthContext';

const INITIAL_FORM: Omit<CreateProductInput, 'company_id'> = {
  sku: '',
  product_name: '',
  category_id: null,
  barcode: null,
  description: null,
  unit_of_measure: 'PCS',
  product_type: 'GOODS',
  tracking_method: 'NONE',
  unit_price: 0,
  cost_price: 0,
  vat_rate: 15,
  min_stock_level: 0,
  max_stock_level: null,
  reorder_point: null,
  track_inventory: true,
  is_active: true,
  images: [],
  attributes: {},
};

export default function InventoryPageNew() {
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const {
    data: inventory,
    loading: inventoryLoading,
    error: inventoryError,
    refetch: refetchInventory,
  } = useInventory();

  const {
    data: products,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useProducts();

  const inventoryItems: InventoryItem[] = inventory ?? [];
  const productItems: Product[] = products ?? [];

  /*
   * Build a product -> inventory map.
   *
   * A product does not have to have an inventory row immediately after
   * creation. This is intentional: opening balances and stock movements
   * should be recorded through the inventory movement system.
   */
  const inventoryByProduct = useMemo(() => {
    const map = new Map<string, InventoryItem>();

    for (const item of inventoryItems) {
      const existing = map.get(item.product_id);

      if (!existing) {
        map.set(item.product_id, item);
        continue;
      }

      map.set(item.product_id, {
        ...existing,
        quantity_available:
          existing.quantity_available + item.quantity_available,
        quantity_reserved:
          existing.quantity_reserved + item.quantity_reserved,
      });
    }

    return map;
  }, [inventoryItems]);

  const getProductStock = (productId: string) =>
    inventoryByProduct.get(productId)?.quantity_available ?? 0;

  const getProductReserved = (productId: string) =>
    inventoryByProduct.get(productId)?.quantity_reserved ?? 0;

  const availableStock = productItems.reduce(
    (sum, product) => sum + getProductStock(product.id),
    0,
  );

  const reservedStock = productItems.reduce(
    (sum, product) => sum + getProductReserved(product.id),
    0,
  );

  const totalStockValue = productItems.reduce(
    (sum, product) =>
      sum + getProductStock(product.id) * Number(product.cost_price ?? 0),
    0,
  );

  const lowStockItems = productItems.filter((product) => {
    if (!product.is_active || !product.track_inventory) {
      return false;
    }

    const stock = getProductStock(product.id);
    return stock <= Number(product.min_stock_level ?? 0);
  });

  const lowStockCount = lowStockItems.length;

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return productItems;
    }

    return productItems.filter((product) => {
      return (
        product.product_name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search) ||
        (product.item_code ?? '').toLowerCase().includes(search) ||
        (product.barcode ?? '').toLowerCase().includes(search)
      );
    });
  }, [productItems, searchTerm]);

  const openAddModal = () => {
    setFormData(INITIAL_FORM);
    setFormError(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (saving) return;

    setShowAddModal(false);
    setFormError(null);
  };

  const updateField = <K extends keyof typeof INITIAL_FORM>(
    field: K,
    value: (typeof INITIAL_FORM)[K],
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAddProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.company_id) {
      setFormError('No company is associated with the current user.');
      return;
    }

    const sku = formData.sku.trim();
    const productName = formData.product_name.trim();

    if (!sku) {
      setFormError('SKU is required.');
      return;
    }

    if (!productName) {
      setFormError('Product name is required.');
      return;
    }

    if (Number(formData.unit_price) < 0) {
      setFormError('Selling price cannot be negative.');
      return;
    }

    if (Number(formData.cost_price) < 0) {
      setFormError('Cost price cannot be negative.');
      return;
    }

    if (Number(formData.vat_rate) < 0 || Number(formData.vat_rate) > 100) {
      setFormError('VAT rate must be between 0 and 100.');
      return;
    }

    if (Number(formData.min_stock_level) < 0) {
      setFormError('Minimum stock level cannot be negative.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const created = await createProduct({
        company_id: user.company_id,
        sku,
        product_name: productName,
        category_id: formData.category_id || null,
        barcode: formData.barcode?.trim() || null,
        description: formData.description?.trim() || null,
        unit_of_measure: formData.unit_of_measure?.trim() || 'PCS',
        product_type: formData.product_type,
        tracking_method: formData.tracking_method,
        unit_price: Number(formData.unit_price) || 0,
        cost_price: Number(formData.cost_price) || 0,
        vat_rate: Number(formData.vat_rate) || 0,
        min_stock_level: Number(formData.min_stock_level) || 0,
        max_stock_level:
          formData.max_stock_level === null ||
          formData.max_stock_level === undefined ||
          Number(formData.max_stock_level) === 0
            ? null
            : Number(formData.max_stock_level),
        reorder_point:
          formData.reorder_point === null ||
          formData.reorder_point === undefined ||
          Number(formData.reorder_point) === 0
            ? null
            : Number(formData.reorder_point),
        track_inventory: Boolean(formData.track_inventory),
        is_active: true,
        images: [],
        attributes: {},
      });

      /*
       * PostgreSQL generates item_code automatically.
       * The UI must never generate or overwrite it.
       */
      console.info('[Inventory] Product created:', {
        id: created.id,
        item_code: created.item_code,
        sku: created.sku,
      });

      setShowAddModal(false);
      setFormData(INITIAL_FORM);

      await Promise.all([
        refetchProducts(),
        refetchInventory(),
      ]);
    } catch (error) {
      console.error('[Inventory] create product failed:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create the product.';

      if (message.toLowerCase().includes('products_company_id_sku_key')) {
        setFormError('This SKU already exists for the company.');
      } else {
        setFormError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveProduct = async (product: Product) => {
    const confirmed = window.confirm(
      `Archive "${product.product_name}"?\n\nThe product will be deactivated and will remain in historical records.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await archiveProduct(product.id);
      await refetchProducts();
    } catch (error) {
      console.error('[Inventory] archive product failed:', error);

      window.alert(
        error instanceof Error
          ? error.message
          : 'Unable to archive the product.',
      );
    }
  };

  const handleExport = () => {
    const rows = [
      [
        'Item Code',
        'SKU',
        'Product Name',
        'Barcode',
        'Product Type',
        'Tracking',
        'Stock',
        'Reserved',
        'Cost',
        'Selling Price',
        'VAT %',
        'Status',
      ],
      ...filteredProducts.map((product) => [
        product.item_code ?? '',
        product.sku,
        product.product_name,
        product.barcode ?? '',
        product.product_type,
        product.tracking_method,
        String(getProductStock(product.id)),
        String(getProductReserved(product.id)),
        Number(product.cost_price ?? 0).toFixed(2),
        Number(product.unit_price ?? 0).toFixed(2),
        Number(product.vat_rate ?? 0).toFixed(2),
        product.is_active ? 'Active' : 'Archived',
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `inventory-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  if (inventoryLoading || productsLoading) {
    return <LoadingState message="Loading inventory data..." />;
  }

  if (inventoryError || productsError) {
    return (
      <ErrorState
        error={inventoryError || productsError!}
        retry={() => {
          void refetchProducts();
          void refetchInventory();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Inventory Management
          </h1>

          <p className="text-gray-400 mt-1">
            Product master, stock visibility and inventory control
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              void refetchInventory();
              void refetchProducts();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExport}
            disabled={filteredProducts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-xl text-white font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-semibold shadow-lg shadow-blue-500/30 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Stock Value"
          value={`SAR ${totalStockValue.toLocaleString('en-SA', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon={DollarSign}
          trend="Live"
          color="from-blue-500 to-cyan-500"
        />

        <KPICard
          title="Available Stock"
          value={availableStock.toLocaleString()}
          icon={Package}
          trend="Live"
          color="from-green-500 to-emerald-500"
        />

        <KPICard
          title="Reserved Stock"
          value={reservedStock.toLocaleString()}
          icon={Clock}
          trend="Live"
          color="from-yellow-500 to-orange-500"
          trendDown={reservedStock > 0}
        />

        <KPICard
          title="Low Stock Items"
          value={lowStockCount.toString()}
          icon={AlertTriangle}
          trend={lowStockCount > 0 ? 'Attention' : 'OK'}
          color="from-red-500 to-orange-500"
          trendDown={lowStockCount > 0}
        />
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />

          <input
            type="text"
            placeholder="Search by item code, SKU, product name or barcode..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {searchTerm && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={clearSearch}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium"
          >
            <Filter className="w-4 h-4" />
            Clear
          </motion.button>
        )}
      </div>

      {/* Low Stock */}
      {lowStockCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />

            <div>
              <h3 className="text-lg font-semibold text-white">
                Low Stock Alert
              </h3>

              <p className="text-sm text-gray-400">
                {lowStockCount} products are at or below their minimum stock
                level
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowStockItems.slice(0, 4).map((product) => {
              const stock = getProductStock(product.id);

              return (
                <div
                  key={product.id}
                  className="p-4 bg-gray-900/50 rounded-xl border border-gray-800"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-medium">
                        {product.product_name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {product.item_code ?? 'Item code pending'} ·{' '}
                        {product.sku}
                      </p>
                    </div>

                    <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-400">
                      Low
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">
                      Stock: {stock}
                    </span>

                    <span className="text-gray-500">
                      Minimum: {product.min_stock_level}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Product Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Product Master
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              {filteredProducts.length} of {productItems.length} products
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Item Code
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  SKU
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Product
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Type
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Tracking
                </th>

                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">
                  Stock
                </th>

                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">
                  Selling Price
                </th>

                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400">
                  Status
                </th>

                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => {
                const stock = getProductStock(product.id);

                return (
                  <tr
                    key={product.id}
                    className="border-t border-gray-800 hover:bg-gray-800/30"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-blue-400">
                        {product.item_code ?? '—'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-400">
                      {product.sku}
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-white font-medium">
                        {product.product_name}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {product.barcode
                          ? `Barcode: ${product.barcode}`
                          : product.description || 'No description'}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-400">
                      {product.product_type}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-400">
                      {product.tracking_method}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-sm font-semibold ${
                          product.track_inventory &&
                          stock <= product.min_stock_level
                            ? 'text-red-400'
                            : 'text-white'
                        }`}
                      >
                        {stock}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right text-sm text-white font-semibold">
                      SAR{' '}
                      {Number(product.unit_price ?? 0).toLocaleString(
                        'en-SA',
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          product.is_active
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Archived'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          disabled
                          className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center text-gray-500 cursor-not-allowed"
                          title="Product editing will be enabled in the next Inventory phase"
                        >
                          <Edit size={16} />
                        </motion.button>

                        {product.is_active && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => void handleArchiveProduct(product)}
                            className="w-8 h-8 rounded-lg bg-gray-800/50 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
                            title="Archive product"
                          >
                            <Archive size={16} />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />

            <p className="text-gray-400">
              {productItems.length === 0
                ? 'No products have been created yet.'
                : 'No products match your search.'}
            </p>

            {productItems.length === 0 && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
                Add First Product
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-gray-800 bg-[#111827] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-[#111827]">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Add Product
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Create a new product master record
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                disabled={saving}
                className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddProduct}>
              <div className="p-6 space-y-7">
                {/* System generated code */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                        System Generated
                      </p>

                      <p className="text-sm text-gray-400 mt-1">
                        Item Code is generated automatically by PostgreSQL after
                        creation.
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-blue-400">
                      Auto
                    </span>
                  </div>
                </div>

                {/* Basic information */}
                <FormSection title="Basic Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="SKU" required>
                      <input
                        value={formData.sku}
                        onChange={(event) =>
                          updateField('sku', event.target.value)
                        }
                        placeholder="e.g. LAP-DELL-001"
                        className={inputClass}
                        required
                      />
                    </FormField>

                    <FormField label="Product Name" required>
                      <input
                        value={formData.product_name}
                        onChange={(event) =>
                          updateField('product_name', event.target.value)
                        }
                        placeholder="e.g. Dell Latitude 5420"
                        className={inputClass}
                        required
                      />
                    </FormField>

                    <FormField label="Barcode">
                      <input
                        value={formData.barcode ?? ''}
                        onChange={(event) =>
                          updateField(
                            'barcode',
                            event.target.value || null,
                          )
                        }
                        placeholder="EAN / UPC / GS1"
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Unit of Measure">
                      <select
                        value={formData.unit_of_measure ?? 'PCS'}
                        onChange={(event) =>
                          updateField(
                            'unit_of_measure',
                            event.target.value,
                          )
                        }
                        className={inputClass}
                      >
                        <option value="PCS">Pieces (PCS)</option>
                        <option value="BOX">Box</option>
                        <option value="KG">Kilogram (KG)</option>
                        <option value="G">Gram (G)</option>
                        <option value="L">Liter (L)</option>
                        <option value="M">Meter (M)</option>
                        <option value="M2">Square Meter (M²)</option>
                        <option value="SET">Set</option>
                        <option value="HR">Hour</option>
                        <option value="DAY">Day</option>
                        <option value="LICENSE">License</option>
                      </select>
                    </FormField>

                    <FormField label="Product Type">
                      <select
                        value={formData.product_type}
                        onChange={(event) =>
                          updateField(
                            'product_type',
                            event.target.value as
                              | 'GOODS'
                              | 'SERVICE'
                              | 'ASSET',
                          )
                        }
                        className={inputClass}
                      >
                        <option value="GOODS">Goods</option>
                        <option value="SERVICE">Service</option>
                        <option value="ASSET">Asset</option>
                      </select>
                    </FormField>

                    <FormField label="Tracking Method">
                      <select
                        value={formData.tracking_method}
                        onChange={(event) =>
                          updateField(
                            'tracking_method',
                            event.target.value as
                              | 'NONE'
                              | 'BATCH'
                              | 'SERIAL',
                          )
                        }
                        className={inputClass}
                      >
                        <option value="NONE">None</option>
                        <option value="BATCH">Batch / Lot</option>
                        <option value="SERIAL">Serial Number</option>
                      </select>
                    </FormField>
                  </div>

                  <FormField label="Description">
                    <textarea
                      value={formData.description ?? ''}
                      onChange={(event) =>
                        updateField(
                          'description',
                          event.target.value || null,
                        )
                      }
                      placeholder="Product description..."
                      rows={3}
                      className={inputClass}
                    />
                  </FormField>
                </FormSection>

                {/* Pricing */}
                <FormSection title="Pricing & Tax">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Cost Price (SAR)">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.cost_price}
                        onChange={(event) =>
                          updateField(
                            'cost_price',
                            Number(event.target.value),
                          )
                        }
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Selling Price (SAR)">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.unit_price}
                        onChange={(event) =>
                          updateField(
                            'unit_price',
                            Number(event.target.value),
                          )
                        }
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="VAT Rate (%)">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.vat_rate}
                        onChange={(event) =>
                          updateField(
                            'vat_rate',
                            Number(event.target.value),
                          )
                        }
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* Inventory policy */}
                <FormSection title="Inventory Policy">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="Minimum Stock">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.min_stock_level}
                        onChange={(event) =>
                          updateField(
                            'min_stock_level',
                            Number(event.target.value),
                          )
                        }
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Reorder Point">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.reorder_point ?? ''}
                        onChange={(event) =>
                          updateField(
                            'reorder_point',
                            event.target.value
                              ? Number(event.target.value)
                              : null,
                          )
                        }
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Maximum Stock">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.max_stock_level ?? ''}
                        onChange={(event) =>
                          updateField(
                            'max_stock_level',
                            event.target.value
                              ? Number(event.target.value)
                              : null,
                          )
                        }
                        className={inputClass}
                      />
                    </FormField>
                  </div>

                  <label className="flex items-center gap-3 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.track_inventory)}
                      onChange={(event) =>
                        updateField(
                          'track_inventory',
                          event.target.checked,
                        )
                      }
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                    />

                    <span className="text-sm text-gray-300">
                      Track inventory quantities for this product
                    </span>
                  </label>
                </FormSection>

                {formError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                    <p className="text-sm text-red-400">{formError}</p>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-5 border-t border-gray-800 bg-[#111827]">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !user?.company_id ||
                    !formData.sku.trim() ||
                    !formData.product_name.trim()
                  }
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating Product...' : 'Create Product'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-gray-900/70 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

function FormSection({ title, children }: FormSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-white mb-4">
        {title}
      </h3>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ label, required, children }: FormFieldProps) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </span>

      {children}
    </label>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  icon: typeof Package;
  trend: string;
  color: string;
  trendDown?: boolean;
}

function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  trendDown,
}: KPICardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-[#111827] border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>

        <span
          className={`text-sm font-semibold flex items-center gap-1 ${
            trendDown ? 'text-red-400' : 'text-green-400'
          }`}
        >
          {trendDown ? (
            <TrendingDown className="w-4 h-4" />
          ) : (
            <TrendingUp className="w-4 h-4" />
          )}

          {trend}
        </span>
      </div>

      <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
      <p className="text-sm text-gray-400">{title}</p>
    </motion.div>
  );
}
