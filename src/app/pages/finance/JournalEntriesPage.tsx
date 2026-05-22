import { useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Clock, FileText, Search, Filter } from 'lucide-react';

const journalEntries = [
  {
    id: 1,
    entryNumber: 'JE-2026-001',
    date: '2026-04-28',
    reference: 'INV-1245',
    source: 'Sales',
    description: 'Customer payment received',
    totalDebit: 15000,
    totalCredit: 15000,
    status: 'posted',
    createdBy: 'Ahmed Ali',
    lines: [
      { account: 'Cash - Main', accountCode: '1010', debit: 15000, credit: 0 },
      { account: 'Accounts Receivable', accountCode: '1200', debit: 0, credit: 15000 },
    ]
  },
  {
    id: 2,
    entryNumber: 'JE-2026-002',
    date: '2026-04-29',
    reference: 'BILL-890',
    source: 'Purchases',
    description: 'Supplier invoice',
    totalDebit: 8500,
    totalCredit: 8500,
    status: 'pending',
    createdBy: 'Sara Mohamed',
    lines: [
      { account: 'Inventory', accountCode: '1300', debit: 8500, credit: 0 },
      { account: 'Accounts Payable', accountCode: '2100', debit: 0, credit: 8500 },
    ]
  },
  {
    id: 3,
    entryNumber: 'JE-2026-003',
    date: '2026-04-30',
    reference: 'PAY-445',
    source: 'Payroll',
    description: 'Monthly salary expense',
    totalDebit: 85000,
    totalCredit: 85000,
    status: 'approved',
    createdBy: 'Fatima Hassan',
    lines: [
      { account: 'Salary Expense', accountCode: '5010', debit: 85000, credit: 0 },
      { account: 'Employee Payable', accountCode: '2200', debit: 0, credit: 85000 },
    ]
  },
  {
    id: 4,
    entryNumber: 'JE-2026-004',
    date: '2026-04-30',
    reference: 'EXP-223',
    source: 'Expense',
    description: 'Rent payment for April',
    totalDebit: 12000,
    totalCredit: 12000,
    status: 'posted',
    createdBy: 'Omar Ibrahim',
    lines: [
      { account: 'Rent Expense', accountCode: '5110', debit: 12000, credit: 0 },
      { account: 'Bank - Al Rajhi', accountCode: '1020', debit: 0, credit: 12000 },
    ]
  },
];

export default function JournalEntriesPage() {
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredEntries = journalEntries.filter(entry => {
    const matchesSearch = entry.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Journal Entries</h1>
          <p className="text-gray-600">Manage general ledger journal entries and transactions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Entry
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by entry number or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="posted">Posted</option>
          </select>
          <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-5 h-5" />
            More Filters
          </button>
        </div>
      </div>

      {/* Journal Entries Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedEntry(entry)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-blue-600">{entry.entryNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.reference}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">{entry.source}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">${entry.totalDebit.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">${entry.totalCredit.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={entry.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800">
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

      {/* Entry Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedEntry(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedEntry.entryNumber}</h2>
                  <p className="text-gray-600">{selectedEntry.description}</p>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Entry Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{selectedEntry.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reference</p>
                  <p className="font-medium">{selectedEntry.reference}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Source Module</p>
                  <p className="font-medium">{selectedEntry.source}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <StatusBadge status={selectedEntry.status} />
                </div>
              </div>

              {/* Journal Lines */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Journal Lines</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Account Code</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Account Name</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Debit</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedEntry.lines.map((line: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{line.accountCode}</td>
                          <td className="px-4 py-3 text-sm font-medium">{line.account}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            {line.debit > 0 ? `$${line.debit.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {line.credit > 0 ? `$${line.credit.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={2} className="px-4 py-3 text-sm">Total</td>
                        <td className="px-4 py-3 text-sm text-right">${selectedEntry.totalDebit.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right">${selectedEntry.totalCredit.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {selectedEntry.status === 'pending' && (
                  <>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <CheckCircle className="w-5 h-5" />
                      Approve & Post
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                      <XCircle className="w-5 h-5" />
                      Reject
                    </button>
                  </>
                )}
                {selectedEntry.status === 'posted' && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                    Reverse Entry
                  </button>
                )}
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Edit className="w-5 h-5" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Entry Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">Create Journal Entry</h2>
            </div>
            <div className="p-6">
              <JournalEntryForm onClose={() => setShowCreateModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    posted: 'bg-green-100 text-green-800',
  };

  const icons = {
    pending: <Clock className="w-3 h-3" />,
    approved: <CheckCircle className="w-3 h-3" />,
    posted: <CheckCircle className="w-3 h-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {icons[status as keyof typeof icons]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function JournalEntryForm({ onClose }: { onClose: () => void }) {
  const [lines, setLines] = useState([
    { accountCode: '', accountName: '', debit: 0, credit: 0, costCenter: '', description: '' },
    { accountCode: '', accountName: '', debit: 0, credit: 0, costCenter: '', description: '' },
  ]);

  const addLine = () => {
    setLines([...lines, { accountCode: '', accountName: '', debit: 0, credit: 0, costCenter: '', description: '' }]);
  };

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Posting Date</label>
          <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
          <input type="text" placeholder="REF-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Module</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option>Manual Entry</option>
            <option>Sales</option>
            <option>Purchases</option>
            <option>Payroll</option>
            <option>Expense</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Entry description..." />
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Journal Lines</h3>
          <button onClick={addLine} className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
            <Plus className="w-4 h-4" />
            Add Line
          </button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Account</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Description</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Credit</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">
                      <input type="text" placeholder="Search account..." className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" placeholder="Line description" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" placeholder="0.00" className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" placeholder="0.00" className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                    </td>
                    <td className="px-3 py-2">
                      <button className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={2} className="px-3 py-2 text-sm">Total</td>
                  <td className="px-3 py-2 text-sm text-right">${totalDebit.toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm text-right">${totalCredit.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {!isBalanced && totalDebit > 0 && (
          <p className="text-red-600 text-sm mt-2">Entry is not balanced. Debit and Credit must be equal.</p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          disabled={!isBalanced}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create & Post
        </button>
        <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          Save as Draft
        </button>
        <button onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  );
}
