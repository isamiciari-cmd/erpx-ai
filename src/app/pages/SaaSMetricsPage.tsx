import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Subscription {
  id: number;
  tenantName: string;
  plan: string;
  status: "active" | "past_due" | "canceled";
  mrr: number;
  startDate: string;
  nextBillingDate: string;
  stripeCustomerId: string;
}

const saasAPI = {
  subscriptions: [
    {
      id: 1,
      tenantName: "Acme Corp",
      plan: "Pro",
      status: "active" as const,
      mrr: 999,
      startDate: "2024-01-15",
      nextBillingDate: "2025-05-15",
      stripeCustomerId: "cus_abc123",
    },
    {
      id: 2,
      tenantName: "TechStart Ltd",
      plan: "Basic",
      status: "active" as const,
      mrr: 299,
      startDate: "2024-03-20",
      nextBillingDate: "2025-05-20",
      stripeCustomerId: "cus_def456",
    },
    {
      id: 3,
      tenantName: "Global Enterprises",
      plan: "Enterprise",
      status: "active" as const,
      mrr: 4500,
      startDate: "2023-11-10",
      nextBillingDate: "2025-05-10",
      stripeCustomerId: "cus_ghi789",
    },
    {
      id: 4,
      tenantName: "SmallBiz Co",
      plan: "Basic",
      status: "past_due" as const,
      mrr: 299,
      startDate: "2024-04-05",
      nextBillingDate: "2025-05-05",
      stripeCustomerId: "cus_jkl012",
    },
    {
      id: 5,
      tenantName: "MediumTech Inc",
      plan: "Pro",
      status: "canceled" as const,
      mrr: 0,
      startDate: "2024-02-12",
      nextBillingDate: "2025-04-12",
      stripeCustomerId: "cus_mno345",
    },
  ] as Subscription[],

  async findAll(): Promise<Subscription[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...this.subscriptions]), 300));
  },

  getMetrics() {
    const active = this.subscriptions.filter((s) => s.status === "active").length;
    const pastDue = this.subscriptions.filter((s) => s.status === "past_due").length;
    const canceled = this.subscriptions.filter((s) => s.status === "canceled").length;
    const mrr = this.subscriptions
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + s.mrr, 0);
    const churnRate = ((canceled / this.subscriptions.length) * 100).toFixed(1);

    return { active, pastDue, canceled, mrr, churnRate };
  },
};

export default function SaaSMetricsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [metrics, setMetrics] = useState({
    active: 0,
    pastDue: 0,
    canceled: 0,
    mrr: 0,
    churnRate: "0",
  });

  const fetchData = async () => {
    const data = await saasAPI.findAll();
    setSubscriptions(data);
    setMetrics(saasAPI.getMetrics());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const mrrData = [
    { id: "jan", month: "Jan", mrr: 85000 },
    { id: "feb", month: "Feb", mrr: 92000 },
    { id: "mar", month: "Mar", mrr: 105000 },
    { id: "apr", month: "Apr", mrr: 128000 },
    { id: "may", month: "May", mrr: metrics.mrr },
  ];

  const planDistribution = [
    { name: "Basic", value: subscriptions.filter((s) => s.plan === "Basic").length },
    { name: "Pro", value: subscriptions.filter((s) => s.plan === "Pro").length },
    { name: "Enterprise", value: subscriptions.filter((s) => s.plan === "Enterprise").length },
  ];

  const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b"];

  const stats = [
    {
      label: "Active Tenants",
      value: metrics.active.toString(),
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      change: "+12.5%",
      changeType: "up",
    },
    {
      label: "Monthly Recurring Revenue",
      value: `SAR ${metrics.mrr.toLocaleString()}`,
      icon: DollarSign,
      color: "from-green-500 to-emerald-500",
      change: "+22.3%",
      changeType: "up",
    },
    {
      label: "Churn Rate",
      value: `${metrics.churnRate}%`,
      icon: TrendingDown,
      color: "from-red-500 to-pink-500",
      change: "-0.8%",
      changeType: "down",
    },
    {
      label: "Past Due",
      value: metrics.pastDue.toString(),
      icon: AlertCircle,
      color: "from-yellow-500 to-orange-500",
      change: "+2",
      changeType: "neutral",
    },
  ];

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-8"
      >
        SaaS Metrics Dashboard
      </motion.h1>

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
              {stat.changeType === "up" && <TrendingUp className="w-4 h-4 text-green-400" />}
              {stat.changeType === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
              <span
                className={`text-xs font-semibold ${
                  stat.changeType === "up"
                    ? "text-green-400"
                    : stat.changeType === "down"
                    ? "text-red-400"
                    : "text-gray-400"
                }`}
              >
                {stat.change} from last month
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* MRR Trend */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6">MRR Growth</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mrrData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
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
                dataKey="mrr"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#mrrGradient)"
                name="MRR (SAR)"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Plan Distribution */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6">Plan Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {planDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "12px",
                  color: "#fff",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Subscriptions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Active Subscriptions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Tenant
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Plan
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  MRR
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Next Billing
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Stripe ID
                </th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub, i) => (
                <motion.tr
                  key={sub.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="px-6 py-4">
                    <p className="text-white font-semibold">{sub.tenantName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        sub.plan === "Basic"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : sub.plan === "Pro"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                      }`}
                    >
                      {sub.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-white">
                    SAR {sub.mrr.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {sub.status === "active" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    )}
                    {sub.status === "past_due" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        <AlertCircle className="w-3 h-3" />
                        Past Due
                      </span>
                    )}
                    {sub.status === "canceled" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                        <XCircle className="w-3 h-3" />
                        Canceled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(sub.nextBillingDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-400">
                    {sub.stripeCustomerId}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
