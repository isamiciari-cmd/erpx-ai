import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Package,
  Zap,
  Server,
  Database,
  Wifi,
  CheckCircle,
  XCircle,
  Brain,
  ShoppingBag,
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
} from "recharts";

interface SystemHealth {
  service: string;
  status: "ok" | "down" | "slow";
  latency: number;
  uptime: number;
}

interface AIInsight {
  id: number;
  type: "warning" | "opportunity" | "critical" | "info";
  message: string;
  tenantId?: number;
  tenantName?: string;
  timestamp: string;
  action?: string;
}

interface MarketplaceModule {
  id: number;
  name: string;
  description: string;
  price: number;
  active: boolean;
  installs: number;
  rating: number;
}

const controlTowerAPI = {
  systemHealth: [
    { service: "API Gateway", status: "ok" as const, latency: 45, uptime: 99.98 },
    { service: "Database", status: "ok" as const, latency: 12, uptime: 99.99 },
    { service: "Auth Service", status: "ok" as const, latency: 23, uptime: 99.95 },
    { service: "Billing Service", status: "slow" as const, latency: 180, uptime: 99.2 },
    { service: "Storage", status: "ok" as const, latency: 35, uptime: 99.97 },
    { service: "Cache", status: "ok" as const, latency: 8, uptime: 100 },
  ] as SystemHealth[],

  marketplaceModules: [
    {
      id: 1,
      name: "Advanced Analytics",
      description: "AI-powered business intelligence",
      price: 199,
      active: true,
      installs: 450,
      rating: 4.8,
    },
    {
      id: 2,
      name: "Mobile App",
      description: "iOS & Android native apps",
      price: 299,
      active: true,
      installs: 320,
      rating: 4.6,
    },
    {
      id: 3,
      name: "E-Signature",
      description: "Digital document signing",
      price: 149,
      active: true,
      installs: 280,
      rating: 4.9,
    },
    {
      id: 4,
      name: "WhatsApp Integration",
      description: "Customer messaging via WhatsApp",
      price: 99,
      active: false,
      installs: 150,
      rating: 4.5,
    },
  ] as MarketplaceModule[],

  async getSystemHealth(): Promise<SystemHealth[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...this.systemHealth]), 300));
  },

  async getMarketplaceModules(): Promise<MarketplaceModule[]> {
    return new Promise((resolve) =>
      setTimeout(() => resolve([...this.marketplaceModules]), 300)
    );
  },

  generateAIInsights(): AIInsight[] {
    return [
      {
        id: 1,
        type: "critical",
        message: "Tenant 'Acme Corp' payment failed 3 times. Risk of suspension.",
        tenantId: 1,
        tenantName: "Acme Corp",
        timestamp: new Date().toISOString(),
        action: "Suspend tenant",
      },
      {
        id: 2,
        type: "opportunity",
        message: "Tenant 'TechStart Ltd' usage increased 40%. Suggest Pro plan upgrade.",
        tenantId: 2,
        tenantName: "TechStart Ltd",
        timestamp: new Date().toISOString(),
        action: "Send upgrade email",
      },
      {
        id: 3,
        type: "warning",
        message: "Tenant 'SmallBiz Co' revenue dropped 20% due to low Sales module usage.",
        tenantId: 4,
        tenantName: "SmallBiz Co",
        timestamp: new Date().toISOString(),
        action: "Send engagement email",
      },
      {
        id: 4,
        type: "info",
        message: "12 tenants identified as churn risk based on usage patterns.",
        timestamp: new Date().toISOString(),
        action: "Review tenant list",
      },
      {
        id: 5,
        type: "critical",
        message: "Billing Service latency is 180ms (threshold: 100ms). Investigate immediately.",
        timestamp: new Date().toISOString(),
        action: "Check service logs",
      },
    ];
  },

  async suspendTenant(id: number): Promise<void> {
    console.log("Suspending tenant:", id);
    return new Promise((resolve) => setTimeout(() => resolve(), 500));
  },

  async sendUpgradeEmail(id: number): Promise<void> {
    console.log("Sending upgrade email to tenant:", id);
    return new Promise((resolve) => setTimeout(() => resolve(), 500));
  },

  async toggleModule(id: number): Promise<void> {
    const module = this.marketplaceModules.find((m) => m.id === id);
    if (module) {
      module.active = !module.active;
    }
    return new Promise((resolve) => setTimeout(() => resolve(), 300));
  },
};

export default function ControlTowerPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [modules, setModules] = useState<MarketplaceModule[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    const health = await controlTowerAPI.getSystemHealth();
    const marketplace = await controlTowerAPI.getMarketplaceModules();
    setSystemHealth(health);
    setModules(marketplace);
    setInsights(controlTowerAPI.generateAIInsights());
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleAction = async (insight: AIInsight) => {
    if (insight.action === "Suspend tenant" && insight.tenantId) {
      if (confirm(`Are you sure you want to suspend ${insight.tenantName}?`)) {
        await controlTowerAPI.suspendTenant(insight.tenantId);
        alert("Tenant suspended successfully");
      }
    } else if (insight.action === "Send upgrade email" && insight.tenantId) {
      await controlTowerAPI.sendUpgradeEmail(insight.tenantId);
      alert("Upgrade email sent successfully");
    } else {
      alert(`Action: ${insight.action}`);
    }
  };

  const toggleModule = async (id: number) => {
    await controlTowerAPI.toggleModule(id);
    fetchData();
  };

  const criticalServices = systemHealth.filter((s) => s.status === "down").length;
  const slowServices = systemHealth.filter((s) => s.status === "slow").length;
  const avgUptime =
    systemHealth.reduce((sum, s) => sum + s.uptime, 0) / systemHealth.length;

  const revenueData = [
    { id: "jan", month: "Jan", revenue: 380000 },
    { id: "feb", month: "Feb", revenue: 420000 },
    { id: "mar", month: "Mar", revenue: 450000 },
    { id: "apr", month: "Apr", revenue: 480000 },
    { id: "may", month: "May", revenue: 520000 },
  ];

  const stats = [
    {
      label: "Active Tenants",
      value: "1,240",
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      change: "+12.5%",
      trend: "up",
    },
    {
      label: "Monthly Recurring Revenue",
      value: "SAR 480K",
      icon: DollarSign,
      color: "from-green-500 to-emerald-500",
      change: "+22.3%",
      trend: "up",
    },
    {
      label: "Active Modules",
      value: modules.filter((m) => m.active).length.toString(),
      icon: Package,
      color: "from-purple-500 to-pink-500",
      change: "+2",
      trend: "up",
    },
    {
      label: "System Health",
      value: `${avgUptime.toFixed(2)}%`,
      icon: Activity,
      color: "from-orange-500 to-yellow-500",
      change: criticalServices > 0 ? "Critical" : slowServices > 0 ? "Degraded" : "Healthy",
      trend: criticalServices > 0 ? "down" : "neutral",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Server className="w-8 h-8 text-blue-400" />
            ERPX Control Tower
          </h1>
          <p className="text-gray-400 mt-2">Central command center for your SaaS platform</p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
            autoRefresh
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
          }`}
        >
          <Zap className={`w-4 h-4 ${autoRefresh ? "animate-pulse" : ""}`} />
          {autoRefresh ? "Live Updates" : "Paused"}
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all"
          >
            <div
              className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg mb-4`}
            >
              <stat.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-sm text-gray-400 mb-2">{stat.label}</p>
            <div className="flex items-center gap-2">
              {stat.trend === "up" && <TrendingUp className="w-4 h-4 text-green-400" />}
              {stat.trend === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
              <span
                className={`text-xs font-semibold ${
                  stat.trend === "up"
                    ? "text-green-400"
                    : stat.trend === "down"
                    ? "text-red-400"
                    : "text-gray-400"
                }`}
              >
                {stat.change}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Insights & Recommendations</h2>
            <p className="text-sm text-gray-400">
              Automated intelligence for proactive management
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {insights.map((insight, i) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-4 rounded-xl border ${
                insight.type === "critical"
                  ? "bg-red-500/10 border-red-500/30"
                  : insight.type === "warning"
                  ? "bg-yellow-500/10 border-yellow-500/30"
                  : insight.type === "opportunity"
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-blue-500/10 border-blue-500/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {insight.type === "critical" && (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  {insight.type === "warning" && (
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  )}
                  {insight.type === "opportunity" && (
                    <TrendingUp className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  )}
                  {insight.type === "info" && (
                    <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-white font-medium">{insight.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(insight.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {insight.action && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAction(insight)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all"
                  >
                    {insight.action}
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* System Health Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />
            System Health Monitor
          </h2>

          <div className="space-y-3">
            {systemHealth.map((service, i) => (
              <motion.div
                key={service.service}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 bg-white/5 border border-white/10 rounded-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {service.service.includes("Database") && (
                      <Database className="w-5 h-5 text-purple-400" />
                    )}
                    {service.service.includes("Gateway") && (
                      <Wifi className="w-5 h-5 text-blue-400" />
                    )}
                    {!service.service.includes("Database") &&
                      !service.service.includes("Gateway") && (
                        <Server className="w-5 h-5 text-cyan-400" />
                      )}
                    <span className="text-white font-semibold">{service.service}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      service.status === "ok"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : service.status === "slow"
                        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {service.status.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Latency</p>
                    <p
                      className={`font-semibold ${
                        service.latency < 50
                          ? "text-green-400"
                          : service.latency < 150
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {service.latency}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Uptime</p>
                    <p className="text-white font-semibold">{service.uptime}%</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Revenue Trend */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6">Revenue Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="controlTowerRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
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
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#controlTowerRevenueGradient)"
                name="Revenue (SAR)"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Module Marketplace */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-purple-400" />
          Module Marketplace
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module, i) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    module.active
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                  }`}
                >
                  {module.active ? "Active" : "Inactive"}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">{module.name}</h3>
              <p className="text-sm text-gray-400 mb-4">{module.description}</p>

              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-white">SAR {module.price}</span>
                <div className="text-sm text-gray-400">
                  <span className="text-yellow-400">★</span> {module.rating}
                </div>
              </div>

              <div className="text-xs text-gray-400 mb-4">{module.installs} installs</div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleModule(module.id)}
                className={`w-full py-2 rounded-xl font-medium transition-all ${
                  module.active
                    ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                    : "bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                }`}
              >
                {module.active ? "Deactivate" : "Activate"}
              </motion.button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
