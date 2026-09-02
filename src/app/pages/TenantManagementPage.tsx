import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  Plus,
  Globe,
  Database,
  Crown,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Shield,
} from 'lucide-react';

interface Tenant {
  id: number;
  name: string;
  domain: string;
  schema: string;
  plan: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'expired';
  subscriptionExpiry: string;
  userCount: number;
  createdAt: string;
}

// Mock API
const tenantAPI = {
  tenants: [
    {
      id: 1,
      name: 'Al-Noor Restaurant',
      domain: 'alnoor.erpx.sa',
      schema: 'tenant_1',
      plan: 'pro' as const,
      status: 'active' as const,
      subscriptionExpiry: '2026-12-31',
      userCount: 25,
      createdAt: '2024-01-15',
    },
    {
      id: 2,
      name: 'Riyadh Trading Co.',
      domain: 'riyadh-trading.erpx.sa',
      schema: 'tenant_2',
      plan: 'enterprise' as const,
      status: 'active' as const,
      subscriptionExpiry: '2027-06-30',
      userCount: 150,
      createdAt: '2024-03-20',
    },
    {
      id: 3,
      name: 'Jeddah Electronics',
      domain: 'jeddah-electronics.erpx.sa',
      schema: 'tenant_3',
      plan: 'basic' as const,
      status: 'active' as const,
      subscriptionExpiry: '2026-08-15',
      userCount: 10,
      createdAt: '2025-02-10',
    },
  ] as Tenant[],
  nextId: 4,

  async findAll(): Promise<Tenant[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...this.tenants]), 300));
  },

  async create(data: Omit<Tenant, 'id' | 'createdAt' | 'userCount'>): Promise<Tenant> {
    const tenant: Tenant = {
      ...data,
      id: this.nextId++,
      userCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.tenants.push(tenant);
    return new Promise((resolve) => setTimeout(() => resolve(tenant), 300));
  },

  async update(id: number, data: Partial<Tenant>): Promise<void> {
    const tenant = this.tenants.find((t) => t.id === id);
    if (tenant) {
      Object.assign(tenant, data);
    }
    return new Promise((resolve) => setTimeout(() => resolve(), 300));
  },

  async delete(id: number): Promise<void> {
    this.tenants = this.tenants.filter((t) => t.id !== id);
    return new Promise((resolve) => setTimeout(() => resolve(), 300));
  },

  getConnectionConfig(tenant: Tenant) {
    return {
      host: 'localhost',
      port: 5432,
      database: 'erpx',
      schema: tenant.schema,
    };
  },
};

const planFeatures = {
  basic: {
    name: 'Basic',
    color: 'from-gray-500 to-gray-600',
    price: '299 SAR/month',
    features: ['Orders Management', 'Basic Reports', '5 Users', 'Email Support'],
  },
  pro: {
    name: 'Pro',
    color: 'from-blue-500 to-cyan-500',
    price: '999 SAR/month',
    features: [
      'Orders + Finance',
      'Advanced Reports',
      '50 Users',
      'Priority Support',
      'Multi-Currency',
      'ZATCA Integration',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    color: 'from-purple-500 to-pink-500',
    price: 'Custom',
    features: [
      'Full ERP Suite',
      'Unlimited Users',
      '24/7 Support',
      'Custom Integrations',
      'Dedicated Server',
      'White Label',
    ],
  },
};

export default function TenantManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [plan, setPlan] = useState<Tenant['plan']>('basic');
  const [subscriptionExpiry, setSubscriptionExpiry] = useState('');

  const fetchTenants = async () => {
    const data = await tenantAPI.findAll();
    setTenants(data);
  };

  const createTenant = async () => {
    if (!name || !domain || !subscriptionExpiry) return;

    const schema = `tenant_${tenantAPI.nextId}`;

    await tenantAPI.create({
      name,
      domain,
      schema,
      plan,
      status: 'active',
      subscriptionExpiry,
    });

    setName('');
    setDomain('');
    setPlan('basic');
    setSubscriptionExpiry('');
    setShowForm(false);
    fetchTenants();
  };

  const updateTenantStatus = async (id: number, status: Tenant['status']) => {
    await tenantAPI.update(id, { status });
    fetchTenants();
  };

  const deleteTenant = async (id: number) => {
    if (confirm('Are you sure? This will delete all tenant data permanently.')) {
      await tenantAPI.delete(id);
      fetchTenants();
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const getStatusColor = (status: Tenant['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'suspended':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'expired':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
  };

  const getStatusIcon = (status: Tenant['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'suspended':
      case 'expired':
        return <XCircle className="w-4 h-4" />;
    }
  };

  const stats = [
    {
      label: 'Total Tenants',
      value: tenants.length.toString(),
      icon: Building2,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Active Tenants',
      value: tenants.filter((t) => t.status === 'active').length.toString(),
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Total Users',
      value: tenants.reduce((sum, t) => sum + t.userCount, 0).toString(),
      icon: Users,
      color: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Monthly Revenue',
      value: 'SAR 45,000',
      icon: Crown,
      color: 'from-orange-500 to-yellow-500',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white"
        >
          Multi-Tenant Management
        </motion.h1>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Tenant
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer"
          >
            <div
              className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg mb-4`}
            >
              <stat.icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Architecture Diagram */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/20 rounded-2xl p-6 mb-8"
      >
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Multi-Tenant Architecture
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { icon: Globe, label: 'Domain Routing' },
            { icon: Shield, label: 'Tenant Resolver' },
            { icon: Database, label: 'Schema Isolation' },
            { icon: Users, label: 'User Auth' },
            { icon: Crown, label: 'Subscription' },
            { icon: CheckCircle, label: 'Access Control' },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-2">
                <step.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-xs text-gray-400">{step.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Create Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-6">Create New Tenant</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Tenant Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Al-Noor Restaurant"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="tenant.erpx.sa"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Subscription Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as Tenant['plan'])}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">Basic - 299 SAR/month</option>
                <option value="pro">Pro - 999 SAR/month</option>
                <option value="enterprise">Enterprise - Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Subscription Expiry</label>
              <input
                type="date"
                value={subscriptionExpiry}
                onChange={(e) => setSubscriptionExpiry(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Plan Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(planFeatures).map(([key, planInfo]) => (
              <div
                key={key}
                className={`p-4 rounded-xl border ${
                  plan === key ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <h4 className="text-white font-semibold mb-2">{planInfo.name}</h4>
                <p className="text-sm text-gray-400 mb-3">{planInfo.price}</p>
                <ul className="space-y-1">
                  {planInfo.features.map((feature) => (
                    <li key={feature} className="text-xs text-gray-400 flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createTenant}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium"
            >
              Create Tenant
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl"
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Tenants Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">All Tenants</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Tenant
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Domain
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Schema
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Plan
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Users
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant, i) => (
                <motion.tr
                  key={tenant.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{tenant.name}</p>
                        <p className="text-xs text-gray-400">ID: {tenant.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Globe className="w-4 h-4" />
                      <span className="text-sm">{tenant.domain}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                      {tenant.schema}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${
                        planFeatures[tenant.plan].color
                      } text-white`}
                    >
                      {planFeatures[tenant.plan].name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-semibold">{tenant.userCount}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(
                        tenant.status,
                      )}`}
                    >
                      {getStatusIcon(tenant.status)}
                      {tenant.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-400"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </motion.button>

                      {tenant.status === 'active' && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateTenantStatus(tenant.id, 'suspended')}
                          className="p-2 hover:bg-yellow-500/10 rounded-lg text-gray-400 hover:text-yellow-400"
                          title="Suspend"
                        >
                          <XCircle className="w-4 h-4" />
                        </motion.button>
                      )}

                      {tenant.status === 'suspended' && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateTenantStatus(tenant.id, 'active')}
                          className="p-2 hover:bg-green-500/10 rounded-lg text-gray-400 hover:text-green-400"
                          title="Activate"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </motion.button>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => deleteTenant(tenant.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
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
