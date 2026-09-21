import { useMemo, useState } from 'react';
import {
  BarChart3,
  FileText,
  Package,
  ShoppingBag,
  ShoppingCart,
  Users,
} from 'lucide-react';
import {
  ActionButton,
  PageHeader,
  Panel,
  ReportActions,
} from '../components/erp/ModulePrimitives';

type ReportDefinition = {
  name: string;
  module: string;
  icon: typeof ShoppingCart;
  description: string;
  rows: Record<string, unknown>[];
};

const reports: ReportDefinition[] = [
  {
    name: 'Sales Register',
    module: 'Sales',
    icon: ShoppingCart,
    description: 'Orders, customers, revenue and settlement status.',
    rows: [
      {
        'Order #': 'SO-10021',
        Customer: 'Ahmed Trading Co.',
        Amount: 'SAR 4,500',
        Status: 'Paid',
      },
      {
        'Order #': 'SO-10020',
        Customer: 'Al-Noor Electronics',
        Amount: 'SAR 3,200',
        Status: 'Pending',
      },
    ],
  },
  {
    name: 'Inventory Valuation',
    module: 'Inventory',
    icon: Package,
    description: 'SKU balances, minimum levels and stock value.',
    rows: [
      {
        SKU: 'SKU-1001',
        Product: 'Wireless Headphones',
        Qty: 45,
        Value: 'SAR 5,400',
      },
      {
        SKU: 'SKU-1002',
        Product: 'USB-C Cable',
        Qty: 12,
        Value: 'SAR 216',
      },
    ],
  },
  {
    name: 'Purchase Register',
    module: 'Purchases',
    icon: ShoppingBag,
    description: 'Purchase orders, suppliers and expected receipts.',
    rows: [
      {
        'PO #': 'PO-20031',
        Supplier: 'Al-Jawad Trading',
        Amount: 'SAR 12,500',
        Status: 'Received',
      },
      {
        'PO #': 'PO-20030',
        Supplier: 'Modern Supply Co.',
        Amount: 'SAR 8,900',
        Status: 'In Transit',
      },
    ],
  },
  {
    name: 'Finance Activity',
    module: 'Finance',
    icon: BarChart3,
    description: 'Ledger activity and transaction summary.',
    rows: [
      {
        'Entry #': 'JE-10041',
        Type: 'Income',
        Amount: 'SAR 18,450',
        Status: 'Posted',
      },
      {
        'Entry #': 'JE-10040',
        Type: 'Expense',
        Amount: 'SAR 6,200',
        Status: 'Posted',
      },
    ],
  },
  {
    name: 'Workforce Report',
    module: 'HR',
    icon: Users,
    description: 'Employees, departments, salary and employment status.',
    rows: [
      {
        Employee: 'Ahmed Ali',
        Department: 'Sales',
        Salary: 'SAR 18,000',
        Status: 'Active',
      },
      {
        Employee: 'Sara Mohamed',
        Department: 'IT',
        Salary: 'SAR 16,000',
        Status: 'Active',
      },
    ],
  },
];

export default function ReportsPage() {
  const [query, setQuery] = useState('');

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return reports;

    return reports.filter((report) =>
      `${report.name} ${report.module} ${report.description}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics / Reports"
        title="Reports Hub"
        description="Generate management-ready operational reports with one-click Excel export and print-to-PDF output."
        actions={
          <ActionButton
            variant="secondary"
            icon={<FileText size={15} />}
            onClick={() => window.print()}
          >
            Print Workspace
          </ActionButton>
        }
      />

      <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.05] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-black text-white">
              Universal Report Engine
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Search available reports and export the selected dataset to
              Excel or PDF.
            </p>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a report..."
            aria-label="Find a report"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/50 md:w-72"
          />
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <Panel className="p-10 text-center">
          <FileText className="mx-auto text-slate-600" size={32} />
          <h2 className="mt-4 text-base font-black text-white">
            No reports found
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Try another report name or module.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredReports.map((report) => {
            const Icon = report.icon;

            return (
              <Panel key={report.name}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
                      <Icon size={20} />
                    </div>

                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                      {report.module}
                    </span>
                  </div>

                  <h2 className="mt-4 text-base font-black text-white">
                    {report.name}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {report.description}
                  </p>

                  <div className="mt-5">
                    <ReportActions
                      title={report.name}
                      rows={report.rows}
                    />
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
