import { describe, expect, it } from 'vitest';

import {
  calculateInvoice,
} from '../invoicing/invoiceCalculation';

import type {
  InvoiceLineInput,
} from '../invoicing/invoiceTypes';

import {
  validateInvoice,
} from './invoiceValidation';

const validLine: InvoiceLineInput = {
  description: 'Product A',
  quantity: 2,
  unitPrice: 500,
  taxCategory: 'STANDARD',
  taxRate: 15,
  taxMode: 'EXCLUSIVE',
};

describe('Invoice Validation Engine', () => {
  it('accepts a valid invoice', () => {
    const calculation = calculateInvoice({
      lines: [validLine],
    });

    const result = validateInvoice(
      [validLine],
      calculation
    );

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects an invoice without lines', () => {
    const result = validateInvoice([]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINES_EMPTY',
        severity: 'ERROR',
      })
    );
  });

  it('rejects a missing line description', () => {
    const line = {
      ...validLine,
      description: '',
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_DESCRIPTION_REQUIRED',
        field: 'lines[0].description',
      })
    );
  });

  it('rejects zero quantity', () => {
    const line = {
      ...validLine,
      quantity: 0,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_INVALID_QUANTITY',
      })
    );
  });

  it('rejects negative quantity', () => {
    const line = {
      ...validLine,
      quantity: -1,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_INVALID_QUANTITY',
      })
    );
  });

  it('rejects negative unit price', () => {
    const line = {
      ...validLine,
      unitPrice: -10,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_INVALID_UNIT_PRICE',
      })
    );
  });

  it('rejects discount type without discount value', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      discountType: 'PERCENTAGE',
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_DISCOUNT_VALUE_REQUIRED',
      })
    );
  });

  it('rejects negative discount value', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      discountType: 'FIXED',
      discountValue: -1,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_INVALID_DISCOUNT_VALUE',
      })
    );
  });

  it('rejects percentage discount above 100%', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      discountType: 'PERCENTAGE',
      discountValue: 101,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_DISCOUNT_EXCEEDS_100',
      })
    );
  });

  it('accepts a 100% percentage discount', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      discountType: 'PERCENTAGE',
      discountValue: 100,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(true);
  });

  it('rejects a tax rate above 100%', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      taxRate: 101,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_INVALID_TAX_RATE',
      })
    );
  });

  it('rejects a negative tax rate', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      taxRate: -1,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_INVALID_TAX_RATE',
      })
    );
  });

  it('rejects zero-rated line with non-zero tax rate', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      taxCategory: 'ZERO_RATED',
      taxRate: 15,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_NON_STANDARD_TAX_RATE',
      })
    );
  });

  it('rejects exempt line with non-zero tax rate', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      taxCategory: 'EXEMPT',
      taxRate: 15,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_NON_STANDARD_TAX_RATE',
      })
    );
  });

  it('rejects out-of-scope line with non-zero tax rate', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      taxCategory: 'OUT_OF_SCOPE',
      taxRate: 15,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_LINE_NON_STANDARD_TAX_RATE',
      })
    );
  });

  it('accepts zero-rated line with zero tax rate', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      taxCategory: 'ZERO_RATED',
      taxRate: 0,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(true);
  });

  it('accepts exempt line with zero tax rate', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      taxCategory: 'EXEMPT',
      taxRate: 0,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(true);
  });

  it('accepts out-of-scope line with zero tax rate', () => {
    const line: InvoiceLineInput = {
      ...validLine,
      taxCategory: 'OUT_OF_SCOPE',
      taxRate: 0,
    };

    const result = validateInvoice([line]);

    expect(result.valid).toBe(true);
  });

  it('validates calculated invoice totals', () => {
    const calculation = calculateInvoice({
      lines: [validLine],
    });

    const result = validateInvoice(
      [validLine],
      calculation
    );

    expect(result.valid).toBe(true);
    expect(calculation.subtotal).toBe(1000);
    expect(calculation.discountTotal).toBe(0);
    expect(calculation.taxableTotal).toBe(1000);
    expect(calculation.taxTotal).toBe(150);
    expect(calculation.grandTotal).toBe(1150);
  });

  it('detects a taxable total mismatch', () => {
    const calculation = calculateInvoice({
      lines: [validLine],
    });

    const invalidCalculation = {
      ...calculation,
      taxableTotal: 999,
    };

    const result = validateInvoice(
      [validLine],
      invalidCalculation
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_TAXABLE_TOTAL_MISMATCH',
      })
    );
  });

  it('detects a grand total mismatch', () => {
    const calculation = calculateInvoice({
      lines: [validLine],
    });

    const invalidCalculation = {
      ...calculation,
      grandTotal: 999,
    };

    const result = validateInvoice(
      [validLine],
      invalidCalculation
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_GRAND_TOTAL_MISMATCH',
      })
    );
  });

  it('accepts a valid currency context', () => {
    const result = validateInvoice(
      [validLine],
      undefined,
      {
        operation: 'CREATE',
        currency: 'SAR',
      }
    );

    expect(result.valid).toBe(true);
  });

  it('rejects an empty currency context', () => {
    const result = validateInvoice(
      [validLine],
      undefined,
      {
        operation: 'CREATE',
        currency: '   ',
      }
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVOICE_INVALID_CURRENCY',
      })
    );
  });
});