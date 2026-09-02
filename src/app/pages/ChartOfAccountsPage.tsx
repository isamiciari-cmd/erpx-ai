import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';

interface Account {
  id: number;
  name: string;
  type: 'asset' | 'liability' | 'revenue' | 'expense' | 'equity';
  parentId: number | null;
  balance: number;
  children?: Account[];
}

// Mock API
const accountsAPI = {
  accounts: [
    { id: 1, name: 'Assets', type: 'asset' as const, parentId: null, balance: 150000 },
    { id: 2, name: 'Cash', type: 'asset' as const, parentId: 1, balance: 50000 },
    { id: 3, name: 'Bank - AlRajhi', type: 'asset' as const, parentId: 1, balance: 100000 },
    { id: 4, name: 'Liabilities', type: 'liability' as const, parentId: null, balance: 50000 },
    { id: 5, name: 'Loans', type: 'liability' as const, parentId: 4, balance: 50000 },
    { id: 6, name: 'Revenue', type: 'revenue' as const, parentId: null, balance: 200000 },
    { id: 7, name: 'Sales', type: 'revenue' as const, parentId: 6, balance: 200000 },
    { id: 8, name: 'Expenses', type: 'expense' as const, parentId: null, balance: 80000 },
    { id: 9, name: 'Salaries', type: 'expense' as const, parentId: 8, balance: 60000 },
    { id: 10, name: 'Rent', type: 'expense' as const, parentId: 8, balance: 20000 },
  ] as Account[],
  nextId: 11,

  async findAll(): Promise<Account[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...this.accounts]), 300));
  },

  async create(data: Omit<Account, 'id' | 'balance'>): Promise<Account> {
    const account = { ...data, id: this.nextId++, balance: 0 };
    this.accounts.push(account);
    return new Promise((resolve) => setTimeout(() => resolve(account), 300));
  },

  async delete(id: number): Promise<void> {
    this.accounts = this.accounts.filter((a) => a.id !== id);
    return new Promise((resolve) => setTimeout(() => resolve(), 300));
  },
};

const AccountTypeColors = {
  asset: 'from-blue-500 to-cyan-500',
  liability: 'from-red-500 to-rose-500',
  revenue: 'from-green-500 to-emerald-500',
  expense: 'from-orange-500 to-yellow-500',
  equity: 'from-purple-500 to-pink-500',
};

interface AccountTreeProps {
  accounts: Account[];
  parentId: number | null;
  level: number;
  onDelete: (id: number) => void;
}

function AccountTree({ accounts, parentId, level, onDelete }: AccountTreeProps) {
  const [expanded, setExpanded] = useState<{ [key: number]: boolean }>({});

  const filteredAccounts = accounts.filter((a) => a.parentId === parentId);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hasChildren = (id: number) => {
    return accounts.some((a) => a.parentId === id);
  };

  return (
    <>
      {filteredAccounts.map((account) => {
        const isExpanded = expanded[account.id];
        const childAccounts = hasChildren(account.id);

        return (
          <div key={account.id}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center justify-between px-6 py-4 border-b border-white/5 hover:bg-white/5 ${
                level > 0 ? 'ml-' + level * 8 : ''
              }`}
              style={{ paddingLeft: `${24 + level * 32}px` }}
            >
              <div className="flex items-center gap-3 flex-1">
                {childAccounts ? (
                  <button onClick={() => toggleExpand(account.id)} className="text-gray-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <div className="w-4" />
                )}

                <div
                  className={`w-3 h-3 rounded-full bg-gradient-to-r ${
                    AccountTypeColors[account.type]
                  }`}
                />

                <span className="text-white font-medium">{account.name}</span>

                <span
                  className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${
                    AccountTypeColors[account.type]
                  } bg-opacity-10`}
                >
                  {account.type}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-white font-semibold">
                  SAR {account.balance.toLocaleString()}
                </span>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onDelete(account.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>

            {isExpanded && (
              <AccountTree
                accounts={accounts}
                parentId={account.id}
                level={level + 1}
                onDelete={onDelete}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('asset');
  const [parentId, setParentId] = useState<number | null>(null);

  const fetchAccounts = async () => {
    const data = await accountsAPI.findAll();
    setAccounts(data);
  };

  const createAccount = async () => {
    if (!name) return;

    await accountsAPI.create({ name, type, parentId });
    setName('');
    setType('asset');
    setParentId(null);
    setShowForm(false);
    fetchAccounts();
  };

  const deleteAccount = async (id: number) => {
    await accountsAPI.delete(id);
    fetchAccounts();
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-white"
        >
          Chart of Accounts
        </motion.h1>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Account
        </motion.button>
      </div>

      {/* Create Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-6">Create New Account</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Account Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Petty Cash"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Account Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Account['type'])}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
                <option value="equity">Equity</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Parent Account</label>
              <select
                value={parentId || ''}
                onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None (Root)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createAccount}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium"
            >
              Create Account
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl"
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Accounts Tree */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Account Hierarchy</h2>
        </div>

        <AccountTree accounts={accounts} parentId={null} level={0} onDelete={deleteAccount} />
      </motion.div>
    </div>
  );
}
