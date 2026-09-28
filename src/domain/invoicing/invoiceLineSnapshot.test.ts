import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  InvoiceLineSnapshot,
} from './invoiceLineSnapshot';

describe('Invoice Line Snapshot', () => {
  it('stores a complete standard VAT invoice line snapshot', () => {
    const line: InvoiceLineSnapshot = {
      lineId: 'line-001',
      lineNumber: 1,

      productId: 'product-001',
      productCode: 'SKU-001',

      description: 'Test Product',
      unitOfMeasure: 'PCS',

      quantity: 2,
      unitPrice: 500,

      discountType: 'FIXED',
      discountValue: 100,

      grossAmount: 1000,
      discountAmount: 100,
      netAmount: 900,

      taxCategory: 'STANDARD',
      taxCode: 'S',
      taxRate: 15,
      taxMode: 'EXCLUSIVE',

      taxableAmount: 900,
      taxAmount: 135,
      totalAmount: 1035,
    };

    expect(line.lineId).toBe('line-001');
    expect(line.lineNumber).toBe(1);

    expect(line.productId).toBe('product-001');
    expect(line.productCode).toBe('SKU-001');

    expect(line.quantity).toBe(2);
    expect(line.unitPrice).toBe(500);

    expect(line.grossAmount).toBe(1000);
    expect(line.discountAmount).toBe(100);
    expect(line.netAmount).toBe(900);

    expect(line.taxCategory).toBe('STANDARD');
    expect(line.taxRate).toBe(15);
    expect(line.taxableAmount).toBe(900);
    expect(line.taxAmount).toBe(135);

    expect(line.totalAmount).toBe(1035);
  });

  it('supports zero-rated lines', () => {
    const line: InvoiceLineSnapshot = {
      lineId: 'line-002',
      lineNumber: 1,

      description: 'Zero Rated Product',

      quantity: 1,
      unitPrice: 100,

      grossAmount: 100,
      discountAmount: 0,
      netAmount: 100,

      taxCategory: 'ZERO_RATED',
      taxRate: 0,
      taxMode: 'EXCLUSIVE',

      taxableAmount: 100,
      taxAmount: 0,
      totalAmount: 100,
    };

    expect(line.taxCategory).toBe('ZERO_RATED');
    expect(line.taxRate).toBe(0);
    expect(line.taxAmount).toBe(0);
    expect(line.totalAmount).toBe(100);
  });

  it('supports VAT-inclusive lines', () => {
    const line: InvoiceLineSnapshot = {
      lineId: 'line-003',
      lineNumber: 1,

      description: 'VAT Inclusive Product',

      quantity: 1,
      unitPrice: 115,

      grossAmount: 115,
      discountAmount: 0,
      netAmount: 115,

      taxCategory: 'STANDARD',
      taxRate: 15,
      taxMode: 'INCLUSIVE',

      taxableAmount: 100,
      taxAmount: 15,
      totalAmount: 115,
    };

    expect(line.taxMode).toBe('INCLUSIVE');
    expect(line.taxableAmount).toBe(100);
    expect(line.taxAmount).toBe(15);
    expect(line.totalAmount).toBe(115);
  });

  it('supports service lines without a product ID', () => {
    const line: InvoiceLineSnapshot = {
      lineId: 'line-004',
      lineNumber: 1,

      description: 'Consulting Service',

      quantity: 1,
      unitPrice: 1000,

      grossAmount: 1000,
      discountAmount: 0,
      netAmount: 1000,

      taxCategory: 'STANDARD',
      taxRate: 15,
      taxMode: 'EXCLUSIVE',

      taxableAmount: 1000,
      taxAmount: 150,
      totalAmount: 1150,
    };

    expect(line.productId).toBeUndefined();
    expect(line.description).toBe('Consulting Service');
    expect(line.taxAmount).toBe(150);
  });
});
