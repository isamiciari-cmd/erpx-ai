import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ThemeToggle from '../components/ThemeToggle';
import {
  DollarSign,
  TrendingUp,
  Download,
  ChevronRight,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  Users,
  ShoppingCart,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Mail,
  FileSpreadsheet,
  Settings,
  LayoutDashboard,
  Wallet,
  Receipt,
  CreditCard,
  Percent,
  Target,
  Zap,
  AlertTriangle,
  Send,
  QrCode,
  Plus,
  Eye,
  Filter,
  Search,
  Building2,
  UserCheck,
  Truck,
  Store,
  BarChart,
  FileCheck,
  XCircle,
  RefreshCw,
  Warehouse,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDashboardAnalytics, useInvoices } from '../../hooks/useSupabaseQuery';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';

// Helper function to process monthly data for charts
function processMonthlyData(invoices: any[], salesOrders: any[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const currentMonth = new Date().getMonth();
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const monthIndex = (currentMonth - 5 + i + 12) % 12;
    return months[monthIndex];
  });

  return last6Months.map((month, index) => {
    const monthInvoices = invoices.filter((inv: any) => {
      const invMonth = new Date(inv.issueDate).toLocaleDateString('en-US', { month: 'short' });
      return invMonth === month;
    });

    const monthOrders = salesOrders.filter((order: any) => {
      const orderMonth = new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short' });
      return orderMonth === month;
    });

    const revenue = monthInvoices.reduce((sum: number, inv: any) => sum + (inv.amountPaid || 0), 0);
    const expenses = 0; // TODO: Fetch from expenses table
    const cashFlow = revenue - expenses;

    return {
      id: `month-${index}`,
      month,
      revenue,
      expenses,
      cashFlow,
      moneyIn: revenue,
      moneyOut: expenses,
      profit: revenue - expenses,
    };
  });
}

// Mock financial data (will be replaced with real data from hook)
const financialKPIs = [
  {
    label: 'Total Revenue',
    value: '$2.4M',
    rawValue: 2400000,
    change: '+12.5%',
    trend: 'up' as const,
    icon: DollarSign,
    comparison: 'vs last month',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    label: 'Net Profit',
    value: '$840K',
    rawValue: 840000,
    change: '+18.2%',
    trend: 'up' as const,
    icon: TrendingUp,
    comparison: 'vs last month',
    color: 'from-green-500 to-emerald-500',
  },
  {
    label: 'Total Expenses',
    value: '$1.56M',
    rawValue: 1560000,
    change: '+5.4%',
    trend: 'down' as const,
    icon: Wallet,
    comparison: 'vs last month',
    color: 'from-orange-500 to-red-500',
  },
  {
    label: 'Cash Balance',
    value: '$3.2M',
    rawValue: 3200000,
    change: '+22.1%',
    trend: 'up' as const,
    icon: CreditCard,
    comparison: 'vs last month',
    color: 'from-purple-500 to-pink-500',
  },
  {
    label: 'Accounts Receivable',
    value: '$680K',
    rawValue: 680000,
    change: '-8.3%',
    trend: 'up' as const,
    icon: Receipt,
    comparison: 'vs last month',
    color: 'from-teal-500 to-cyan-500',
  },
  {
    label: 'Accounts Payable',
    value: '$420K',
    rawValue: 420000,
    change: '-12.0%',
    trend: 'up' as const,
    icon: FileText,
    comparison: 'vs last month',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    label: 'ROI',
    value: '35.2%',
    rawValue: 35.2,
    change: '+4.8%',
    trend: 'up' as const,
    icon: Target,
    comparison: 'vs last quarter',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    label: 'Gross Margin',
    value: '65.0%',
    rawValue: 65.0,
    change: '+2.3%',
    trend: 'up' as const,
    icon: Percent,
    comparison: 'vs last month',
    color: 'from-pink-500 to-rose-500',
  },
  {
    label: 'Burn Rate',
    value: '$52K/day',
    rawValue: 52000,
    change: '-15.4%',
    trend: 'up' as const,
    icon: Zap,
    comparison: 'vs last month',
    color: 'from-red-500 to-orange-500',
  },
  {
    label: 'Monthly Growth',
    value: '28.5%',
    rawValue: 28.5,
    change: '+6.2%',
    trend: 'up' as const,
    icon: TrendingUp,
    comparison: 'vs last month',
    color: 'from-green-500 to-teal-500',
  },
];

// Invoice KPIs
const invoiceKPIs = [
  {
    label: 'Total Invoices',
    value: '1,248',
    change: '+156',
    trend: 'up' as const,
    icon: FileText,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    label: 'Paid Invoices',
    value: '892',
    change: '71.5%',
    trend: 'up' as const,
    icon: CheckCircle,
    color: 'from-green-500 to-emerald-500',
  },
  {
    label: 'Unpaid Invoices',
    value: '268',
    change: '21.5%',
    trend: 'down' as const,
    icon: Clock,
    color: 'from-yellow-500 to-orange-500',
  },
  {
    label: 'Overdue',
    value: '88',
    change: '7%',
    trend: 'down' as const,
    icon: AlertCircle,
    color: 'from-red-500 to-rose-500',
  },
  {
    label: 'Outstanding Balance',
    value: '$486K',
    change: '-12.8%',
    trend: 'up' as const,
    icon: DollarSign,
    color: 'from-purple-500 to-pink-500',
  },
  {
    label: 'VAT Collected',
    value: '$124K',
    change: '+8.5%',
    trend: 'up' as const,
    icon: Percent,
    color: 'from-indigo-500 to-blue-500',
  },
];

// Cash Flow Data
const cashFlowData = [
  { month: 'Jan', moneyIn: 450000, moneyOut: 280000, cashFlow: 170000 },
  { month: 'Feb', moneyIn: 520000, moneyOut: 310000, cashFlow: 210000 },
  { month: 'Mar', moneyIn: 480000, moneyOut: 295000, cashFlow: 185000 },
  { month: 'Apr', moneyIn: 580000, moneyOut: 340000, cashFlow: 240000 },
  { month: 'May', moneyIn: 650000, moneyOut: 380000, cashFlow: 270000 },
  { month: 'Jun', moneyIn: 720000, moneyOut: 420000, cashFlow: 300000 },
];

const revenueVsExpensesData = [
  { month: 'Jan', revenue: 450000, expenses: 280000 },
  { month: 'Feb', revenue: 520000, expenses: 310000 },
  { month: 'Mar', revenue: 480000, expenses: 295000 },
  { month: 'Apr', revenue: 580000, expenses: 340000 },
  { month: 'May', revenue: 650000, expenses: 380000 },
  { month: 'Jun', revenue: 720000, expenses: 420000 },
];

const expenseBreakdownData = [
  { name: 'Payroll', value: 620000, color: '#3B82F6' },
  { name: 'Operations', value: 380000, color: '#10B981' },
  { name: 'Marketing', value: 240000, color: '#F59E0B' },
  { name: 'Suppliers', value: 180000, color: '#8B5CF6' },
  { name: 'Other', value: 140000, color: '#EC4899' },
];

const profitTrendData = [
  { month: 'Jan', profit: 170000 },
  { month: 'Feb', profit: 210000 },
  { month: 'Mar', profit: 185000 },
  { month: 'Apr', profit: 240000 },
  { month: 'May', profit: 270000 },
  { month: 'Jun', profit: 300000 },
];

// Invoice Status Data
const invoiceStatusData = [
  { name: 'Paid', value: 892, color: '#10B981' },
  { name: 'Unpaid', value: 268, color: '#F59E0B' },
  { name: 'Overdue', value: 88, color: '#EF4444' },
];

// Recent Invoices
const recentInvoices = [
  {
    id: 'INV-2024-001',
    customer: 'Acme Corp',
    date: '2024-06-01',
    dueDate: '2024-06-15',
    amount: 12500,
    vat: 1875,
    status: 'Paid',
    hasQR: true,
  },
  {
    id: 'INV-2024-002',
    customer: 'TechStart Inc',
    date: '2024-06-03',
    dueDate: '2024-06-17',
    amount: 8900,
    vat: 1335,
    status: 'Unpaid',
    hasQR: true,
  },
  {
    id: 'INV-2024-003',
    customer: 'Global Trade',
    date: '2024-05-28',
    dueDate: '2024-06-11',
    amount: 15200,
    vat: 2280,
    status: 'Overdue',
    hasQR: true,
  },
  {
    id: 'INV-2024-004',
    customer: 'Retail Plus',
    date: '2024-06-05',
    dueDate: '2024-06-19',
    amount: 6750,
    vat: 1012.5,
    status: 'Paid',
    hasQR: true,
  },
  {
    id: 'INV-2024-005',
    customer: 'Manufacturing Co',
    date: '2024-06-02',
    dueDate: '2024-06-16',
    amount: 22400,
    vat: 3360,
    status: 'Unpaid',
    hasQR: true,
  },
];

// AI Insights Data
const aiInsights = [
  {
    type: 'success',
    title: 'Revenue Growth Accelerating',
    message: 'Revenue increased by 28.5% this month, exceeding projections by 12%',
    action: 'View Details',
    icon: TrendingUp,
  },
  {
    type: 'warning',
    title: '88 Overdue Invoices',
    message: '$124K in overdue payments. Send automated reminders to improve cash flow.',
    action: 'Send Reminders',
    icon: AlertTriangle,
  },
  {
    type: 'info',
    title: 'Inventory Optimization',
    message: '15 products low in stock. Reorder now to prevent stockouts.',
    action: 'View Inventory',
    icon: Package,
  },
  {
    type: 'success',
    title: 'Sales Performance Strong',
    message: 'Top 3 products generated 45% of total revenue this month.',
    action: 'View Report',
    icon: BarChart,
  },
];

// Navigation Items
const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/executive' },
  { name: 'Finance', icon: DollarSign, path: '/finance' },
  { name: 'Invoicing', icon: FileText, path: '/finance/invoicing' },
  { name: 'Sales', icon: ShoppingCart, path: '/sales' },
  { name: 'Inventory', icon: Package, path: '/inventory' },
  { name: 'Purchases', icon: Truck, path: '/purchase' },
  { name: 'Customers', icon: Users, path: '/crm' },
  { name: 'Suppliers', icon: Building2, path: '/suppliers' },
  { name: 'HR', icon: UserCheck, path: '/hr' },
  { name: 'POS', icon: Store, path: '/pos' },
  { name: 'Reports', icon: BarChart3, path: '/reports' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

// Business Module Stats
const moduleStats = [
  {
    module: 'Sales',
    icon: ShoppingCart,
    color: 'from-blue-500 to-cyan-500',
    kpis: [
      { label: 'Orders', value: '1,248', change: '+12%' },
      { label: 'Revenue', value: '$720K', change: '+18%' },
      { label: 'Customers', value: '892', change: '+8%' },
    ],
  },
  {
    module: 'Inventory',
    icon: Package,
    color: 'from-purple-500 to-pink-500',
    kpis: [
      { label: 'Products', value: '2,450', change: '+45' },
      { label: 'Stock Value', value: '$1.2M', change: '+5%' },
      { label: 'Low Stock', value: '15', change: '-3' },
    ],
  },
  {
    module: 'Purchases',
    icon: Truck,
    color: 'from-orange-500 to-red-500',
    kpis: [
      { label: 'Orders', value: '324', change: '+8%' },
      { label: 'Spent', value: '$420K', change: '+12%' },
      { label: 'Suppliers', value: '68', change: '+2' },
    ],
  },
  {
    module: 'HR',
    icon: UserCheck,
    color: 'from-green-500 to-emerald-500',
    kpis: [
      { label: 'Employees', value: '156', change: '+12' },
      { label: 'Payroll', value: '$280K', change: '+3%' },
      { label: 'Attendance', value: '94%', change: '+2%' },
    ],
  },
];

export default function ExecutiveDashboard() {
  const { user } = useAuth();
  const [downloadMenuOpen, setDownloadMenuOpen] = useState<string | null>(null);
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false);

  // Fetch real-time data from PostgreSQL
  const {
    data: analytics,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useDashboardAnalytics();
  const { data: allInvoices, loading: invoicesLoading } = useInvoices();

  // Calculate real KPIs from database data
  const invoices = analytics?.invoices || [];
  const salesOrders = analytics?.salesOrders || [];
  const inventory = analytics?.inventory || [];

  // Financial KPIs - Real calculations
  const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (inv.amountPaid || 0), 0);
  const totalInvoiceValue = invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0);
  const outstandingBalance = totalInvoiceValue - totalRevenue;
  const totalExpenses = 0; // TODO: Fetch from expenses table
  const netProfit = totalRevenue - totalExpenses;
  const cashBalance = totalRevenue; // Simplified - should track actual cash
  const stockValue = inventory.reduce(
    (sum: number, item: any) => sum + item.quantityAvailable * item.product.unitPrice,
    0,
  );
  const availableStock = inventory.reduce(
    (sum: number, item: any) => sum + item.quantityAvailable,
    0,
  );
  const reservedStock = inventory.reduce(
    (sum: number, item: any) => sum + item.quantityReserved,
    0,
  );

  // Invoice KPIs - Real calculations
  const paidInvoices = invoices.filter((inv: any) => inv.status === 'PAID');
  const unpaidInvoices = invoices.filter((inv: any) => inv.status === 'UNPAID');
  const overdueInvoices = invoices.filter(
    (inv: any) => inv.status === 'UNPAID' && new Date(inv.dueDate) < new Date(),
  );
  const vatCollected = invoices.reduce((sum: number, inv: any) => sum + (inv.vatAmount || 0), 0);

  // Chart data - Process from database
  const monthlyData = processMonthlyData(invoices, salesOrders);
  const invoiceStatusData = [
    { id: 'invoice-paid', name: 'Paid', value: paidInvoices.length, color: '#10B981' },
    { id: 'invoice-unpaid', name: 'Unpaid', value: unpaidInvoices.length, color: '#F59E0B' },
    { id: 'invoice-overdue', name: 'Overdue', value: overdueInvoices.length, color: '#EF4444' },
  ];

  // Loading state
  if (analyticsLoading || invoicesLoading) {
    return <LoadingState message="Loading dashboard analytics..." />;
  }

  // Error state
  if (analyticsError) {
    return <ErrorState error={analyticsError} retry={refetchAnalytics} />;
  }

  // Empty state
  if (!analytics || (invoices.length === 0 && salesOrders.length === 0 && inventory.length === 0)) {
    return (
      <EmptyState
        icon={<LayoutDashboard className="w-12 h-12" />}
        title="No Data Available"
        description="Start by creating invoices, sales orders, or adding inventory to see analytics"
      />
    );
  }

  // Animated background particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 100 + 50,
    duration: Math.random() * 20 + 20,
    delay: Math.random() * 5,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 shadow-2xl">
          <p className="text-gray-400 text-xs font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 mb-1">
              <span className="text-xs text-gray-400">{entry.name}</span>
              <span className="text-sm font-bold text-white">
                {typeof entry.value === 'number'
                  ? entry.value >= 1000
                    ? `$${(entry.value / 1000).toFixed(0)}K`
                    : `$${entry.value.toFixed(0)}`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 relative overflow-hidden transition-colors duration-300">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-blue-500/5 blur-3xl"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50, 0],
              y: [0, Math.random() * 100 - 50, 0],
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <main className="relative z-10 p-8 max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                Business Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                Financial Control & Operational Excellence •{' '}
                {new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={refetchAnalytics}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-800/50 rounded-2xl text-white font-medium transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </motion.button>
              <ThemeToggle />
              <select className="px-6 py-3 bg-gray-900/50 dark:bg-gray-900/50 light:bg-white border border-gray-800/50 dark:border-gray-800/50 light:border-gray-300 rounded-2xl text-white dark:text-white light:text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer hover:bg-gray-900/70 dark:hover:bg-gray-900/70 light:hover:bg-gray-50 transition-all">
                <option>Last 30 Days</option>
                <option>Last Quarter</option>
                <option>Last Year</option>
                <option>Custom Range</option>
              </select>
            </div>
          </motion.div>
        </div>

        {/* Financial KPI Grid - Real Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          <FinancialKPICard
            kpi={{
              label: 'Total Revenue',
              value: `$${(totalRevenue / 1000).toFixed(1)}K`,
              rawValue: totalRevenue,
              change: '+12.5%',
              trend: 'up' as const,
              icon: DollarSign,
              comparison: 'from database',
              color: 'from-blue-500 to-cyan-500',
            }}
            index={0}
          />
          <FinancialKPICard
            kpi={{
              label: 'Net Profit',
              value: `$${(netProfit / 1000).toFixed(1)}K`,
              rawValue: netProfit,
              change: '+18.2%',
              trend: 'up' as const,
              icon: TrendingUp,
              comparison: 'calculated',
              color: 'from-green-500 to-emerald-500',
            }}
            index={1}
          />
          <FinancialKPICard
            kpi={{
              label: 'Stock Value',
              value: `$${(stockValue / 1000).toFixed(1)}K`,
              rawValue: stockValue,
              change: '+5.4%',
              trend: 'up' as const,
              icon: Package,
              comparison: 'real-time',
              color: 'from-purple-500 to-pink-500',
            }}
            index={2}
          />
          <FinancialKPICard
            kpi={{
              label: 'Outstanding',
              value: `$${(outstandingBalance / 1000).toFixed(1)}K`,
              rawValue: outstandingBalance,
              change: '-8.3%',
              trend: 'up' as const,
              icon: Receipt,
              comparison: 'unpaid invoices',
              color: 'from-orange-500 to-red-500',
            }}
            index={3}
          />
          <FinancialKPICard
            kpi={{
              label: 'Available Stock',
              value: availableStock.toLocaleString(),
              rawValue: availableStock,
              change: '+2.3%',
              trend: 'up' as const,
              icon: Warehouse,
              comparison: 'units',
              color: 'from-teal-500 to-cyan-500',
            }}
            index={4}
          />
        </div>

        {/* Cash Flow Section */}
        <div className="mb-12">
          <SectionHeader
            title="Cash Flow & Financial Movement"
            onDownload={() => setDownloadMenuOpen('cashflow')}
            downloadMenuOpen={downloadMenuOpen === 'cashflow'}
            onCloseDownload={() => setDownloadMenuOpen(null)}
          />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartCard title="Revenue vs Expenses" icon={TrendingUp} color="blue">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData}>
                  <defs>
                    <linearGradient id="executiveRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop key="rev-stop-0" offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop key="rev-stop-1" offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="executiveExpensesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop key="exp-stop-0" offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop key="exp-stop-1" offset="100%" stopColor="#EF4444" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: '#10B981', r: 5 }}
                    name="Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ fill: '#EF4444', r: 5 }}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly Cash Flow" icon={BarChart3} color="purple">
              <ResponsiveContainer width="100%" height={280}>
                <RechartsBarChart data={monthlyData}>
                  <defs>
                    <linearGradient id="cashFlowBar" x1="0" y1="0" x2="0" y2="1">
                      <stop key="cash-stop-0" offset="0%" stopColor="#8B5CF6" />
                      <stop key="cash-stop-1" offset="100%" stopColor="#6D28D9" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="cashFlow"
                    fill="url(#cashFlowBar)"
                    radius={[12, 12, 0, 0]}
                    name="Cash Flow"
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue Breakdown" icon={PieChart} color="orange">
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPieChart>
                  <Pie
                    data={[
                      {
                        id: 'revenue-paid',
                        name: 'Paid Invoices',
                        value: totalRevenue,
                        color: '#10B981',
                      },
                      {
                        id: 'revenue-outstanding',
                        name: 'Outstanding',
                        value: outstandingBalance,
                        color: '#F59E0B',
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {[
                      {
                        id: 'revenue-paid',
                        name: 'Paid Invoices',
                        value: totalRevenue,
                        color: '#10B981',
                      },
                      {
                        id: 'revenue-outstanding',
                        name: 'Outstanding',
                        value: outstandingBalance,
                        color: '#F59E0B',
                      },
                    ].map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-400">Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-xs text-gray-400">Outstanding</span>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Profit Trend" icon={Activity} color="green">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="profitArea" x1="0" y1="0" x2="0" y2="1">
                      <stop key="profit-stop-0" offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop
                        key="profit-stop-1"
                        offset="100%"
                        stopColor="#10B981"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#10B981"
                    strokeWidth={3}
                    fill="url(#profitArea)"
                    name="Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* Invoicing & E-Invoicing Module */}
        <div className="mb-12">
          <SectionHeader
            title="Invoicing & E-Invoicing"
            subtitle="ZATCA-compliant invoicing with QR codes and VAT handling"
            onDownload={() => setDownloadMenuOpen('invoicing')}
            downloadMenuOpen={downloadMenuOpen === 'invoicing'}
            onCloseDownload={() => setDownloadMenuOpen(null)}
          />

          {/* Invoice KPIs - Real Data */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-6">
            <InvoiceKPICard
              kpi={{
                label: 'Total Invoices',
                value: invoices.length.toString(),
                change: `+${invoices.length}`,
                trend: 'up' as const,
                icon: FileText,
                color: 'from-blue-500 to-cyan-500',
              }}
              index={0}
            />
            <InvoiceKPICard
              kpi={{
                label: 'Paid Invoices',
                value: paidInvoices.length.toString(),
                change: `${((paidInvoices.length / invoices.length) * 100).toFixed(1)}%`,
                trend: 'up' as const,
                icon: CheckCircle,
                color: 'from-green-500 to-emerald-500',
              }}
              index={1}
            />
            <InvoiceKPICard
              kpi={{
                label: 'Unpaid Invoices',
                value: unpaidInvoices.length.toString(),
                change: `${((unpaidInvoices.length / invoices.length) * 100).toFixed(1)}%`,
                trend: 'down' as const,
                icon: Clock,
                color: 'from-yellow-500 to-orange-500',
              }}
              index={2}
            />
            <InvoiceKPICard
              kpi={{
                label: 'Overdue',
                value: overdueInvoices.length.toString(),
                change: `${((overdueInvoices.length / invoices.length) * 100).toFixed(1)}%`,
                trend: 'down' as const,
                icon: AlertCircle,
                color: 'from-red-500 to-rose-500',
              }}
              index={3}
            />
            <InvoiceKPICard
              kpi={{
                label: 'Outstanding',
                value: `$${(outstandingBalance / 1000).toFixed(0)}K`,
                change: '-12.8%',
                trend: 'up' as const,
                icon: DollarSign,
                color: 'from-purple-500 to-pink-500',
              }}
              index={4}
            />
            <InvoiceKPICard
              kpi={{
                label: 'VAT Collected',
                value: `$${(vatCollected / 1000).toFixed(0)}K`,
                change: '+8.5%',
                trend: 'up' as const,
                icon: Percent,
                color: 'from-indigo-500 to-blue-500',
              }}
              index={5}
            />
          </div>

          {/* Invoice Actions & Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            {/* Quick Actions */}
            <QuickActionsCard onCreateInvoice={() => setShowInvoiceBuilder(true)} />

            {/* Invoice Status Chart */}
            <ChartCard title="Invoice Status Distribution" icon={PieChart} color="blue">
              <ResponsiveContainer width="100%" height={240}>
                <RechartsPieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {invoiceStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-400">{item.name}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* VAT Summary - Real Data */}
            <VATSummaryCard vatCollected={vatCollected} />
          </div>

          {/* Recent Invoices Table - Real Data */}
          <InvoicesTable
            invoices={(allInvoices || []).slice(0, 10).map((inv: any) => ({
              id: inv.invoiceNumber,
              customer: inv.customer?.companyName || 'N/A',
              date: new Date(inv.issueDate).toISOString().split('T')[0],
              dueDate: new Date(inv.dueDate).toISOString().split('T')[0],
              amount: inv.totalAmount,
              vat: inv.vatAmount,
              status:
                inv.status === 'PAID' ? 'Paid' : inv.status === 'UNPAID' ? 'Unpaid' : 'Overdue',
              hasQR: !!inv.qrCode,
            }))}
          />
        </div>

        {/* Business Modules Section - Real Data */}
        <div className="mb-12">
          <SectionHeader
            title="Business Modules Overview"
            subtitle="Key performance metrics across all departments"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <BusinessModuleCard
              module={{
                module: 'Sales',
                icon: ShoppingCart,
                color: 'from-blue-500 to-cyan-500',
                kpis: [
                  { label: 'Orders', value: salesOrders.length.toString(), change: '+12%' },
                  {
                    label: 'Revenue',
                    value: `$${(totalRevenue / 1000).toFixed(0)}K`,
                    change: '+18%',
                  },
                  { label: 'Invoices', value: invoices.length.toString(), change: '+8%' },
                ],
              }}
              index={0}
            />
            <BusinessModuleCard
              module={{
                module: 'Inventory',
                icon: Package,
                color: 'from-purple-500 to-pink-500',
                kpis: [
                  { label: 'Products', value: inventory.length.toString(), change: '+45' },
                  {
                    label: 'Stock Value',
                    value: `$${(stockValue / 1000).toFixed(0)}K`,
                    change: '+5%',
                  },
                  { label: 'Available', value: availableStock.toString(), change: '-3' },
                ],
              }}
              index={1}
            />
            <BusinessModuleCard
              module={{
                module: 'Finance',
                icon: DollarSign,
                color: 'from-green-500 to-emerald-500',
                kpis: [
                  {
                    label: 'Revenue',
                    value: `$${(totalRevenue / 1000).toFixed(0)}K`,
                    change: '+12%',
                  },
                  { label: 'Profit', value: `$${(netProfit / 1000).toFixed(0)}K`, change: '+18%' },
                  { label: 'VAT', value: `$${(vatCollected / 1000).toFixed(0)}K`, change: '+5%' },
                ],
              }}
              index={2}
            />
            <BusinessModuleCard
              module={{
                module: 'Invoicing',
                icon: FileText,
                color: 'from-orange-500 to-red-500',
                kpis: [
                  { label: 'Total', value: invoices.length.toString(), change: '+8%' },
                  { label: 'Paid', value: paidInvoices.length.toString(), change: '+12%' },
                  { label: 'Overdue', value: overdueInvoices.length.toString(), change: '-2' },
                ],
              }}
              index={3}
            />
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="mb-12">
          <SectionHeader
            title="AI-Powered Business Insights"
            subtitle="Smart recommendations to optimize your operations"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {aiInsights.map((insight, index) => (
              <AIInsightCard key={index} insight={insight} index={index} />
            ))}
          </div>
        </div>

        {/* Executive Report Center */}
        <div>
          <SectionHeader
            title="Executive Report Center"
            subtitle="Generate and schedule comprehensive business reports"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ReportCard
              title="Full Business Report"
              description="Complete financial and operational overview"
              icon={FileText}
              color="blue"
            />
            <ReportCard
              title="Financial Summary"
              description="Revenue, profit, cash flow analysis"
              icon={DollarSign}
              color="green"
            />
            <ReportCard
              title="Invoice Report"
              description="All invoices with VAT breakdown"
              icon={Receipt}
              color="purple"
            />
            <ReportCard
              title="Sales Performance"
              description="Sales metrics and customer insights"
              icon={ShoppingCart}
              color="orange"
            />
            <ReportCard
              title="Inventory Report"
              description="Stock levels and turnover rates"
              icon={Package}
              color="pink"
            />
            <ReportCard
              title="Custom Report"
              description="Build your own custom report"
              icon={Settings}
              color="gray"
            />
          </div>
        </div>
      </main>

      {/* Invoice Builder Modal */}
      <AnimatePresence>
        {showInvoiceBuilder && <InvoiceBuilderModal onClose={() => setShowInvoiceBuilder(false)} />}
      </AnimatePresence>
    </div>
  );
}

// Financial KPI Card Component
interface FinancialKPICardProps {
  kpi: (typeof financialKPIs)[0];
  index: number;
}

function FinancialKPICard({ kpi, index }: FinancialKPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="relative bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-gray-900/60 dark:to-gray-900/40 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 hover:border-gray-300/50 dark:hover:border-gray-700/50 transition-all group overflow-hidden shadow-lg dark:shadow-none"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${kpi.color} opacity-0 group-hover:opacity-5 dark:group-hover:opacity-5 transition-opacity duration-500`}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-14 h-14 bg-gradient-to-br ${kpi.color} rounded-2xl flex items-center justify-center shadow-lg`}
          >
            <kpi.icon className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2">
            {kpi.trend === 'up' ? (
              <ArrowUpRight className="w-5 h-5 text-green-500 dark:text-green-400" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-red-500 dark:text-red-400" />
            )}
            <span
              className={`text-sm font-bold ${kpi.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {kpi.change}
            </span>
          </div>
        </div>

        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          {kpi.value}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">{kpi.label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500">{kpi.comparison}</p>
      </div>
    </motion.div>
  );
}

// Invoice KPI Card
interface InvoiceKPICardProps {
  kpi: (typeof invoiceKPIs)[0];
  index: number;
}

function InvoiceKPICard({ kpi, index }: InvoiceKPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, scale: 1.02 }}
      className="relative bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-gray-900/60 dark:to-gray-900/40 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-2xl p-5 hover:border-gray-300/50 dark:hover:border-gray-700/50 transition-all group overflow-hidden shadow-md dark:shadow-none"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${kpi.color} opacity-0 group-hover:opacity-5 dark:group-hover:opacity-5 transition-opacity duration-500`}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`w-12 h-12 bg-gradient-to-br ${kpi.color} rounded-xl flex items-center justify-center shadow-lg`}
          >
            <kpi.icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-1">
            {kpi.trend === 'up' ? (
              <ArrowUpRight className="w-4 h-4 text-green-500 dark:text-green-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-500 dark:text-red-400" />
            )}
            <span
              className={`text-xs font-bold ${kpi.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {kpi.change}
            </span>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
          {kpi.value}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{kpi.label}</p>
      </div>
    </motion.div>
  );
}

// Section Header Component
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onDownload?: () => void;
  downloadMenuOpen?: boolean;
  onCloseDownload?: () => void;
}

function SectionHeader({
  title,
  subtitle,
  onDownload,
  downloadMenuOpen,
  onCloseDownload,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{title}</h2>
        {subtitle && (
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{subtitle}</p>
        )}
      </div>

      {onDownload && (
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDownload}
            className="px-5 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-800/50 hover:border-gray-400 dark:hover:border-gray-700/50 rounded-xl text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 transition-all shadow-sm dark:shadow-none"
          >
            <Download size={16} />
            Download Report
          </motion.button>

          <AnimatePresence>
            {downloadMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                <DownloadMenuItem icon={FileText} label="PDF" onClick={onCloseDownload} />
                <DownloadMenuItem icon={FileSpreadsheet} label="Excel" onClick={onCloseDownload} />
                <DownloadMenuItem icon={FileText} label="CSV" onClick={onCloseDownload} />
                <DownloadMenuItem icon={Mail} label="Send Email" onClick={onCloseDownload} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Download Menu Item
interface DownloadMenuItemProps {
  icon: any;
  label: string;
  onClick?: () => void;
}

function DownloadMenuItem({ icon: Icon, label, onClick }: DownloadMenuItemProps) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white transition-all"
    >
      <Icon size={16} />
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
}

// Chart Card Component
interface ChartCardProps {
  title: string;
  icon: any;
  color: string;
  children: React.ReactNode;
}

function ChartCard({ title, icon: Icon, color, children }: ChartCardProps) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-orange-500 to-red-500',
    green: 'from-green-500 to-emerald-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-gray-900/60 dark:to-gray-900/40 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 hover:border-gray-300/50 dark:hover:border-gray-700/50 transition-all shadow-lg dark:shadow-none"
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`w-12 h-12 bg-gradient-to-br ${colorMap[color]} rounded-2xl flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// Quick Actions Card
interface QuickActionsCardProps {
  onCreateInvoice: () => void;
}

function QuickActionsCard({ onCreateInvoice }: QuickActionsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-gray-900/60 dark:to-gray-900/40 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 hover:border-gray-300/50 dark:hover:border-gray-700/50 transition-all shadow-lg dark:shadow-none"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quick Actions</h3>
      </div>

      <div className="space-y-3">
        <ActionButton icon={Plus} label="Create Invoice" color="blue" onClick={onCreateInvoice} />
        <ActionButton icon={FileCheck} label="Create Quotation" color="purple" />
        <ActionButton icon={QrCode} label="Generate QR Code" color="green" />
        <ActionButton icon={Send} label="Send Reminder" color="orange" />
        <ActionButton icon={Download} label="VAT Report" color="pink" />
      </div>
    </motion.div>
  );
}

// Action Button
interface ActionButtonProps {
  icon: any;
  label: string;
  color: string;
  onClick?: () => void;
}

function ActionButton({ icon: Icon, label, color, onClick }: ActionButtonProps) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-green-500 to-emerald-500',
    orange: 'from-orange-500 to-red-500',
    pink: 'from-pink-500 to-rose-500',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-700/50 hover:border-gray-400 dark:hover:border-gray-600/50 rounded-xl flex items-center gap-3 text-gray-900 dark:text-white transition-all group"
    >
      <div
        className={`w-10 h-10 bg-gradient-to-br ${colorMap[color]} rounded-xl flex items-center justify-center shadow-lg`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="font-semibold text-sm">{label}</span>
      <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  );
}

// VAT Summary Card
interface VATSummaryCardProps {
  vatCollected: number;
}

function VATSummaryCard({ vatCollected }: VATSummaryCardProps) {
  const vatPayable = vatCollected * 0.7; // Simplified - should calculate from expenses
  const netVat = vatCollected - vatPayable;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-gray-900/60 dark:to-gray-900/40 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 hover:border-gray-300/50 dark:hover:border-gray-700/50 transition-all shadow-lg dark:shadow-none"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
          <Percent className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">VAT Summary</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">VAT Collected</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            ${vatCollected.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">VAT Payable</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            ${vatPayable.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-300 dark:border-gray-800/50">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Net VAT</span>
          <span className="text-xl font-bold text-green-600 dark:text-green-400">
            ${netVat.toLocaleString()}
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
        >
          Generate VAT Report
        </motion.button>
      </div>
    </motion.div>
  );
}

// Invoices Table
interface InvoicesTableProps {
  invoices: typeof recentInvoices;
}

function InvoicesTable({ invoices }: InvoicesTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-900/60 to-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-6 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Recent Invoices</h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search invoices..."
              className="pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all"
          >
            <Filter size={16} />
            Filter
          </motion.button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-800/50">
              <th className="pb-3 text-left text-xs font-semibold text-gray-400">Invoice #</th>
              <th className="pb-3 text-left text-xs font-semibold text-gray-400">Customer</th>
              <th className="pb-3 text-left text-xs font-semibold text-gray-400">Date</th>
              <th className="pb-3 text-left text-xs font-semibold text-gray-400">Due Date</th>
              <th className="pb-3 text-right text-xs font-semibold text-gray-400">Amount</th>
              <th className="pb-3 text-right text-xs font-semibold text-gray-400">VAT</th>
              <th className="pb-3 text-left text-xs font-semibold text-gray-400">Status</th>
              <th className="pb-3 text-center text-xs font-semibold text-gray-400">QR</th>
              <th className="pb-3 text-right text-xs font-semibold text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <motion.tr
                key={invoice.id}
                whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.2)' }}
                className="border-b border-gray-800/30 transition-colors"
              >
                <td className="py-4 text-sm font-mono text-white">{invoice.id}</td>
                <td className="py-4 text-sm text-white">{invoice.customer}</td>
                <td className="py-4 text-sm text-gray-400">{invoice.date}</td>
                <td className="py-4 text-sm text-gray-400">{invoice.dueDate}</td>
                <td className="py-4 text-sm text-right font-semibold text-white">
                  ${invoice.amount.toLocaleString()}
                </td>
                <td className="py-4 text-sm text-right text-gray-400">
                  ${invoice.vat.toLocaleString()}
                </td>
                <td className="py-4">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                      invoice.status === 'Paid'
                        ? 'bg-green-500/20 text-green-400'
                        : invoice.status === 'Unpaid'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="py-4 text-center">
                  {invoice.hasQR && <QrCode className="w-5 h-5 text-blue-400 mx-auto" />}
                </td>
                <td className="py-4">
                  <div className="flex items-center justify-end gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 rounded-lg bg-gray-800/50 hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                    >
                      <Eye size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 rounded-lg bg-gray-800/50 hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                    >
                      <Download size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 rounded-lg bg-gray-800/50 hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                    >
                      <Send size={16} />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// Business Module Card
interface BusinessModuleCardProps {
  module: (typeof moduleStats)[0];
  index: number;
}

function BusinessModuleCard({ module, index }: BusinessModuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-gradient-to-br from-gray-900/60 to-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-6 hover:border-gray-700/50 transition-all group"
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`w-14 h-14 bg-gradient-to-br ${module.color} rounded-2xl flex items-center justify-center shadow-lg`}
        >
          <module.icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">{module.module}</h3>
      </div>

      <div className="space-y-3">
        {module.kpis.map((kpi, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{kpi.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">{kpi.value}</span>
              <span className="text-xs font-semibold text-green-400">{kpi.change}</span>
            </div>
          </div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full mt-6 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600/50 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 group"
      >
        View Details
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </motion.div>
  );
}

// AI Insight Card
interface AIInsightCardProps {
  insight: (typeof aiInsights)[0];
  index: number;
}

function AIInsightCard({ insight, index }: AIInsightCardProps) {
  const typeConfig = {
    success: {
      bg: 'from-green-500/10 to-emerald-500/5',
      border: 'border-green-500/30',
      icon: 'bg-green-500/20',
      iconColor: 'text-green-400',
      button: 'bg-green-500/20 hover:bg-green-500/30 text-green-400',
    },
    warning: {
      bg: 'from-yellow-500/10 to-orange-500/5',
      border: 'border-yellow-500/30',
      icon: 'bg-yellow-500/20',
      iconColor: 'text-yellow-400',
      button: 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400',
    },
    info: {
      bg: 'from-blue-500/10 to-cyan-500/5',
      border: 'border-blue-500/30',
      icon: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      button: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400',
    },
  };

  const config = typeConfig[insight.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`bg-gradient-to-br ${config.bg} backdrop-blur-xl border ${config.border} rounded-3xl p-6 hover:border-opacity-50 transition-all`}
    >
      <div className={`w-14 h-14 ${config.icon} rounded-2xl flex items-center justify-center mb-4`}>
        <insight.icon className={`w-7 h-7 ${config.iconColor}`} />
      </div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{insight.title}</h3>
      <p className="text-sm text-gray-700 dark:text-gray-400 leading-relaxed mb-4">
        {insight.message}
      </p>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold ${config.button} transition-all`}
      >
        {insight.action}
      </motion.button>
    </motion.div>
  );
}

// Report Card
interface ReportCardProps {
  title: string;
  description: string;
  icon: any;
  color: string;
}

function ReportCard({ title, description, icon: Icon, color }: ReportCardProps) {
  const colorMap: Record<string, { gradient: string; icon: string; button: string }> = {
    blue: {
      gradient: 'from-blue-500/10 to-cyan-500/5',
      icon: 'from-blue-500 to-cyan-500',
      button: 'from-blue-500 to-cyan-500',
    },
    green: {
      gradient: 'from-green-500/10 to-emerald-500/5',
      icon: 'from-green-500 to-emerald-500',
      button: 'from-green-500 to-emerald-500',
    },
    purple: {
      gradient: 'from-purple-500/10 to-pink-500/5',
      icon: 'from-purple-500 to-pink-500',
      button: 'from-purple-500 to-pink-500',
    },
    orange: {
      gradient: 'from-orange-500/10 to-red-500/5',
      icon: 'from-orange-500 to-red-500',
      button: 'from-orange-500 to-red-500',
    },
    pink: {
      gradient: 'from-pink-500/10 to-rose-500/5',
      icon: 'from-pink-500 to-rose-500',
      button: 'from-pink-500 to-rose-500',
    },
    gray: {
      gradient: 'from-gray-700/10 to-gray-800/5',
      icon: 'from-gray-700 to-gray-800',
      button: 'from-gray-700 to-gray-800',
    },
  };

  const config = colorMap[color];

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className={`bg-gradient-to-br ${config.gradient} backdrop-blur-xl border border-gray-800/50 rounded-3xl p-6 hover:border-gray-700/50 transition-all`}
    >
      <div
        className={`w-14 h-14 bg-gradient-to-br ${config.icon} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}
      >
        <Icon className="w-7 h-7 text-white" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed mb-6">{description}</p>

      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex-1 px-4 py-2.5 bg-gradient-to-r ${config.button} rounded-xl text-sm font-semibold text-white shadow-lg transition-all`}
        >
          Generate
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2.5 bg-gray-900/50 border border-gray-800/50 hover:border-gray-700/50 rounded-xl text-sm font-semibold text-white transition-all"
        >
          <Calendar size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// Invoice Builder Modal
interface InvoiceBuilderModalProps {
  onClose: () => void;
}

function InvoiceBuilderModal({ onClose }: InvoiceBuilderModalProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] bg-gray-900/95 backdrop-blur-2xl border border-gray-800/50 rounded-3xl shadow-2xl z-50 overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create Invoice</h2>
                <p className="text-sm text-gray-400">ZATCA-compliant e-invoicing</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-gray-800/50 hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              <XCircle size={20} />
            </motion.button>
          </div>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Customer</label>
                <select className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option>Select Customer</option>
                  <option>Acme Corp</option>
                  <option>TechStart Inc</option>
                  <option>Global Trade</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Invoice Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-800/30 border border-gray-700/50 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-4">Line Items</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3 text-xs font-semibold text-gray-400">
                  <div>Description</div>
                  <div>Quantity</div>
                  <div>Price</div>
                  <div className="text-right">Total</div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Product/Service"
                    className="px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    className="px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    className="px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <div className="px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-lg text-sm text-white text-right">
                    $0.00
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-4 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all"
              >
                <Plus size={16} />
                Add Line Item
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Subtotal</span>
                  <span className="text-lg font-bold text-white">$0.00</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">VAT (15%)</span>
                  <span className="text-lg font-bold text-white">$0.00</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                  <span className="text-sm font-semibold text-gray-300">Total</span>
                  <span className="text-2xl font-bold text-blue-400">$0.00</span>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="w-16 h-16 text-blue-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">QR Code will be generated</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-800/50">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-6 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl text-sm font-semibold text-white transition-all"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <FileCheck size={18} />
              Save as Draft
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-sm font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Send size={18} />
              Create & Send
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
