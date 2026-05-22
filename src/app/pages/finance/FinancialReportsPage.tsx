import { FileText, Download, Calendar } from 'lucide-react';

const reports = [
  { id: 1, name: 'Profit & Loss Statement', description: 'Income statement showing revenue and expenses', category: 'Financial Statements', icon: '📊' },
  { id: 2, name: 'Balance Sheet', description: 'Assets, liabilities, and equity snapshot', category: 'Financial Statements', icon: '⚖️' },
  { id: 3, name: 'Cash Flow Statement', description: 'Operating, investing, and financing activities', category: 'Financial Statements', icon: '💰' },
  { id: 4, name: 'Trial Balance', description: 'Verify debit and credit balances', category: 'General Ledger', icon: '🔍' },
  { id: 5, name: 'General Ledger Report', description: 'Detailed transaction history by account', category: 'General Ledger', icon: '📖' },
  { id: 6, name: 'Account Statement', description: 'Transaction history for specific account', category: 'General Ledger', icon: '📄' },
  { id: 7, name: 'Aged Receivables', description: 'Customer outstanding invoices by aging period', category: 'AR/AP', icon: '👥' },
  { id: 8, name: 'Aged Payables', description: 'Supplier outstanding bills by aging period', category: 'AR/AP', icon: '🏢' },
  { id: 9, name: 'Budget Variance Analysis', description: 'Compare budget vs actual spending', category: 'Budget', icon: '📈' },
  { id: 10, name: 'Branch Profitability', description: 'P&L by branch location', category: 'Multi-Branch', icon: '🏪' },
  { id: 11, name: 'Department P&L', description: 'Profit and loss by department', category: 'Cost Centers', icon: '🎯' },
  { id: 12, name: 'VAT Return Summary', description: 'Input and output VAT summary', category: 'Tax', icon: '🧾' },
  { id: 13, name: 'Fixed Assets Register', description: 'Asset list with depreciation', category: 'Assets', icon: '🏗️' },
  { id: 14, name: 'Expense Analysis', description: 'Expense breakdown by category', category: 'Expenses', icon: '💳' },
  { id: 15, name: 'Revenue Analysis', description: 'Revenue by product/service/module', category: 'Revenue', icon: '💵' },
];

const categories = [...new Set(reports.map(r => r.category))];

export default function FinancialReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Financial Reports</h1>
        <p className="text-gray-600">Generate comprehensive financial reports and statements</p>
      </div>

      {/* Report Parameters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Report Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option>This Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
              <option>Custom Range</option>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option>All Branches</option>
              <option>HQ - Riyadh</option>
              <option>Jeddah Branch</option>
              <option>Dammam Branch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports by Category */}
      {categories.map((category) => (
        <div key={category} className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">{category}</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports
                .filter(r => r.category === category)
                .map((report) => (
                  <div
                    key={report.id}
                    className="border rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-3xl">{report.icon}</div>
                      <button className="text-blue-600 hover:text-blue-800">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                    <h3 className="font-semibold mb-1">{report.name}</h3>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ))}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Financial Statement Package</h2>
        <p className="mb-6">Generate a complete set of financial statements for the period</p>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium">
            <FileText className="w-5 h-5" />
            Full Package (PDF)
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium">
            <Download className="w-5 h-5" />
            Excel Export
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium">
            <Calendar className="w-5 h-5" />
            Schedule Report
          </button>
        </div>
      </div>
    </div>
  );
}
