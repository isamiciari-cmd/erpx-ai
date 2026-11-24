import { describe, expect, it, vi } from 'vitest';
import type { Invoice } from '../../services/invoicesService';
import { companyToday, deriveInvoiceAlerts } from './AIWorkspacePage';

vi.mock('../../lib/supabase', () => ({ supabase: {}, isDemoMode: false }));
vi.mock('../../services/invoicesService', () => ({ listInvoices: vi.fn() }));
const company = 'company-a';
function invoice(
  changes: Partial<Invoice> & { customer?: { company_id: string; company_name: string } } = {},
) {
  return {
    id: 'invoice-a',
    company_id: company,
    invoice_number: 'INV-1',
    status: 'issued',
    due_date: '2026-11-01',
    amount_due: 100,
    currency_code: 'SAR',
    invoice_type_code: '388',
    customer: { company_id: company, company_name: 'Current company customer' },
    ...changes,
  } as Invoice & { customer: { company_id: string; company_name: string } };
}

describe('read-only derived invoice alerts', () => {
  it('includes only issued-status invoices with positive outstanding past the due date', () => {
    const records = [
      'issued',
      'sent',
      'partial',
      'paid',
      'overdue',
      'draft',
      'cancelled',
      'void',
      'refunded',
      'unknown',
    ].map((status) => invoice({ id: status, status }));
    expect(
      deriveInvoiceAlerts(records, company, '2026-11-03').map((alert) => alert.invoice.id),
    ).toEqual(['issued', 'sent', 'partial', 'paid', 'overdue']);
  });
  it('excludes settled, invalid and negative outstanding values', () => {
    const records = [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.01].map((amount_due, index) =>
      invoice({ id: String(index), amount_due }),
    );
    expect(
      deriveInvoiceAlerts(records, company, '2026-11-03').map((alert) => alert.invoice.id),
    ).toEqual(['4']);
  });
  it('does not call a credit note an outstanding receivable', () => {
    expect(
      deriveInvoiceAlerts([invoice({ invoice_type_code: '381' })], company, '2026-11-03'),
    ).toEqual([]);
    expect(
      deriveInvoiceAlerts([invoice({ invoice_type_code: '383' })], company, '2026-11-03'),
    ).toHaveLength(1);
  });
  it('never includes another company record or leaks an unrelated joined customer name', () => {
    const records = [
      invoice({ id: 'foreign', company_id: 'company-b' }),
      invoice({
        id: 'own',
        customer: { company_id: 'company-b', company_name: 'Private unrelated customer' },
      }),
    ];
    const alerts = deriveInvoiceAlerts(records, company, '2026-11-03');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].invoice.id).toBe('own');
    expect(alerts[0].customerName).toBe('');
  });
  it('excludes today, future and invalid calendar dates', () => {
    const records = ['2026-11-03', '2026-11-04', '2026-02-31', '', 'not-a-date', '2026-11-01'].map(
      (due_date, index) => invoice({ id: String(index), due_date }),
    );
    expect(
      deriveInvoiceAlerts(records, company, '2026-11-03').map((alert) => alert.invoice.id),
    ).toEqual(['5']);
    expect(deriveInvoiceAlerts(records, company, 'invalid')).toEqual([]);
  });
  it('uses company-local today rather than the browser UTC date', () => {
    const now = new Date('2026-11-03T22:30:00Z');
    expect(companyToday('Asia/Riyadh', now)).toBe('2026-11-04');
    expect(companyToday('America/Los_Angeles', now)).toBe('2026-11-03');
  });
  it('calculates calendar days without daylight-saving-hour errors and sorts oldest due first', () => {
    const records = [
      invoice({ id: 'newer', due_date: '2026-03-08' }),
      invoice({ id: 'older', due_date: '2026-03-07' }),
    ];
    const alerts = deriveInvoiceAlerts(records, company, '2026-03-09');
    expect(alerts.map((alert) => [alert.invoice.id, alert.daysOverdue])).toEqual([
      ['older', 2],
      ['newer', 1],
    ]);
    expect(records.map((row) => row.id)).toEqual(['newer', 'older']);
  });
});
