import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../lib/supabase', () => ({ isDemoMode: false, supabase: mocks }));
import {
  createCustomer,
  getCustomer,
  listCustomers,
  normalizeCustomer,
  searchCustomers,
  updateCustomer,
} from './customersService';

const row = {
  id: 'customer-1',
  company_id: 'company-1',
  customer_code: 'C-1',
  company_name: 'Customer',
  contact_name: 'Contact',
  email: null,
  phone: '+966500000001',
  address: null,
  city: null,
  country: 'SA',
  credit_limit: null,
  payment_terms: 'Net 30',
  status: 'active',
  created_at: '2026-10-26T00:00:00Z',
  updated_at: '2026-10-26T00:00:00Z',
};
function query() {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    or: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
  };
  for (const method of ['select', 'eq', 'or', 'insert', 'update'] as const)
    q[method].mockReturnValue(q);
  q.order.mockResolvedValue({ data: [row], error: null });
  q.limit.mockResolvedValue({ data: [row], error: null });
  q.single.mockResolvedValue({ data: row, error: null });
  mocks.from.mockReturnValue(q);
  return q;
}
beforeEach(() => vi.clearAllMocks());
describe('Existing customer schema compatibility', () => {
  it('normalizes canonical contact_name/phone for existing UI aliases without changing payment terms', () => {
    expect(normalizeCustomer(row)).toMatchObject({
      contact_name: 'Contact',
      contact_person: 'Contact',
      phone: row.phone,
      phone_number: row.phone,
      payment_terms: 'Net 30',
      credit_limit: null,
      email: null,
    });
  });
  it('retains explicit canonical null/empty values and falls back only when canonical keys are absent', () => {
    expect(
      normalizeCustomer({
        ...row,
        contact_name: null,
        phone: '',
        contact_person: 'Stale',
        phone_number: 'Stale',
      }),
    ).toMatchObject({ contact_person: null, phone_number: '' });
    const { contact_name, phone, ...legacy } = row;
    expect(
      normalizeCustomer({ ...legacy, contact_person: 'Legacy', phone_number: '123' }),
    ).toMatchObject({ contact_name: 'Legacy', phone: '123' });
  });
  it('normalizes list, detail and search reads consistently while preserving tenant filters', async () => {
    const q = query();
    expect((await listCustomers('company-1'))[0].contact_person).toBe('Contact');
    expect((await getCustomer('customer-1'))?.phone_number).toBe(row.phone);
    expect((await searchCustomers('company-1', 'Customer'))[0].payment_terms).toBe('Net 30');
    expect(q.eq.mock.calls).toContainEqual(['company_id', 'company-1']);
    expect(q.eq.mock.calls).toContainEqual(['id', 'customer-1']);
  });
  it('creates using existing storage columns instead of sending aliases or system fields', async () => {
    const q = query();
    const result = await createCustomer({
      id: 'forged',
      company_id: 'company-1',
      company_name: 'Customer',
      customer_code: 'C-1',
      contact_person: 'Contact',
      phone_number: '123',
      payment_terms: 'On receipt',
      created_at: 'forged',
    });
    expect(q.insert).toHaveBeenCalledWith({
      company_id: 'company-1',
      company_name: 'Customer',
      customer_code: 'C-1',
      contact_name: 'Contact',
      phone: '123',
      payment_terms: 'On receipt',
    });
    expect(result.phone_number).toBe(row.phone);
  });
  it('updates only submitted fields and preserves explicit clears without changing IDs or company', async () => {
    const q = query();
    await updateCustomer('customer-1', {
      id: 'other',
      company_id: 'other',
      updated_at: 'forged',
      contact_person: null,
      phone: '',
      payment_terms: '45 days',
      email: undefined,
    });
    expect(q.update).toHaveBeenCalledWith({
      contact_name: null,
      phone: '',
      payment_terms: '45 days',
    });
    expect(q.eq).toHaveBeenCalledWith('id', 'customer-1');
  });
  it('rejects conflicting aliases before a write instead of silently replacing customer contact data', async () => {
    const q = query();
    await expect(
      updateCustomer('customer-1', { contact_name: 'A', contact_person: 'B' }),
    ).rejects.toThrow('Conflicting');
    await expect(createCustomer({ phone: '1', phone_number: '2' })).rejects.toThrow('Conflicting');
    expect(q.update).not.toHaveBeenCalled();
    expect(q.insert).not.toHaveBeenCalled();
  });
});
