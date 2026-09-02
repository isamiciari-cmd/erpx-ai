import { CheckCircle, Download, FileText } from 'lucide-react';

const payrollRecords = [
  {
    id: 1,
    employee: 'Ahmed Ali',
    code: 'EMP001',
    basicSalary: 18000,
    allowances: 3000,
    overtime: 500,
    deductions: 200,
    netSalary: 21300,
    status: 'Approved',
  },
  {
    id: 2,
    employee: 'Sara Mohamed',
    code: 'EMP002',
    basicSalary: 15000,
    allowances: 2500,
    overtime: 400,
    deductions: 150,
    netSalary: 17750,
    status: 'Approved',
  },
  {
    id: 3,
    employee: 'Omar Abdullah',
    code: 'EMP003',
    basicSalary: 12000,
    allowances: 2000,
    overtime: 300,
    deductions: 500,
    netSalary: 13800,
    status: 'Pending',
  },
  {
    id: 4,
    employee: 'Fatima Hassan',
    code: 'EMP004',
    basicSalary: 11000,
    allowances: 1800,
    overtime: 250,
    deductions: 100,
    netSalary: 12950,
    status: 'Pending',
  },
  {
    id: 5,
    employee: 'Khalid Ahmed',
    code: 'EMP005',
    basicSalary: 8000,
    allowances: 1200,
    overtime: 0,
    deductions: 0,
    netSalary: 9200,
    status: 'Pending',
  },
];

export default function PayrollPage() {
  const totalBasic = payrollRecords.reduce((sum, r) => sum + r.basicSalary, 0);
  const totalAllowances = payrollRecords.reduce((sum, r) => sum + r.allowances, 0);
  const totalOvertime = payrollRecords.reduce((sum, r) => sum + r.overtime, 0);
  const totalDeductions = payrollRecords.reduce((sum, r) => sum + r.deductions, 0);
  const totalNet = payrollRecords.reduce((sum, r) => sum + r.netSalary, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Payroll Management</h1>
          <p className="text-gray-600">Process and manage employee payroll</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <CheckCircle className="w-5 h-5" />
            Approve All
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-5 h-5" />
            Generate Payslips
          </button>
        </div>
      </div>

      {/* Payroll Period */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Payroll Period: April 2026</h2>
            <p className="text-gray-600">Total Employees: {payrollRecords.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Status</p>
            <span className="px-3 py-1 text-sm rounded-full bg-yellow-100 text-yellow-800 font-medium">
              Pending Approval
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Basic Salary</p>
          <p className="text-2xl font-bold text-blue-600">${totalBasic.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Allowances</p>
          <p className="text-2xl font-bold text-green-600">${totalAllowances.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Overtime</p>
          <p className="text-2xl font-bold text-purple-600">${totalOvertime.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Deductions</p>
          <p className="text-2xl font-bold text-red-600">${totalDeductions.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Net Payroll</p>
          <p className="text-2xl font-bold text-indigo-600">${totalNet.toLocaleString()}</p>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Payroll Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Employee
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Basic Salary
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Allowances
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Overtime
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Deductions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Net Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payrollRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{record.employee}</p>
                      <p className="text-sm text-gray-500">{record.code}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">${record.basicSalary.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-green-600">
                    ${record.allowances.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-purple-600">
                    ${record.overtime.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-red-600">
                    ${record.deductions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-blue-600">
                    ${record.netSalary.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <PayrollStatusBadge status={record.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <FileText className="w-4 h-4" title="View Payslip" />
                      </button>
                      {record.status === 'Pending' && (
                        <button className="text-green-600 hover:text-green-800">
                          <CheckCircle className="w-4 h-4" title="Approve" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 font-bold">
              <tr>
                <td className="px-6 py-4">TOTAL</td>
                <td className="px-6 py-4 text-right">${totalBasic.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-green-600">
                  ${totalAllowances.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-purple-600">
                  ${totalOvertime.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-red-600">
                  ${totalDeductions.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right text-blue-600">${totalNet.toLocaleString()}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Button */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Ready to Post Payroll?</h3>
            <p>Review all entries and post to Finance module</p>
          </div>
          <button className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium">
            Post to Finance
          </button>
        </div>
      </div>
    </div>
  );
}

function PayrollStatusBadge({ status }: { status: string }) {
  const styles = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Approved: 'bg-green-100 text-green-800',
    Posted: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={`px-2 py-1 text-xs rounded-full font-medium ${styles[status as keyof typeof styles]}`}
    >
      {status}
    </span>
  );
}
