import { describe, expect, it } from 'vitest';
import { acceptedSubmission, preparedPayload } from '../../../supabase/functions/_shared/zatcaPayload';
const invoice = { uuid: '00000000-0000-4000-8000-000000000001', xml_content: '<Invoice><UUID>00000000-0000-4000-8000-000000000001</UUID><ds:Signature>signed</ds:Signature></Invoice>', invoice_hash: 'a'.repeat(43) + '=', status: 'issued', invoice_subtype: '02' };
describe('ZATCA submission boundary', () => {
  it('sends simplified invoices to reporting and preserves XML bytes', () => { const p = preparedPayload(invoice); expect(p.mode).toBe('reporting'); expect(atob(p.body.invoice)).toBe(invoice.xml_content); });
  it('sends standard invoices to clearance', () => expect(preparedPayload({ ...invoice, invoice_subtype: '01' }).mode).toBe('clearance'));
  it('rejects unsigned, draft, mismatched, invalid-hash invoices', () => {
    for (const change of [{ xml_content: '<Invoice/>' }, { status: 'draft' }, { uuid: '00000000-0000-4000-8000-000000000002' }, { invoice_hash: 'bad' }]) expect(() => preparedPayload({ ...invoice, ...change })).toThrow();
  });
  it('requires an explicit successful authority response, not just HTTP 200', () => {
    expect(acceptedSubmission('reporting', true, {})).toBe(false);
    expect(acceptedSubmission('reporting', false, { reportingStatus: 'REPORTED' })).toBe(false);
    expect(acceptedSubmission('reporting', true, { reportingStatus: 'REPORTED' })).toBe(true);
    expect(acceptedSubmission('clearance', true, { clearanceStatus: 'CLEARED' })).toBe(true);
  });
});
