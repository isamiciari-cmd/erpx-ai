import { FileText, Download, Calendar } from 'lucide-react';

const reports = [
  { id: 1, name: 'Employee Report', description: 'Complete employee list with details', category: 'Employees', icon: '👥' },
  { id: 2, name: 'Attendance Report', description: 'Daily/monthly attendance records', category: 'Attendance', icon: '📅' },
  { id: 3, name: 'Leave Report', description: 'Leave requests and balances', category: 'Leave', icon: '🏖️' },
  { id: 4, name: 'Payroll Report', description: 'Salary breakdown and payments', category: 'Payroll', icon: '💰' },
  { id: 5, name: 'Overtime Report', description: 'Overtime hours and payments', category: 'Overtime', icon: '⏰' },
  { id: 6, name: 'Performance Report', description: 'Performance reviews and ratings', category: 'Performance', icon: '📊' },
  { id: 7, name: 'Recruitment Report', description: 'Hiring pipeline and candidates', category: 'Recruitment', icon: '🎯' },
  { id: 8, name: 'Training Report', description: 'Employee training and certifications', category: 'Training', icon: '📚' },
  { id: 9, name: 'Turnover Report', description: 'Employee turnover analysis', category: 'Analytics', icon: '📉' },
  { id: 10, name: 'Headcount Report', description: 'Employees by department/branch', category: 'Analytics', icon: '👨‍💼' },
  { id: 11, name: 'Contract Expiry Report', description: 'Contracts expiring soon', category: 'Contracts', icon: '📄' },
  { id: 12, name: 'Loan Report', description: 'Employee loans and repayments', category: 'Loans', icon: '💵' },
];

const categories = [...new Set(reports.map(r => r.category))];

export default function HRReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">HR Reports</h1>
        <p className="text-gray-600">Generate comprehensive HR reports and analytics</p>
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
        <h2 className="text-2xl font-bold mb-4">Complete HR Report Package</h2>
        <p className="mb-6">Generate all HR reports for the selected period</p>
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
            Schedule Reports
          </button>
        </div>
      </div>
    </div>
  );
}
