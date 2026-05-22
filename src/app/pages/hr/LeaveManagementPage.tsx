import { useState } from 'react';
import { Plus, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

const leaveRequests = [
  { id: 1, employee: 'Ahmed Ali', code: 'EMP001', leaveType: 'Annual', startDate: '2026-05-10', endDate: '2026-05-14', days: 5, reason: 'Family vacation', status: 'Pending' },
  { id: 2, employee: 'Sara Mohamed', code: 'EMP002', leaveType: 'Sick', startDate: '2026-04-28', endDate: '2026-04-29', days: 2, reason: 'Medical appointment', status: 'Approved' },
  { id: 3, employee: 'Omar Abdullah', code: 'EMP003', leaveType: 'Annual', startDate: '2026-06-01', endDate: '2026-06-10', days: 10, reason: 'Umrah trip', status: 'Pending' },
  { id: 4, employee: 'Fatima Hassan', code: 'EMP004', leaveType: 'Emergency', startDate: '2026-04-25', endDate: '2026-04-25', days: 1, reason: 'Family emergency', status: 'Approved' },
  { id: 5, employee: 'Khalid Ahmed', code: 'EMP005', leaveType: 'Unpaid', startDate: '2026-05-20', endDate: '2026-05-22', days: 3, reason: 'Personal matters', status: 'Rejected' },
];

const leaveBalances = [
  { employee: 'Ahmed Ali', code: 'EMP001', annual: 15, sick: 10, emergency: 3, used: 8, remaining: 20 },
  { employee: 'Sara Mohamed', code: 'EMP002', annual: 18, sick: 8, emergency: 3, used: 5, remaining: 24 },
  { employee: 'Omar Abdullah', code: 'EMP003', annual: 21, sick: 10, emergency: 3, used: 12, remaining: 22 },
];

const leaveTypes = [
  { id: 1, name: 'Annual Leave', maxDays: 21, carryForward: true, paid: true, color: 'blue' },
  { id: 2, name: 'Sick Leave', maxDays: 10, carryForward: false, paid: true, color: 'red' },
  { id: 3, name: 'Emergency Leave', maxDays: 3, carryForward: false, paid: true, color: 'orange' },
  { id: 4, name: 'Unpaid Leave', maxDays: 0, carryForward: false, paid: false, color: 'gray' },
];

export default function LeaveManagementPage() {
  const [selectedTab, setSelectedTab] = useState('requests');

  const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;
  const approvedCount = leaveRequests.filter(r => r.status === 'Approved').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Leave Management</h1>
          <p className="text-gray-600">Manage employee leave requests and balances</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          Request Leave
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">Pending Requests</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Approved (This Month)</p>
              <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">On Leave Today</p>
              <p className="text-3xl font-bold text-blue-600">7</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Avg Leave Balance</p>
              <p className="text-3xl font-bold text-purple-600">18 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Types */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Leave Types Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {leaveTypes.map((type) => (
            <div key={type.id} className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">{type.name}</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600">Max: {type.maxDays > 0 ? `${type.maxDays} days` : 'Unlimited'}</p>
                <p className="text-gray-600">Carry Forward: {type.carryForward ? 'Yes' : 'No'}</p>
                <p className="text-gray-600">Paid: {type.paid ? 'Yes' : 'No'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setSelectedTab('requests')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Leave Requests
            </button>
            <button
              onClick={() => setSelectedTab('balances')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'balances' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Leave Balances
            </button>
            <button
              onClick={() => setSelectedTab('calendar')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'calendar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Leave Calendar
            </button>
          </div>
        </div>

        <div className="p-6">
          {selectedTab === 'requests' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leaveRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{request.employee}</p>
                          <p className="text-sm text-gray-500">{request.code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {request.leaveType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{request.startDate}</td>
                      <td className="px-4 py-3 text-sm">{request.endDate}</td>
                      <td className="px-4 py-3 text-sm font-medium">{request.days}</td>
                      <td className="px-4 py-3 text-sm">{request.reason}</td>
                      <td className="px-4 py-3">
                        <LeaveStatusBadge status={request.status} />
                      </td>
                      <td className="px-4 py-3">
                        {request.status === 'Pending' && (
                          <div className="flex gap-2">
                            <button className="text-green-600 hover:text-green-800">
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button className="text-red-600 hover:text-red-800">
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedTab === 'balances' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Annual</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sick</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Emergency</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Used</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leaveBalances.map((balance, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{balance.employee}</p>
                          <p className="text-sm text-gray-500">{balance.code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{balance.annual}</td>
                      <td className="px-4 py-3 text-right">{balance.sick}</td>
                      <td className="px-4 py-3 text-right">{balance.emergency}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">{balance.used}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-bold">{balance.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedTab === 'calendar' && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Leave Calendar</h3>
              <p className="text-gray-600">Visual calendar showing all employee leaves</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaveStatusBadge({ status }: { status: string }) {
  const styles = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Approved: 'bg-green-100 text-green-800',
    Rejected: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[status as keyof typeof styles]}`}>
      {status}
    </span>
  );
}
