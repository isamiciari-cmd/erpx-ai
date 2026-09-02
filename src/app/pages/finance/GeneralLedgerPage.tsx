import { useState } from 'react';
import { Download } from 'lucide-react';

const ledgerData = [
  {
    date: '2026-04-01',
    entryNumber: 'JE-2026-001',
    account: 'Cash - Main',
    accountCode: '1010',
    debit: 50000,
    credit: 0,
    balance: 50000,
    reference: 'Opening Balance',
  },
  {
    date: '2026-04-05',
    entryNumber: 'JE-2026-015',
    account: 'Cash - Main',
    accountCode: '1010',
    debit: 15000,
    credit: 0,
    balance: 65000,
    reference: 'Customer Payment INV-1245',
  },
  {
    date: '2026-04-08',
    entryNumber: 'JE-2026-023',
    account: 'Cash - Main',
    accountCode: '1010',
    debit: 0,
    credit: 8500,
    balance: 56500,
    reference: 'Supplier Payment BILL-890',
  },
  {
    date: '2026-04-12',
    entryNumber: 'JE-2026-031',
    account: 'Cash - Main',
    accountCode: '1010',
    debit: 22000,
    credit: 0,
    balance: 78500,
    reference: 'Sales Revenue',
  },
  {
    date: '2026-04-15',
    entryNumber: 'JE-2026-045',
    account: 'Cash - Main',
    accountCode: '1010',
    debit: 0,
    credit: 12000,
    balance: 66500,
    reference: 'Rent Payment',
  },
  {
    date: '2026-04-20',
    entryNumber: 'JE-2026-052',
    account: 'Cash - Main',
    accountCode: '1010',
    debit: 35000,
    credit: 0,
    balance: 101500,
    reference: 'Customer Payment INV-1289',
  },
  {
    date: '2026-04-25',
    entryNumber: 'JE-2026-067',
    account: 'Cash - Main',
    accountCode: '1010',
    debit: 0,
    credit: 18500,
    balance: 83000,
    reference: 'Utilities & Expenses',
  },
  {
    date: '2026-04-30',
    entryNumber: 'JE-2026-078',
    account: 'Cash - Main',
    accountCode: '1010',
    debit: 0,
    credit: 25000,
    balance: 58000,
    reference: 'Salary Payment',
  },
];

export default function GeneralLedgerPage() {
  const [selectedAccount, setSelectedAccount] = useState('1010');
  const [dateRange, setDateRange] = useState('month');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">General Ledger</h1>
          <p className="text-gray-600">View detailed transaction history by account</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Download className="w-5 h-5" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="1010">1010 - Cash - Main</option>
              <option value="1020">1020 - Bank - Al Rajhi</option>
              <option value="1200">1200 - Accounts Receivable</option>
              <option value="1300">1300 - Inventory</option>
              <option value="2100">2100 - Accounts Payable</option>
              <option value="4000">4000 - Sales Revenue</option>
              <option value="5010">5010 - Salary Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              defaultValue="2026-04-01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              defaultValue="2026-04-30"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Opening Balance</p>
          <p className="text-2xl font-bold text-blue-600">$50,000</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total Debits</p>
          <p className="text-2xl font-bold text-green-600">$122,000</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total Credits</p>
          <p className="text-2xl font-bold text-red-600">$114,000</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Closing Balance</p>
          <p className="text-2xl font-bold text-purple-600">$58,000</p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ledgerData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-blue-600">{row.entryNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.reference}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                    {row.debit > 0 ? `$${row.debit.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                    {row.credit > 0 ? `$${row.credit.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                    ${row.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr className="font-bold">
                <td colSpan={3} className="px-6 py-4 text-sm">
                  Period Totals
                </td>
                <td className="px-6 py-4 text-sm text-right text-green-600">$122,000</td>
                <td className="px-6 py-4 text-sm text-right text-red-600">$114,000</td>
                <td className="px-6 py-4 text-sm text-right text-purple-600">$58,000</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
