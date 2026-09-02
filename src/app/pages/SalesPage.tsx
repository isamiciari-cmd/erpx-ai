import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Target,
  Brain,
  Plus,
  Download,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// Revenue trend data
const revenueData = [
  { id: 'month-0', month: 'Jan', revenue: 125000, profit: 42000 },
  { id: 'month-1', month: 'Feb', revenue: 142000, profit: 48000 },
  { id: 'month-2', month: 'Mar', revenue: 138000, profit: 45000 },
  { id: 'month-3', month: 'Apr', revenue: 165000, profit: 58000 },
  { id: 'month-4', month: 'May', revenue: 158000, profit: 52000 },
  { id: 'month-5', month: 'Jun', revenue: 182000, profit: 65000 },
];

// Sales by branch
const branchData = [
  { id: 'branch-0', branch: 'Riyadh', sales: 85000 },
  { id: 'branch-1', branch: 'Jeddah', sales: 62000 },
  { id: 'branch-2', branch: 'Dammam', sales: 48000 },
  { id: 'branch-3', branch: 'Makkah', sales: 35000 },
];

// Sales pipeline stages
const pipelineData = [
  { id: 'stage-0', stage: 'Lead', value: 45, count: 23 },
  { id: 'stage-1', stage: 'Qualified', value: 28, count: 14 },
  { id: 'stage-2', stage: 'Proposal', value: 18, count: 9 },
  { id: 'stage-3', stage: 'Negotiation', value: 12, count: 6 },
  { id: 'stage-4', stage: 'Closed', value: 8, count: 4 },
];

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

// Top customers
const topCustomers = [
  { id: 1, name: 'Ahmed Trading Co.', revenue: 45000, orders: 28, growth: '+15%' },
  { id: 2, name: 'Al-Noor Electronics', revenue: 38000, orders: 22, growth: '+12%' },
  { id: 3, name: 'Saudi Tech Solutions', revenue: 32000, orders: 18, growth: '+8%' },
  { id: 4, name: 'Modern Retail Group', revenue: 28000, orders: 15, growth: '+22%' },
];

// Recent invoices
const recentInvoices = [
  { id: 'INV-1234', customer: 'Ahmed Trading Co.', amount: 4500, status: 'Paid', date: '2h ago' },
  {
    id: 'INV-1235',
    customer: 'Al-Noor Electronics',
    amount: 3200,
    status: 'Pending',
    date: '4h ago',
  },
  { id: 'INV-1236', customer: 'Saudi Tech', amount: 5800, status: 'Overdue', date: '1d ago' },
  { id: 'INV-1237', customer: 'Modern Retail', amount: 2100, status: 'Paid', date: '2d ago' },
];

// Sales opportunities
const opportunities = [
  {
    id: 1,
    name: 'Office Equipment Deal',
    customer: 'Tech Corp',
    value: 45000,
    stage: 'Proposal',
    probability: 75,
  },
  {
    id: 2,
    name: 'Software Licenses',
    customer: 'Digital Co',
    value: 32000,
    stage: 'Negotiation',
    probability: 60,
  },
  {
    id: 3,
    name: 'Furniture Supply',
    customer: 'Modern Office',
    value: 28000,
    stage: 'Qualified',
    probability: 40,
  },
];

// AI Insights
const aiInsights = [
  {
    id: 1,
    type: 'success',
    title: 'Upselling Opportunity',
    message:
      'Ahmed Trading Co. shows 85% likelihood of purchasing additional products. Recommend product bundle.',
    confidence: '92%',
  },
  {
    id: 2,
    type: 'warning',
    title: 'Churn Risk Detected',
    message: "3 key customers haven't placed orders in 45 days. Immediate follow-up recommended.",
    confidence: '88%',
  },
  {
    id: 3,
    type: 'info',
    title: 'Revenue Forecast',
    message: 'Based on current pipeline, expected revenue next month: SAR 195,000 (+7%).',
    confidence: '94%',
  },
];

export default function SalesPage() {
  const [totalRevenue, setTotalRevenue] = useState(182000);
  const [monthlyGrowth, setMonthlyGrowth] = useState(12.5);
  const [pendingInvoices, setPendingInvoices] = useState(24);
  const [targetAchievement, setTargetAchievement] = useState(87);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalRevenue((prev) => prev + Math.floor(Math.random() * 2000 - 1000));
      setPendingInvoices((prev) => Math.max(0, prev + Math.floor(Math.random() * 3 - 1)));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Sales Management
          </h1>
          <p className="text-gray-400 mt-1">Track revenue, customers, and sales pipeline</p>
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
            New Sale
          </motion.button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={`SAR ${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={`+${monthlyGrowth}%`}
          color="from-blue-500 to-cyan-500"
        />
        <KPICard
          title="Gross Profit"
          value="SAR 65,000"
          icon={TrendingUp}
          trend="+18.2%"
          color="from-green-500 to-emerald-500"
        />
        <KPICard
          title="Pending Invoices"
          value={pendingInvoices.toString()}
          icon={FileText}
          trend="-5.1%"
          color="from-yellow-500 to-orange-500"
          trendDown
        />
        <KPICard
          title="Target Achievement"
          value={`${targetAchievement}%`}
          icon={Target}
          trend="+12.3%"
          color="from-purple-500 to-pink-500"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat label="Active Customers" value="156" color="bg-blue-500/20 text-blue-400" />
        <QuickStat label="Quotations" value="18" color="bg-purple-500/20 text-purple-400" />
        <QuickStat label="Orders" value="42" color="bg-green-500/20 text-green-400" />
        <QuickStat label="Overdue" value="7" color="bg-red-500/20 text-red-400" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Revenue & Profit Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="salesRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop key="sales-rev-stop-0" offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop key="sales-rev-stop-1" offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    key="sales-profit-stop-0"
                    offset="5%"
                    stopColor="#10B981"
                    stopOpacity={0.3}
                  />
                  <stop
                    key="sales-profit-stop-1"
                    offset="95%"
                    stopColor="#10B981"
                    stopOpacity={0}
                  />
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
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#salesRevenueGradient)"
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#profitGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Sales by Branch */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Sales by Branch</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={branchData}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop key="sales-bar-stop-0" offset="0%" stopColor="#8B5CF6" />
                  <stop key="sales-bar-stop-1" offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="branch" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="sales" fill="url(#barGradient)" radius={[8, 8, 0, 0]} name="Sales" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Sales Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Sales Pipeline</h3>
          <div className="space-y-3">
            {pipelineData.map((stage, index) => (
              <div key={stage.stage} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-sm text-gray-300">{stage.stage}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{stage.count} deals</span>
                    <span className="text-white font-semibold text-sm">{stage.value}%</span>
                  </div>
                </div>
                <div className="bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${stage.value}%`,
                      backgroundColor: COLORS[index],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
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
              <h3 className="text-lg font-bold text-white">AI Sales Insights</h3>
              <p className="text-xs text-gray-400">Smart Recommendations</p>
            </div>
          </div>

          <div className="space-y-3">
            {aiInsights.map((insight) => (
              <motion.div
                key={insight.id}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-xl border ${
                  insight.type === 'warning'
                    ? 'bg-yellow-500/5 border-yellow-500/30'
                    : insight.type === 'success'
                      ? 'bg-green-500/5 border-green-500/30'
                      : 'bg-blue-500/5 border-blue-500/30'
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
        {/* Top Customers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Top Customers
            </h3>
          </div>
          <div className="divide-y divide-gray-800">
            {topCustomers.map((customer, index) => (
              <div key={customer.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{customer.name}</p>
                    <p className="text-xs text-gray-400">{customer.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">
                      SAR {customer.revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-400">{customer.growth}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Invoices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">Recent Invoices</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {recentInvoices.map((invoice) => (
              <div key={invoice.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-medium text-sm">{invoice.customer}</p>
                    <p className="text-xs text-gray-500">{invoice.id}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      invoice.status === 'Paid'
                        ? 'bg-green-500/20 text-green-400'
                        : invoice.status === 'Pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {invoice.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>SAR {invoice.amount.toLocaleString()}</span>
                  <span>{invoice.date}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Sales Opportunities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Active Opportunities</h3>
            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs font-semibold">
              {opportunities.length} deals
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Opportunity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Value</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">
                  Probability
                </th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => (
                <tr key={opp.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                  <td className="px-6 py-4 text-sm text-white font-medium">{opp.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{opp.customer}</td>
                  <td className="px-6 py-4 text-sm text-white font-semibold">
                    SAR {opp.value.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                      {opp.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2 max-w-[80px]">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{ width: `${opp.probability}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{opp.probability}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <div
          className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <span
          className={`text-sm font-semibold flex items-center gap-1 ${trendDown ? 'text-red-400' : 'text-green-400'}`}
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
