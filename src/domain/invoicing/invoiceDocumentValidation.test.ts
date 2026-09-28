import { describe, expect, it } from 'vitest';

import {
  validateInvoiceDocument,
} from './invoiceDocumentValidation';

describe('Invoice Document Validation', () => {
  it('accepts a tax invoice without optional buyer VAT data', () => {
    const result = validateInvoiceDocument({
      documentType: 'TAX_INVOICE',
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('accepts a simplified tax invoice', () => {
    const result = validateInvoiceDocument({
      documentType: 'SIMPLIFIED_TAX_INVOICE',
    });

    expect(result.valid).toBe(true);
  });

  it('requires an original invoice reference for a credit note', () => {
    const result = validateInvoiceDocument({
      documentType: 'CREDIT_NOTE',
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'ORIGINAL_INVOICE_REFERENCE_REQUIRED',
      })
    );
  });

  it('requires an original invoice reference for a debit note', () => {
    const result = validateInvoiceDocument({
      documentType: 'DEBIT_NOTE',
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'ORIGINAL_INVOICE_REFERENCE_REQUIRED',
      })
    );
  });

  it('accepts a credit note with an invoice ID reference', () => {
    const result = validateInvoiceDocument({
      documentType: 'CREDIT_NOTE',
      originalInvoice: {
        invoiceId: 'invoice-001',
      },
    });

    expect(result.valid).toBe(true);
  });

  it('accepts a debit note with an invoice number reference', () => {
    const result = validateInvoiceDocument({
      documentType: 'DEBIT_NOTE',
      originalInvoice: {
        invoiceNumber: 'INV-2026-0001',
      },
    });

    expect(result.valid).toBe(true);
  });

  it('rejects an empty original invoice reference', () => {
    const result = validateInvoiceDocument({
      documentType: 'CREDIT_NOTE',
      originalInvoice: {},
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'ORIGINAL_INVOICE_IDENTIFIER_REQUIRED',
      })
    );
  });

  it('accepts a valid 15-digit seller VAT number', () => {
    const result = validateInvoiceDocument({
      documentType: 'TAX_INVOICE',
      sellerVatNumber: '300000000000003',
    });

    expect(result.valid).toBe(true);
  });

  it('rejects an invalid seller VAT number', () => {
    const result = validateInvoiceDocument({
      documentType: 'TAX_INVOICE',
      sellerVatNumber: '12345',
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_VAT_NUMBER',
        field: 'sellerVatNumber',
      })
    );
  });

  it('rejects an invalid buyer VAT number when supplied', () => {
    const result = validateInvoiceDocument({
      documentType: 'TAX_INVOICE',
      buyerVatNumber: '12345',
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_VAT_NUMBER',
        field: 'buyerVatNumber',
      })
    );
  });

  it('accepts a valid buyer VAT number when supplied', () => {
    const result = validateInvoiceDocument({
      documentType: 'TAX_INVOICE',
      buyerVatNumber: '300000000000003',
    });

    expect(result.valid).toBe(true);
  });

  it('accepts valid invoice indicators', () => {
    const result = validateInvoiceDocument({
      documentType: 'TAX_INVOICE',
      indicators: {
        thirdParty: true,
        selfBilled: false,
        nominal: false,
        export: false,
      },
    });

    expect(result.valid).toBe(true);
  });

  it('rejects non-boolean invoice indicators', () => {
    const result = validateInvoiceDocument({
      documentType: 'TAX_INVOICE',
      indicators: {
        thirdParty: true,
        selfBilled: false,
        nominal: false,
        export: false,
      },
    });

    expect(result.valid).toBe(true);
  });

  it('rejects export indicator for simplified tax invoice', () => {
    const result = validateInvoiceDocument({
      documentType: 'SIMPLIFIED_TAX_INVOICE',
      indicators: {
        export: true,
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_DOCUMENT_INDICATOR',
      })
    );
  });

  it('rejects missing document type', () => {
    const result = validateInvoiceDocument({
      documentType: undefined as never,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'DOCUMENT_TYPE_REQUIRED',
      })
    );
  });

  it('accepts a credit note with valid seller and buyer VAT numbers', () => {
    const result = validateInvoiceDocument({
      documentType: 'CREDIT_NOTE',
      sellerVatNumber: '300000000000003',
      buyerVatNumber: '311111111111113',
      originalInvoice: {
        invoiceNumber: 'INV-2026-0001',
      },
    });

    expect(result.valid).toBe(true);
  });

  it('accepts a debit note with valid seller and buyer VAT numbers', () => {
    const result = validateInvoiceDocument({
      documentType: 'DEBIT_NOTE',
      sellerVatNumber: '300000000000003',
      buyerVatNumber: '311111111111113',
      originalInvoice: {
        invoiceId: 'invoice-001',
      },
    });

    expect(result.valid).toBe(true);
  });
});