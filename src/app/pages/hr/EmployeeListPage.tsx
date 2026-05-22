import { useState } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, Download } from 'lucide-react';

const employees = [
  { id: 1, code: 'EMP001', name: 'Ahmed Ali Hassan', jobTitle: 'Sales Manager', department: 'Sales', branch: 'HQ - Riyadh', employmentType: 'Full-time', hireDate: '2020-03-15', salary: 18000, status: 'Active' },
  { id: 2, code: 'EMP002', name: 'Sara Mohamed Ibrahim', jobTitle: 'IT Specialist', department: 'IT', branch: 'HQ - Riyadh', employmentType: 'Full-time', hireDate: '2021-06-20', salary: 15000, status: 'Active' },
  { id: 3, code: 'EMP003', name: 'Omar Abdullah', jobTitle: 'Accountant', department: 'Finance', branch: 'Jeddah', employmentType: 'Full-time', hireDate: '2019-11-10', salary: 12000, status: 'Active' },
  { id: 4, code: 'EMP004', name: 'Fatima Hassan', jobTitle: 'HR Officer', department: 'HR', branch: 'HQ - Riyadh', employmentType: 'Full-time', hireDate: '2022-01-08', salary: 11000, status: 'Active' },
  { id: 5, code: 'EMP005', name: 'Khalid Ahmed', jobTitle: 'Marketing Coordinator', department: 'Marketing', branch: 'Dammam', employmentType: 'Part-time', hireDate: '2023-04-12', salary: 8000, status: 'Active' },
  { id: 6, code: 'EMP006', name: 'Layla Mahmoud', jobTitle: 'Operations Manager', department: 'Operations', branch: 'Jeddah', employmentType: 'Full-time', hireDate: '2018-09-25', salary: 16000, status: 'On Leave' },
];

export default function EmployeeListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || emp.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Employee Management</h1>
          <p className="text-gray-600">Manage employee information and records</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-1">Total Employees</h3>
          <p className="text-3xl font-bold text-blue-600">{employees.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-1">Active</h3>
          <p className="text-3xl font-bold text-green-600">
            {employees.filter(e => e.status === 'Active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-1">On Leave</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {employees.filter(e => e.status === 'On Leave').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm text-gray-600 mb-1">Avg Salary</h3>
          <p className="text-3xl font-bold text-purple-600">
            ${Math.round(employees.reduce((sum, e) => sum + e.salary, 0) / employees.length).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, code, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            <option value="Sales">Sales</option>
            <option value="IT">IT</option>
            <option value="Finance">Finance</option>
            <option value="HR">HR</option>
            <option value="Marketing">Marketing</option>
            <option value="Operations">Operations</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hire Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-blue-600">{employee.code}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{employee.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.jobTitle}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                      {employee.department}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.branch}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      employee.employmentType === 'Full-time' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {employee.employmentType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.hireDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={employee.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="w-5 h-5" />
          Export to Excel
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    Active: 'bg-green-100 text-green-800',
    'On Leave': 'bg-yellow-100 text-yellow-800',
    Terminated: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[status as keyof typeof styles]}`}>
      {status}
    </span>
  );
}
