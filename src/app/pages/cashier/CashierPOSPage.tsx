import { preparePrintedDocument, printPreparedDocument } from '../../utils/printedDocument';
import { useEffect, useRef, useState } from 'react';
import {
  Search,
  ArrowLeft,
  Barcode,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Printer,
  PauseCircle,
  XCircle,
  Loader2,
  Package,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useRealtimeTable } from '../../../hooks/useRealtimeTable';
import { Product } from '../../../services/productsService';
import { completePOSSale, createSale, deleteSale, getHeldSales, getCurrentShift, type Sale, type SaleItem } from '../../../services/salesService';
import { receiptSnapshot, renderReceipt, type Receipt } from './receipt';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  vatRate: number;
}

export default function CashierPOSPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const arabic = (i18n.resolvedLanguage || i18n.language).startsWith('ar');
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [heldSales,setHeldSales] = useState<Sale[]>([]);
  const [lastReceipt,setLastReceipt] = useState<Receipt | null>(null);
  const preparedReceipts = useRef(new WeakMap<Receipt, Map<boolean, Promise<string>>>());
  const checkoutLock = useRef(false);
  const requestRef = useRef<{ fingerprint: string; key: string; codes: ReadonlyMap<string, string> } | null>(null);
  const receiptCompany = user?.company?.name || 'ERPX';
  const currency = user?.company?.currency || 'SAR';

  useEffect(() => {
    let disposed = false;
    setCart([]); setHeldSales([]); setLastReceipt(null); requestRef.current = null;
    if (user?.company_id) getHeldSales(user.company_id).then(sales => { if (!disposed) setHeldSales(sales.filter(s => s.cashier_id === user.id)); }).catch(() => {});
    return () => { disposed = true; };
  },[user?.company_id,user?.id]);

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
    { id: 'cash', label: arabic ? 'نقدًا' : 'Cash', icon: Banknote },
    { id: 'card', label: arabic ? 'بطاقة' : 'Card', icon: CreditCard },
    { id: 'mada', label: arabic ? 'مدى' : 'Mada', icon: CreditCard },
    { id: 'apple_pay', label: arabic ? 'آبل باي' : 'Apple Pay', icon: Smartphone },
    { id: 'bank_transfer', label: arabic ? 'تحويل بنكي' : 'Bank Transfer', icon: Building2 },
  ];

  const addToCart = (product: Product) => {
    if (checkoutLock.current) return;
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
          name: product.product_name,
          price: Number(product.unit_price),
          quantity: 1,
          discount: 0,
          vatRate: Number(product.vat_rate ?? 0),
        },
      ]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    if (checkoutLock.current) return;
    setCart(
      cart
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: string) => {
    if (checkoutLock.current) return;
    setCart(cart.filter((item) => item.id !== id));
  };

  const applyDiscount = (id: string, discount: number) => {
    if (checkoutLock.current || !Number.isFinite(discount)) return;
    setCart(
      cart.map((item) => (item.id === id ? { ...item, discount: Math.max(0,Math.min(discount,20)) } : item)),
    );
  };

  const roundMoney = (amount:number) => Math.round((amount + Number.EPSILON)*100)/100;
  const subtotal = cart.reduce((sum, item) => sum + roundMoney(item.price * item.quantity), 0);
  const totalDiscount = cart.reduce(
    (sum, item) => sum + roundMoney(roundMoney(item.price * item.quantity) * item.discount / 100),
    0,
  );
  const vat = cart.reduce((sum,item) => sum + roundMoney((roundMoney(item.price*item.quantity)-roundMoney(roundMoney(item.price*item.quantity)*item.discount/100))*item.vatRate/100),0);
  const total = roundMoney(subtotal - totalDiscount + vat);

  const handleHoldOrder = async () => {
    if (!cart.length || checkoutLock.current || !user?.company_id || !user.branch_id) return;
    checkoutLock.current = true; setIsProcessing(true);
    try {
      const shift = await ensureCurrentShift();
      const held = await createSale({ company_id:user.company_id,branch_id:user.branch_id,cashier_id:user.id,shift_id:shift.id,
        sale_date:new Date().toISOString(),payment_method:'cash',subtotal,discount_amount:totalDiscount,vat_amount:vat,total_amount:total,
        amount_paid:0,change_amount:0,items:cart.map(item => ({ product_id:item.id,product_name:item.name,quantity:item.quantity,unit_price:item.price,
          discount_percentage:item.discount,subtotal:roundMoney(item.price*item.quantity),total:roundMoney(item.price*item.quantity*(1-item.discount/100)),vat_rate:item.vatRate })),status:'on_hold' });
      setHeldSales(sales => [held,...sales]); setCart([]); requestRef.current = null;
    } catch (error) { alert(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to hold this order'); }
    finally { checkoutLock.current = false; setIsProcessing(false); }
  };

  const resumeHeldSale = async (sale:Sale) => {
    if (!sale.id || checkoutLock.current || cart.length) return;
    checkoutLock.current = true; setIsProcessing(true);
    try {
      await deleteSale(sale.id);
      setCart(sale.items.map(item => ({ id:item.product_id,name:item.product_name,price:Number(item.unit_price),quantity:Number(item.quantity),discount:Number(item.discount_percentage),vatRate:Number(item.vat_rate ?? 0) })));
      setHeldSales(sales => sales.filter(held => held.id !== sale.id)); requestRef.current = null;
    } catch (error) { alert(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to resume held order'); }
    finally { checkoutLock.current = false; setIsProcessing(false); }
  };

  const printReceipt = async () => {
    if (!lastReceipt || !user?.company_id) return;
    const existing = preparedReceipts.current.get(lastReceipt);
    const byLanguage = existing ?? new Map<boolean, Promise<string>>();
    if (!existing) preparedReceipts.current.set(lastReceipt, byLanguage);
    try {
      let prepared = byLanguage.get(arabic);
      if (!prepared) {
        const preview = document.implementation.createHTMLDocument();
        renderReceipt(preview, lastReceipt, arabic ? 'ar' : 'en');
        prepared = preparePrintedDocument(preview, user.company_id, arabic);
        byLanguage.set(arabic, prepared);
      }
      const html = await prepared;
      printPreparedDocument(html, lastReceipt.invoiceNumber);
    } catch {
      byLanguage.delete(arabic);
      alert(arabic ? 'تعذّر تجهيز الإيصال للطباعة.' : 'Could not prepare the receipt for printing.');
    }
  };

  const handleCancelOrder = () => {
    if (checkoutLock.current) return;
    if (confirm('Are you sure you want to cancel this order?')) {
      setCart([]);
      requestRef.current = null;
    }
  };

  const promptBarcodeInput = () => {
    const barcode = prompt('Enter barcode:');
    if (barcode) {
      setBarcodeInput(barcode);
      const product = products.find(
        (p) => p.sku.toLowerCase() === barcode.toLowerCase() || p.barcode?.toLowerCase() === barcode.toLowerCase(),
      );
      if (product) {
        addToCart(product);
      } else {
        alert('Product not found');
      }
    }
  };

  const ensureCurrentShift = async () => {
    if (!user?.company_id || !user?.branch_id || !user?.id) {
      throw new Error('Company, branch, or cashier information is missing');
    }

    const shift = await getCurrentShift(
      user.company_id,
      user.branch_id,
      user.id,
    );

    if (!shift) {
      throw new Error('No open shift found. Please open a shift first.');
    }

    return shift;
  };
const handleCheckout = async () => {
    if (checkoutLock.current) return;
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!user?.company_id || !user?.branch_id || !user?.id) {
      alert('User company, branch, or cashier information is missing');
      return;
    }

    checkoutLock.current = true;
    setIsProcessing(true);

    try {
      const shift = await ensureCurrentShift();

      const saleItems: SaleItem[] = cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        discount_percentage: item.discount,
        discount_amount: item.price * item.quantity * (item.discount / 100),
        subtotal: item.price * item.quantity,
        total: item.price * item.quantity * (1 - item.discount / 100),
        vat_rate: item.vatRate,
      }));

      const fingerprint = JSON.stringify({ items:saleItems,payment:selectedPayment,shift:shift.id });
      if (requestRef.current?.fingerprint !== fingerprint) {
        // The checkout result records the item and amounts but omits its catalog code.
        // Keep the code with this attempt, including after a lost reply.
        const codes = new Map(products.map((product) => [product.id, product.barcode || product.sku]));
        requestRef.current = { fingerprint, key: crypto.randomUUID(), codes };
      }
      const request = requestRef.current;

      const result = await completePOSSale({
        company_id: user.company_id,
        branch_id: user.branch_id,
        cashier_id: user.id,
        shift_id: shift.id,
        customer_id: null,
        payment_method: selectedPayment as
          | 'cash'
          | 'card'
          | 'mada'
          | 'apple_pay'
          | 'bank_transfer',
        items: saleItems,
        discount_amount: 0,
        idempotency_key: request.key,
        notes: null,
      });

      setLastReceipt(receiptSnapshot(result, receiptCompany, currency, request.codes));
      setCart([]); requestRef.current = null;

      alert(
        `Sale completed successfully\n\nSale: ${result.sale_number}\nInvoice: ${result.invoice_number}\nTotal: ${result.total_amount.toFixed(2)} SAR`,
      );

    } catch (error) {
      console.error('[POS] Checkout failed:', error);
      alert(
        error instanceof Error
          ? `Checkout failed: ${error.message}`
          : 'Checkout failed',
      );
    } finally {
      checkoutLock.current = false;
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="erpx-pos">
      {/* Left Panel - Products */}
      <section className="erpx-pos-catalog">
        {/* Search Bar */}
        <div className="erpx-pos-toolbar">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="erpx-pos-search-icon w-5 h-5" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={arabic ? 'البحث عن منتج' : 'Search products'}
                placeholder={arabic ? 'اسم المنتج أو الباركود' : 'Search products by name or barcode...'}
                className="ws-input erpx-pos-search"
              />
            </div>
            <button
              onClick={() => promptBarcodeInput()}
              className="ws-btn ws-btn-primary"
            >
              <Barcode className="w-5 h-5" />
              {arabic ? 'مسح' : 'Scan'}
            </button>
            <a href="#pos-cart" className="ws-btn erpx-pos-cart-link">
              {arabic ? 'السلة' : 'Cart'} <bdi dir="ltr">{cart.length}</bdi>
            </a>
          </div>
        </div>

        {/* Products Grid */}
        <div className="erpx-pos-products">
          {productsLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-400" role="status">{arabic ? 'جارٍ تحميل المنتجات…' : 'Loading products...'}</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 text-lg mb-2">
                  {searchQuery ? (arabic ? 'لا توجد نتائج' : 'No products found') : (arabic ? 'لا توجد منتجات متاحة' : 'No products available')}
                </p>
                <p className="text-gray-600 text-sm">
                  {searchQuery ? (arabic ? 'جرّب عبارة بحث أخرى' : 'Try a different search term') : (arabic ? 'أضف المنتجات إلى المخزون' : 'Add products to your inventory')}
                </p>
              </div>
            </div>
          ) : (
            <div className="erpx-pos-grid">
              {filteredProducts.map((product) => (
                <motion.button
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addToCart(product)}
                  className="erpx-pos-product"
                >
                  <div className="erpx-pos-product-icon">
                    <Package className="h-10 w-10 text-gray-500" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{product.product_name}</h3>
                  <bdi dir="ltr" className="ws-number text-blue-300 font-bold text-lg">
                    {Number(product.unit_price).toFixed(2)} {currency}
                  </bdi>
                  <p className="text-xs text-gray-400 mt-1">{arabic ? 'رمز الصنف' : 'SKU'} <bdi dir="ltr">{product.sku}</bdi></p>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Right Panel - Cart & Payment */}
      <section className="erpx-pos-cart" id="pos-cart" aria-labelledby="pos-cart-title" tabIndex={-1}>
        {/* Cart Header */}
        <div className="erpx-pos-cart-header">
          <h2 id="pos-cart-title" className="text-2xl font-bold text-white mb-1">{arabic ? 'البيع الحالي' : 'Current Sale'}</h2>
          <p className="text-sm text-gray-400"><bdi dir="ltr">{cart.length}</bdi> {arabic ? 'أصناف' : 'items'}</p>
          {heldSales.length > 0 && cart.length === 0 && <select aria-label="Resume held order" disabled={isProcessing} value="" onChange={event => { const held = heldSales.find(sale => sale.id === event.target.value); if (held) void resumeHeldSale(held); }} className="mt-3 w-full rounded bg-gray-800 p-2 text-white"><option value="">Resume held order ({heldSales.length})</option>{heldSales.map(sale => <option key={sale.id} value={sale.id}>{sale.sale_number} · {Number(sale.total_amount).toFixed(2)} {currency}</option>)}</select>}
          {lastReceipt && <p role="status" className="mt-2 text-sm text-green-400">{arabic ? 'المدفوع' : 'Paid'} <bdi dir="ltr">{Number(lastReceipt.paid).toFixed(2)} {lastReceipt.currency}</bdi> · <bdi dir="ltr">{lastReceipt.invoiceNumber}</bdi></p>}
        </div>

        {/* Cart Items */}
        <div className="erpx-pos-items space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-300">{arabic ? 'السلة فارغة' : 'Cart is empty'}</p>
              <p className="text-sm text-gray-400 mt-1">{arabic ? 'أضف منتجات لبدء البيع' : 'Add products to start a sale'}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    <bdi dir="ltr" className="ws-number text-sm text-gray-400">{item.price.toFixed(2)} {currency}</bdi>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={arabic ? `إزالة ${item.name}` : `Remove ${item.name}`}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      aria-label={arabic ? 'إنقاص الكمية' : 'Decrease quantity'}
                      className="p-2 hover:bg-white/10 rounded-l-lg transition-colors"
                    >
                      <Minus className="w-4 h-4 text-white" />
                    </button>
                    <span className="w-12 text-center text-white font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      aria-label={arabic ? 'زيادة الكمية' : 'Increase quantity'}
                      className="p-2 hover:bg-white/10 rounded-r-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  <input
                    type="number"
                    value={item.discount}
                    onChange={(e) => applyDiscount(item.id, Number(e.target.value))}
                    max="20"
                    min="0"
                    disabled={isProcessing}
                    aria-label={arabic ? 'نسبة الخصم' : 'Discount %'}
                    className="min-w-0 flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-gray-400">{arabic ? 'المجموع الفرعي' : 'Subtotal:'}</span>
                  <bdi dir="ltr" className="ws-number text-white font-semibold">
                    {(item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)} {currency}
                  </bdi>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Method */}
        {cart.length > 0 && (
          <div className="erpx-pos-payment space-y-3">
            <h3 className="font-semibold text-white">{arabic ? 'طريقة الدفع' : 'Payment Method'}</h3>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  aria-pressed={selectedPayment === method.id}
                  disabled={isProcessing}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedPayment === method.id
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-700 bg-white/5 hover:border-gray-600'
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
        <div className="erpx-pos-summary">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-400">
              <span>{arabic ? 'المجموع الفرعي' : 'Subtotal:'}</span>
              <bdi dir="ltr" className="ws-number">{subtotal.toFixed(2)} {currency}</bdi>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>{arabic ? 'الخصم' : 'Discount:'}</span>
              <bdi dir="ltr" className="ws-number">-{totalDiscount.toFixed(2)} {currency}</bdi>
            </div>
            <div className="flex justify-between text-gray-400"><span>{arabic ? 'الضريبة' : 'VAT:'}</span><bdi dir="ltr" className="ws-number">{vat.toFixed(2)} {currency}</bdi></div>
            <div className="flex justify-between text-2xl font-bold text-white pt-2 border-t border-gray-800">
              <span>{arabic ? 'الإجمالي' : 'Total:'}</span>
              <bdi dir="ltr" className="ws-number">{total.toFixed(2)} {currency}</bdi>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={handleHoldOrder}
              disabled={!cart.length || isProcessing}
              className="p-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-400 transition-all flex items-center justify-center gap-1"
            >
              <PauseCircle className="w-4 h-4" />
              <span className="text-xs">{arabic ? 'تعليق' : 'Hold'}</span>
            </button>
            <button
              onClick={handleCancelOrder}
              disabled={isProcessing}
              className="p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-all flex items-center justify-center gap-1"
            >
              <XCircle className="w-4 h-4" />
              <span className="text-xs">{arabic ? 'إلغاء' : 'Cancel'}</span>
            </button>
            <button
              onClick={printReceipt}
              disabled={!lastReceipt || isProcessing}
              className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white transition-all flex items-center justify-center gap-1"
            >
              <Printer className="w-4 h-4" />
              <span className="text-xs">{arabic ? 'طباعة' : 'Print'}</span>
            </button>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className="ws-btn ws-btn-primary erpx-pos-checkout"
          >
            {isProcessing && <Loader2 className="w-5 h-5 animate-spin" />}
            {isProcessing ? (arabic ? 'جارٍ التنفيذ…' : 'Processing...') : (arabic ? 'إتمام الدفع' : 'Complete Payment')}
          </button>
        </div>
      </section>
    </div>
  );
}
