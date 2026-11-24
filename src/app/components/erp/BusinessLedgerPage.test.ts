import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LedgerJournal } from '../../../services/businessRecordsService';
import { financeResources } from '../../../i18n/finance';
import { buildLedgerReport } from './BusinessLedgerPage';
import { useBusinessAccess } from './BusinessRecordsPage';

const trusted = vi.hoisted(() => ({ roles: new Set<string>(), grants: new Set<string>() }));
vi.mock('../../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasRole: (role: string) => trusted.roles.has(role),
    hasPermission: (key: string) => trusted.grants.has(key),
  }),
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../../lib/supabase', () => ({ isDemoMode: false }));
vi.mock('../../../services/businessRecordsService', () => ({
  listBusinessLedger: vi.fn(),
  listBusinessRecords: vi.fn(),
  listBusinessAccounts: vi.fn(),
  listBusinessAudit: vi.fn(),
  saveBusinessRecord: vi.fn(),
  transitionBusinessRecord: vi.fn(),
  completeBusinessPayment: vi.fn(),
  downloadBusinessCsv: vi.fn(),
}));

const cash = { id: 'cash', account_code: '1000', account_name: 'Cash', account_type: 'asset' };
const revenue = {
  id: 'revenue',
  account_code: '4000',
  account_name: 'Sales',
  account_type: 'revenue',
};
function journal(id: string, date: string, amount: number, status = 'posted'): LedgerJournal {
  return {
    id,
    entry_number: id,
    entry_date: date,
    description: 'Synthetic unit test',
    status,
    lines: [
      { account_id: cash.id, account: cash, debit_amount: amount, credit_amount: 0 },
      { account_id: revenue.id, account: revenue, debit_amount: 0, credit_amount: amount },
    ],
  };
}
const source = () => [
  journal('opening', '2025-12-31', 100),
  journal('period', '2026-01-10', 230),
  journal('future', '2026-02-01', 50),
  journal('unposted', '2026-01-12', 999, 'draft'),
];

describe('Native posted ledger period report', () => {
  it('keeps opening, period movement and closing separate', () => {
    const report = buildLedgerReport(source(), '2026-01-01', '2026-01-31');
    expect(report.balances.find((row) => row.account_id === 'cash')).toMatchObject({
      opening: 100,
      debit: 230,
      credit: 0,
      balance: 230,
      closing: 330,
    });
    expect(report.journalCount).toBe(1);
    expect(report.details).toHaveLength(2);
    expect(report.details.every((row) => row.reference === 'period')).toBe(true);
  });
  it('preserves credit balance signs instead of presenting revenue as an asset', () => {
    expect(
      buildLedgerReport(source(), '2026-01-01', '2026-01-31').balances.find(
        (row) => row.account_id === 'revenue',
      ),
    ).toMatchObject({
      opening: -100,
      debit: 0,
      credit: 230,
      balance: -230,
      closing: -330,
    });
  });
  it('brings forward prior balances even when the period has no activity', () => {
    const report = buildLedgerReport(source(), '2026-01-20', '2026-01-31');
    expect(report.journalCount).toBe(0);
    expect(report.details).toEqual([]);
    expect(report.balances.find((row) => row.account_id === 'cash')).toMatchObject({
      opening: 330,
      debit: 0,
      credit: 0,
      balance: 0,
      closing: 330,
    });
  });
  it('uses inclusive boundaries and treats no start date as zero opening', () => {
    const sameDay = buildLedgerReport(source(), '2026-01-10', '2026-01-10');
    expect(sameDay.journalCount).toBe(1);
    expect(sameDay.balances.find((row) => row.account_id === 'cash')?.closing).toBe(330);
    expect(
      buildLedgerReport(source(), '', '2026-01-31').balances.find(
        (row) => row.account_id === 'cash',
      ),
    ).toMatchObject({ opening: 0, debit: 330 });
  });
  it('applies correcting credits with exact cents without mutating source journals', () => {
    const input = [journal('a', '2026-01-01', 0.3), journal('b', '2026-01-02', 0.1)];
    input[1].lines = input[1].lines.map((line) => ({
      ...line,
      debit_amount: line.credit_amount,
      credit_amount: line.debit_amount,
    }));
    const before = structuredClone(input);
    const report = buildLedgerReport(input);
    expect(report.balances.find((row) => row.account_id === 'cash')).toMatchObject({
      opening: 0,
      debit: 0.3,
      credit: 0.1,
      balance: 0.2,
      closing: 0.2,
    });
    expect(input).toEqual(before);
  });
  it('rejects an inverted period', () => {
    expect(() => buildLedgerReport(source(), '2026-02-01', '2026-01-01')).toThrow('invalid_period');
  });
  it('validates whole posted journals before the display can filter out the opposite entry', () => {
    const broken = journal('broken', '2026-01-01', 100);
    broken.lines[1].credit_amount = 99;
    expect(() => buildLedgerReport([broken])).toThrow('balance');
  });
  it('orders period details deterministically regardless of source order', () => {
    const input = [journal('b', '2026-01-02', 1), journal('a', '2026-01-01', 2)];
    expect(buildLedgerReport(input).details.map((row) => row.id)).toEqual([
      'a:0',
      'a:1',
      'b:0',
      'b:1',
    ]);
  });
});

describe('Trusted business presentation access', () => {
  beforeEach(() => {
    trusted.roles.clear();
    trusted.grants.clear();
  });
  it('does not expose writes, export or salary for a read-only finance user', () => {
    trusted.grants.add('finance.view');
    expect(useBusinessAccess('finance_journal')).toEqual({
      canCreate: false,
      canUpdate: false,
      canExport: false,
      canSeeSalary: false,
    });
  });
  it('does not treat generic legacy read-derived hr.view as sensitive salary access', () => {
    trusted.grants.add('hr.view');
    expect(useBusinessAccess('hr_employees').canSeeSalary).toBe(false);
  });
  it('allows explicit HR read access to view salary without granting writes', () => {
    trusted.grants.add('hr.read');
    expect(useBusinessAccess('hr_employees')).toMatchObject({
      canCreate: false,
      canUpdate: false,
      canExport: false,
      canSeeSalary: true,
    });
  });
  it('keeps a payroll-only grant scoped to payroll salary records', () => {
    trusted.grants.add('hr_payroll');
    expect(useBusinessAccess('hr_payroll').canSeeSalary).toBe(true);
    expect(useBusinessAccess('hr_employees').canSeeSalary).toBe(false);
  });
  it('does not turn finance role authority into HR salary authority', () => {
    trusted.roles.add('finance_manager');
    expect(useBusinessAccess('finance_journal')).toMatchObject({
      canCreate: true,
      canUpdate: true,
      canExport: true,
      canSeeSalary: false,
    });
    expect(useBusinessAccess('hr_employees').canUpdate).toBe(false);
  });
  it.each(['admin', 'manager', 'hr_manager', 'hr'])('retains trusted %s HR actions', (role) => {
    trusted.roles.add(role);
    expect(useBusinessAccess('hr_employees')).toMatchObject({
      canCreate: true,
      canUpdate: true,
      canExport: true,
      canSeeSalary: true,
    });
  });
});

describe('Financial and employee bilingual resources', () => {
  it('has the same nonempty key set in Arabic and English', () => {
    const flatten = (value: Record<string, unknown>, prefix = ''): [string, string][] =>
      Object.entries(value).flatMap(([key, child]) =>
        typeof child === 'object'
          ? flatten(child as Record<string, unknown>, `${prefix}${key}.`)
          : [[`${prefix}${key}`, String(child)]],
      );
    const en = flatten(financeResources.en);
    const ar = flatten(financeResources.ar);
    expect(en.map(([key]) => key)).toEqual(ar.map(([key]) => key));
    expect(en.every(([, value]) => value.trim().length > 0)).toBe(true);
    expect(ar.every(([, value]) => value.trim().length > 0)).toBe(true);
    expect(ar.some(([, value]) => /[\u0600-\u06ff]/.test(value))).toBe(true);
  });
});
