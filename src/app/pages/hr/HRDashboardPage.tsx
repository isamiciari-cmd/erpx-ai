import {
  Users,
  UserCheck,
  UserPlus,
  UserMinus,
  Clock,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const employeesByDepartment = [
  { name: 'Sales', count: 45, color: '#3b82f6' },
  { name: 'IT', count: 32, color: '#8b5cf6' },
  { name: 'Finance', count: 18, color: '#10b981' },
  { name: 'HR', count: 12, color: '#f59e0b' },
  { name: 'Operations', count: 28, color: '#ec4899' },
];

const employeesByBranch = [
  { branch: 'HQ - Riyadh', employees: 85 },
  { branch: 'Jeddah', employees: 32 },
  { branch: 'Dammam', employees: 18 },
];

const attendanceTrend = [
  { date: 'Mon', present: 128, absent: 7, late: 12 },
  { date: 'Tue', present: 132, absent: 3, late: 8 },
  { date: 'Wed', present: 130, absent: 5, late: 10 },
  { date: 'Thu', present: 135, absent: 0, late: 5 },
  { date: 'Fri', present: 120, absent: 15, late: 3 },
];

const contractExpiry = [
  {
    id: 1,
    employee: 'Ahmed Ali',
    position: 'Sales Manager',
    expiryDate: '2026-05-15',
    daysLeft: 15,
  },
  {
    id: 2,
    employee: 'Sara Mohamed',
    position: 'IT Specialist',
    expiryDate: '2026-05-20',
    daysLeft: 20,
  },
  {
    id: 3,
    employee: 'Omar Ibrahim',
    position: 'Accountant',
    expiryDate: '2026-06-01',
    daysLeft: 32,
  },
];

const hrAlerts = [
  {
    id: 1,
    type: 'warning',
    message: '3 contracts expiring in next 30 days',
    action: 'Review renewals',
  },
  { id: 2, type: 'info', message: '15 leave requests pending approval', action: 'Approve leaves' },
  {
    id: 3,
    type: 'critical',
    message: 'Payroll for April needs approval',
    action: 'Process payroll',
  },
];

export default function HRDashboardPage() {
  const totalEmployees = 135;
  const activeEmployees = 128;
  const newHires = 8;
  const resignations = 3;
  const attendanceRate = 94.8;
  const absenteeismRate = 5.2;
  const overtimeHours = 245;
  const payrollCost = 850000;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">HR Dashboard</h1>
        <p className="text-gray-600">Human Resources overview and analytics</p>
      </div>

      {/* HR Alerts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">HR Alerts & Notifications</h2>
        <div className="space-y-3">
          {hrAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                alert.type === 'critical'
                  ? 'bg-red-50 border border-red-200'
                  : alert.type === 'warning'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle
                  className={`w-5 h-5 ${
                    alert.type === 'critical'
                      ? 'text-red-600'
                      : alert.type === 'warning'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                  }`}
                />
                <span className="font-medium">{alert.message}</span>
              </div>
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
                {alert.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Employees"
          value={totalEmployees.toString()}
          subtitle={`${activeEmployees} active`}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="New Hires (This Month)"
          value={newHires.toString()}
          subtitle="April 2026"
          icon={<UserPlus className="w-6 h-6" />}
          color="green"
        />
        <MetricCard
          title="Resignations"
          value={resignations.toString()}
          subtitle="This quarter"
          icon={<UserMinus className="w-6 h-6" />}
          color="red"
        />
        <MetricCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          subtitle={`${absenteeismRate}% absent`}
          icon={<UserCheck className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Overtime & Payroll */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm text-gray-600">Overtime Hours (This Month)</h3>
              <p className="text-2xl font-bold">{overtimeHours}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Average 8.1 hours per employee</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm text-gray-600">Monthly Payroll Cost</h3>
              <p className="text-2xl font-bold">${payrollCost.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Including bonuses and overtime</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employees by Department */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Employees by Department</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={employeesByDepartment}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {employeesByDepartment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {employeesByDepartment.map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: dept.color }} />
                    <span className="text-sm">{dept.name}</span>
                  </div>
                  <span className="text-sm font-medium">{dept.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Employees by Branch */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Employees by Branch</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={employeesByBranch} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="branch" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="employees" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Weekly Attendance Trend</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={attendanceTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="present"
              stroke="#10b981"
              strokeWidth={2}
              name="Present"
            />
            <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
            <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Contract Expiry Alerts */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Contract Expiry Alerts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Days Left
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contractExpiry.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{contract.employee}</td>
                  <td className="px-6 py-4 text-sm">{contract.position}</td>
                  <td className="px-6 py-4 text-sm">{contract.expiryDate}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        contract.daysLeft <= 15
                          ? 'bg-red-100 text-red-800'
                          : contract.daysLeft <= 30
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {contract.daysLeft} days
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Renew Contract
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-2">Pending Leave Requests</h3>
          <p className="text-3xl font-bold text-yellow-600">15</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-2">Approved Leaves (This Month)</h3>
          <p className="text-3xl font-bold text-green-600">42</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-2">Employees on Leave Today</h3>
          <p className="text-3xl font-bold text-blue-600">7</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-2">Average Leave Balance</h3>
          <p className="text-3xl font-bold text-purple-600">12 days</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      <h3 className="text-sm text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}
