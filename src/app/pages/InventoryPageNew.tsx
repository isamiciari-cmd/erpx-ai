import { useState } from 'react';
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
  Trash2,
  RefreshCw,
} from 'lucide-react';

import { useInventory, useProducts } from '../../hooks/useSupabaseQuery';
import { useSupabaseMutation } from '../../hooks/useSupabaseQuery';
import { createProduct, deleteProduct, type Product } from '../../services/productsService';
import type { InventoryItem } from '../../services/inventoryService';
import { LoadingState } from '../../components/LoadingState';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { useAuth } from '../../contexts/AuthContext';

interface ProductFormData extends Partial<Product> {
  company_id: string;
}

export default function InventoryPageNew() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

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

  const { mutate: addProduct, loading: addingProduct } =
    useSupabaseMutation<ProductFormData, Product>(createProduct);

  const { mutate: removeProduct } = useSupabaseMutation<string, void>(deleteProduct);

  const inventoryItems: InventoryItem[] = inventory ?? [];
  const productItems: Product[] = products ?? [];

  const lowStockItems = inventoryItems.filter((item) => {
    return item.quantity_available <= 0;
  });

  const lowStockCount = lowStockItems.length;

  const totalStockValue = inventoryItems.reduce(
    (sum, item) => sum + item.quantity_available * 0,
    0,
  );

  const availableStock = inventoryItems.reduce(
    (sum, item) => sum + item.quantity_available,
    0,
  );

  const reservedStock = inventoryItems.reduce(
    (sum, item) => sum + item.quantity_reserved,
    0,
  );

  if (inventoryLoading || productsLoading) {
    return <LoadingState message="Loading inventory data..." />;
  }

  if (inventoryError || productsError) {
    return (
      <ErrorState
        error={inventoryError || productsError!}
        retry={refetchInventory}
      />
    );
  }

  if (!inventory || inventory.length === 0) {
    return (
      <EmptyState
        icon={<Package className="w-12 h-12" />}
        title="No Inventory Data"
        description="Start by adding products to your inventory"
        action={{
          label: 'Add First Product',
          onClick: () => setShowAddModal(true),
        }}
      />
    );
  }

  const filteredProducts = productItems.filter((product) => {
    const search = searchTerm.toLowerCase();

    return (
      product.product_name.toLowerCase().includes(search) ||
      product.sku.toLowerCase().includes(search)
    );
  });

  const handleAddProduct = async (productData: ProductFormData) => {
    if (!user?.company_id) return;

    const result = await addProduct({
      ...productData,
      company_id: user.company_id,
    });

    if (result) {
      setShowAddModal(false);
      await refetchProducts();
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    const result = await removeProduct(productId);

    if (result !== null || !productsError) {
      await refetchProducts();
    }
  };

  const handleExport = () => {
    const rows = [
      ['SKU', 'Product Name', 'Category', 'Stock', 'Price'],
      ...filteredProducts.map((product) => {
        const inventoryItem = inventoryItems.find(
          (item) => item.product_id === product.id,
        );

        return [
          product.sku,
          product.product_name,
          product.category_id,
          String(inventoryItem?.quantity_available ?? 0),
          product.unit_price.toFixed(2),
        ];
      }),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${value.replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleFilter = () => {
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Inventory Management
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time stock tracking from PostgreSQL
          </p>
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => void refetchInventory()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-semibold shadow-lg shadow-blue-500/30"
            disabled={addingProduct}
          >
            <Plus className="w-4 h-4" />
            {addingProduct ? 'Adding...' : 'Add Product'}
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Stock Value"
          value={`$${totalStockValue.toLocaleString()}`}
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
          trendDown
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

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />

          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleFilter}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium"
        >
          <Filter className="w-4 h-4" />
          Clear
        </motion.button>
      </div>

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
                {lowStockCount} items need attention
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowStockItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="p-4 bg-gray-900/50 rounded-xl border border-gray-800"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-medium">
                      Product {item.product_id}
                    </p>

                    <p className="text-xs text-gray-500">
                      Inventory ID: {item.id}
                    </p>
                  </div>

                  <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-400">
                    Low
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Stock: {item.quantity_available}
                  </span>

                  <span className="text-gray-500">
                    Reserved: {item.quantity_reserved}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Products</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">
                  Stock
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">
                  Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => {
                const inventoryItem = inventoryItems.find(
                  (item) => item.product_id === product.id,
                );

                return (
                  <tr
                    key={product.id}
                    className="border-t border-gray-800 hover:bg-gray-800/30"
                  >
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {product.sku}
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm text-white font-medium">
                        {product.product_name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {product.description || 'No description'}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-400">
                      {product.category_id || '—'}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className="text-sm text-white font-semibold">
                        {inventoryItem?.quantity_available ?? 0}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right text-sm text-white font-semibold">
                      ${product.unit_price.toFixed(2)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-8 h-8 rounded-lg bg-gray-800/50 hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                          title="Edit product"
                        >
                          <Edit size={16} />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => void handleDeleteProduct(product.id)}
                          className="w-8 h-8 rounded-lg bg-gray-800/50 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
                          title="Delete product"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-10 text-center text-gray-500">
            No products match your search.
          </div>
        )}
      </motion.div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#111827] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Add Product
              </h2>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              Product creation is connected to the Supabase service. Use the
              product management form to provide the required product fields.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 text-white hover:bg-gray-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (user?.company_id) {
                    void handleAddProduct({
                      company_id: user.company_id,
                      product_name: 'New Product',
                      sku: `SKU-${Date.now()}`,
                    });
                  }
                }}
                disabled={addingProduct || !user?.company_id}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {addingProduct ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
      className="bg-[#111827] border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer"
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

      <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
      <p className="text-sm text-gray-400">{title}</p>
    </motion.div>
  );
}
