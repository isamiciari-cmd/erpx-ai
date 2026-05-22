import { FileText, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const taxCodes = [
  { id: 1, code: 'VAT-15', name: 'Standard VAT 15%', rate: 15, type: 'Output', status: 'Active' },
  { id: 2, code: 'VAT-0', name: 'Zero Rated', rate: 0, type: 'Output', status: 'Active' },
  { id: 3, code: 'EX', name: 'Exempt', rate: 0, type: 'Exempt', status: 'Active' },
  { id: 4, code: 'IN-15', name: 'Input VAT 15%', rate: 15, type: 'Input', status: 'Active' },
];

const vatTransactions = [
  { month: 'Jan', outputVAT: 42000, inputVAT: 28000, netVAT: 14000 },
  { month: 'Feb', outputVAT: 48000, inputVAT: 32000, netVAT: 16000 },
  { month: 'Mar', outputVAT: 45000, inputVAT: 30000, netVAT: 15000 },
  { month: 'Apr', outputVAT: 52000, inputVAT: 35000, netVAT: 17000 },
];

const currentPeriod = {
  outputVAT: 52000,
  inputVAT: 35000,
  netVAT: 17000,
  taxableSales: 346667,
  taxablePurchases: 233333,
  exemptTransactions: 12000,
};

export default function VATTaxPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">VAT & Tax Management</h1>
          <p className="text-gray-600">Track VAT transactions and generate tax returns</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Download className="w-5 h-5" />
          Generate VAT Return
        </button>
      </div>

      {/* Current Period Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Current Period (April 2026)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-r pr-6">
            <p className="text-sm text-gray-600 mb-1">Output VAT (Sales)</p>
            <p className="text-3xl font-bold text-green-600 mb-2">${currentPeriod.outputVAT.toLocaleString()}</p>
            <p className="text-sm text-gray-500">From ${currentPeriod.taxableSales.toLocaleString()} taxable sales</p>
          </div>
          <div className="border-r pr-6">
            <p className="text-sm text-gray-600 mb-1">Input VAT (Purchases)</p>
            <p className="text-3xl font-bold text-red-600 mb-2">${currentPeriod.inputVAT.toLocaleString()}</p>
            <p className="text-sm text-gray-500">From ${currentPeriod.taxablePurchases.toLocaleString()} taxable purchases</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Net VAT Payable</p>
            <p className="text-3xl font-bold text-purple-600 mb-2">${currentPeriod.netVAT.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Due: May 31, 2026</p>
          </div>
        </div>
      </div>

      {/* VAT Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">VAT Trend (Last 4 Months)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={vatTransactions}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="outputVAT" fill="#10b981" name="Output VAT" />
            <Bar dataKey="inputVAT" fill="#ef4444" name="Input VAT" />
            <Bar dataKey="netVAT" fill="#8b5cf6" name="Net VAT" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Codes */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Tax Codes</h2>
          </div>
          <div className="p-6">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {taxCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{code.code}</td>
                    <td className="px-4 py-3 text-sm">{code.name}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold">{code.rate}%</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        code.type === 'Output' ? 'bg-green-100 text-green-800' :
                        code.type === 'Input' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {code.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ZATCA Compliance */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">ZATCA E-Invoice Compliance</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center">
                  ✓
                </div>
                <div>
                  <p className="font-semibold">E-Invoice Integration</p>
                  <p className="text-sm text-gray-600">Connected to ZATCA Platform</p>
                </div>
              </div>
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-600 text-white">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center">
                  ✓
                </div>
                <div>
                  <p className="font-semibold">QR Code Generation</p>
                  <p className="text-sm text-gray-600">Automatic on all invoices</p>
                </div>
              </div>
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-600 text-white">
                Enabled
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Last Submitted</p>
                  <p className="text-sm text-gray-600">March 2026 VAT Return</p>
                </div>
              </div>
              <span className="text-sm text-gray-600">Mar 28, 2026</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">This Month</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Invoices Issued</p>
                  <p className="text-xl font-bold">248</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ZATCA Submitted</p>
                  <p className="text-xl font-bold text-green-600">248</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
