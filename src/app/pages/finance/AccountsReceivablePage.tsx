import { useState } from 'react';
import { DollarSign, AlertTriangle, Clock, CheckCircle, FileText, Download } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const receivables = [
  { id: 1, customer: 'Al-Noor Trading Co.', invoiceNumber: 'INV-1245', amount: 45000, paid: 0, remaining: 45000, dueDate: '2026-05-15', status: 'outstanding', daysOverdue: 0 },
  { id: 2, customer: 'Tech Solutions Ltd.', invoiceNumber: 'INV-1238', amount: 28000, paid: 28000, remaining: 0, dueDate: '2026-04-20', status: 'paid', daysOverdue: 0 },
  { id: 3, customer: 'Modern Electronics', invoiceNumber: 'INV-1232', amount: 65000, paid: 30000, remaining: 35000, dueDate: '2026-03-15', status: 'overdue', daysOverdue: 45 },
  { id: 4, customer: 'Global Imports Inc.', invoiceNumber: 'INV-1250', amount: 82000, paid: 0, remaining: 82000, dueDate: '2026-05-20', status: 'outstanding', daysOverdue: 0 },
  { id: 5, customer: 'City Mall Retail', invoiceNumber: 'INV-1215', amount: 15000, paid: 0, remaining: 15000, dueDate: '2026-03-01', status: 'overdue', daysOverdue: 60 },
  { id: 6, customer: 'Prime Contractors', invoiceNumber: 'INV-1247', amount: 120000, paid: 50000, remaining: 70000, dueDate: '2026-04-10', status: 'overdue', daysOverdue: 20 },
];

const agingData = [
  { range: 'Current', amount: 127000, count: 2, color: '#10b981' },
  { range: '1-30 days', amount: 85000, count: 3, color: '#f59e0b' },
  { range: '31-60 days', amount: 70000, count: 2, color: '#ef4444' },
  { range: '60+ days', amount: 15000, count: 1, color: '#991b1b' },
];

const customerBalances = [
  { customer: 'Prime Contractors', balance: 70000 },
  { customer: 'Modern Electronics', balance: 35000 },
  { customer: 'Global Imports Inc.', balance: 82000 },
  { customer: 'Al-Noor Trading Co.', balance: 45000 },
  { customer: 'City Mall Retail', balance: 15000 },
];

export default function AccountsReceivablePage() {
  const [selectedTab, setSelectedTab] = useState('invoices');

  const totalReceivable = receivables.reduce((sum, r) => sum + r.remaining, 0);
  const overdueAmount = receivables.filter(r => r.status === 'overdue').reduce((sum, r) => sum + r.remaining, 0);
  const outstandingCount = receivables.filter(r => r.status === 'outstanding').length;
  const overdueCount = receivables.filter(r => r.status === 'overdue').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Accounts Receivable</h1>
          <p className="text-gray-600">Track customer invoices and payments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Download className="w-5 h-5" />
          Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Total Receivable</h3>
          <p className="text-2xl font-bold">${totalReceivable.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 rounded-lg bg-red-100 text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Overdue Amount</h3>
          <p className="text-2xl font-bold text-red-600">${overdueAmount.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Outstanding Invoices</h3>
          <p className="text-2xl font-bold">{outstandingCount}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 rounded-lg bg-orange-100 text-orange-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Overdue Invoices</h3>
          <p className="text-2xl font-bold text-orange-600">{overdueCount}</p>
        </div>
      </div>

      {/* Aging Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Aging Analysis</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="40%" height={200}>
              <PieChart>
                <Pie
                  data={agingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="amount"
                >
                  {agingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {agingData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium">{item.range}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${item.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{item.count} invoices</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Customer Balances</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={customerBalances} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="customer" type="category" width={120} fontSize={12} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Bar dataKey="balance" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setSelectedTab('invoices')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'invoices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setSelectedTab('aging')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'aging' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Aging Report
            </button>
            <button
              onClick={() => setSelectedTab('customers')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'customers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Customer Balances
            </button>
          </div>
        </div>

        <div className="p-6">
          {selectedTab === 'invoices' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {receivables.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-blue-600">{item.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{item.customer}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">${item.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">${item.paid.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">${item.remaining.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{item.dueDate}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} daysOverdue={item.daysOverdue} />
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedTab === 'aging' && (
            <div className="space-y-4">
              {agingData.map((bucket, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-lg">{bucket.range}</h3>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${bucket.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{bucket.count} invoices</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        backgroundColor: bucket.color,
                        width: `${(bucket.amount / totalReceivable) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTab === 'customers' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customerBalances.map((customer, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{customer.customer}</td>
                      <td className="px-4 py-3 text-right text-lg font-bold">${customer.balance.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                          View Statement
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, daysOverdue }: { status: string; daysOverdue: number }) {
  const styles = {
    paid: 'bg-green-100 text-green-800',
    outstanding: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
  };

  const icons = {
    paid: <CheckCircle className="w-3 h-3" />,
    outstanding: <Clock className="w-3 h-3" />,
    overdue: <AlertTriangle className="w-3 h-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {icons[status as keyof typeof icons]}
      {status === 'overdue' ? `${daysOverdue} days overdue` : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
