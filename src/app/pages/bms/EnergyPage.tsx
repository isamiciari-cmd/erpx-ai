import { useState } from "react";
import { motion } from "motion/react";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Wind,
  Droplet,
  Flame,
  Battery,
  Download,
  Calendar,
  Building2,
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

// Sample Data
const energyTrendData = [
  { time: "00:00", current: 145, predicted: 150, cost: 52 },
  { time: "04:00", current: 98, predicted: 95, cost: 35 },
  { time: "08:00", current: 210, predicted: 205, cost: 75 },
  { time: "12:00", current: 285, predicted: 290, cost: 102 },
  { time: "16:00", current: 245, predicted: 240, cost: 88 },
  { time: "20:00", current: 195, predicted: 200, cost: 70 },
  { time: "23:00", current: 160, predicted: 165, cost: 57 },
];

const buildingConsumption = [
  { building: "Building A", consumption: 2450, cost: 882, status: "normal" },
  { building: "Building B", consumption: 3120, cost: 1123, status: "high" },
  { building: "Building C", consumption: 1890, cost: 680, status: "normal" },
  { building: "Warehouse", consumption: 1560, cost: 561, status: "low" },
];

const energyBreakdown = [
  { name: "HVAC", value: 42, color: "#3B82F6" },
  { name: "Lighting", value: 28, color: "#F59E0B" },
  { name: "Equipment", value: 18, color: "#8B5CF6" },
  { name: "Other", value: 12, color: "#10B981" },
];

const zones = [
  { id: 1, name: "Floor 1 - Office", usage: 125, limit: 200, efficiency: 94, status: "optimal" },
  { id: 2, name: "Floor 2 - Conference", usage: 185, limit: 200, efficiency: 78, status: "high" },
  { id: 3, name: "Floor 3 - IT Lab", usage: 95, limit: 200, efficiency: 98, status: "optimal" },
  { id: 4, name: "Parking", usage: 45, limit: 100, efficiency: 99, status: "optimal" },
];

export default function EnergyPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("today");

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4 shadow-2xl">
          <p className="text-gray-400 text-xs font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-400">{entry.name}</span>
              <span className="text-sm font-bold text-white">{entry.value} kWh</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Zap className="w-10 h-10 text-yellow-400" />
            Energy Management
          </h1>
          <p className="text-gray-400 text-sm font-medium mt-2">Real-time energy monitoring and optimization</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm text-white font-medium hover:bg-gray-800/70 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Report
          </motion.button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          icon={Zap}
          label="Current Usage"
          value="285 kWh"
          change="+12.5%"
          trend="up"
          gradient="from-yellow-500 to-orange-500"
        />
        <KPICard
          icon={DollarSign}
          label="Cost Today"
          value="$102.50"
          change="-8.2%"
          trend="down"
          gradient="from-green-500 to-emerald-500"
        />
        <KPICard
          icon={TrendingUp}
          label="Efficiency"
          value="94.2%"
          change="+3.1%"
          trend="up"
          gradient="from-blue-500 to-cyan-500"
        />
        <KPICard
          icon={Battery}
          label="Peak Load"
          value="312 kWh"
          change="+5.4%"
          trend="up"
          gradient="from-purple-500 to-pink-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Charts */}
        <div className="xl:col-span-2 space-y-8">
          {/* Energy Trend */}
          <PremiumCard title="Energy Consumption & Cost" subtitle="Real-time with AI predictions" icon={Zap}>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={energyTrendData}>
                <defs>
                  <linearGradient id="energyArea" x1="0" y1="0" x2="0" y2="1">
                    <stop key="energy-area-1" offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop key="energy-area-2" offset="100%" stopColor="#F59E0B" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="time" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="current"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  fill="url(#energyArea)"
                  name="Current Usage"
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

            {/* Cost Summary */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800/50">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Current Rate</p>
                <p className="text-xl font-bold text-white">$0.36/kWh</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Total Today</p>
                <p className="text-xl font-bold text-yellow-400">1,850 kWh</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Savings</p>
                <p className="text-xl font-bold text-green-400">$45.20</p>
              </div>
            </div>
          </PremiumCard>

          {/* Building Consumption */}
          <PremiumCard title="Building-wise Consumption" subtitle="Energy usage by location" icon={Building2}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={buildingConsumption}>
                <defs>
                  <linearGradient id="buildingBar" x1="0" y1="0" x2="0" y2="1">
                    <stop key="building-bar-1" offset="0%" stopColor="#3B82F6" />
                    <stop key="building-bar-2" offset="100%" stopColor="#1D4ED8" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="building" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="consumption" fill="url(#buildingBar)" radius={[8, 8, 0, 0]} name="Consumption" />
              </BarChart>
            </ResponsiveContainer>
          </PremiumCard>

          {/* Zone Management */}
          <PremiumCard title="Zone Management" subtitle="Energy usage by zone" icon={Wind}>
            <div className="space-y-3">
              {zones.map((zone) => (
                <motion.div
                  key={zone.id}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="p-5 bg-gray-800/30 rounded-2xl border border-gray-700/50 hover:border-gray-600/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          zone.status === "optimal"
                            ? "bg-green-400"
                            : zone.status === "high"
                            ? "bg-yellow-400"
                            : "bg-red-400"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-bold text-white">{zone.name}</p>
                        <p className="text-xs text-gray-400">
                          {zone.usage} / {zone.limit} kWh
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{zone.efficiency}%</p>
                      <p className="text-xs text-gray-400">Efficiency</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(zone.usage / zone.limit) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`absolute inset-y-0 left-0 rounded-full ${
                        zone.status === "optimal"
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : zone.status === "high"
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                          : "bg-gradient-to-r from-red-500 to-pink-500"
                      }`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </PremiumCard>
        </div>

        {/* Right Column - Stats & Actions */}
        <div className="space-y-8">
          {/* Energy Breakdown */}
          <PremiumCard title="Energy Breakdown" subtitle="Usage by category" icon={Lightbulb}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={energyBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {energyBreakdown.map((entry, index) => (
                    <Cell key={`energy-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 gap-3 mt-6">
              {energyBreakdown.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="text-xs text-gray-400">{item.name}</p>
                    <p className="text-sm font-bold text-white">{item.value}%</p>
                  </div>
                </div>
              ))}
            </div>
          </PremiumCard>

          {/* AI Recommendations */}
          <PremiumCard title="AI Recommendations" subtitle="Smart optimization tips" icon={Lightbulb} highlight>
            <div className="space-y-4">
              <RecommendationCard
                title="Off-Peak Shift"
                description="Move 30% of equipment usage to off-peak hours"
                savings="$125/month"
                impact="high"
              />
              <RecommendationCard
                title="HVAC Optimization"
                description="Adjust cooling schedule in Building B"
                savings="$85/month"
                impact="medium"
              />
              <RecommendationCard
                title="Lighting Automation"
                description="Enable motion sensors in parking areas"
                savings="$45/month"
                impact="low"
              />
            </div>
          </PremiumCard>

          {/* Quick Stats */}
          <PremiumCard title="Quick Stats" subtitle="At a glance" icon={TrendingUp}>
            <div className="space-y-4">
              <QuickStat label="Peak Time" value="12:00 PM" subtext="Highest usage" />
              <QuickStat label="Off-Peak Savings" value="32%" subtext="vs peak rate" />
              <QuickStat label="Carbon Offset" value="2.4 tons" subtext="This month" />
              <QuickStat label="Renewable %" value="18%" subtext="Of total usage" />
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  icon: any;
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  gradient: string;
}

function KPICard({ icon: Icon, label, value, change, trend, gradient }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 hover:border-gray-600/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-1">
          {trend === "up" ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-green-400" />
          )}
          <span className="text-sm font-bold text-green-400">{change}</span>
        </div>
      </div>
      <h3 className="text-3xl font-bold text-white mb-2">{value}</h3>
      <p className="text-sm text-gray-400 font-medium">{label}</p>
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
}

function PremiumCard({ title, subtitle, icon: Icon, children, highlight }: PremiumCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl border rounded-3xl p-8 transition-all ${
        highlight ? "border-blue-500/30 shadow-xl shadow-blue-500/10" : "border-gray-700/50 hover:border-gray-600/50"
      }`}
    >
      <div className="flex items-center gap-4 mb-6">
        <div
          className={`w-12 h-12 bg-gradient-to-br ${
            highlight ? "from-blue-500 to-purple-500" : "from-gray-700 to-gray-800"
          } rounded-2xl flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 font-medium mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// Recommendation Card
interface RecommendationCardProps {
  title: string;
  description: string;
  savings: string;
  impact: "high" | "medium" | "low";
}

function RecommendationCard({ title, description, savings, impact }: RecommendationCardProps) {
  const impactColors = {
    high: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400" },
    medium: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
    low: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  };

  const colors = impactColors[impact];

  return (
    <motion.div
      whileHover={{ scale: 1.02, x: 4 }}
      className={`p-4 rounded-2xl border ${colors.bg} ${colors.border} cursor-pointer`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <span className={`text-sm font-bold ${colors.text}`}>{savings}</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">{description}</p>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${colors.bg} ${colors.text}`}>
          {impact.toUpperCase()} IMPACT
        </span>
      </div>
    </motion.div>
  );
}

// Quick Stat Component
interface QuickStatProps {
  label: string;
  value: string;
  subtext: string;
}

function QuickStat({ label, value, subtext }: QuickStatProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl">
      <div>
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-xs text-gray-500">{subtext}</p>
      </div>
    </div>
  );
}
