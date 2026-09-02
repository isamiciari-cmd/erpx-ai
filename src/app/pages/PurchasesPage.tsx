import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Brain,
  Plus,
  Download,
  Truck,
  ArrowRight,
  FileText,
  ClipboardCheck,
  Award,
  Target,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// Purchase trend data
const purchaseData = [
  { id: 'month-0', month: 'Jan', amount: 85000, orders: 42 },
  { id: 'month-1', month: 'Feb', amount: 92000, orders: 48 },
  { id: 'month-2', month: 'Mar', amount: 88000, orders: 45 },
  { id: 'month-3', month: 'Apr', amount: 105000, orders: 55 },
  { id: 'month-4', month: 'May', amount: 98000, orders: 51 },
  { id: 'month-5', month: 'Jun', amount: 112000, orders: 58 },
];

// Supplier performance
const supplierData = [
  { id: 'supplier-0', name: 'Al-Jawad Trading', share: 32, amount: 35840 },
  { id: 'supplier-1', name: 'Modern Supply Co', share: 28, amount: 31360 },
  { id: 'supplier-2', name: 'Tech Imports', share: 22, amount: 24640 },
  { id: 'supplier-3', name: 'Global Wholesale', share: 12, amount: 13440 },
  { id: 'supplier-4', name: 'Others', share: 6, amount: 6720 },
];

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

// Budget data
const budgetData = [
  { id: 'dept-0', department: 'IT', budget: 50000, used: 38000, committed: 8000 },
  { id: 'dept-1', department: 'Operations', budget: 75000, used: 62000, committed: 10000 },
  { id: 'dept-2', department: 'Marketing', budget: 30000, used: 22000, committed: 5000 },
  { id: 'dept-3', department: 'Admin', budget: 25000, used: 18000, committed: 3000 },
];

// Top suppliers with ratings
const topSuppliers = [
  {
    id: 1,
    name: 'Al-Jawad Trading',
    orders: 28,
    amount: 45000,
    rating: 4.8,
    delivery: 95,
    quality: 92,
    price: 88,
  },
  {
    id: 2,
    name: 'Modern Supply Co',
    orders: 22,
    amount: 38000,
    rating: 4.6,
    delivery: 90,
    quality: 88,
    price: 85,
  },
  {
    id: 3,
    name: 'Tech Imports Ltd',
    orders: 18,
    amount: 32000,
    rating: 4.5,
    delivery: 88,
    quality: 90,
    price: 82,
  },
  {
    id: 4,
    name: 'Global Wholesale',
    orders: 15,
    amount: 28000,
    rating: 4.3,
    delivery: 82,
    quality: 85,
    price: 90,
  },
];

// Recent purchase orders
const recentOrders = [
  {
    id: 'PO-1234',
    supplier: 'Al-Jawad Trading',
    amount: 12500,
    status: 'Received',
    date: '2h ago',
    grn: 'GRN-456',
  },
  {
    id: 'PO-1235',
    supplier: 'Modern Supply',
    amount: 8900,
    status: 'In Transit',
    date: '5h ago',
    grn: '-',
  },
  {
    id: 'PO-1236',
    supplier: 'Tech Imports',
    amount: 15200,
    status: 'Approved',
    date: '1d ago',
    grn: '-',
  },
  {
    id: 'PO-1237',
    supplier: 'Global Wholesale',
    amount: 6700,
    status: 'Delayed',
    date: '2d ago',
    grn: '-',
  },
];

// Purchase requests pending approval
const pendingRequests = [
  {
    id: 'PR-245',
    department: 'IT',
    item: 'Office Supplies',
    quantity: 500,
    value: 5000,
    requestedBy: 'Ahmad',
    priority: 'High',
  },
  {
    id: 'PR-246',
    department: 'Operations',
    item: 'Computer Parts',
    quantity: 50,
    value: 12000,
    requestedBy: 'Sarah',
    priority: 'Medium',
  },
  {
    id: 'PR-247',
    department: 'Marketing',
    item: 'Furniture',
    quantity: 20,
    value: 8500,
    requestedBy: 'Mohammed',
    priority: 'Low',
  },
];

// RFQ Comparison
const rfqComparison = [
  { supplier: 'Al-Jawad', price: 4500, delivery: '5 days', rating: 4.8 },
  { supplier: 'Modern Supply', price: 4200, delivery: '7 days', rating: 4.6 },
  { supplier: 'Tech Imports', price: 4800, delivery: '4 days', rating: 4.5 },
];

// Goods receipts
const recentGRN = [
  {
    id: 'GRN-456',
    po: 'PO-1234',
    supplier: 'Al-Jawad',
    received: 48,
    ordered: 50,
    variance: -2,
    status: 'Accepted',
  },
  {
    id: 'GRN-457',
    po: 'PO-1238',
    supplier: 'Modern Supply',
    received: 100,
    ordered: 100,
    variance: 0,
    status: 'Accepted',
  },
  {
    id: 'GRN-458',
    po: 'PO-1239',
    supplier: 'Tech Imports',
    received: 28,
    ordered: 30,
    variance: -2,
    status: 'Partial',
  },
];

// Three-way matching
const threeWayMatch = [
  {
    invoice: 'INV-789',
    po: 'PO-1234',
    grn: 'GRN-456',
    poAmount: 12500,
    grnAmount: 12000,
    invoiceAmount: 12500,
    status: 'Mismatch',
  },
  {
    invoice: 'INV-790',
    po: 'PO-1238',
    grn: 'GRN-457',
    poAmount: 8900,
    grnAmount: 8900,
    invoiceAmount: 8900,
    status: 'Matched',
  },
];

// AI Insights
const aiInsights = [
  {
    id: 1,
    type: 'success',
    title: 'Cost Optimization Detected',
    message:
      "Switch to 'Modern Supply Co' for electronics - save 12% on average. Estimated annual savings: SAR 18,000.",
    confidence: '91%',
  },
  {
    id: 2,
    type: 'warning',
    title: 'Delivery Performance Risk',
    message:
      "'Global Wholesale' has 3 consecutive delays averaging 4 days. Consider backup supplier or contract renegotiation.",
    confidence: '87%',
  },
  {
    id: 3,
    type: 'info',
    title: 'Bulk Purchase Opportunity',
    message:
      "Seasonal discount from 'Al-Jawad Trading' - 15% off on orders >SAR 50K. Valid until month end.",
    confidence: '94%',
  },
  {
    id: 4,
    type: 'warning',
    title: 'Budget Alert',
    message:
      'IT department at 92% budget utilization. Recommend approval freeze for non-critical requests.',
    confidence: '96%',
  },
];

export default function PurchasesPage() {
  const [totalPurchases, setTotalPurchases] = useState(112000);
  const [pendingOrders, setPendingOrders] = useState(18);
  const [activeSuppliers, setActiveSuppliers] = useState(24);
  const [avgDeliveryDays, setAvgDeliveryDays] = useState(5.2);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalPurchases((prev) => prev + Math.floor(Math.random() * 2000 - 1000));
      setPendingOrders((prev) => Math.max(0, prev + Math.floor(Math.random() * 3 - 1)));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Purchase Management
          </h1>
          <p className="text-gray-400 mt-1">Supplier management and procurement tracking</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-white font-medium transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white font-semibold shadow-lg shadow-blue-500/30"
          >
            <Plus className="w-4 h-4" />
            New Request
          </motion.button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Purchases"
          value={`SAR ${totalPurchases.toLocaleString()}`}
          icon={ShoppingBag}
          trend="+14.2%"
          color="from-blue-500 to-cyan-500"
        />
        <KPICard
          title="Pending Requests"
          value={pendingOrders.toString()}
          icon={Clock}
          trend="-8.1%"
          color="from-yellow-500 to-orange-500"
          trendDown
        />
        <KPICard
          title="Active Suppliers"
          value={activeSuppliers.toString()}
          icon={Users}
          trend="+5.4%"
          color="from-green-500 to-emerald-500"
        />
        <KPICard
          title="Avg Delivery Time"
          value={`${avgDeliveryDays} days`}
          icon={Truck}
          trend="-12.3%"
          color="from-purple-500 to-pink-500"
          trendDown
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <QuickStat label="Pending Approval" value="8" color="bg-yellow-500/20 text-yellow-400" />
        <QuickStat label="RFQs Sent" value="5" color="bg-purple-500/20 text-purple-400" />
        <QuickStat label="In Transit" value="12" color="bg-blue-500/20 text-blue-400" />
        <QuickStat label="Received Today" value="15" color="bg-green-500/20 text-green-400" />
        <QuickStat label="Overdue" value="3" color="bg-red-500/20 text-red-400" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Purchase Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={purchaseData}>
              <defs>
                <linearGradient id="purchaseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop key="purchase-stop-0" offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop key="purchase-stop-1" offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#8B5CF6"
                strokeWidth={2}
                fill="url(#purchaseGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* AI Insights Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI Insights</h3>
              <p className="text-xs text-gray-400">Procurement Intelligence</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[240px] overflow-y-auto">
            {aiInsights.map((insight) => (
              <motion.div
                key={insight.id}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-xl border ${
                  insight.type === 'warning'
                    ? 'bg-yellow-500/5 border-yellow-500/30'
                    : insight.type === 'success'
                      ? 'bg-green-500/5 border-green-500/30'
                      : 'bg-blue-500/5 border-blue-500/30'
                } cursor-pointer`}
              >
                <h4 className="text-white font-semibold text-xs mb-1">{insight.title}</h4>
                <p className="text-gray-400 text-xs mb-2 leading-relaxed">{insight.message}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-400">{insight.confidence}</span>
                  <ArrowRight className="w-3 h-3 text-blue-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Purchase Requests & Budget Control */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-400" />
                Purchase Requests
              </h3>
              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-xs font-semibold">
                {pendingRequests.length} pending
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-800">
            {pendingRequests.map((req) => (
              <div key={req.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium text-sm">{req.item}</p>
                    <p className="text-xs text-gray-500">
                      {req.id} • {req.department}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      req.priority === 'High'
                        ? 'bg-red-500/20 text-red-400'
                        : req.priority === 'Medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {req.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>Qty: {req.quantity}</span>
                  <span>SAR {req.value.toLocaleString()}</span>
                  <span>By: {req.requestedBy}</span>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Approve
                  </button>
                  <button className="flex-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Budget Control */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              Budget Control
            </h3>
          </div>
          <div className="space-y-4">
            {budgetData.map((dept) => {
              const usedPercent = (dept.used / dept.budget) * 100;
              const committedPercent = (dept.committed / dept.budget) * 100;
              const availablePercent =
                ((dept.budget - dept.used - dept.committed) / dept.budget) * 100;

              return (
                <div key={dept.department} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{dept.department}</span>
                    <span className="text-xs text-gray-500">{usedPercent.toFixed(0)}% used</span>
                  </div>
                  <div className="bg-gray-700 rounded-full h-3 overflow-hidden flex">
                    <div
                      className="bg-red-500"
                      style={{ width: `${usedPercent}%` }}
                      title={`Used: SAR ${dept.used.toLocaleString()}`}
                    />
                    <div
                      className="bg-yellow-500"
                      style={{ width: `${committedPercent}%` }}
                      title={`Committed: SAR ${dept.committed.toLocaleString()}`}
                    />
                    <div
                      className="bg-green-500"
                      style={{ width: `${availablePercent}%` }}
                      title={`Available: SAR ${(dept.budget - dept.used - dept.committed).toLocaleString()}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      SAR {dept.used.toLocaleString()} / {dept.budget.toLocaleString()}
                    </span>
                    <span className={usedPercent > 90 ? 'text-red-400' : 'text-green-400'}>
                      SAR {(dept.budget - dept.used - dept.committed).toLocaleString()} left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-400">Used</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-400">Committed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-400">Available</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Supplier Performance & Three-Way Matching */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers with Performance Radar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-400" />
              Top Suppliers Performance
            </h3>
          </div>
          <div className="divide-y divide-gray-800">
            {topSuppliers.slice(0, 3).map((supplier, index) => (
              <div key={supplier.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{supplier.name}</p>
                    <p className="text-xs text-gray-400">
                      {supplier.orders} orders • ⭐ {supplier.rating}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">
                      SAR {supplier.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                    <p className="text-green-400 font-semibold">{supplier.delivery}%</p>
                    <p className="text-gray-500">Delivery</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
                    <p className="text-blue-400 font-semibold">{supplier.quality}%</p>
                    <p className="text-gray-500">Quality</p>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 text-center">
                    <p className="text-purple-400 font-semibold">{supplier.price}%</p>
                    <p className="text-gray-500">Price</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Three-Way Matching */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-400" />
              Three-Way Matching
            </h3>
          </div>
          <div className="divide-y divide-gray-800">
            {threeWayMatch.map((match) => (
              <div key={match.invoice} className="p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-medium text-sm">{match.invoice}</p>
                    <p className="text-xs text-gray-500">
                      PO: {match.po} • GRN: {match.grn}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      match.status === 'Matched'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {match.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 mb-1">PO Amount</p>
                    <p className="text-white font-semibold text-sm">
                      SAR {match.poAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 mb-1">GRN Amount</p>
                    <p className="text-white font-semibold text-sm">
                      SAR {match.grnAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 mb-1">Invoice</p>
                    <p className="text-white font-semibold text-sm">
                      SAR {match.invoiceAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
                {match.status === 'Mismatch' && (
                  <p className="mt-2 text-xs text-red-400">
                    ⚠️ GRN variance detected: SAR{' '}
                    {Math.abs(match.poAmount - match.grnAmount).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Orders & Goods Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">Recent Purchase Orders</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium text-sm">{order.supplier}</p>
                    <p className="text-xs text-gray-500">{order.id}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      order.status === 'Received'
                        ? 'bg-green-500/20 text-green-400'
                        : order.status === 'In Transit'
                          ? 'bg-blue-500/20 text-blue-400'
                          : order.status === 'Approved'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>SAR {order.amount.toLocaleString()}</span>
                  <span>GRN: {order.grn}</span>
                  <span>{order.date}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Goods Receipts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-green-400" />
              Recent Goods Receipts
            </h3>
          </div>
          <div className="divide-y divide-gray-800">
            {recentGRN.map((grn) => (
              <div key={grn.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium text-sm">{grn.supplier}</p>
                    <p className="text-xs text-gray-500">
                      {grn.id} • PO: {grn.po}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      grn.status === 'Accepted'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {grn.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex-1">
                    <p className="text-gray-500 mb-1">Ordered: {grn.ordered}</p>
                    <p className="text-gray-500">Received: {grn.received}</p>
                  </div>
                  {grn.variance !== 0 && (
                    <div
                      className={`px-2 py-1 rounded ${grn.variance < 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
                    >
                      {grn.variance > 0 ? '+' : ''}
                      {grn.variance}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string;
  icon: any;
  trend: string;
  color: string;
  trendDown?: boolean;
}

function KPICard({ title, value, icon: Icon, trend, color, trendDown }: KPICardProps) {
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
          className={`text-sm font-semibold flex items-center gap-1 ${trendDown ? 'text-green-400' : 'text-green-400'}`}
        >
          {trendDown ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
          {trend}
        </span>
      </div>
      <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
      <p className="text-sm text-gray-400">{title}</p>
    </motion.div>
  );
}

// Quick Stat Component
interface QuickStatProps {
  label: string;
  value: string;
  color: string;
}

function QuickStat({ label, value, color }: QuickStatProps) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
