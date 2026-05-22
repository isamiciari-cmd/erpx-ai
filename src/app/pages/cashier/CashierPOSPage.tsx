import { useState, useEffect } from "react";
import { Search, Barcode, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, Building2, Calculator, Printer, PauseCircle, XCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../../contexts/AuthContext";
import { useRealtimeTable } from "../../../hooks/useRealtimeTable";
import { Product, searchProducts, getProductByBarcode } from "../../../services/productsService";
import { createSale, Sale, SaleItem } from "../../../services/salesService";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
}

export default function CashierPOSPage() {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<string>("cash");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch products from Supabase with Realtime updates
  const { data: products, loading: productsLoading } = useRealtimeTable<Product>({
    table: 'products',
    select: '*',
    filter: {
      company_id: user?.company_id || '',
      is_active: true,
    },
    orderBy: { column: 'product_name', ascending: true },
    enabled: !!user?.company_id,
  });

  const paymentMethods = [
    { id: "cash", label: "Cash", icon: Banknote },
    { id: "card", label: "Card", icon: CreditCard },
    { id: "mada", label: "Mada", icon: CreditCard },
    { id: "apple_pay", label: "Apple Pay", icon: Smartphone },
    { id: "bank_transfer", label: "Bank Transfer", icon: Building2 },
    { id: "split", label: "Split Payment", icon: Calculator },
  ];

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.product_name,
          price: product.unit_price,
          quantity: 1,
          discount: 0,
        },
      ]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const applyDiscount = (id: string, discount: number) => {
    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, discount: Math.min(discount, 20) } : item
      )
    );
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalDiscount = cart.reduce(
    (sum, item) =>
      sum + (item.price * item.quantity * item.discount) / 100,
    0
  );
  const total = subtotal - totalDiscount;

  const handleHoldOrder = () => {
    alert("Order held successfully");
  };

  const handleCancelOrder = () => {
    if (confirm("Are you sure you want to cancel this order?")) {
      setCart([]);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (!user?.id || !user?.company_id || !user?.branch_id) {
      alert("User information not available");
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare sale items
      const saleItems: SaleItem[] = cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        discount_percentage: item.discount,
        subtotal: item.price * item.quantity,
        total: item.price * item.quantity * (1 - item.discount / 100),
      }));

      // Create sale
      const sale: Omit<Sale, 'id' | 'created_at' | 'updated_at' | 'sale_number'> = {
        company_id: user.company_id,
        branch_id: user.branch_id,
        cashier_id: user.id,
        sale_date: new Date().toISOString(),
        payment_method: selectedPayment as any,
        subtotal,
        discount_amount: totalDiscount,
        vat_amount: 0, // TODO: Calculate VAT
        total_amount: total,
        amount_paid: total,
        change_amount: 0,
        items: saleItems,
        status: 'completed',
      };

      await createSale(sale);

      alert(`Payment successful! Total: ${total.toFixed(2)} SAR`);
      setCart([]);
      setSelectedPayment("cash");
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Failed to process payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-gray-950 flex">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col">
        {/* Search Bar */}
        <div className="p-6 bg-gray-900 border-b border-gray-800">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or barcode..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-xl text-blue-400 flex items-center gap-2 transition-all">
              <Barcode className="w-5 h-5" />
              Scan
            </button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-auto p-6">
          {productsLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading products...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 text-lg mb-2">
                  {searchQuery ? "No products found" : "No products available"}
                </p>
                <p className="text-gray-600 text-sm">
                  {searchQuery ? "Try a different search term" : "Add products to your inventory"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <motion.button
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addToCart(product)}
                  className="p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/50 rounded-xl text-left transition-all"
                >
                  <div className="aspect-square bg-gray-800 rounded-lg mb-3 flex items-center justify-center">
                    <span className="text-4xl text-gray-600">📦</span>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{product.product_name}</h3>
                  <p className="text-blue-400 font-bold text-lg">
                    {product.unit_price.toFixed(2)} SAR
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    SKU: {product.sku}
                  </p>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart & Payment */}
      <div className="w-[450px] bg-gray-900 border-l border-gray-800 flex flex-col">
        {/* Cart Header */}
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-1">Current Sale</h2>
          <p className="text-sm text-gray-400">{cart.length} items</p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-6 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Cart is empty</p>
              <p className="text-sm text-gray-600 mt-1">
                Add products to start a sale
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white/5 border border-white/10 rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    <p className="text-sm text-gray-400">
                      {item.price.toFixed(2)} SAR
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-2 hover:bg-white/10 rounded-l-lg transition-colors"
                    >
                      <Minus className="w-4 h-4 text-white" />
                    </button>
                    <span className="w-12 text-center text-white font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-2 hover:bg-white/10 rounded-r-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  <input
                    type="number"
                    value={item.discount}
                    onChange={(e) =>
                      applyDiscount(item.id, Number(e.target.value))
                    }
                    max="20"
                    placeholder="Discount %"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white font-semibold">
                    {(item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)} SAR
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Method */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-gray-800 space-y-4">
            <h3 className="font-semibold text-white mb-3">Payment Method</h3>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedPayment === method.id
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-gray-700 bg-white/5 hover:border-gray-600"
                  }`}
                >
                  <method.icon className="w-5 h-5 mx-auto mb-1 text-white" />
                  <p className="text-xs text-white">{method.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Totals & Actions */}
        <div className="p-6 bg-gray-950 border-t border-gray-800">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal:</span>
              <span>{subtotal.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Discount:</span>
              <span>-{totalDiscount.toFixed(2)} SAR</span>
            </div>
            <div className="flex justify-between text-2xl font-bold text-white pt-2 border-t border-gray-800">
              <span>Total:</span>
              <span>{total.toFixed(2)} SAR</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={handleHoldOrder}
              className="p-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-400 transition-all flex items-center justify-center gap-1"
            >
              <PauseCircle className="w-4 h-4" />
              <span className="text-xs">Hold</span>
            </button>
            <button
              onClick={handleCancelOrder}
              className="p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-all flex items-center justify-center gap-1"
            >
              <XCircle className="w-4 h-4" />
              <span className="text-xs">Cancel</span>
            </button>
            <button className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white transition-all flex items-center justify-center gap-1">
              <Printer className="w-4 h-4" />
              <span className="text-xs">Print</span>
            </button>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
            {isProcessing ? "Processing..." : "Complete Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
