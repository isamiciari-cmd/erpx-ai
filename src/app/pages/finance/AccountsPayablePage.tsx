import { DollarSign, AlertTriangle, Clock, FileText } from 'lucide-react';

const payables = [
  { id: 1, supplier: 'Tech Supplies Ltd.', invoiceNumber: 'BILL-445', amount: 32000, paid: 0, remaining: 32000, dueDate: '2026-05-10', status: 'pending', daysUntilDue: 10 },
  { id: 2, supplier: 'Office Equipment Co.', invoiceNumber: 'BILL-441', amount: 18500, paid: 18500, remaining: 0, dueDate: '2026-04-25', status: 'paid', daysUntilDue: 0 },
  { id: 3, supplier: 'Maintenance Services', invoiceNumber: 'BILL-438', amount: 12000, paid: 0, remaining: 12000, dueDate: '2026-04-30', status: 'due', daysUntilDue: 0 },
  { id: 4, supplier: 'Cloud Services Inc.', invoiceNumber: 'BILL-450', amount: 8500, paid: 0, remaining: 8500, dueDate: '2026-05-15', status: 'pending', daysUntilDue: 15 },
  { id: 5, supplier: 'Marketing Agency', invoiceNumber: 'BILL-430', amount: 45000, paid: 0, remaining: 45000, dueDate: '2026-04-15', status: 'overdue', daysUntilDue: -15 },
];

export default function AccountsPayablePage() {
  const totalPayable = payables.reduce((sum, p) => sum + p.remaining, 0);
  const overdueAmount = payables.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.remaining, 0);
  const dueThisWeek = payables.filter(p => p.daysUntilDue >= 0 && p.daysUntilDue <= 7).reduce((sum, p) => sum + p.remaining, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Accounts Payable</h1>
        <p className="text-gray-600">Manage supplier invoices and payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-3 rounded-lg bg-blue-100 text-blue-600 w-fit mb-3">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Total Payable</h3>
          <p className="text-2xl font-bold">${totalPayable.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-3 rounded-lg bg-red-100 text-red-600 w-fit mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Overdue Payments</h3>
          <p className="text-2xl font-bold text-red-600">${overdueAmount.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-3 rounded-lg bg-orange-100 text-orange-600 w-fit mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Due This Week</h3>
          <p className="text-2xl font-bold text-orange-600">${dueThisWeek.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-3 rounded-lg bg-green-100 text-green-600 w-fit mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Total Invoices</h3>
          <p className="text-2xl font-bold">{payables.length}</p>
        </div>
      </div>

      {/* Payables Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Supplier Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payables.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-blue-600">{item.invoiceNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{item.supplier}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium">${item.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold">${item.remaining.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">{item.dueDate}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4">
                    {item.status !== 'paid' && (
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Make Payment
                      </button>
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
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    due: 'bg-orange-100 text-orange-800',
    overdue: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
