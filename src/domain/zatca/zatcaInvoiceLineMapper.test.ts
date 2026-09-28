import { describe, expect, it } from 'vitest';

import type {
  InvoiceLineSnapshot,
} from '../invoicing/invoiceLineSnapshot';

import {
  mapInvoiceLineToZatca,
} from './zatcaInvoiceLineMapper';

describe('ZATCA Invoice Line Mapper', () => {
  it('maps a standard VAT line correctly', () => {
    const line: InvoiceLineSnapshot = {
      lineId: 'line-001',
      lineNumber: 1,
      productId: 'product-001',
      productCode: 'LAP-001',
      description: 'Laptop',
      unitOfMeasure: 'EA',
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

    const result = mapInvoiceLineToZatca(line, {
      unitCode: 'EA',
    });

    expect(result.id).toBe('line-001');
    expect(result.lineNumber).toBe(1);
    expect(result.quantity).toBe(2);
    expect(result.unitCode).toBe('EA');
    expect(result.itemName).toBe('Laptop');
    expect(result.productCode).toBe('LAP-001');
    expect(result.unitPrice).toBe(500);
    expect(result.allowanceAmount).toBe(100);
    expect(result.lineExtensionAmount).toBe(900);
    expect(result.taxableAmount).toBe(900);
    expect(result.taxAmount).toBe(135);

    expect(result.taxCategory.code).toBe('S');
    expect(result.taxCategory.rate).toBe(15);
  });

  it('maps a VAT-inclusive line without recalculating VAT', () => {
    const line: InvoiceLineSnapshot = {
      lineId: 'line-002',
      lineNumber: 1,
      productId: 'product-002',
      productCode: 'SRV-001',
      description: 'Consulting Service',
      unitOfMeasure: 'EA',
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

    const result = mapInvoiceLineToZatca(line, {
      unitCode: 'EA',
    });

    expect(result.unitPrice).toBe(115);
    expect(result.lineExtensionAmount).toBe(115);
    expect(result.taxableAmount).toBe(100);
    expect(result.taxAmount).toBe(15);
    expect(result.taxCategory.code).toBe('S');
    expect(result.taxCategory.rate).toBe(15);
  });

  it('maps a zero-rated line with its exemption reason snapshot', () => {
    const line: InvoiceLineSnapshot = {
      lineId: 'line-003',
      lineNumber: 1,
      productCode: 'ZR-001',
      description: 'Zero Rated Item',
      quantity: 1,
      unitPrice: 1000,
      grossAmount: 1000,
      discountAmount: 0,
      netAmount: 1000,
      taxCategory: 'ZERO_RATED',
      taxRate: 0,
      taxMode: 'EXCLUSIVE',
      taxExemptionReasonCode: 'TEST',
      taxExemptionReason: 'Test reason',
      taxableAmount: 1000,
      taxAmount: 0,
      totalAmount: 1000,
    };

    const result = mapInvoiceLineToZatca(line, {
      unitCode: 'EA',
    });

    expect(result.taxCategory.code).toBe('Z');
    expect(result.taxCategory.rate).toBe(0);
    expect(result.taxCategory.taxExemptionReasonCode)
      .toBe('TEST');
    expect(result.taxCategory.taxExemptionReason)
      .toBe('Test reason');
    expect(result.taxAmount).toBe(0);
    expect(result.taxableAmount).toBe(1000);
  });

  it('maps an exempt line with its exemption reason snapshot', () => {
    const line: InvoiceLineSnapshot = {
      lineId: 'line-004',
      lineNumber: 1,
      productCode: 'EX-001',
      description: 'Exempt Service',
      quantity: 1,
      unitPrice: 500,
      grossAmount: 500,
      discountAmount: 0,
      netAmount: 500,
      taxCategory: 'EXEMPT',
      taxRate: 0,
      taxMode: 'EXCLUSIVE',
      taxExemptionReasonCode: 'TEST',
      taxExemptionReason: 'Test reason',
      taxableAmount: 500,
      taxAmount: 0,
      totalAmount: 500,
    };

    const result = mapInvoiceLineToZatca(line, {
      unitCode: 'EA',
    });

    expect(result.taxCategory.code).toBe('E');
    expect(result.taxCategory.rate).toBe(0);
    expect(result.taxCategory.taxExemptionReasonCode)
      .toBe('TEST');
    expect(result.taxCategory.taxExemptionReason)
      .toBe('Test reason');
    expect(result.taxAmount).toBe(0);
  });

  it('does not include an allowance amount when there is no discount', () => {
    const line: InvoiceLineSnapshot = {
      lineId: 'line-005',
      lineNumber: 1,
      productCode: 'PRD-001',
      description: 'Product',
      quantity: 1,
      unitPrice: 100,
      grossAmount: 100,
      discountAmount: 0,
      netAmount: 100,
      taxCategory: 'STANDARD',
      taxRate: 15,
      taxMode: 'EXCLUSIVE',
      taxableAmount: 100,
      taxAmount: 15,
      totalAmount: 115,
    };

    const result = mapInvoiceLineToZatca(line);

    expect(result.allowanceAmount).toBeUndefined();
  });

  it('rejects an invalid line ID', () => {
    const line: InvoiceLineSnapshot = {
      lineId: '   ',
      lineNumber: 1,
      description: 'Product',
      quantity: 1,
      unitPrice: 100,
      grossAmount: 100,
      discountAmount: 0,
      netAmount: 100,
      taxCategory: 'STANDARD',
      taxRate: 15,
      taxMode: 'EXCLUSIVE',
      taxableAmount: 100,
      taxAmount: 15,
      totalAmount: 115,
    };

    expect(() =>
      mapInvoiceLineToZatca(line)
    ).toThrow(
      'Invoice line ID is required'
    );
  });

  it('rejects an invalid line number', () => {
    const line: InvoiceLineSnapshot = {
      lineId: 'line-007',
      lineNumber: 0,
      description: 'Product',
      quantity: 1,
      unitPrice: 100,
      grossAmount: 100,
      discountAmount: 0,
      netAmount: 100,
      taxCategory: 'STANDARD',
      taxRate: 15,
      taxMode: 'EXCLUSIVE',
      taxableAmount: 100,
      taxAmount: 15,
      totalAmount: 115,
    };

    expect(() =>
      mapInvoiceLineToZatca(line)
    ).toThrow(
      'Invoice line number must be a positive integer'
    );
  });

  it('rejects invalid quantity', () => {
    const line: InvoiceLineSnapshot = {
      lineId: 'line-008',
      lineNumber: 1,
      description: 'Product',
      quantity: 0,
      unitPrice: 100,
      grossAmount: 0,
      discountAmount: 0,
      netAmount: 0,
      taxCategory: 'STANDARD',
      taxRate: 15,
      taxMode: 'EXCLUSIVE',
      taxableAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
    };

    expect(() =>
      mapInvoiceLineToZatca(line)
    ).toThrow(
      'Invoice line quantity must be greater than zero'
    );
  });
});
