import { supabase, isDemoMode } from '../lib/supabase';
import {
  FINAL_STATUSES,
  calculatePayroll,
  isBusinessDate,
  validateDateRange,
  validateJournal,
  validatePaymentReference,
  type JournalLine,
} from './businessRules';

export interface BusinessRecord {
  id: string;
  company_id: string;
  module: string;
  title: string;
  reference: string;
  status: string;
  record_date: string;
  amount: number;
  data: Record<string, unknown>;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type BusinessInput = Pick<
  BusinessRecord,
  'module' | 'title' | 'reference' | 'record_date' | 'amount' | 'data'
>;

function assertLive(companyId: string) {
  if (isDemoMode)
    throw new Error('Connect Supabase to save business data. Demo data is not persisted.');
  if (!companyId || companyId === 'demo-company')
    throw new Error('An active company profile is required.');
}

function fail(error: { message?: string; code?: string } | null) {
  if (!error) return;
  if (error.code === '42P01' || error.code === 'PGRST202' || error.code === 'PGRST205') {
    throw new Error(
      'Business database setup is required. Apply migration 20261022000300_business_records.sql.',
    );
  }
  throw new Error(error.message || 'The operation could not be saved.');
}

export async function listBusinessRecords(
  companyId: string,
  module: string,
): Promise<BusinessRecord[]> {
  assertLive(companyId);
  const records: BusinessRecord[] = [];
  // Supabase returns at most a page by default. Do not silently truncate reports.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('business_records')
      .select('*')
      .eq('company_id', companyId)
      .eq('module', module)
      .order('record_date', { ascending: false })
      .order('id')
      .range(offset, offset + 499);
    fail(error);
    const page = (data ?? []) as BusinessRecord[];
    records.push(...page.map((row) => ({ ...row, amount: Number(row.amount) })));
    if (page.length < 500) break;
  }
  return records;
}

export function validateBusinessInput(input: BusinessInput): BusinessInput {
  if (!/^[a-z][a-z0-9_]{1,79}$/.test(input.module)) throw new Error('Invalid business module.');
  if (!input.title.trim()) throw new Error('A title or name is required.');
  if (!isBusinessDate(input.record_date)) throw new Error('A valid record date is required.');
  if (!Number.isFinite(Number(input.amount)) || Number(input.amount) < 0)
    throw new Error('Amount must be nonnegative.');
  let amount = Number(input.amount);
  if (input.module === 'finance_journal')
    amount = validateJournal((input.data.lines as JournalLine[]) || []);
  if (input.module === 'hr_payroll')
    amount = calculatePayroll(
      input.data.base_salary,
      input.data.allowances ?? 0,
      input.data.deductions ?? 0,
    );
  if (input.module === 'hr_leave') validateDateRange(input.data.start_date, input.data.end_date);
  return {
    module: input.module,
    title: input.title.trim(),
    reference: input.reference.trim(),
    record_date: input.record_date,
    amount,
    data: input.data,
  };
}

export async function saveBusinessRecord(
  companyId: string,
  input: BusinessInput,
  existing?: BusinessRecord,
  targetStatus?: string,
): Promise<BusinessRecord> {
  assertLive(companyId);
  if (existing && existing.company_id !== companyId) throw new Error('Company mismatch.');
  if (existing && FINAL_STATUSES.includes(existing.status))
    throw new Error('Finalized records are immutable. Create a correcting record.');
  const clean = validateBusinessInput(input);
  const { data, error } = await supabase.rpc('save_business_record', {
    p_company_id: companyId,
    p_id: existing?.id ?? null,
    p_expected_version: existing?.version ?? null,
    p_record: { ...clean, status: targetStatus ?? existing?.status ?? 'draft' },
  });
  fail(error);
  return { ...data, amount: Number(data.amount) } as BusinessRecord;
}

export async function transitionBusinessRecord(
  companyId: string,
  record: BusinessRecord,
  status: string,
) {
  return saveBusinessRecord(companyId, record, record, status);
}

/** Record evidence together with settlement, without reopening approved amounts. */
export async function completeBusinessPayment(
  companyId: string,
  record: BusinessRecord,
  reference: string,
) {
  if (
    record.status !== 'approved' ||
    !['hr_payroll', 'finance_payables', 'finance_expenses'].includes(record.module)
  )
    throw new Error('Only an approved payable, expense or payroll record can be settled.');
  return saveBusinessRecord(
    companyId,
    { ...record, data: { ...record.data, payment_reference: validatePaymentReference(reference) } },
    record,
    'paid',
  );
}

export interface BusinessAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}
export async function listBusinessAccounts(companyId: string): Promise<BusinessAccount[]> {
  assertLive(companyId);
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id,account_code,account_name,account_type')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('account_code');
  fail(error);
  return data ?? [];
}

export interface LedgerJournal {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  status: string;
  lines: {
    account_id: string;
    debit_amount: number;
    credit_amount: number;
    account: BusinessAccount;
  }[];
}
export async function listBusinessLedger(companyId: string): Promise<LedgerJournal[]> {
  assertLive(companyId);
  const rows: LedgerJournal[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(
        'id,entry_number,entry_date,description,status,lines:journal_entry_lines(account_id,debit_amount,credit_amount,account:chart_of_accounts(id,account_code,account_name,account_type))',
      )
      .eq('company_id', companyId)
      .eq('status', 'posted')
      .order('entry_date', { ascending: false })
      .order('id')
      .range(offset, offset + 499);
    fail(error);
    const page = (data ?? []) as unknown as LedgerJournal[];
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows;
}

export async function saveBusinessAccount(
  companyId: string,
  account: Omit<BusinessAccount, 'id'> & { id?: string; is_active?: boolean },
) {
  assertLive(companyId);
  const { data, error } = await supabase.rpc('save_business_account', {
    p_company_id: companyId,
    p_id: account.id ?? null,
    p_code: account.account_code,
    p_name: account.account_name,
    p_type: account.account_type,
    p_active: account.is_active ?? true,
  });
  fail(error);
  return data;
}

export interface BusinessAuditEvent {
  id: string;
  action: string;
  old_status: string | null;
  new_status: string;
  actor_id: string;
  created_at: string;
}
export async function listBusinessAudit(
  companyId: string,
  recordId: string,
): Promise<BusinessAuditEvent[]> {
  assertLive(companyId);
  const { data, error } = await supabase
    .from('business_record_events')
    .select('id,action,old_status,new_status,actor_id,created_at')
    .eq('company_id', companyId)
    .eq('record_id', recordId)
    .order('created_at', { ascending: false });
  fail(error);
  return data ?? [];
}

export function downloadBusinessCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
