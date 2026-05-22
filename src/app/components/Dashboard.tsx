import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  TrendingUp,
  TrendingDown,
  Bell,
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(3);

  const stats = [
    {
      label: "Total Revenue",
      value: "SAR 124,500",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Orders",
      value: "1,248",
      change: "+8.2%",
      trend: "up",
      icon: ShoppingCart,
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Customers",
      value: "892",
      change: "+15.3%",
      trend: "up",
      icon: Users,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Profit",
      value: "SAR 42,300",
      change: "+9.7%",
      trend: "up",
      icon: Wallet,
      color: "from-orange-500 to-yellow-500",
    },
  ];

  const salesData = [
    { id: "jan", month: "Jan", sales: 45000 },
    { id: "feb", month: "Feb", sales: 52000 },
    { id: "mar", month: "Mar", sales: 48000 },
    { id: "apr", month: "Apr", sales: 61000 },
    { id: "may", month: "May", sales: 55000 },
    { id: "jun", month: "Jun", sales: 67000 },
    { id: "jul", month: "Jul", sales: 72000 },
  ];

  const ordersData = [
    { id: "mon", day: "Mon", orders: 245 },
    { id: "tue", day: "Tue", orders: 312 },
    { id: "wed", day: "Wed", orders: 278 },
    { id: "thu", day: "Thu", orders: 398 },
    { id: "fri", day: "Fri", orders: 445 },
    { id: "sat", day: "Sat", orders: 523 },
    { id: "sun", day: "Sun", orders: 412 },
  ];

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "customers", label: "Customers", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "finance", label: "Finance", icon: DollarSign },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const recentOrders = [
    {
      id: "#ORD-1247",
      customer: "Ahmed Al-Mutairi",
      product: "Office Chair Pro",
      amount: "SAR 1,450",
      status: "Completed",
      date: "2026-04-26",
    },
    {
      id: "#ORD-1246",
      customer: "Fatima Hassan",
      product: "Laptop Stand",
      amount: "SAR 890",
      status: "Processing",
      date: "2026-04-26",
    },
    {
      id: "#ORD-1245",
      customer: "Mohammed Saeed",
      product: "Desk Organizer",
      amount: "SAR 320",
      status: "Pending",
      date: "2026-04-25",
    },
    {
      id: "#ORD-1244",
      customer: "Sara Abdullah",
      product: "Monitor 4K",
      amount: "SAR 2,670",
      status: "Completed",
      date: "2026-04-25",
    },
    {
      id: "#ORD-1243",
      customer: "Khalid Ibrahim",
      product: "Wireless Mouse",
      amount: "SAR 245",
      status: "Completed",
      date: "2026-04-24",
    },
  ];

  return (
    <div className="h-screen flex bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ width: sidebarCollapsed ? 80 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-gradient-to-b from-gray-900 to-black border-r border-white/10 flex flex-col relative"
      >
        {/* Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-8 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 z-50"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed ? (
              <motion.div
                key="full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <span className="text-white font-bold">EX</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">ERPX</h1>
                  <p className="text-xs text-gray-500">Admin Panel</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <span className="text-white font-bold">EX</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3"
              } px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
              title={sidebarCollapsed ? item.label : ""}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
            </motion.button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center ${
              sidebarCollapsed ? "justify-center" : "gap-3"
            } px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all`}
            title={sidebarCollapsed ? "Logout" : ""}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Logout</span>}
          </motion.button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-gray-900/50 backdrop-blur-xl border-b border-white/10 px-8 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 hover:bg-white/5 rounded-xl transition-all"
            >
              <Bell className="w-5 h-5 text-gray-400" />
              {notifications > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-500/30"
                >
                  {notifications}
                </motion.span>
              )}
            </motion.button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Admin User</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-medium">{stat.change}</span>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Sales Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Sales Overview</h2>
                  <p className="text-sm text-gray-500">Monthly sales trend</p>
                </div>
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={salesData} key="sales-chart">
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: 12 }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#salesGradient)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Orders Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Orders Activity</h2>
                  <p className="text-sm text-gray-500">Weekly orders breakdown</p>
                </div>
                <BarChart3 className="w-5 h-5 text-cyan-400" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ordersData} key="orders-chart">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: 12 }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="orders"
                    fill="#06b6d4"
                    radius={[8, 8, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Recent Orders Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all"
          >
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Recent Orders</h2>
                <p className="text-sm text-gray-500">Latest transactions</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-sm text-blue-400 hover:text-blue-300 font-medium px-4 py-2 bg-blue-500/10 rounded-xl hover:bg-blue-500/20 transition-all"
              >
                View All
              </motion.button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order, i) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.05, duration: 0.3 }}
                      whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}
                      className="border-b border-white/5 cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm text-blue-400 font-semibold">
                        {order.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {order.customer}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {order.product}
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-semibold">
                        {order.amount}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold ${
                            order.status === "Completed"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : order.status === "Processing"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
