import { describe, it, expect } from 'vitest';
import {
  BUSINESS_TRANSITIONS,
  FINAL_STATUSES,
  buildTrialBalance,
  calculatePayroll,
  csvCell,
  isBusinessDate,
  recordsToCsv,
  toMinorUnits,
  validateDateRange,
  validateJournal,
  validatePaymentReference,
  type JournalLine,
} from './businessRules';

const line = (id: string, debit: number, credit: number): JournalLine => ({
  account_id: id,
  account_code: id,
  account_name: id,
  debit,
  credit,
});
describe('Business journal and payroll rules', () => {
  it('balances decimal journal values in minor units', () => {
    expect(validateJournal([line('cash', 0.1 + 0.2, 0), line('sales', 0, 0.3)])).toBe(0.3);
    expect(toMinorUnits(1.005)).toBe(101);
  });
  it.each([
    [line('cash', 100, 0)],
    [line('cash', 100, 0), line('sales', 0, 99.99)],
    [line('cash', 100, 1), line('sales', 0, 99)],
    [line('cash', -0.001, 100), line('sales', 100, 0)],
    [line('', 10, 0), line('sales', 0, 10)],
    [line('cash', Infinity, 0), line('sales', 0, 1)],
  ])('rejects an invalid journal %#', (...lines) => {
    expect(() => validateJournal(lines as JournalLine[])).toThrow();
  });
  it('calculates payroll without floating point drift', () => {
    expect(calculatePayroll(1000.1, 0.2, 100.15)).toBe(900.15);
    expect(calculatePayroll(100, 0, 100)).toBe(0);
  });
  it.each([
    [100, 0, 101],
    [-1, 0, 0],
    [100, -1, 0],
    [100, 0, -1],
    [NaN, 0, 0],
  ])('rejects invalid payroll %s/%s/%s', (base, allowances, deductions) => {
    expect(() => calculatePayroll(base, allowances, deductions)).toThrow();
  });
  it('builds a trial balance from posted entries and their correcting journals only', () => {
    const entries = [
      { status: 'draft', data: { lines: [line('cash', 999, 0), line('sales', 0, 999)] } },
      { status: 'posted', data: { lines: [line('cash', 100, 0), line('sales', 0, 100)] } },
      { status: 'posted', data: { lines: [line('cash', 0, 25), line('sales', 25, 0)] } },
    ];
    expect(buildTrialBalance(entries)).toEqual([
      {
        account_id: 'cash',
        account_code: 'cash',
        account_name: 'cash',
        debit: 100,
        credit: 25,
        balance: 75,
      },
      {
        account_id: 'sales',
        account_code: 'sales',
        account_name: 'sales',
        debit: 25,
        credit: 100,
        balance: -75,
      },
    ]);
  });
  it('never exposes final records as editable workflow states', () => {
    for (const status of FINAL_STATUSES) expect(BUSINESS_TRANSITIONS[status]).toBeUndefined();
    expect(BUSINESS_TRANSITIONS.approved).toContain('paid');
    expect(BUSINESS_TRANSITIONS.draft).not.toContain('paid');
  });
});

describe('Business evidence and exports', () => {
  it('accepts real leap dates and rejects impossible dates and reversed ranges', () => {
    expect(isBusinessDate('2024-02-29')).toBe(true);
    expect(isBusinessDate('2026-02-29')).toBe(false);
    expect(isBusinessDate('2026-13-01')).toBe(false);
    expect(() => validateDateRange('2026-10-26', '2026-10-25')).toThrow();
    expect(() => validateDateRange('2026-10-26', '2026-10-26')).not.toThrow();
  });
  it('requires bounded payment evidence and normalizes whitespace', () => {
    expect(validatePaymentReference('  BANK-123  ')).toBe('BANK-123');
    expect(() => validatePaymentReference('   ')).toThrow();
    expect(() => validatePaymentReference('x'.repeat(251))).toThrow();
  });
  it('escapes quotes, multiline text, and spreadsheet formulas', () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell(' \t=HYPERLINK("bad")')).toBe('"\' \t=HYPERLINK(""bad"")"');
    expect(csvCell('@SUM(1)')).toBe('"\'@SUM(1)"');
    expect(recordsToCsv(['اسم'], [['أحمد']])).toBe('\uFEFF"اسم"\r\n"أحمد"');
  });
});
