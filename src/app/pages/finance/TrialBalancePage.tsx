import { Download } from 'lucide-react';

const trialBalanceData = [
  {
    accountCode: '1010',
    accountName: 'Cash - Main',
    accountType: 'Asset',
    debit: 58000,
    credit: 0,
  },
  {
    accountCode: '1020',
    accountName: 'Bank - Al Rajhi',
    accountType: 'Asset',
    debit: 245000,
    credit: 0,
  },
  {
    accountCode: '1030',
    accountName: 'Bank - SNB',
    accountType: 'Asset',
    debit: 180000,
    credit: 0,
  },
  {
    accountCode: '1200',
    accountName: 'Accounts Receivable',
    accountType: 'Asset',
    debit: 425000,
    credit: 0,
  },
  { accountCode: '1300', accountName: 'Inventory', accountType: 'Asset', debit: 320000, credit: 0 },
  {
    accountCode: '1400',
    accountName: 'Prepaid Expenses',
    accountType: 'Asset',
    debit: 45000,
    credit: 0,
  },
  {
    accountCode: '1500',
    accountName: 'Fixed Assets',
    accountType: 'Asset',
    debit: 850000,
    credit: 0,
  },
  {
    accountCode: '1510',
    accountName: 'Accumulated Depreciation',
    accountType: 'Asset',
    debit: 0,
    credit: 120000,
  },
  {
    accountCode: '2100',
    accountName: 'Accounts Payable',
    accountType: 'Liability',
    debit: 0,
    credit: 287500,
  },
  {
    accountCode: '2200',
    accountName: 'Employee Payable',
    accountType: 'Liability',
    debit: 0,
    credit: 85000,
  },
  {
    accountCode: '2300',
    accountName: 'VAT Payable',
    accountType: 'Liability',
    debit: 0,
    credit: 42000,
  },
  {
    accountCode: '2400',
    accountName: 'Loan Payable',
    accountType: 'Liability',
    debit: 0,
    credit: 500000,
  },
  {
    accountCode: '3000',
    accountName: 'Share Capital',
    accountType: 'Equity',
    debit: 0,
    credit: 1000000,
  },
  {
    accountCode: '3100',
    accountName: 'Retained Earnings',
    accountType: 'Equity',
    debit: 0,
    credit: 156500,
  },
  {
    accountCode: '4000',
    accountName: 'Sales Revenue',
    accountType: 'Revenue',
    debit: 0,
    credit: 720000,
  },
  {
    accountCode: '4100',
    accountName: 'Service Revenue',
    accountType: 'Revenue',
    debit: 0,
    credit: 180000,
  },
  {
    accountCode: '5010',
    accountName: 'Salary Expense',
    accountType: 'Expense',
    debit: 450000,
    credit: 0,
  },
  {
    accountCode: '5110',
    accountName: 'Rent Expense',
    accountType: 'Expense',
    debit: 72000,
    credit: 0,
  },
  {
    accountCode: '5120',
    accountName: 'Utilities Expense',
    accountType: 'Expense',
    debit: 28000,
    credit: 0,
  },
  {
    accountCode: '5200',
    accountName: 'Marketing Expense',
    accountType: 'Expense',
    debit: 85000,
    credit: 0,
  },
  {
    accountCode: '5300',
    accountName: 'Office Supplies',
    accountType: 'Expense',
    debit: 15000,
    credit: 0,
  },
  {
    accountCode: '5400',
    accountName: 'Depreciation Expense',
    accountType: 'Expense',
    debit: 30000,
    credit: 0,
  },
];

export default function TrialBalancePage() {
  const totalDebit = trialBalanceData.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = trialBalanceData.reduce((sum, row) => sum + row.credit, 0);

  const accountsByType = {
    Asset: trialBalanceData.filter((a) => a.accountType === 'Asset'),
    Liability: trialBalanceData.filter((a) => a.accountType === 'Liability'),
    Equity: trialBalanceData.filter((a) => a.accountType === 'Equity'),
    Revenue: trialBalanceData.filter((a) => a.accountType === 'Revenue'),
    Expense: trialBalanceData.filter((a) => a.accountType === 'Expense'),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trial Balance</h1>
          <p className="text-gray-600">Verify debits and credits are balanced</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Download className="w-5 h-5" />
          Export PDF
        </button>
      </div>

      {/* Period Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option>April 2026</option>
              <option>March 2026</option>
              <option>February 2026</option>
              <option>January 2026</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">As of Date</label>
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

      {/* Balance Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Total Debits</p>
            <p className="text-3xl font-bold text-green-600">${totalDebit.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Total Credits</p>
            <p className="text-3xl font-bold text-red-600">${totalCredit.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Difference</p>
            <p
              className={`text-3xl font-bold ${totalDebit === totalCredit ? 'text-green-600' : 'text-red-600'}`}
            >
              ${Math.abs(totalDebit - totalCredit).toLocaleString()}
            </p>
            {totalDebit === totalCredit && (
              <p className="text-sm text-green-600 mt-2 font-medium">✓ Books are balanced</p>
            )}
          </div>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Trial Balance Report</h2>
          <p className="text-sm text-gray-600 mt-1">As of April 30, 2026</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(accountsByType).map(([type, accounts]) => (
                <>
                  <tr key={`header-${type}`} className="bg-gray-100">
                    <td colSpan={5} className="px-6 py-3 font-semibold text-gray-900">
                      {type}
                    </td>
                  </tr>
                  {accounts.map((account, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {account.accountCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{account.accountName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.accountType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                        {account.debit > 0 ? `$${account.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                        {account.credit > 0 ? `$${account.credit.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="px-6 py-3 text-sm">
                      Subtotal {type}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-green-600">
                      ${accounts.reduce((sum, a) => sum + a.debit, 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-right text-red-600">
                      ${accounts.reduce((sum, a) => sum + a.credit, 0).toLocaleString()}
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
            <tfoot className="bg-gray-900 text-white border-t-2">
              <tr className="font-bold">
                <td colSpan={3} className="px-6 py-4 text-sm">
                  GRAND TOTAL
                </td>
                <td className="px-6 py-4 text-sm text-right">${totalDebit.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-right">${totalCredit.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
