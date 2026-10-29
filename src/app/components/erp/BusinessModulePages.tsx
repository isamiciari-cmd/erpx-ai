import BusinessRecordsPage, { type BusinessField } from './BusinessRecordsPage';

const notes: BusinessField = { key: 'notes', label: 'Notes', type: 'textarea' };
const employee: BusinessField = { key: 'employee_id', label: 'Employee', required: true };
const approval = ['draft', 'submitted', 'approved', 'rejected', 'completed', 'cancelled'];
const paid = ['draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled'];
const active = ['draft', 'active', 'inactive', 'cancelled'];
const payment: BusinessField = {
  key: 'payment_reference',
  label: 'Payment / bank reference (can be entered when recording payment)',
};

export function JournalEntriesPage() {
  return (
    <BusinessRecordsPage
      module="finance_journal"
      title="Journal entries"
      description="Balanced journals using your chart of accounts. Posting writes the canonical general ledger atomically and preserves the record."
      fields={[notes]}
      statuses={['draft', 'submitted', 'approved', 'rejected', 'posted', 'cancelled']}
      journal
    />
  );
}
export function BudgetManagementPage() {
  return (
    <BusinessRecordsPage
      module="finance_budgets"
      title="Budgets"
      description="Create and approve departmental spending plans. Approved budgets are planning records; ledger reports show actual posted activity."
      fields={[
        { key: 'department', label: 'Department', required: true },
        { key: 'start_date', label: 'Period start', type: 'date', required: true },
        { key: 'end_date', label: 'Period end', type: 'date', required: true },
        notes,
      ]}
      statuses={approval}
    />
  );
}
export function AccountsPayablePage() {
  return (
    <BusinessRecordsPage
      module="finance_payables"
      title="Supplier bills"
      description="Record supplier liabilities and payment evidence. Record the corresponding balanced journal in Journal entries for ledger recognition."
      fields={[
        { key: 'supplier_name', label: 'Supplier', required: true },
        { key: 'supplier_invoice', label: 'Supplier invoice number', required: true },
        { key: 'due_date', label: 'Due date', type: 'date', required: true },
        payment,
        notes,
      ]}
      statuses={paid}
    />
  );
}
export function ExpenseManagementPage() {
  return (
    <BusinessRecordsPage
      module="finance_expenses"
      title="Expense claims"
      description="Submit and approve actual expense claims, retain receipt references and record payment evidence. Use Journal entries for accounting recognition."
      fields={[
        {
          key: 'category',
          label: 'Category',
          type: 'select',
          options: ['Travel', 'Supplies', 'Rent', 'Utilities', 'Other'],
          required: true,
        },
        { key: 'claimant', label: 'Claimant', required: true },
        { key: 'receipt_reference', label: 'Receipt document reference', required: true },
        payment,
        notes,
      ]}
      statuses={paid}
    />
  );
}
export function FixedAssetsPage() {
  return (
    <BusinessRecordsPage
      module="finance_assets"
      title="Fixed asset register"
      description="Track acquisition cost, useful life, location and disposal. Depreciation must be posted through a balanced journal."
      fields={[
        { key: 'asset_code', label: 'Asset code', required: true },
        { key: 'location', label: 'Location' },
        {
          key: 'useful_life_months',
          label: 'Useful life (months)',
          type: 'number',
          min: 1,
          required: true,
        },
        { key: 'residual_value', label: 'Residual value', type: 'number', min: 0, defaultValue: 0 },
        { key: 'custodian', label: 'Custodian' },
        notes,
      ]}
      statuses={['draft', 'active', 'inactive', 'completed', 'cancelled']}
    />
  );
}
export function EmployeeListPage() {
  return (
    <BusinessRecordsPage
      module="hr_employees"
      title="Employees"
      description="Company employee records. Enter monthly base salary in Amount, hire date in Date and employee code in Reference."
      fields={[
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'phone', label: 'Phone' },
        { key: 'department', label: 'Department', required: true },
        { key: 'position', label: 'Job title', required: true },
        {
          key: 'employment_type',
          label: 'Employment type',
          type: 'select',
          options: ['Full time', 'Part time', 'Contract'],
          required: true,
        },
        notes,
      ]}
      statuses={active}
    />
  );
}
export function AttendancePage() {
  return (
    <BusinessRecordsPage
      module="hr_attendance"
      title="Attendance"
      description="One company record per employee and work date. Times use HH:MM in the branch's local time; use a separate work date for overnight shifts."
      fields={[
        employee,
        { key: 'check_in', label: 'Check-in (HH:MM)', required: true },
        { key: 'check_out', label: 'Check-out (HH:MM)' },
        notes,
      ]}
      statuses={approval}
      hideAmount
    />
  );
}
export function LeaveManagementPage() {
  return (
    <BusinessRecordsPage
      module="hr_leave"
      title="Leave requests"
      description="Review and approve employee leave. Overlapping submitted or approved requests are rejected by the server."
      fields={[
        employee,
        {
          key: 'leave_type',
          label: 'Leave type',
          type: 'select',
          options: ['Annual', 'Sick', 'Unpaid', 'Other'],
          required: true,
        },
        { key: 'start_date', label: 'First day', type: 'date', required: true },
        { key: 'end_date', label: 'Last day', type: 'date', required: true },
        notes,
      ]}
      statuses={approval}
      hideAmount
    />
  );
}
export function PayrollPage() {
  return (
    <BusinessRecordsPage
      module="hr_payroll"
      title="Payroll"
      description="One payroll record per employee and pay period. Net pay is calculated on the server from salary, allowances and deductions. Export filtered records as payslip source data."
      fields={[
        employee,
        { key: 'pay_period', label: 'Pay period (YYYY-MM)', required: true },
        { key: 'base_salary', label: 'Base salary', type: 'number', min: 0, required: true },
        { key: 'allowances', label: 'Allowances', type: 'number', min: 0, defaultValue: 0 },
        { key: 'deductions', label: 'Deductions', type: 'number', min: 0, defaultValue: 0 },
        payment,
        notes,
      ]}
      statuses={paid}
    />
  );
}
export function RecruitmentPage() {
  return (
    <BusinessRecordsPage
      module="hr_recruitment"
      title="Recruitment"
      description="Maintain job requisitions and applicant records, track review and retain interview notes."
      fields={[
        {
          key: 'record_type',
          label: 'Record type',
          type: 'select',
          options: ['Job requisition', 'Applicant'],
          required: true,
        },
        { key: 'position', label: 'Position', required: true },
        { key: 'department', label: 'Department', required: true },
        { key: 'email', label: 'Applicant email', type: 'email' },
        { key: 'interview_date', label: 'Interview date', type: 'date' },
        notes,
      ]}
      statuses={approval}
      hideAmount
    />
  );
}
export function PurchasesPage() {
  return (
    <BusinessRecordsPage
      module="purchases_requests"
      title="Purchase requests"
      description="Request, review and approve purchases. Approval authorizes procurement; receive products through inventory before selling them."
      fields={[
        { key: 'supplier_name', label: 'Supplier', required: true },
        { key: 'requested_by', label: 'Requested by', required: true },
        {
          key: 'items_description',
          label: 'Items, quantities and specifications',
          type: 'textarea',
          required: true,
        },
        { key: 'needed_by', label: 'Needed by', type: 'date' },
        notes,
      ]}
      statuses={approval}
    />
  );
}
