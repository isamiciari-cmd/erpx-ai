import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Users, FileText, Package, ShoppingCart, Database } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface UsageRecord {
  tenantId: number;
  tenantName: string;
  module: string;
  count: number;
  lastUsed: string;
}

interface ModuleLimit {
  module: string;
  plan: string;
  limit: number;
  current: number;
}

const usageAPI = {
  records: [
    {
      tenantId: 1,
      tenantName: 'Acme Corp',
      module: 'Finance',
      count: 1250,
      lastUsed: new Date().toISOString(),
    },
    {
      tenantId: 1,
      tenantName: 'Acme Corp',
      module: 'Inventory',
      count: 850,
      lastUsed: new Date().toISOString(),
    },
    {
      tenantId: 2,
      tenantName: 'TechStart Ltd',
      module: 'Finance',
      count: 320,
      lastUsed: new Date().toISOString(),
    },
    {
      tenantId: 2,
      tenantName: 'TechStart Ltd',
      module: 'HR',
      count: 45,
      lastUsed: new Date().toISOString(),
    },
    {
      tenantId: 3,
      tenantName: 'Global Enterprises',
      module: 'Finance',
      count: 5200,
      lastUsed: new Date().toISOString(),
    },
    {
      tenantId: 3,
      tenantName: 'Global Enterprises',
      module: 'Inventory',
      count: 3400,
      lastUsed: new Date().toISOString(),
    },
  ] as UsageRecord[],

  limits: {
    Basic: {
      Finance: 500,
      Inventory: 200,
      HR: 10,
      Sales: 100,
    },
    Pro: {
      Finance: 5000,
      Inventory: 2000,
      HR: 50,
      Sales: 1000,
    },
    Enterprise: {
      Finance: -1, // unlimited
      Inventory: -1,
      HR: -1,
      Sales: -1,
    },
  },

  async findAll(): Promise<UsageRecord[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...this.records]), 300));
  },

  checkLimits(tenantId: number, plan: string): ModuleLimit[] {
    const tenantUsage = this.records.filter((r) => r.tenantId === tenantId);
    const planLimits = this.limits[plan as keyof typeof this.limits];

    return Object.entries(planLimits).map(([module, limit]) => {
      const usage = tenantUsage.find((r) => r.module === module);
      return {
        module,
        plan,
        limit,
        current: usage?.count || 0,
      };
    });
  },

  hasAccess(tenantId: number, plan: string, module: string): boolean {
    const limits = this.checkLimits(tenantId, plan);
    const moduleLimit = limits.find((l) => l.module === module);

    if (!moduleLimit) return false;
    if (moduleLimit.limit === -1) return true; // unlimited
    return moduleLimit.current < moduleLimit.limit;
  },
};

export default function UsageTrackingPage() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<number>(1);
  const [selectedPlan] = useState<string>('Pro');

  const fetchRecords = async () => {
    const data = await usageAPI.findAll();
    setRecords(data);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const tenants = Array.from(new Set(records.map((r) => r.tenantId))).map((id) => ({
    id,
    name: records.find((r) => r.tenantId === id)?.tenantName || '',
  }));

  const tenantUsage = records.filter((r) => r.tenantId === selectedTenant);
  const limits = usageAPI.checkLimits(selectedTenant, selectedPlan);

  const usageTrend = [
    { id: 'week1', week: 'Week 1', usage: 2800 },
    { id: 'week2', week: 'Week 2', usage: 3200 },
    { id: 'week3', week: 'Week 3', usage: 3600 },
    { id: 'week4', week: 'Week 4', usage: 4100 },
  ];

  const moduleIcons: { [key: string]: any } = {
    Finance: FileText,
    Inventory: Package,
    HR: Users,
    Sales: ShoppingCart,
  };

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-8"
      >
        Usage Tracking
      </motion.h1>

      {/* Tenant Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center gap-4">
          <Database className="w-6 h-6 text-blue-400" />
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-2">Select Tenant</label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} (Plan: {selectedPlan})
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Module Limits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {limits.map((limit, i) => {
          const Icon = moduleIcons[limit.module] || Activity;
          const percentage = limit.limit === -1 ? 0 : (limit.current / limit.limit) * 100;
          const isNearLimit = percentage > 80;
          const isOverLimit = percentage >= 100;

          return (
            <motion.div
              key={limit.module}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className={`bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border rounded-2xl p-6 transition-all ${
                isOverLimit
                  ? 'border-red-500/50'
                  : isNearLimit
                    ? 'border-yellow-500/50'
                    : 'border-white/10'
              }`}
            >
              <div
                className={`w-14 h-14 bg-gradient-to-br ${
                  isOverLimit
                    ? 'from-red-500 to-pink-500'
                    : isNearLimit
                      ? 'from-yellow-500 to-orange-500'
                      : 'from-blue-500 to-cyan-500'
                } rounded-xl flex items-center justify-center shadow-lg mb-4`}
              >
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {limit.current.toLocaleString()}
                {limit.limit !== -1 && ` / ${limit.limit.toLocaleString()}`}
              </h3>
              <p className="text-sm text-gray-400 mb-3">{limit.module} Usage</p>
              {limit.limit !== -1 && (
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={`h-full ${
                      isOverLimit
                        ? 'bg-gradient-to-r from-red-500 to-pink-500'
                        : isNearLimit
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    }`}
                  />
                </div>
              )}
              {limit.limit === -1 && (
                <span className="text-xs text-green-400 font-semibold">Unlimited</span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Usage Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
      >
        <h2 className="text-xl font-bold text-white mb-6">Usage Trend</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={usageTrend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="week" stroke="#6b7280" style={{ fontSize: 12 }} />
            <YAxis stroke="#6b7280" style={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '12px',
                color: '#fff',
              }}
            />
            <Line
              type="monotone"
              dataKey="usage"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#usageGradient)"
              name="Total Usage"
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Module Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
      >
        <h2 className="text-xl font-bold text-white mb-6">Module Breakdown</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={tenantUsage} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="module" stroke="#6b7280" style={{ fontSize: 12 }} />
            <YAxis stroke="#6b7280" style={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '12px',
                color: '#fff',
              }}
            />
            <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} name="Usage Count" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
