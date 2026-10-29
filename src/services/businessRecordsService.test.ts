import { beforeEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('../lib/supabase', () => ({ isDemoMode: false, supabase: mocks }));
import {
  completeBusinessPayment,
  listBusinessRecords,
  saveBusinessRecord,
  type BusinessRecord,
} from './businessRecordsService';

const record: BusinessRecord = {
  id: 'record-1',
  company_id: 'company-1',
  module: 'finance_expenses',
  title: 'Office supplies',
  reference: 'EXP-1',
  status: 'approved',
  record_date: '2026-10-26',
  amount: 100,
  data: { receipt_reference: 'receipt-1' },
  version: 3,
  created_by: 'user-1',
  created_at: '2026-10-26T10:00:00Z',
  updated_at: '2026-10-26T10:00:00Z',
};
beforeEach(() => vi.clearAllMocks());
describe('Tenant-scoped persistence contract', () => {
  it('includes the company and version in every update, and returns server data', async () => {
    mocks.rpc.mockResolvedValue({ data: { ...record, status: 'paid', version: 4 }, error: null });
    const result = await completeBusinessPayment('company-1', record, ' BANK-1 ');
    expect(mocks.rpc).toHaveBeenCalledWith('save_business_record', {
      p_company_id: 'company-1',
      p_id: 'record-1',
      p_expected_version: 3,
      p_record: {
        module: 'finance_expenses',
        title: 'Office supplies',
        reference: 'EXP-1',
        record_date: '2026-10-26',
        amount: 100,
        data: { receipt_reference: 'receipt-1', payment_reference: 'BANK-1' },
        status: 'paid',
      },
    });
    expect(result.version).toBe(4);
  });
  it('rejects company mismatches and finalized edits before making a request', async () => {
    await expect(saveBusinessRecord('other-company', record, record)).rejects.toThrow(
      'Company mismatch',
    );
    await expect(
      saveBusinessRecord('company-1', record, { ...record, status: 'paid' }),
    ).rejects.toThrow('immutable');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('requires approval and evidence for settlement', async () => {
    await expect(
      completeBusinessPayment('company-1', { ...record, status: 'draft' }, 'BANK-1'),
    ).rejects.toThrow('approved');
    await expect(completeBusinessPayment('company-1', record, ' ')).rejects.toThrow('reference');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('surfaces a concurrent update conflict without a local success fallback', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '40001', message: 'This record changed. Refresh before saving again.' },
    });
    await expect(completeBusinessPayment('company-1', record, 'BANK-1')).rejects.toThrow('Refresh');
  });
  it('paginates records while retaining tenant and module filters', async () => {
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.range
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, id) => ({ ...record, id: String(id) })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ ...record, id: 'last' }], error: null });
    mocks.from.mockReturnValue(query);
    const records = await listBusinessRecords('company-1', 'finance_expenses');
    expect(records).toHaveLength(501);
    expect(query.range.mock.calls).toEqual([
      [0, 499],
      [500, 999],
    ]);
    expect(query.eq.mock.calls.filter((c) => c[0] === 'company_id')).toEqual([
      ['company_id', 'company-1'],
      ['company_id', 'company-1'],
    ]);
    expect(query.eq.mock.calls.filter((c) => c[0] === 'module')).toEqual([
      ['module', 'finance_expenses'],
      ['module', 'finance_expenses'],
    ]);
  });
});
