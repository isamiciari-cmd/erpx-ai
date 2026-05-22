import { useState } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const attendanceRecords = [
  { id: 1, employee: 'Ahmed Ali', code: 'EMP001', date: '2026-04-30', checkIn: '08:55', checkOut: '17:10', late: 0, earlyLeave: 0, status: 'Present' },
  { id: 2, employee: 'Sara Mohamed', code: 'EMP002', date: '2026-04-30', checkIn: '09:15', checkOut: '17:05', late: 15, earlyLeave: 0, status: 'Late' },
  { id: 3, employee: 'Omar Abdullah', code: 'EMP003', date: '2026-04-30', checkIn: '-', checkOut: '-', late: 0, earlyLeave: 0, status: 'Absent' },
  { id: 4, employee: 'Fatima Hassan', code: 'EMP004', date: '2026-04-30', checkIn: '08:50', checkOut: '17:00', late: 0, earlyLeave: 0, status: 'Present' },
  { id: 5, employee: 'Khalid Ahmed', code: 'EMP005', date: '2026-04-30', checkIn: '09:05', checkOut: '16:45', late: 5, earlyLeave: 15, status: 'Early Leave' },
  { id: 6, employee: 'Layla Mahmoud', code: 'EMP006', date: '2026-04-30', checkIn: '-', checkOut: '-', late: 0, earlyLeave: 0, status: 'On Leave' },
];

const weeklyStats = [
  { day: 'Mon', present: 128, late: 12, absent: 7 },
  { day: 'Tue', present: 132, late: 8, absent: 3 },
  { day: 'Wed', present: 130, late: 10, absent: 5 },
  { day: 'Thu', present: 135, late: 5, absent: 0 },
  { day: 'Fri', present: 120, late: 3, absent: 15 },
];

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState('2026-04-30');

  const presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'Late').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;
  const onLeaveCount = attendanceRecords.filter(r => r.status === 'On Leave').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Attendance Management</h1>
          <p className="text-gray-600">Track employee attendance and working hours</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <CheckCircle className="w-5 h-5" />
            Bulk Check-In
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-5 h-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <label className="font-medium">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            View Attendance
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-3xl font-bold text-green-600">{presentCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-600">Late Arrivals</p>
              <p className="text-3xl font-bold text-yellow-600">{lateCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-3xl font-bold text-red-600">{absentCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">On Leave</p>
              <p className="text-3xl font-bold text-blue-600">{onLeaveCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Weekly Attendance Statistics</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="present" fill="#10b981" name="Present" />
            <Bar dataKey="late" fill="#f59e0b" name="Late" />
            <Bar dataKey="absent" fill="#ef4444" name="Absent" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Daily Attendance - {selectedDate}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Late (mins)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Early Leave (mins)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {attendanceRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{record.employee}</td>
                  <td className="px-6 py-4 text-sm text-blue-600">{record.code}</td>
                  <td className="px-6 py-4 text-sm">{record.checkIn}</td>
                  <td className="px-6 py-4 text-sm">{record.checkOut}</td>
                  <td className="px-6 py-4 text-sm">
                    {record.late > 0 ? (
                      <span className="text-yellow-600 font-medium">{record.late}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {record.earlyLeave > 0 ? (
                      <span className="text-orange-600 font-medium">{record.earlyLeave}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <AttendanceStatusBadge status={record.status} />
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Edit
                    </button>
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

function AttendanceStatusBadge({ status }: { status: string }) {
  const styles = {
    Present: 'bg-green-100 text-green-800',
    Late: 'bg-yellow-100 text-yellow-800',
    Absent: 'bg-red-100 text-red-800',
    'On Leave': 'bg-blue-100 text-blue-800',
    'Early Leave': 'bg-orange-100 text-orange-800',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[status as keyof typeof styles]}`}>
      {status}
    </span>
  );
}
