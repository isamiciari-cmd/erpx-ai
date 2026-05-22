import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  price: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

const MOCK_DATA: InventoryItem[] = [
  {
    id: '1',
    sku: 'SKU-001',
    name: 'Wireless Headphones',
    category: 'Electronics',
    quantity: 45,
    minStock: 20,
    price: 49.99,
    status: 'In Stock',
  },
  {
    id: '2',
    sku: 'SKU-002',
    name: 'USB-C Cable',
    category: 'Accessories',
    quantity: 12,
    minStock: 30,
    price: 9.99,
    status: 'Low Stock',
  },
  {
    id: '3',
    sku: 'SKU-003',
    name: 'Laptop Stand',
    category: 'Office',
    quantity: 0,
    minStock: 15,
    price: 29.99,
    status: 'Out of Stock',
  },
];

export default function InventoryManagementPage() {
  const toast = useToast();
  const [items, setItems] = useState<InventoryItem[]>(MOCK_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Filter items by search query
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle Delete
  const handleDelete = async () => {
    if (!itemToDelete) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setItems(items.filter((item) => item.id !== itemToDelete.id));
    toast.success(`${itemToDelete.name} deleted successfully!`);
    setItemToDelete(null);
    setIsLoading(false);
  };

  // Handle Add
  const handleAdd = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newItem: InventoryItem = {
      id: (items.length + 1).toString(),
      sku: `SKU-${(items.length + 1).toString().padStart(3, '0')}`,
      name: 'New Product',
      category: 'General',
      quantity: 10,
      minStock: 5,
      price: 19.99,
      status: 'In Stock',
    };

    setItems([...items, newItem]);
    toast.success('Product added successfully!');
    setIsAddModalOpen(false);
    setIsLoading(false);
  };

  // Handle Edit
  const handleEdit = async () => {
    if (!selectedItem) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success(`${selectedItem.name} updated successfully!`);
    setIsEditModalOpen(false);
    setIsLoading(false);
  };

  // Handle Export
  const handleExport = () => {
    toast.info('Exporting data to Excel...');
    // Simulate export
    setTimeout(() => {
      toast.success('Data exported successfully!');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventory Management</h1>
          <p className="text-gray-400 mt-1">Manage your products and stock levels</p>
        </div>

        <Button
          leftIcon={<Plus className="w-5 h-5" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Button */}
          <Button variant="secondary" leftIcon={<Filter className="w-5 h-5" />}>
            Filter
          </Button>

          {/* Export Button */}
          <Button
            variant="ghost"
            leftIcon={<Download className="w-5 h-5" />}
            onClick={handleExport}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading inventory..." />
      ) : filteredItems.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-2xl">
          <EmptyState
            icon={Package}
            title="No Products Found"
            description={
              searchQuery
                ? 'No products match your search criteria'
                : 'Start by adding your first product to inventory'
            }
            actionLabel={!searchQuery ? 'Add Product' : undefined}
            onAction={!searchQuery ? () => setIsAddModalOpen(true) : undefined}
          />
        </div>
      ) : (
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    SKU
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Product Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredItems.map((item) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-400">{item.sku}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{item.category}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-semibold ${
                          item.quantity === 0
                            ? 'text-red-400'
                            : item.quantity <= item.minStock
                            ? 'text-yellow-400'
                            : 'text-green-400'
                        }`}
                      >
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-semibold">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'In Stock'
                            ? 'bg-green-500/20 text-green-400'
                            : item.status === 'Low Stock'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsViewModalOpen(true);
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-blue-400 transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-yellow-400 transition-all"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setItemToDelete(item);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-400 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product"
        size="lg"
      >
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Product Name</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter product name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">SKU</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter SKU"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Category</label>
              <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Electronics</option>
                <option>Accessories</option>
                <option>Office</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Price</label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Quantity</label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Min Stock</label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button variant="secondary" fullWidth onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleAdd} isLoading={isLoading}>
              Add Product
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Product Details"
        size="md"
      >
        {selectedItem && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedItem.name}</h3>
                <p className="text-gray-400">{selectedItem.sku}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Category</p>
                <p className="text-white font-semibold">{selectedItem.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Price</p>
                <p className="text-white font-semibold">${selectedItem.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Quantity</p>
                <p className="text-white font-semibold">{selectedItem.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedItem.status === 'In Stock'
                      ? 'bg-green-500/20 text-green-400'
                      : selectedItem.status === 'Low Stock'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {selectedItem.status}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Product"
        size="lg"
      >
        {selectedItem && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Product Name</label>
                <input
                  type="text"
                  defaultValue={selectedItem.name}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">SKU</label>
                <input
                  type="text"
                  defaultValue={selectedItem.sku}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Category</label>
                <select
                  defaultValue={selectedItem.category}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Electronics</option>
                  <option>Accessories</option>
                  <option>Office</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Price</label>
                <input
                  type="number"
                  defaultValue={selectedItem.price}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Quantity</label>
                <input
                  type="number"
                  defaultValue={selectedItem.quantity}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Min Stock</label>
                <input
                  type="number"
                  defaultValue={selectedItem.minStock}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button fullWidth onClick={handleEdit} isLoading={isLoading}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
