import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DollarSign,
  Zap,
  Wifi,
  AlertTriangle,
  Users,
  TrendingUp,
  TrendingDown,
  Wind,
  Lock,
  Unlock,
  Thermometer,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  MessageSquare,
  Send,
  X,
  Minimize2,
  Maximize2,
  Brain,
  Sparkles,
  Building2,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Circle,
  Bolt,
  Target,
  Rocket,
  RefreshCw,
  Download,
  Share2,
  Filter,
  Calendar,
  MoreHorizontal,
  Star,
  Shield,
  Briefcase,
  TrendingUpIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

// Enhanced Sample Data
const energyData = [
  { time: "00:00", usage: 120, cost: 45, predicted: 125 },
  { time: "04:00", usage: 95, cost: 35, predicted: 98 },
  { time: "08:00", usage: 180, cost: 68, predicted: 175 },
  { time: "12:00", usage: 220, cost: 85, predicted: 225 },
  { time: "16:00", usage: 195, cost: 72, predicted: 190 },
  { time: "20:00", usage: 165, cost: 60, predicted: 170 },
  { time: "23:00", usage: 140, cost: 52, predicted: 142 },
];

const revenueData = [
  { month: "Jan", revenue: 145000, expenses: 95000, profit: 50000 },
  { month: "Feb", revenue: 162000, expenses: 102000, profit: 60000 },
  { month: "Mar", revenue: 158000, expenses: 98000, profit: 60000 },
  { month: "Apr", revenue: 178000, expenses: 110000, profit: 68000 },
  { month: "May", revenue: 185000, expenses: 112000, profit: 73000 },
  { month: "Jun", revenue: 192000, expenses: 115000, profit: 77000 },
];

const performanceMetrics = [
  { name: "Mon", efficiency: 92, uptime: 98 },
  { name: "Tue", efficiency: 88, uptime: 97 },
  { name: "Wed", efficiency: 94, uptime: 99 },
  { name: "Thu", efficiency: 91, uptime: 96 },
  { name: "Fri", efficiency: 95, uptime: 99 },
  { name: "Sat", efficiency: 89, uptime: 98 },
  { name: "Sun", efficiency: 87, uptime: 97 },
];

const recommendedActions = [
  {
    id: 1,
    title: "Optimize HVAC Schedule",
    description: "Adjust cooling hours to save $2,400/month based on occupancy patterns",
    impact: "High",
    savings: "$2,400",
    effort: "Low",
    icon: Wind,
    color: "blue",
  },
  {
    id: 2,
    title: "Preventive Maintenance",
    description: "Schedule maintenance for 5 devices to prevent potential failures",
    impact: "Medium",
    savings: "$1,200",
    effort: "Medium",
    icon: Wrench,
    color: "purple",
  },
  {
    id: 3,
    title: "Energy Peak Shifting",
    description: "Move 30% of energy usage to off-peak hours",
    impact: "High",
    savings: "$3,100",
    effort: "Low",
    icon: Zap,
    color: "yellow",
  },
];

const quickStats = [
  { label: "Uptime", value: "99.8%", change: "+0.2%", trend: "up", icon: Activity },
  { label: "Efficiency", value: "94.2%", change: "+3.1%", trend: "up", icon: TrendingUp },
  { label: "Cost/kWh", value: "$0.12", change: "-8%", trend: "up", icon: DollarSign },
  { label: "Response Time", value: "2.1s", change: "-12%", trend: "up", icon: Bolt },
];

export default function DashboardPage() {
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiChatMinimized, setAiChatMinimized] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "Hello! I'm your AI assistant. I can help you analyze data, generate reports, or optimize your operations. What would you like to know?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [selectedTimeRange, setSelectedTimeRange] = useState("24h");

  // Real-time stats with smoother animations
  const [stats, setStats] = useState({
    revenue: 192000,
    revenueChange: 12.5,
    energy: 165,
    energyChange: -8.2,
    devices: 156,
    devicesChange: 3,
    alerts: 3,
    alertsChange: -2,
    occupancy: 68,
    occupancyChange: 5.4,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        energy: Math.max(140, Math.min(200, prev.energy + Math.floor(Math.random() * 6 - 3))),
        devices: 156 + Math.floor(Math.random() * 3),
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages([...chatMessages, { role: "user", content: chatInput }]);
    setChatInput("");

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I've analyzed your request. Based on current data patterns, I recommend reviewing the energy consumption report for Floor 2. Would you like me to generate a detailed analysis?",
        },
      ]);
    }, 1200);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4 shadow-2xl">
          <p className="text-gray-400 text-xs font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-400">{entry.name}</span>
              <span className="text-sm font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Overview
            </h1>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-2 h-2 rounded-full bg-green-400"
            />
          </div>
          <p className="text-gray-400 text-sm font-medium">Real-time monitoring and AI-powered insights</p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 cursor-pointer hover:bg-gray-800/70 transition-all"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm text-white font-medium hover:bg-gray-800/70 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-sm text-white font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25"
          >
            <Sparkles className="w-4 h-4" />
            AI Report
          </motion.button>
        </div>
      </div>

      {/* Premium KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <PremiumKPICard
          title="Total Revenue"
          value={`$${(stats.revenue / 1000).toFixed(0)}K`}
          change={`${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}%`}
          trend={stats.revenueChange > 0 ? "up" : "down"}
          icon={DollarSign}
          gradient="from-blue-500 via-blue-600 to-cyan-500"
          glowColor="blue"
        />
        <PremiumKPICard
          title="Energy Usage"
          value={`${stats.energy} kWh`}
          change={`${stats.energyChange > 0 ? '+' : ''}${stats.energyChange.toFixed(1)}%`}
          trend={stats.energyChange < 0 ? "up" : "down"}
          icon={Zap}
          gradient="from-yellow-500 via-orange-500 to-red-500"
          glowColor="yellow"
        />
        <PremiumKPICard
          title="Active Devices"
          value={stats.devices.toString()}
          change={`+${stats.devicesChange} new`}
          trend="up"
          icon={Wifi}
          gradient="from-purple-500 via-purple-600 to-pink-500"
          glowColor="purple"
        />
        <PremiumKPICard
          title="Active Alerts"
          value={stats.alerts.toString()}
          change={`${stats.alertsChange} resolved`}
          trend="up"
          icon={AlertTriangle}
          gradient="from-red-500 via-pink-500 to-rose-500"
          glowColor="red"
        />
        <PremiumKPICard
          title="Occupancy"
          value={`${stats.occupancy}%`}
          change={`+${stats.occupancyChange.toFixed(1)}%`}
          trend="up"
          icon={Users}
          gradient="from-green-500 via-emerald-500 to-teal-500"
          glowColor="green"
        />
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -2 }}
            className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-4 hover:border-gray-600/50 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-5 h-5 text-gray-400" />
              <span className={`text-xs font-semibold ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Primary Charts */}
        <div className="xl:col-span-2 space-y-8">
          {/* Premium Energy Chart */}
          <PremiumCard
            title="Energy Consumption & Cost Analysis"
            subtitle="Real-time monitoring with AI predictions"
            icon={Zap}
            actions={
              <div className="flex items-center gap-2">
                <button className="text-xs text-gray-400 hover:text-white transition-colors">Auto</button>
                <button className="text-xs text-blue-400 font-semibold">Predicted</button>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={energyData}>
                <defs>
                  <linearGradient id="energyGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop key="energy-glow-1" offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop key="energy-glow-2" offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="time"
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="usage"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fill="url(#energyGlow)"
                  name="Usage (kWh)"
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="AI Prediction"
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Energy Insights */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800/50">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Current</p>
                <p className="text-xl font-bold text-white">165 kWh</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Predicted Peak</p>
                <p className="text-xl font-bold text-purple-400">225 kWh</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Savings</p>
                <p className="text-xl font-bold text-green-400">$2.4K</p>
              </div>
            </div>
          </PremiumCard>

          {/* Financial Performance */}
          <PremiumCard
            title="Financial Performance"
            subtitle="Revenue, expenses, and profit tracking"
            icon={TrendingUpIcon}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueBar" x1="0" y1="0" x2="0" y2="1">
                    <stop key="revenue-bar-1" offset="0%" stopColor="#3B82F6" />
                    <stop key="revenue-bar-2" offset="100%" stopColor="#1D4ED8" />
                  </linearGradient>
                  <linearGradient id="expenseBar" x1="0" y1="0" x2="0" y2="1">
                    <stop key="expense-bar-1" offset="0%" stopColor="#EC4899" />
                    <stop key="expense-bar-2" offset="100%" stopColor="#BE185D" />
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
                <YAxis
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="url(#revenueBar)" radius={[8, 8, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="url(#expenseBar)" radius={[8, 8, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </PremiumCard>

          {/* System Performance */}
          <PremiumCard
            title="System Performance"
            subtitle="Efficiency and uptime metrics"
            icon={Activity}
          >
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={performanceMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="name"
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[80, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', r: 4 }}
                  name="Efficiency %"
                />
                <Line
                  type="monotone"
                  dataKey="uptime"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  name="Uptime %"
                />
              </LineChart>
            </ResponsiveContainer>
          </PremiumCard>
        </div>

        {/* Right Column - AI Insights & Actions */}
        <div className="space-y-8">
          {/* AI Recommended Actions */}
          <PremiumCard
            title="AI Recommendations"
            subtitle="Smart actions to optimize operations"
            icon={Brain}
            highlight
          >
            <div className="space-y-4">
              {recommendedActions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    action.color === 'blue'
                      ? 'bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10'
                      : action.color === 'purple'
                      ? 'bg-purple-500/5 border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/10'
                      : 'bg-yellow-500/5 border-yellow-500/30 hover:border-yellow-500/50 hover:bg-yellow-500/10'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        action.color === 'blue'
                          ? 'bg-blue-500/20'
                          : action.color === 'purple'
                          ? 'bg-purple-500/20'
                          : 'bg-yellow-500/20'
                      }`}
                    >
                      <action.icon
                        className={`w-6 h-6 ${
                          action.color === 'blue'
                            ? 'text-blue-400'
                            : action.color === 'purple'
                            ? 'text-purple-400'
                            : 'text-yellow-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-bold text-white">{action.title}</h4>
                        <span className="text-lg font-bold text-green-400">{action.savings}</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed mb-3">{action.description}</p>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                          action.impact === 'High'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {action.impact} Impact
                        </span>
                        <span className="text-xs px-2 py-1 rounded-lg font-semibold bg-gray-700/50 text-gray-300">
                          {action.effort} Effort
                        </span>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition-all"
                  >
                    Apply Recommendation
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </PremiumCard>

          {/* Critical Alerts */}
          <PremiumCard
            title="Critical Alerts"
            subtitle="Requires immediate attention"
            icon={AlertTriangle}
          >
            <div className="space-y-3">
              <AlertCard
                title="HVAC Malfunction - Floor 2"
                severity="high"
                time="2m ago"
              />
              <AlertCard
                title="Unusual Energy Spike"
                severity="medium"
                time="15m ago"
              />
              <AlertCard
                title="Device Offline - Sensor #45"
                severity="low"
                time="1h ago"
              />
            </div>
          </PremiumCard>

          {/* Quick HVAC Control */}
          <PremiumCard
            title="HVAC Quick Control"
            subtitle="Adjust temperature by zone"
            icon={Wind}
          >
            <div className="space-y-4">
              <HVACControl zone="Floor 1 - Office" temp={22} target={23} />
              <HVACControl zone="Floor 2 - Conference" temp={24} target={22} />
              <HVACControl zone="Lobby" temp={21} target={21} />
            </div>
          </PremiumCard>
        </div>
      </div>

      {/* AI Assistant - Enhanced UI */}
      <AnimatePresence>
        {aiChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              height: aiChatMinimized ? "72px" : "560px",
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-8 right-8 w-[420px] bg-gray-900/95 backdrop-blur-2xl border border-gray-700/50 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden z-50"
          >
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-1">
              <div className="bg-gray-900 p-5 rounded-t-[22px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-gray-900 rounded-full" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base">AI Assistant</h3>
                      <p className="text-xs text-gray-400 font-medium">Online • Ready to help</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setAiChatMinimized(!aiChatMinimized)}
                      className="w-8 h-8 rounded-xl bg-gray-800/50 hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                    >
                      {aiChatMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setAiChatOpen(false)}
                      className="w-8 h-8 rounded-xl bg-gray-800/50 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-all"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>

            {!aiChatMinimized && (
              <>
                {/* Messages */}
                <div className="h-[380px] overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-900/50 to-gray-900">
                  {chatMessages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-4 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25"
                            : "bg-gray-800/80 backdrop-blur-sm text-gray-200 border border-gray-700/50"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-6 border-t border-gray-800/50 bg-gray-900">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Ask me anything..."
                      className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder-gray-500"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSendMessage}
                      className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                    >
                      <Send size={18} />
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant Trigger - Premium */}
      {!aiChatOpen && (
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.1, y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAiChatOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all z-50 group"
        >
          <MessageSquare size={28} className="group-hover:scale-110 transition-transform" />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 border-2 border-gray-900 rounded-full"
          />
        </motion.button>
      )}
    </div>
  );
}

// Premium KPI Card Component
interface PremiumKPICardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: any;
  gradient: string;
  glowColor: string;
}

function PremiumKPICard({ title, value, change, trend, icon: Icon, gradient, glowColor }: PremiumKPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 hover:border-gray-600/50 transition-all cursor-pointer group overflow-hidden`}
    >
      {/* Glow Effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

      {/* Content */}
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center shadow-lg shadow-${glowColor}-500/20 group-hover:shadow-${glowColor}-500/40 transition-all`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            {trend === "up" ? (
              <ArrowUpRight className="w-5 h-5 text-green-400" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-red-400" />
            )}
            <span className={`text-sm font-bold ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {change}
            </span>
          </div>
        </div>
        <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">{value}</h3>
        <p className="text-sm text-gray-400 font-medium">{title}</p>
      </div>
    </motion.div>
  );
}

// Premium Card Component
interface PremiumCardProps {
  title: string;
  subtitle?: string;
  icon: any;
  children: React.ReactNode;
  highlight?: boolean;
  actions?: React.ReactNode;
}

function PremiumCard({ title, subtitle, icon: Icon, children, highlight, actions }: PremiumCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border rounded-3xl p-8 transition-all ${
        highlight
          ? "border-blue-500/30 shadow-xl shadow-blue-500/10"
          : "border-gray-700/50 hover:border-gray-600/50"
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${highlight ? 'from-blue-500 to-purple-500' : 'from-gray-700 to-gray-800'} rounded-2xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 font-medium mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </motion.div>
  );
}

// Alert Card Component
interface AlertCardProps {
  title: string;
  severity: "high" | "medium" | "low";
  time: string;
}

function AlertCard({ title, severity, time }: AlertCardProps) {
  const severityConfig = {
    high: { color: "red", bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" },
    medium: { color: "yellow", bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
    low: { color: "blue", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  };

  const config = severityConfig[severity];

  return (
    <motion.div
      whileHover={{ scale: 1.02, x: 4 }}
      className={`p-4 rounded-2xl border ${config.bg} ${config.border} cursor-pointer transition-all`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-2 h-2 rounded-full ${config.text} mt-2`} />
          <div>
            <p className="text-sm font-semibold text-white mb-1">{title}</p>
            <p className="text-xs text-gray-400">{time}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${config.bg} ${config.text}`}>
          {severity}
        </span>
      </div>
    </motion.div>
  );
}

// HVAC Control Component
interface HVACControlProps {
  zone: string;
  temp: number;
  target: number;
}

function HVACControl({ zone, temp, target }: HVACControlProps) {
  return (
    <div className="p-4 bg-gray-800/30 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-blue-400" />
          <p className="text-sm font-semibold text-white">{zone}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-white">{temp}°C</p>
          <p className="text-xs text-gray-400 mt-1">Target: {target}°C</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold text-lg transition-all"
          >
            -
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold text-lg transition-all"
          >
            +
          </motion.button>
        </div>
      </div>
    </div>
  );
}
