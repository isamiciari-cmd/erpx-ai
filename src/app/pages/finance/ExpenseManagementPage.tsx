import { useState } from 'react';
import { Plus, Clock, CheckCircle, XCircle, Paperclip } from 'lucide-react';

const expenses = [
  { id: 1, number: 'EXP-223', category: 'Travel', employee: 'Ahmed Ali', amount: 3500, date: '2026-04-28', status: 'approved', description: 'Business trip to Jeddah' },
  { id: 2, number: 'EXP-224', category: 'Office Supplies', employee: 'Sara Mohamed', amount: 850, date: '2026-04-29', status: 'pending', description: 'Printer cartridges and paper' },
  { id: 3, number: 'EXP-225', category: 'Marketing', employee: 'Omar Ibrahim', amount: 12000, date: '2026-04-30', status: 'approved', description: 'Social media advertising campaign' },
  { id: 4, number: 'EXP-226', category: 'Utilities', employee: 'Fatima Hassan', amount: 4200, date: '2026-04-30', status: 'rejected', description: 'Monthly electricity bill' },
  { id: 5, number: 'EXP-227', category: 'Training', employee: 'Khalid Ahmed', amount: 8500, date: '2026-04-30', status: 'pending', description: 'Professional certification course' },
];

const categories = [
  { id: 1, name: 'Travel', budget: 20000, spent: 15500, count: 12 },
  { id: 2, name: 'Office Supplies', budget: 10000, spent: 8200, count: 28 },
  { id: 3, name: 'Marketing', budget: 50000, spent: 46000, count: 8 },
  { id: 4, name: 'Utilities', budget: 15000, spent: 12800, count: 6 },
  { id: 5, name: 'Training', budget: 25000, spent: 18500, count: 15 },
];

export default function ExpenseManagementPage() {
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filteredExpenses = selectedStatus === 'all'
    ? expenses
    : expenses.filter(e => e.status === selectedStatus);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Expense Management</h1>
          <p className="text-gray-600">Track and approve employee expenses</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          Submit Expense
        </button>
      </div>

      {/* Expense Categories */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {categories.map((cat) => {
          const utilization = (cat.spent / cat.budget) * 100;
          return (
            <div key={cat.id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-2">{cat.name}</h3>
              <p className="text-2xl font-bold text-purple-600 mb-1">${cat.spent.toLocaleString()}</p>
              <p className="text-xs text-gray-600 mb-2">of ${cat.budget.toLocaleString()}</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${utilization >= 90 ? 'bg-red-500' : utilization >= 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${utilization}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{cat.count} expenses</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-4 py-2 rounded-lg ${selectedStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatus('pending')}
            className={`px-4 py-2 rounded-lg ${selectedStatus === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-100'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setSelectedStatus('approved')}
            className={`px-4 py-2 rounded-lg ${selectedStatus === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
          >
            Approved
          </button>
          <button
            onClick={() => setSelectedStatus('rejected')}
            className={`px-4 py-2 rounded-lg ${selectedStatus === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expense #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">{expense.number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{expense.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{expense.employee}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{expense.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">${expense.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={expense.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {expense.status === 'pending' && (
                      <div className="flex gap-2">
                        <button className="text-green-600 hover:text-green-800">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button className="text-red-600 hover:text-red-800">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
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

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const icons = {
    pending: <Clock className="w-3 h-3" />,
    approved: <CheckCircle className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {icons[status as keyof typeof icons]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
