import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const monthlyPL = [
  { month: 'Jan', revenue: 450000, expenses: 320000, profit: 130000 },
  { month: 'Feb', revenue: 520000, expenses: 340000, profit: 180000 },
  { month: 'Mar', revenue: 480000, expenses: 350000, profit: 130000 },
  { month: 'Apr', revenue: 610000, expenses: 380000, profit: 230000 },
  { month: 'May', revenue: 680000, expenses: 420000, profit: 260000 },
  { month: 'Jun', revenue: 720000, expenses: 450000, profit: 270000 },
];

const cashFlowData = [
  { month: 'Jan', inflow: 480000, outflow: 350000 },
  { month: 'Feb', inflow: 550000, outflow: 380000 },
  { month: 'Mar', inflow: 510000, outflow: 390000 },
  { month: 'Apr', inflow: 640000, outflow: 420000 },
  { month: 'May', inflow: 710000, outflow: 460000 },
  { month: 'Jun', inflow: 750000, outflow: 490000 },
];

const expenseBreakdown = [
  { name: 'Salaries', value: 180000, color: '#3b82f6' },
  { name: 'Rent & Utilities', value: 60000, color: '#8b5cf6' },
  { name: 'Marketing', value: 45000, color: '#ec4899' },
  { name: 'Operations', value: 85000, color: '#f59e0b' },
  { name: 'IT & Software', value: 40000, color: '#10b981' },
  { name: 'Others', value: 40000, color: '#6b7280' },
];

const revenueByBranch = [
  { branch: 'HQ - Riyadh', revenue: 320000 },
  { branch: 'Jeddah', revenue: 240000 },
  { branch: 'Dammam', revenue: 160000 },
];

const alerts = [
  { id: 1, type: 'warning', message: '12 invoices overdue by more than 30 days', amount: 145000 },
  { id: 2, type: 'info', message: 'Marketing budget at 92% utilization', amount: 46000 },
  { id: 3, type: 'critical', message: '3 suppliers require immediate payment', amount: 87500 },
];

export default function FinanceDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Finance Dashboard</h1>
        <p className="text-gray-600">Global ERP-level financial overview and analytics</p>
      </div>

      {/* Financial Alerts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Financial Alerts</h2>
        <div className="space-y-3">
          {alerts.map(alert => (
            <div key={alert.id} className={`flex items-start gap-3 p-4 rounded-lg ${
              alert.type === 'critical' ? 'bg-red-50 border border-red-200' :
              alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                alert.type === 'critical' ? 'text-red-600' :
                alert.type === 'warning' ? 'text-yellow-600' :
                'text-blue-600'
              }`} />
              <div className="flex-1">
                <p className="font-medium">{alert.message}</p>
                <p className="text-sm text-gray-600 mt-1">Amount: ${alert.amount.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value="$720,000"
          change="+15.2%"
          trend="up"
          icon={<DollarSign className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="Total Expenses"
          value="$450,000"
          change="+8.3%"
          trend="up"
          icon={<CreditCard className="w-6 h-6" />}
          color="purple"
        />
        <MetricCard
          title="Net Profit"
          value="$270,000"
          change="+28.6%"
          trend="up"
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <MetricCard
          title="Gross Profit"
          value="$340,000"
          change="+22.1%"
          trend="up"
          icon={<Wallet className="w-6 h-6" />}
          color="emerald"
        />
      </div>

      {/* Cash & Bank Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Cash Balance"
          value="$185,000"
          subtitle="Available cash"
          icon={<Wallet className="w-6 h-6" />}
          color="indigo"
        />
        <MetricCard
          title="Bank Balance"
          value="$1,245,000"
          subtitle="All accounts"
          icon={<DollarSign className="w-6 h-6" />}
          color="cyan"
        />
        <MetricCard
          title="Accounts Receivable"
          value="$425,000"
          subtitle="To be collected"
          icon={<CheckCircle className="w-6 h-6" />}
          color="teal"
        />
        <MetricCard
          title="Accounts Payable"
          value="$287,500"
          subtitle="To be paid"
          icon={<Clock className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Outstanding Invoices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Outstanding Invoices</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">Total Outstanding</span>
              <span className="text-2xl font-bold text-blue-600">$425,000</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
              <span className="font-medium">Overdue (0-30 days)</span>
              <span className="text-lg font-semibold text-yellow-600">$85,000</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
              <span className="font-medium">Overdue (31-60 days)</span>
              <span className="text-lg font-semibold text-orange-600">$45,000</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded">
              <span className="font-medium">Overdue (60+ days)</span>
              <span className="text-lg font-semibold text-red-600">$15,000</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Budget Utilization</h2>
          <div className="space-y-4">
            <BudgetBar department="Sales" utilized={85} budget={120000} spent={102000} />
            <BudgetBar department="Marketing" utilized={92} budget={50000} spent={46000} />
            <BudgetBar department="Operations" utilized={78} budget={100000} spent={78000} />
            <BudgetBar department="IT" utilized={65} budget={60000} spent={39000} />
            <BudgetBar department="HR" utilized={88} budget={80000} spent={70400} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly P&L */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Profit & Loss</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyPL}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cash Flow */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Cash Flow Summary</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="inflow" fill="#10b981" name="Cash Inflow" />
              <Bar dataKey="outflow" fill="#ef4444" name="Cash Outflow" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense Breakdown & Revenue by Branch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Expense Breakdown</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={250}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {expenseBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue by Branch */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Revenue by Branch</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueByBranch} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="branch" type="category" width={120} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, trend, subtitle, icon, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    teal: 'bg-teal-100 text-teal-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {change}
          </div>
        )}
      </div>
      <h3 className="text-sm text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function BudgetBar({ department, utilized, budget, spent }: any) {
  const color = utilized >= 90 ? 'bg-red-500' : utilized >= 75 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{department}</span>
        <span className="text-gray-600">${spent.toLocaleString()} / ${budget.toLocaleString()}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${utilized}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-1">{utilized}% utilized</p>
    </div>
  );
}
