import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Warehouse,
  DollarSign,
  BarChart3,
  Clock,
  ArrowRight,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Brain,
} from "lucide-react";
import StockTrendChart from "../components/charts/StockTrendChart";
import CategoryPieChart from "../components/charts/CategoryPieChart";
import MovementBarChart from "../components/charts/MovementBarChart";

// Stock trend data
const stockTrendData = [
  { id: "month-0", month: "Jan", value: 245000 },
  { id: "month-1", month: "Feb", value: 268000 },
  { id: "month-2", month: "Mar", value: 252000 },
  { id: "month-3", month: "Apr", value: 285000 },
  { id: "month-4", month: "May", value: 271000 },
  { id: "month-5", month: "Jun", value: 298000 },
];

// Category distribution
const categoryData = [
  { id: "cat-0", name: "Electronics", value: 35, count: 450 },
  { id: "cat-1", name: "Clothing", value: 25, count: 320 },
  { id: "cat-2", name: "Food", value: 20, count: 280 },
  { id: "cat-3", name: "Home", value: 12, count: 150 },
  { id: "cat-4", name: "Sports", value: 8, count: 100 },
];

const COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981"];

// Stock movement data
const movementData = [
  { id: "day-0", day: "Mon", in: 120, out: 85 },
  { id: "day-1", day: "Tue", in: 98, out: 110 },
  { id: "day-2", day: "Wed", in: 145, out: 95 },
  { id: "day-3", day: "Thu", in: 132, out: 118 },
  { id: "day-4", day: "Fri", in: 156, out: 102 },
  { id: "day-5", day: "Sat", in: 89, out: 78 },
];

// Low stock items
const lowStockItems = [
  { id: 1, sku: "ELC-001", name: "Wireless Mouse", current: 8, min: 30, warehouse: "Main", status: "critical" },
  { id: 2, sku: "CLT-045", name: "T-Shirt Blue", current: 15, min: 50, warehouse: "Branch 1", status: "warning" },
  { id: 3, sku: "FD-123", name: "Coffee Beans 1kg", current: 22, min: 100, warehouse: "Main", status: "critical" },
  { id: 4, sku: "HM-089", name: "Desk Lamp", current: 12, min: 25, warehouse: "Branch 2", status: "warning" },
  { id: 5, sku: "SPT-056", name: "Yoga Mat", current: 18, min: 40, warehouse: "Main", status: "warning" },
];

// Fast moving items
const fastMovingItems = [
  { id: 1, name: "USB-C Cable", sales: 245, revenue: 2450, trend: "+15%" },
  { id: 2, name: "Phone Case", sales: 198, revenue: 3960, trend: "+12%" },
  { id: 3, name: "Water Bottle", sales: 167, revenue: 2505, trend: "+8%" },
  { id: 4, name: "Notebook", sales: 142, revenue: 1420, trend: "+5%" },
];

// Recent movements
const recentMovements = [
  { id: "MOV-1234", type: "IN", item: "Laptop Stand", qty: 50, warehouse: "Main", date: "2h ago", user: "John Doe" },
  { id: "MOV-1235", type: "OUT", item: "Headphones", qty: 25, warehouse: "Branch 1", date: "3h ago", user: "Sarah" },
  { id: "MOV-1236", type: "TRANSFER", item: "Mouse Pad", qty: 100, warehouse: "Main → Branch 2", date: "5h ago", user: "Admin" },
  { id: "MOV-1237", type: "ADJUST", item: "Keyboard", qty: -5, warehouse: "Branch 1", date: "6h ago", user: "Manager" },
];

// AI Insights
const aiInsights = [
  {
    id: 1,
    type: "warning",
    title: "Stockout Risk Detected",
    message: "5 items predicted to stock out within 7 days. Recommend immediate reorder.",
    confidence: "94%",
  },
  {
    id: 2,
    type: "success",
    title: "Optimal Reorder Point",
    message: "Increase reorder point for 'Wireless Mouse' from 30 to 45 units based on demand.",
    confidence: "89%",
  },
  {
    id: 3,
    type: "info",
    title: "Dead Stock Alert",
    message: "12 items haven't moved in 90+ days. Total value: $8,450. Consider clearance sale.",
    confidence: "96%",
  },
];

export default function InventoryPage() {
  const [totalValue, setTotalValue] = useState(298450);
  const [availableStock, setAvailableStock] = useState(1248);
  const [reservedStock, setReservedStock] = useState(156);
  const [turnoverRate, setTurnoverRate] = useState(4.2);

  // Memoize chart data to prevent recreation on every render
  const memoizedStockTrendData = useMemo(() => stockTrendData, []);
  const memoizedCategoryData = useMemo(() => categoryData, []);
  const memoizedMovementData = useMemo(() => movementData, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalValue((prev) => prev + Math.floor(Math.random() * 1000 - 500));
      setAvailableStock((prev) => prev + Math.floor(Math.random() * 10 - 5));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Inventory Management
          </h1>
          <p className="text-gray-400 mt-1">Real-time stock tracking and management</p>
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
            Add Item
          </motion.button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Stock Value"
          value={`$${totalValue.toLocaleString()}`}
          icon={DollarSign}
          trend="+8.2%"
          color="from-blue-500 to-cyan-500"
        />
        <KPICard
          title="Available Stock"
          value={`${availableStock.toLocaleString()}`}
          icon={Package}
          trend="+5.4%"
          color="from-green-500 to-emerald-500"
        />
        <KPICard
          title="Reserved Stock"
          value={reservedStock.toString()}
          icon={Clock}
          trend="-2.1%"
          color="from-yellow-500 to-orange-500"
          trendDown
        />
        <KPICard
          title="Turnover Rate"
          value={`${turnoverRate}x`}
          icon={TrendingUp}
          trend="+12.3%"
          color="from-purple-500 to-pink-500"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat label="Low Stock" value="12" color="bg-red-500/20 text-red-400" />
        <QuickStat label="Out of Stock" value="5" color="bg-orange-500/20 text-orange-400" />
        <QuickStat label="Near Expiry" value="8" color="bg-yellow-500/20 text-yellow-400" />
        <QuickStat label="Warehouses" value="4" color="bg-blue-500/20 text-blue-400" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Value Trend */}
        <motion.div
          key="stock-trend-chart-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Stock Value Trend</h3>
            <button className="text-gray-400 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <StockTrendChart data={memoizedStockTrendData} />
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          key="category-distribution-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Stock by Category</h3>
          <div className="flex items-center gap-6">
            <div style={{ width: '50%', height: 200 }}>
              <CategoryPieChart data={memoizedCategoryData} colors={COLORS} width="100%" height={200} />
            </div>
            <div className="flex-1 space-y-2">
              {memoizedCategoryData.map((cat, index) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-sm text-gray-300">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">{cat.value}%</p>
                    <p className="text-xs text-gray-500">{cat.count} items</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stock Movement */}
        <motion.div
          key="stock-movement-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Weekly Movement</h3>
          <MovementBarChart data={memoizedMovementData} />
        </motion.div>

        {/* AI Insights Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">AI Insights</h3>
              <p className="text-xs text-gray-400">Inventory Intelligence</p>
            </div>
          </div>

          <div className="space-y-3">
            {aiInsights.map((insight) => (
              <motion.div
                key={insight.id}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-xl border ${
                  insight.type === "warning"
                    ? "bg-yellow-500/5 border-yellow-500/30"
                    : insight.type === "success"
                    ? "bg-green-500/5 border-green-500/30"
                    : "bg-blue-500/5 border-blue-500/30"
                } cursor-pointer`}
              >
                <h4 className="text-white font-semibold text-sm mb-1">{insight.title}</h4>
                <p className="text-gray-400 text-xs mb-2">{insight.message}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-400">Confidence: {insight.confidence}</span>
                  <ArrowRight className="w-3 h-3 text-blue-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Low Stock Alerts
              </h3>
              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-lg text-xs font-semibold">
                {lowStockItems.length} items
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm text-gray-400">{item.sku}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.warehouse}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-1.5 max-w-[60px]">
                          <div
                            className={`h-1.5 rounded-full ${
                              item.status === "critical" ? "bg-red-500" : "bg-yellow-500"
                            }`}
                            style={{ width: `${(item.current / item.min) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {item.current}/{item.min}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          item.status === "critical"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Recent Movements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">Recent Movements</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {recentMovements.map((movement) => (
              <div key={movement.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium text-sm">{movement.item}</p>
                    <p className="text-xs text-gray-500">{movement.id}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      movement.type === "IN"
                        ? "bg-green-500/20 text-green-400"
                        : movement.type === "OUT"
                        ? "bg-red-500/20 text-red-400"
                        : movement.type === "TRANSFER"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {movement.type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Qty: {movement.qty}</span>
                  <span>{movement.warehouse}</span>
                  <span>{movement.date}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Fast Moving Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-[#111827] border border-gray-800 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Fast Moving Items</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {fastMovingItems.map((item, index) => (
            <div
              key={item.id}
              className="p-4 bg-gray-800/30 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.sales} units</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-400 font-semibold">${item.revenue}</span>
                <span className="text-green-400 text-xs font-medium">{item.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
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
        <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span className={`text-sm font-semibold flex items-center gap-1 ${trendDown ? 'text-red-400' : 'text-green-400'}`}>
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
