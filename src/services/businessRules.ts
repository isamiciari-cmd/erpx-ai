/** Shared domain rules. Monetary comparisons use integer minor units. */
export interface JournalLine {
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export interface BusinessField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
  min?: number;
  defaultValue?: string | number;
}

export const BUSINESS_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted', 'active', 'cancelled'],
  submitted: ['approved', 'rejected', 'cancelled'],
  approved: ['posted', 'paid', 'completed', 'cancelled'],
  active: ['completed', 'inactive', 'on_hold', 'cancelled'],
  inactive: ['active', 'cancelled'],
  on_hold: ['active', 'cancelled'],
  rejected: ['draft', 'cancelled'],
};

export const FINAL_STATUSES = ['posted', 'paid', 'completed', 'cancelled'];

export function validatePaymentReference(value: unknown): string {
  const reference = typeof value === 'string' ? value.trim() : '';
  if (!reference || reference.length > 250)
    throw new Error('Enter the actual payment or bank reference (maximum 250 characters).');
  return reference;
}

export function toMinorUnits(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || Math.abs(numeric) > 999999999999) {
    throw new Error('Enter a valid monetary amount.');
  }
  return Math.round((numeric + Number.EPSILON) * 100);
}

export function validateJournal(lines: JournalLine[]): number {
  if (lines.length < 2) throw new Error('A journal needs at least two lines.');
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    const d = toMinorUnits(line.debit);
    const c = toMinorUnits(line.credit);
    if (
      !line.account_id ||
      !line.account_code ||
      Number(line.debit) < 0 ||
      Number(line.credit) < 0 ||
      d > 0 === c > 0
    ) {
      throw new Error(
        'Each journal line requires an account and either a positive debit or a positive credit.',
      );
    }
    debit += d;
    credit += c;
  }
  if (debit !== credit) throw new Error('Journal debits and credits must balance.');
  return debit / 100;
}

export function calculatePayroll(base: unknown, allowances: unknown, deductions: unknown): number {
  const b = toMinorUnits(base);
  const a = toMinorUnits(allowances);
  const d = toMinorUnits(deductions);
  if (b < 0 || a < 0 || d < 0 || b + a < d) {
    throw new Error(
      'Salary and allowances must be nonnegative; deductions cannot exceed gross pay.',
    );
  }
  return (b + a - d) / 100;
}

export function validateDateRange(start: unknown, end: unknown) {
  if (!isBusinessDate(start) || !isBusinessDate(end) || end < start) {
    throw new Error('The end date must be on or after the start date.');
  }
}

export function isBusinessDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function csvCell(value: unknown): string {
  // Neutralize spreadsheet formulas, including leading whitespace before a formula.
  let safe = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(safe)) safe = "'" + safe;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function recordsToCsv(headers: string[], rows: unknown[][]): string {
  return '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export interface LedgerBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  balance: number;
}

export function buildTrialBalance(
  entries: { status: string; data: Record<string, unknown> }[],
): LedgerBalance[] {
  const accounts = new Map<string, LedgerBalance>();
  for (const entry of entries.filter((e) => e.status === 'posted')) {
    const lines = entry.data.lines as JournalLine[];
    if (!Array.isArray(lines)) continue;
    validateJournal(lines);
    for (const line of lines) {
      const row = accounts.get(line.account_id) ?? {
        account_id: line.account_id,
        account_code: line.account_code,
        account_name: line.account_name,
        debit: 0,
        credit: 0,
        balance: 0,
      };
      row.debit = (toMinorUnits(row.debit) + toMinorUnits(line.debit)) / 100;
      row.credit = (toMinorUnits(row.credit) + toMinorUnits(line.credit)) / 100;
      row.balance = (toMinorUnits(row.debit) - toMinorUnits(row.credit)) / 100;
      accounts.set(line.account_id, row);
    }
  }
  return [...accounts.values()].sort((a, b) => a.account_code.localeCompare(b.account_code));
}
