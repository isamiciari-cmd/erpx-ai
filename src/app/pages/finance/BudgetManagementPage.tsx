import { TrendingUp, AlertTriangle, Plus } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const budgets = [
  {
    id: 1,
    name: 'Sales Department Q2 2026',
    type: 'Department',
    allocated: 120000,
    used: 102000,
    committed: 8000,
    available: 10000,
    utilization: 85,
  },
  {
    id: 2,
    name: 'Marketing Campaign 2026',
    type: 'Project',
    allocated: 50000,
    used: 46000,
    committed: 2000,
    available: 2000,
    utilization: 92,
  },
  {
    id: 3,
    name: 'Operations Monthly',
    type: 'Department',
    allocated: 100000,
    used: 78000,
    committed: 12000,
    available: 10000,
    utilization: 78,
  },
  {
    id: 4,
    name: 'IT Infrastructure',
    type: 'Department',
    allocated: 60000,
    used: 39000,
    committed: 8000,
    available: 13000,
    utilization: 65,
  },
  {
    id: 5,
    name: 'HR & Recruitment',
    type: 'Department',
    allocated: 80000,
    used: 70400,
    committed: 4600,
    available: 5000,
    utilization: 88,
  },
];

const budgetVariance = [
  { category: 'Salaries', budget: 85000, actual: 88500, variance: -3500 },
  { category: 'Marketing', budget: 50000, actual: 46000, variance: 4000 },
  { category: 'Operations', budget: 75000, actual: 78000, variance: -3000 },
  { category: 'IT', budget: 40000, actual: 39000, variance: 1000 },
  { category: 'Travel', budget: 20000, actual: 15000, variance: 5000 },
];

export default function BudgetManagementPage() {
  const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
  const totalUsed = budgets.reduce((sum, b) => sum + b.used, 0);
  const totalAvailable = budgets.reduce((sum, b) => sum + b.available, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Budget Management</h1>
          <p className="text-gray-600">
            Plan, track, and analyze budgets across departments and projects
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          Create Budget
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-1">Total Allocated</h3>
          <p className="text-2xl font-bold text-blue-600">${totalAllocated.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-1">Total Used</h3>
          <p className="text-2xl font-bold text-purple-600">${totalUsed.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-1">Available</h3>
          <p className="text-2xl font-bold text-green-600">${totalAvailable.toLocaleString()}</p>
        </div>
      </div>

      {/* Budget Variance Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Budget vs Actual</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={budgetVariance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
            <Bar dataKey="actual" fill="#8b5cf6" name="Actual" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Budgets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Active Budgets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Budget Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Allocated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Used
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Available
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {budgets.map((budget) => (
                <tr key={budget.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{budget.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {budget.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    ${budget.allocated.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-purple-600 font-medium">
                    ${budget.used.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-bold">
                    ${budget.available.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                      <div
                        className={`h-2 rounded-full ${
                          budget.utilization >= 90
                            ? 'bg-red-500'
                            : budget.utilization >= 75
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${budget.utilization}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">{budget.utilization}%</p>
                  </td>
                  <td className="px-6 py-4">
                    {budget.utilization >= 90 ? (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        Critical
                      </span>
                    ) : budget.utilization >= 75 ? (
                      <span className="flex items-center gap-1 text-yellow-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        Warning
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <TrendingUp className="w-4 h-4" />
                        Healthy
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
