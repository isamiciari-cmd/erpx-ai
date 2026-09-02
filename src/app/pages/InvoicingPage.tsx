import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Download, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface InvoiceItem {
  description: string;
  quantity: number;
  price: number;
}

interface Invoice {
  id: number;
  customerName: string;
  items: InvoiceItem[];
  total: number;
  currency: string;
  status: 'draft' | 'paid' | 'cancelled';
  createdAt: string;
}

// Mock API
const invoiceAPI = {
  invoices: [] as Invoice[],
  nextId: 1,

  async create(data: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
    const invoice = {
      ...data,
      id: this.nextId++,
      createdAt: new Date().toISOString(),
    };
    this.invoices.push(invoice);
    return new Promise((resolve) => setTimeout(() => resolve(invoice), 300));
  },

  async findAll(): Promise<Invoice[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...this.invoices]), 300));
  },

  async updateStatus(id: number, status: Invoice['status']): Promise<void> {
    const invoice = this.invoices.find((i) => i.id === id);
    if (invoice) invoice.status = status;
    return new Promise((resolve) => setTimeout(() => resolve(), 300));
  },

  async delete(id: number): Promise<void> {
    this.invoices = this.invoices.filter((i) => i.id !== id);
    return new Promise((resolve) => setTimeout(() => resolve(), 300));
  },

  generatePDF(invoice: Invoice): void {
    // Simulate PDF generation
    console.log('Generating PDF for invoice:', invoice);
    alert(
      `PDF generated for Invoice #${invoice.id}\nCustomer: ${invoice.customerName}\nTotal: ${invoice.total} ${invoice.currency}`,
    );
  },
};

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);

  const fetchInvoices = async () => {
    const data = await invoiceAPI.findAll();
    setInvoices(data);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const createInvoice = async () => {
    if (!customerName || items.some((i) => !i.description)) return;

    await invoiceAPI.create({
      customerName,
      items,
      total: calculateTotal(),
      currency,
      status: 'draft',
    });

    setCustomerName('');
    setItems([{ description: '', quantity: 1, price: 0 }]);
    setShowForm(false);
    fetchInvoices();
  };

  const updateStatus = async (id: number, status: Invoice['status']) => {
    await invoiceAPI.updateStatus(id, status);
    fetchInvoices();
  };

  const deleteInvoice = async (id: number) => {
    await invoiceAPI.delete(id);
    fetchInvoices();
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white"
        >
          Invoicing
        </motion.h1>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Invoice
        </motion.button>
      </div>

      {/* Create Invoice Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-6">Create New Invoice</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SAR">SAR - Saudi Riyal</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-4">Invoice Items</label>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 mb-3">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  placeholder="Description"
                  className="col-span-6 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                  placeholder="Qty"
                  className="col-span-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                  placeholder="Price"
                  className="col-span-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-white font-semibold">
                    {(item.quantity * item.price).toFixed(2)}
                  </span>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={addItem}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center border-t border-white/10 pt-4 mb-6">
            <span className="text-gray-400">Total Amount:</span>
            <span className="text-2xl font-bold text-white">
              {calculateTotal().toFixed(2)} {currency}
            </span>
          </div>

          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createInvoice}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium"
            >
              Create Invoice
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl"
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Invoices List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">All Invoices</h2>
        </div>

        <div className="overflow-x-auto">
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No invoices yet. Create your first invoice above.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    Invoice #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, i) => (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-6 py-4 text-sm text-blue-400 font-semibold">#{invoice.id}</td>
                    <td className="px-6 py-4 text-sm text-white">{invoice.customerName}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-white">
                      {invoice.total.toFixed(2)} {invoice.currency}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(
                          invoice.status,
                        )}`}
                      >
                        {getStatusIcon(invoice.status)}
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => invoiceAPI.generatePDF(invoice)}
                          className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-400"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </motion.button>

                        {invoice.status === 'draft' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => updateStatus(invoice.id, 'paid')}
                            className="p-2 hover:bg-green-500/10 rounded-lg text-gray-400 hover:text-green-400"
                            title="Mark as Paid"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </motion.button>
                        )}

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteInvoice(invoice.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
