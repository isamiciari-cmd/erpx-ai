import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  getZatcaDocumentDefinition,
} from './invoiceDocumentTypes';

describe('Invoice Document Types', () => {
  it('maps Tax Invoice to 388 / 01', () => {
    const result = getZatcaDocumentDefinition('TAX_INVOICE');

    expect(result.zatcaTypeCode).toBe('388');
    expect(result.zatcaSubtype).toBe('01');
    expect(result.baseType).toBe('TAX_INVOICE');
    expect(result.requiresOriginalInvoiceReference).toBe(false);
  });

  it('maps Simplified Tax Invoice to 388 / 02', () => {
    const result = getZatcaDocumentDefinition(
      'SIMPLIFIED_TAX_INVOICE'
    );

    expect(result.zatcaTypeCode).toBe('388');
    expect(result.zatcaSubtype).toBe('02');
    expect(result.baseType).toBe('SIMPLIFIED_TAX_INVOICE');
    expect(result.requiresQrCode).toBe(true);
  });

  it('maps Tax Credit Note to 381 / 01', () => {
    const result = getZatcaDocumentDefinition(
      'CREDIT_NOTE',
      'TAX_INVOICE'
    );

    expect(result.zatcaTypeCode).toBe('381');
    expect(result.zatcaSubtype).toBe('01');
    expect(result.requiresOriginalInvoiceReference).toBe(true);
  });

  it('maps Simplified Credit Note to 381 / 02', () => {
    const result = getZatcaDocumentDefinition(
      'CREDIT_NOTE',
      'SIMPLIFIED_TAX_INVOICE'
    );

    expect(result.zatcaTypeCode).toBe('381');
    expect(result.zatcaSubtype).toBe('02');
    expect(result.requiresOriginalInvoiceReference).toBe(true);
    expect(result.requiresQrCode).toBe(true);
  });

  it('maps Tax Debit Note to 383 / 01', () => {
    const result = getZatcaDocumentDefinition(
      'DEBIT_NOTE',
      'TAX_INVOICE'
    );

    expect(result.zatcaTypeCode).toBe('383');
    expect(result.zatcaSubtype).toBe('01');
    expect(result.requiresOriginalInvoiceReference).toBe(true);
  });

  it('maps Simplified Debit Note to 383 / 02', () => {
    const result = getZatcaDocumentDefinition(
      'DEBIT_NOTE',
      'SIMPLIFIED_TAX_INVOICE'
    );

    expect(result.zatcaTypeCode).toBe('383');
    expect(result.zatcaSubtype).toBe('02');
    expect(result.requiresOriginalInvoiceReference).toBe(true);
    expect(result.requiresQrCode).toBe(true);
  });

  it('maps Tax Prepayment Invoice to 386 / 01', () => {
    const result = getZatcaDocumentDefinition(
      'PREPAYMENT_INVOICE',
      'TAX_INVOICE'
    );

    expect(result.zatcaTypeCode).toBe('386');
    expect(result.zatcaSubtype).toBe('01');
  });

  it('maps Simplified Prepayment Invoice to 386 / 02', () => {
    const result = getZatcaDocumentDefinition(
      'PREPAYMENT_INVOICE',
      'SIMPLIFIED_TAX_INVOICE'
    );

    expect(result.zatcaTypeCode).toBe('386');
    expect(result.zatcaSubtype).toBe('02');
    expect(result.requiresQrCode).toBe(true);
  });
});
