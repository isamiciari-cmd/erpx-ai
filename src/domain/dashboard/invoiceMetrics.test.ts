import { describe, expect, it } from 'vitest';
import { invoiceMetrics } from './invoiceMetrics';
const invoice = { issue_date: '2026-10-01', status: 'issued', subtotal: 100, vat_amount: 15, total_amount: 115, amount_paid: 50 };
describe('invoice dashboard metrics', () => {
 it('excludes drafts and voided invoices without fabricating profit', () => { const metrics = invoiceMetrics([invoice, { ...invoice, status: 'draft' }, { ...invoice, status: 'cancelled' }]); expect(metrics.total).toBe(115); expect(metrics.outstanding).toBe(65); });
 it('nets credit notes instead of counting them as sales', () => { const metrics = invoiceMetrics([invoice, { ...invoice, invoice_type_code: '381' }]); expect(metrics.total).toBe(0); });
 it('keeps six calendar months across years and excludes same month in prior year', () => { const metrics = invoiceMetrics([{ ...invoice, issue_date: '2025-12-10' }, { ...invoice, issue_date: '2024-12-10' }], new Date('2026-02-20')); expect(metrics.months.map(m => m.month)).toEqual(['2025-09','2025-10','2025-11','2025-12','2026-01','2026-02']); expect(metrics.months[3].total).toBe(115); });
});
