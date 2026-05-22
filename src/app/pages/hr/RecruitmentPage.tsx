import { useState } from 'react';
import { Plus, UserPlus, Calendar, FileText } from 'lucide-react';

const candidates = [
  { id: 1, name: 'Nora Ahmed', position: 'Senior Developer', email: 'nora@email.com', phone: '+966501234567', appliedDate: '2026-04-15', status: 'Interview Scheduled', stage: 'Technical Interview' },
  { id: 2, name: 'Youssef Hassan', position: 'Marketing Manager', email: 'youssef@email.com', phone: '+966507654321', appliedDate: '2026-04-18', status: 'Under Review', stage: 'CV Screening' },
  { id: 3, name: 'Maha Ibrahim', position: 'Accountant', email: 'maha@email.com', phone: '+966509876543', appliedDate: '2026-04-20', status: 'Offer Sent', stage: 'Offer' },
  { id: 4, name: 'Tariq Ali', position: 'Sales Executive', email: 'tariq@email.com', phone: '+966503456789', appliedDate: '2026-04-22', status: 'Interview Scheduled', stage: 'HR Interview' },
  { id: 5, name: 'Rana Mohamed', position: 'UX Designer', email: 'rana@email.com', phone: '+966508765432', appliedDate: '2026-04-25', status: 'Rejected', stage: 'Rejected' },
];

const jobPostings = [
  { id: 1, title: 'Senior Developer', department: 'IT', location: 'Riyadh', type: 'Full-time', applications: 24, status: 'Active' },
  { id: 2, title: 'Marketing Manager', department: 'Marketing', location: 'Jeddah', type: 'Full-time', applications: 18, status: 'Active' },
  { id: 3, title: 'Sales Executive', department: 'Sales', location: 'Dammam', type: 'Full-time', applications: 32, status: 'Active' },
];

const hiringPipeline = [
  { stage: 'CV Screening', count: 45 },
  { stage: 'HR Interview', count: 18 },
  { stage: 'Technical Interview', count: 12 },
  { stage: 'Manager Interview', count: 8 },
  { stage: 'Offer', count: 3 },
  { stage: 'Hired', count: 2 },
];

export default function RecruitmentPage() {
  const [selectedTab, setSelectedTab] = useState('candidates');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Recruitment Management (ATS)</h1>
          <p className="text-gray-600">Manage job postings, candidates, and hiring process</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-5 h-5" />
            Post New Job
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <UserPlus className="w-5 h-5" />
            Add Candidate
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total Applications</p>
          <p className="text-3xl font-bold text-blue-600">74</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Interviews Scheduled</p>
          <p className="text-3xl font-bold text-purple-600">20</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Offers Sent</p>
          <p className="text-3xl font-bold text-green-600">3</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Hired (This Month)</p>
          <p className="text-3xl font-bold text-indigo-600">2</p>
        </div>
      </div>

      {/* Hiring Pipeline */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Hiring Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {hiringPipeline.map((stage, index) => (
            <div key={index} className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-2">
                <p className="text-3xl font-bold">{stage.count}</p>
              </div>
              <p className="text-sm font-medium text-gray-700">{stage.stage}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setSelectedTab('candidates')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'candidates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Candidates
            </button>
            <button
              onClick={() => setSelectedTab('jobs')}
              className={`py-4 px-2 border-b-2 font-medium ${
                selectedTab === 'jobs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              Job Postings
            </button>
          </div>
        </div>

        <div className="p-6">
          {selectedTab === 'candidates' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position Applied</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{candidate.name}</td>
                      <td className="px-4 py-3 text-sm">{candidate.position}</td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p>{candidate.email}</p>
                          <p className="text-gray-500">{candidate.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{candidate.appliedDate}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          {candidate.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <CandidateStatusBadge status={candidate.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            View CV
                          </button>
                          <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                            Schedule
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedTab === 'jobs' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applications</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jobPostings.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{job.title}</td>
                      <td className="px-4 py-3 text-sm">{job.department}</td>
                      <td className="px-4 py-3 text-sm">{job.location}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {job.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-purple-600">{job.applications}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidateStatusBadge({ status }: { status: string }) {
  const styles = {
    'Under Review': 'bg-yellow-100 text-yellow-800',
    'Interview Scheduled': 'bg-blue-100 text-blue-800',
    'Offer Sent': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[status as keyof typeof styles]}`}>
      {status}
    </span>
  );
}
