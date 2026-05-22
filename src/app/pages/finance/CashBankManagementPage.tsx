import { useState } from 'react';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const cashAccounts = [
  { id: 1, name: 'Main Cash Drawer', branch: 'HQ - Riyadh', balance: 58000, currency: 'SAR' },
  { id: 2, name: 'POS Cash', branch: 'Jeddah', balance: 32000, currency: 'SAR' },
];

const bankAccounts = [
  { id: 1, bankName: 'Al Rajhi Bank', accountNumber: '****5678', iban: 'SA44 8000 0000 0000 1234 5678', balance: 1245000, currency: 'SAR' },
  { id: 2, bankName: 'Saudi National Bank', accountNumber: '****9012', iban: 'SA44 1000 0000 0000 9876 5432', balance: 850000, currency: 'SAR' },
];

const recentTransactions = [
  { id: 1, date: '2026-04-30', type: 'deposit', account: 'Al Rajhi Bank', amount: 45000, reference: 'Customer Payment INV-1245', status: 'completed' },
  { id: 2, date: '2026-04-30', type: 'withdrawal', account: 'Al Rajhi Bank', amount: 12000, reference: 'Rent Payment', status: 'completed' },
  { id: 3, date: '2026-04-29', type: 'transfer', account: 'Transfer: SNB → Al Rajhi', amount: 50000, reference: 'Internal Transfer', status: 'completed' },
  { id: 4, date: '2026-04-28', type: 'deposit', account: 'Main Cash Drawer', amount: 18500, reference: 'Daily POS Collection', status: 'completed' },
  { id: 5, date: '2026-04-28', type: 'withdrawal', account: 'SNB', amount: 8500, reference: 'Supplier Payment BILL-890', status: 'completed' },
];

const cashFlowChart = [
  { date: 'Apr 25', inflow: 65000, outflow: 42000 },
  { date: 'Apr 26', inflow: 72000, outflow: 38000 },
  { date: 'Apr 27', inflow: 58000, outflow: 45000 },
  { date: 'Apr 28', inflow: 83000, outflow: 52000 },
  { date: 'Apr 29', inflow: 91000, outflow: 48000 },
  { date: 'Apr 30', inflow: 78000, outflow: 55000 },
];

export default function CashBankManagementPage() {
  const [selectedTab, setSelectedTab] = useState('overview');

  const totalCash = cashAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalBank = bankAccounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cash & Bank Management</h1>
        <p className="text-gray-600">Manage cash accounts, bank accounts, and reconciliation</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-3 rounded-lg bg-green-100 text-green-600 w-fit mb-3">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Total Cash</h3>
          <p className="text-2xl font-bold">${totalCash.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-3 rounded-lg bg-blue-100 text-blue-600 w-fit mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Total Bank Balance</h3>
          <p className="text-2xl font-bold">${totalBank.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-3 rounded-lg bg-purple-100 text-purple-600 w-fit mb-3">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Total Liquidity</h3>
          <p className="text-2xl font-bold">${(totalCash + totalBank).toLocaleString()}</p>
        </div>
      </div>

      {/* Cash Flow Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">7-Day Cash Flow</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={cashFlowChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} name="Cash Inflow" />
            <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} name="Cash Outflow" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('cash')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'cash' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Cash Accounts
            </button>
            <button
              onClick={() => setSelectedTab('bank')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'bank' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Bank Accounts
            </button>
            <button
              onClick={() => setSelectedTab('transactions')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'transactions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setSelectedTab('reconciliation')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'reconciliation' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Reconciliation
            </button>
          </div>
        </div>

        <div className="p-6">
          {selectedTab === 'cash' && (
            <div className="space-y-4">
              {cashAccounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">{account.name}</h3>
                    <p className="text-sm text-gray-600">{account.branch}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${account.balance.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{account.currency}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTab === 'bank' && (
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{account.bankName}</h3>
                      <p className="text-sm text-gray-600">IBAN: {account.iban}</p>
                      <p className="text-sm text-gray-600">Account: {account.accountNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${account.balance.toLocaleString()}</p>
                      <button className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <RefreshCw className="w-4 h-4" />
                        Reconcile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedTab === 'transactions' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentTransactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{txn.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {txn.type === 'deposit' && <ArrowDownRight className="w-4 h-4 text-green-600" />}
                          {txn.type === 'withdrawal' && <ArrowUpRight className="w-4 h-4 text-red-600" />}
                          {txn.type === 'transfer' && <RefreshCw className="w-4 h-4 text-blue-600" />}
                          <span className="text-sm capitalize">{txn.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{txn.account}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{txn.reference}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">
                        <span className={txn.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                          {txn.type === 'deposit' ? '+' : '-'}${txn.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedTab === 'reconciliation' && (
            <div className="text-center py-12">
              <RefreshCw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Bank Reconciliation</h3>
              <p className="text-gray-600 mb-6">Compare bank statements with your accounting records</p>
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Start Reconciliation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DollarSign({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
