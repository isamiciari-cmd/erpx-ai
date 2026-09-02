import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  DollarSign,
  Smartphone,
  Tag,
  User,
  X,
} from 'lucide-react';

// Product categories
const categories = ['All', 'Electronics', 'Clothing', 'Food', 'Home', 'Sports'];

// Products data
const products = [
  {
    id: 1,
    name: 'Wireless Headphones',
    price: 49.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
    stock: 15,
  },
  {
    id: 2,
    name: 'Smart Watch',
    price: 199.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop',
    stock: 8,
  },
  {
    id: 3,
    name: 'Cotton T-Shirt',
    price: 24.99,
    category: 'Clothing',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop',
    stock: 50,
  },
  {
    id: 4,
    name: 'Coffee Beans',
    price: 12.99,
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&h=200&fit=crop',
    stock: 100,
  },
  {
    id: 5,
    name: 'Desk Lamp',
    price: 34.99,
    category: 'Home',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782f?w=200&h=200&fit=crop',
    stock: 20,
  },
  {
    id: 6,
    name: 'Yoga Mat',
    price: 29.99,
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=200&h=200&fit=crop',
    stock: 30,
  },
  {
    id: 7,
    name: 'USB-C Cable',
    price: 9.99,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=200&h=200&fit=crop',
    stock: 75,
  },
  {
    id: 8,
    name: 'Running Shoes',
    price: 89.99,
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
    stock: 12,
  },
];

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function POSPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: (typeof products)[0]) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
        },
      ]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, change: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + change;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  const completeOrder = () => {
    // Reset
    setCart([]);
    setDiscount(0);
    setCustomerName('');
    setShowCheckout(false);
    alert('Order completed successfully!');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Left Side - Products Grid */}
      <div className="flex-1 flex flex-col bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
        {/* Search and Categories */}
        <div className="p-4 border-b border-gray-800">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <motion.button
                key={category}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                whileHover={{ y: -4 }}
                onClick={() => addToCart(product)}
                className="bg-gray-800/50 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-800/70 transition-all border border-gray-700 hover:border-blue-500/50"
              >
                <div className="aspect-square bg-gray-700">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h4 className="text-white font-medium text-sm mb-1 truncate">{product.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400 font-bold">${product.price}</span>
                    <span className="text-xs text-gray-400">Stock: {product.stock}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Cart & Checkout */}
      <div className="w-96 flex flex-col bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
              Current Order
            </h3>
            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs font-semibold">
              {cart.length} items
            </span>
          </div>

          {/* Customer Name */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingCart className="w-16 h-16 mb-3 opacity-30" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-gray-800/50 rounded-lg p-3 border border-gray-700"
                >
                  <div className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-medium text-sm">{item.name}</h4>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3 text-white" />
                          </button>
                          <span className="text-white font-semibold w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3 text-white" />
                          </button>
                        </div>
                        <span className="text-blue-400 font-bold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-800 space-y-4">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <input
                type="number"
                placeholder="Discount %"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Discount ({discount}%):</span>
                  <span className="text-red-400 font-semibold">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg pt-2 border-t border-gray-700">
                <span className="text-white font-bold">Total:</span>
                <span className="text-blue-400 font-bold">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckout}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 rounded-xl text-white font-semibold shadow-lg shadow-green-500/30 transition-all"
              >
                <DollarSign className="w-5 h-5" />
                Cash
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckout}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-semibold shadow-lg shadow-blue-500/30 transition-all"
              >
                <CreditCard className="w-5 h-5" />
                Card
              </motion.button>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCheckout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl text-white font-semibold shadow-lg shadow-purple-500/30 transition-all"
            >
              <Smartphone className="w-5 h-5" />
              Mobile Payment
            </motion.button>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowCheckout(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 max-w-md w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Complete Order</h2>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-400">Customer:</span>
                    <span className="text-white font-semibold">
                      {customerName || 'Walk-in Customer'}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-400">Items:</span>
                    <span className="text-white font-semibold">{cart.length}</span>
                  </div>
                  <div className="flex justify-between text-2xl pt-4 border-t border-gray-700">
                    <span className="text-white font-bold">Total:</span>
                    <span className="text-blue-400 font-bold">${total.toFixed(2)}</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={completeOrder}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
                >
                  Confirm Payment
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
