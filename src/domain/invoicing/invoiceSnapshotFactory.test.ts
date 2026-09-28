import { describe, expect, it } from 'vitest';

import {
  createInvoiceLineSnapshot,
} from './invoiceSnapshotFactory';

import {
  calculateInvoice,
} from './invoiceCalculation';

import type {
  InvoiceLineInput,
} from './invoiceTypes';

describe('Invoice Snapshot Factory', () => {
  it('creates a standard VAT invoice line snapshot', () => {
    const input: InvoiceLineInput = {
      productId: 'product-001',
      description: 'Laptop',
      quantity: 2,
      unitPrice: 500,
      discountType: 'FIXED',
      discountValue: 100,
      taxCategory: 'STANDARD',
      taxRate: 15,
      taxCode: 'S',
      taxMode: 'EXCLUSIVE',
    };

    const calculation = calculateInvoice({
      lines: [input],
    });

    const snapshot = createInvoiceLineSnapshot(
      input,
      calculation.lines[0],
      {
        lineId: 'line-001',
        lineNumber: 1,
        productCode: 'LAP-001',
        unitOfMeasure: 'EA',
      }
    );

    expect(snapshot.lineId).toBe('line-001');
    expect(snapshot.lineNumber).toBe(1);
    expect(snapshot.productId).toBe('product-001');
    expect(snapshot.productCode).toBe('LAP-001');
    expect(snapshot.description).toBe('Laptop');
    expect(snapshot.quantity).toBe(2);
    expect(snapshot.unitPrice).toBe(500);

    expect(snapshot.grossAmount).toBe(1000);
    expect(snapshot.discountAmount).toBe(100);
    expect(snapshot.netAmount).toBe(900);
    expect(snapshot.taxableAmount).toBe(900);
    expect(snapshot.taxAmount).toBe(135);
    expect(snapshot.totalAmount).toBe(1035);

    expect(snapshot.taxCategory).toBe('STANDARD');
    expect(snapshot.taxRate).toBe(15);
    expect(snapshot.taxCode).toBe('S');
    expect(snapshot.taxMode).toBe('EXCLUSIVE');
  });

  it('creates a VAT-inclusive snapshot correctly', () => {
    const input: InvoiceLineInput = {
      productId: 'product-002',
      description: 'Service',
      quantity: 1,
      unitPrice: 115,
      taxCategory: 'STANDARD',
      taxRate: 15,
      taxMode: 'INCLUSIVE',
    };

    const calculation = calculateInvoice({
      lines: [input],
    });

    const snapshot = createInvoiceLineSnapshot(
      input,
      calculation.lines[0],
      {
        lineId: 'line-002',
        lineNumber: 1,
        productCode: 'SRV-001',
        unitOfMeasure: 'EA',
      }
    );

    expect(snapshot.grossAmount).toBe(115);
    expect(snapshot.discountAmount).toBe(0);
    expect(snapshot.taxableAmount).toBe(100);
    expect(snapshot.taxAmount).toBe(15);
    expect(snapshot.totalAmount).toBe(115);
  });

  it('creates a zero-rated snapshot', () => {
    const input: InvoiceLineInput = {
      productId: 'product-003',
      description: 'Zero Rated Item',
      quantity: 1,
      unitPrice: 1000,
      taxCategory: 'ZERO_RATED',
      taxRate: 0,
      taxMode: 'EXCLUSIVE',
    };

    const calculation = calculateInvoice({
      lines: [input],
    });

    const snapshot = createInvoiceLineSnapshot(
      input,
      calculation.lines[0],
      {
        lineId: 'line-003',
        lineNumber: 1,
        productCode: 'ZR-001',
        unitOfMeasure: 'EA',
      }
    );

    expect(snapshot.taxCategory).toBe('ZERO_RATED');
    expect(snapshot.taxRate).toBe(0);
    expect(snapshot.taxAmount).toBe(0);
    expect(snapshot.taxableAmount).toBe(1000);
    expect(snapshot.totalAmount).toBe(1000);
  });

  it('rejects mismatched descriptions', () => {
    const input: InvoiceLineInput = {
      description: 'Original Product',
      quantity: 1,
      unitPrice: 100,
      taxCategory: 'STANDARD',
      taxRate: 15,
      taxMode: 'EXCLUSIVE',
    };

    const calculation = calculateInvoice({
      lines: [input],
    });

    const mismatchedCalculation = {
      ...calculation.lines[0],
      description: 'Different Product',
    };

    expect(() =>
      createInvoiceLineSnapshot(
        input,
        mismatchedCalculation,
        {
          lineId: 'line-004',
          lineNumber: 1,
        }
      )
    ).toThrow(
      'Invoice line calculation does not match input description'
    );
  });

  it('rejects invalid line numbers', () => {
    const input: InvoiceLineInput = {
      description: 'Product',
      quantity: 1,
      unitPrice: 100,
      taxCategory: 'STANDARD',
      taxRate: 15,
      taxMode: 'EXCLUSIVE',
    };

    const calculation = calculateInvoice({
      lines: [input],
    });

    expect(() =>
      createInvoiceLineSnapshot(
        input,
        calculation.lines[0],
        {
          lineId: 'line-005',
          lineNumber: 0,
        }
      )
    ).toThrow(
      'Invoice line number must be a positive integer'
    );
  });
});
