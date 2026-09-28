import { describe, expect, it } from 'vitest';

import type {
  InvoiceLineSnapshot,
} from '../invoicing/invoiceLineSnapshot';

import {
  mapInvoiceLinesToZatcaTaxTotal,
} from './zatcaTaxTotalsMapper';

function standardLine(
  id: string,
  lineNumber: number,
  taxableAmount: number,
  taxAmount: number,
  rate = 15
): InvoiceLineSnapshot {
  return {
    lineId: id,
    lineNumber,
    description: `Product ${id}`,
    quantity: 1,
    unitPrice: taxableAmount,
    grossAmount: taxableAmount,
    discountAmount: 0,
    netAmount: taxableAmount,
    taxCategory: 'STANDARD',
    taxRate: rate,
    taxMode: 'EXCLUSIVE',
    taxableAmount,
    taxAmount,
    totalAmount:
      taxableAmount + taxAmount,
  };
}

describe('ZATCA Tax Totals Mapper', () => {
  it('groups multiple STANDARD lines with the same rate', () => {
    const result =
      mapInvoiceLinesToZatcaTaxTotal([
        standardLine(
          'line-001',
          1,
          1000,
          150
        ),
        standardLine(
          'line-002',
          2,
          500,
          75
        ),
      ]);

    expect(result.taxSubtotals).toHaveLength(1);
    expect(
      result.taxSubtotals[0].taxableAmount
    ).toBe(1500);
    expect(
      result.taxSubtotals[0].taxAmount
    ).toBe(225);
    expect(
      result.taxSubtotals[0].taxCategory.code
    ).toBe('S');
    expect(
      result.taxSubtotals[0].taxCategory.rate
    ).toBe(15);
    expect(result.taxAmount).toBe(225);
  });

  it('creates separate subtotals for different STANDARD rates', () => {
    const result =
      mapInvoiceLinesToZatcaTaxTotal([
        standardLine(
          'line-001',
          1,
          1000,
          150,
          15
        ),
        standardLine(
          'line-002',
          2,
          1000,
          50,
          5
        ),
      ]);

    expect(result.taxSubtotals).toHaveLength(2);

    const rates =
      result.taxSubtotals
        .map(
          (subtotal) =>
            subtotal.taxCategory.rate
        )
        .sort(
          (a, b) => a - b
        );

    expect(rates).toEqual([5, 15]);
    expect(result.taxAmount).toBe(200);
  });

  it('creates separate subtotals for STANDARD and ZERO_RATED', () => {
    const zeroRated: InvoiceLineSnapshot = {
      lineId: 'line-002',
      lineNumber: 2,
      description: 'Zero Rated',
      quantity: 1,
      unitPrice: 300,
      grossAmount: 300,
      discountAmount: 0,
      netAmount: 300,
      taxCategory: 'ZERO_RATED',
      taxRate: 0,
      taxMode: 'EXCLUSIVE',
      taxExemptionReasonCode: 'TEST',
      taxExemptionReason: 'Test reason',
      taxableAmount: 300,
      taxAmount: 0,
      totalAmount: 300,
    };

    const result =
      mapInvoiceLinesToZatcaTaxTotal([
        standardLine(
          'line-001',
          1,
          1000,
          150
        ),
        zeroRated,
      ]);

    expect(result.taxSubtotals).toHaveLength(2);
    expect(result.taxAmount).toBe(150);

    const standard =
      result.taxSubtotals.find(
        (subtotal) =>
          subtotal.taxCategory.code === 'S'
      );

    const zero =
      result.taxSubtotals.find(
        (subtotal) =>
          subtotal.taxCategory.code === 'Z'
      );

    expect(standard?.taxableAmount).toBe(1000);
    expect(standard?.taxAmount).toBe(150);

    expect(zero?.taxableAmount).toBe(300);
    expect(zero?.taxAmount).toBe(0);
  });

  it('maps EXEMPT lines with zero VAT', () => {
    const exempt: InvoiceLineSnapshot = {
      lineId: 'line-003',
      lineNumber: 1,
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

    const result =
      mapInvoiceLinesToZatcaTaxTotal([
        exempt,
      ]);

    expect(result.taxSubtotals).toHaveLength(1);
    expect(
      result.taxSubtotals[0].taxCategory.code
    ).toBe('E');
    expect(
      result.taxSubtotals[0].taxableAmount
    ).toBe(500);
    expect(
      result.taxSubtotals[0].taxAmount
    ).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it('maps OUT_OF_SCOPE lines with zero VAT', () => {
    const outOfScope: InvoiceLineSnapshot = {
      lineId: 'line-004',
      lineNumber: 1,
      description: 'Out of Scope',
      quantity: 1,
      unitPrice: 250,
      grossAmount: 250,
      discountAmount: 0,
      netAmount: 250,
      taxCategory: 'OUT_OF_SCOPE',
      taxRate: 0,
      taxMode: 'EXCLUSIVE',
      taxableAmount: 250,
      taxAmount: 0,
      totalAmount: 250,
    };

    const result =
      mapInvoiceLinesToZatcaTaxTotal([
        outOfScope,
      ]);

    expect(result.taxSubtotals).toHaveLength(1);
    expect(
      result.taxSubtotals[0].taxCategory.code
    ).toBe('O');
    expect(result.taxAmount).toBe(0);
  });

  it('keeps exemption reasons separate when they differ', () => {
    const first: InvoiceLineSnapshot = {
      lineId: 'line-005',
      lineNumber: 1,
      description: 'Zero Rated A',
      quantity: 1,
      unitPrice: 100,
      grossAmount: 100,
      discountAmount: 0,
      netAmount: 100,
      taxCategory: 'ZERO_RATED',
      taxRate: 0,
      taxMode: 'EXCLUSIVE',
      taxExemptionReasonCode: 'A',
      taxExemptionReason: 'Reason A',
      taxableAmount: 100,
      taxAmount: 0,
      totalAmount: 100,
    };

    const second: InvoiceLineSnapshot = {
      lineId: 'line-006',
      lineNumber: 1,
      description: 'Zero Rated B',
      quantity: 1,
      unitPrice: 200,
      grossAmount: 200,
      discountAmount: 0,
      netAmount: 200,
      taxCategory: 'ZERO_RATED',
      taxRate: 0,
      taxMode: 'EXCLUSIVE',
      taxExemptionReasonCode: 'B',
      taxExemptionReason: 'Reason B',
      taxableAmount: 200,
      taxAmount: 0,
      totalAmount: 200,
    };

    const result =
      mapInvoiceLinesToZatcaTaxTotal([
        first,
        second,
      ]);

    expect(result.taxSubtotals).toHaveLength(2);
  });

  it('rejects empty invoice lines', () => {
    expect(() =>
      mapInvoiceLinesToZatcaTaxTotal([])
    ).toThrow(
      'At least one invoice line is required'
    );
  });

  it('rejects a negative taxable amount', () => {
    const line =
      standardLine(
        'line-007',
        1,
        100,
        15
      );

    line.taxableAmount = -1;

    expect(() =>
      mapInvoiceLinesToZatcaTaxTotal([
        line,
      ])
    ).toThrow(
      'Invoice line taxable amount must be non-negative'
    );
  });

  it('groups STANDARD lines with the same rate even when taxCode differs', () => {
    const first = standardLine(
      'line-011',
      1,
      1000,
      150,
      15
    );

    first.taxCode = 'VAT-A';

    const second = standardLine(
      'line-012',
      2,
      500,
      75,
      15
    );

    second.taxCode = 'VAT-B';

    const result =
      mapInvoiceLinesToZatcaTaxTotal([
        first,
        second,
      ]);

    expect(result.taxSubtotals).toHaveLength(1);
    expect(
      result.taxSubtotals[0].taxCategory.code
    ).toBe('S');
    expect(
      result.taxSubtotals[0].taxCategory.rate
    ).toBe(15);
    expect(
      result.taxSubtotals[0].taxableAmount
    ).toBe(1500);
    expect(
      result.taxSubtotals[0].taxAmount
    ).toBe(225);
    expect(result.taxAmount).toBe(225);
  });
  it('treats equivalent STANDARD VAT rates as the same tax group', () => {
    const result =
      mapInvoiceLinesToZatcaTaxTotal([
        standardLine(
          'line-009',
          1,
          1000,
          150,
          15
        ),
        standardLine(
          'line-010',
          2,
          500,
          75,
          15.00
        ),
      ]);

    expect(result.taxSubtotals).toHaveLength(1);
    expect(
      result.taxSubtotals[0].taxCategory.rate
    ).toBe(15);
    expect(
      result.taxSubtotals[0].taxableAmount
    ).toBe(1500);
    expect(
      result.taxSubtotals[0].taxAmount
    ).toBe(225);
    expect(result.taxAmount).toBe(225);
  });
  it('applies a STANDARD allowance to the matching tax group', () => {
    const line = standardLine(
      'line-013',
      1,
      1000,
      150,
      15
    );

    const result =
      mapInvoiceLinesToZatcaTaxTotal(
        [line],
        [
          {
            charge: false,
            amount: 100,
            taxCategory: 'STANDARD',
            taxRate: 15,
            reasonCode: '95',
            reason: 'Discount',
          },
        ]
      );

    expect(result.taxSubtotals).toHaveLength(1);
    expect(
      result.taxSubtotals[0].taxableAmount
    ).toBe(900);
    expect(
      result.taxSubtotals[0].taxAmount
    ).toBe(135);
    expect(result.taxAmount).toBe(135);
  });

  it('applies a STANDARD charge to the matching tax group', () => {
    const line = standardLine(
      'line-014',
      1,
      1000,
      150,
      15
    );

    const result =
      mapInvoiceLinesToZatcaTaxTotal(
        [line],
        [
          {
            charge: true,
            amount: 100,
            taxCategory: 'STANDARD',
            taxRate: 15,
            reason: 'Service charge',
          },
        ]
      );

    expect(result.taxSubtotals).toHaveLength(1);
    expect(
      result.taxSubtotals[0].taxableAmount
    ).toBe(1100);
    expect(
      result.taxSubtotals[0].taxAmount
    ).toBe(165);
    expect(result.taxAmount).toBe(165);
  });

  it('creates a new tax group for an adjustment category not present on invoice lines', () => {
    const line = standardLine(
      'line-015',
      1,
      1000,
      150,
      15
    );

    const result =
      mapInvoiceLinesToZatcaTaxTotal(
        [line],
        [
          {
            charge: false,
            amount: 100,
            taxCategory: 'ZERO_RATED',
            taxRate: 0,
            reasonCode: 'TEST',
            reason: 'Zero-rated adjustment',
            taxExemptionReasonCode: 'TEST',
            taxExemptionReason: 'Zero-rated adjustment',
          },
        ]
      );

    expect(result.taxSubtotals).toHaveLength(2);

    const standard =
      result.taxSubtotals.find(
        (subtotal) =>
          subtotal.taxCategory.code === 'S'
      );

    const zeroRated =
      result.taxSubtotals.find(
        (subtotal) =>
          subtotal.taxCategory.code === 'Z'
      );

    expect(standard?.taxableAmount).toBe(1000);
    expect(standard?.taxAmount).toBe(150);

    expect(zeroRated?.taxableAmount).toBe(-100);
    expect(zeroRated?.taxAmount).toBe(0);
  });

  it('keeps STANDARD and ZERO_RATED adjustments in separate tax groups', () => {
    const lines = [
      standardLine(
        'line-016',
        1,
        1000,
        150,
        15
      ),
      {
        ...standardLine(
          'line-017',
          2,
          500,
          0,
          0
        ),
        taxCategory: 'ZERO_RATED' as const,
        taxRate: 0,
        taxAmount: 0,
        taxExemptionReasonCode: 'TEST',
        taxExemptionReason: 'Zero-rated adjustment',
      },
    ];

    const result =
      mapInvoiceLinesToZatcaTaxTotal(
        lines,
        [
          {
            charge: false,
            amount: 100,
            taxCategory: 'STANDARD',
            taxRate: 15,
          },
          {
            charge: false,
            amount: 50,
            taxCategory: 'ZERO_RATED',
            taxRate: 0,
            reasonCode: 'TEST',
            reason: 'Zero-rated adjustment',
            taxExemptionReasonCode: 'TEST',
            taxExemptionReason: 'Zero-rated adjustment',
          },
        ]
      );

    expect(result.taxSubtotals).toHaveLength(2);

    const standard =
      result.taxSubtotals.find(
        (subtotal) =>
          subtotal.taxCategory.code === 'S'
      );

    const zeroRated =
      result.taxSubtotals.find(
        (subtotal) =>
          subtotal.taxCategory.code === 'Z'
      );

    expect(standard?.taxableAmount).toBe(900);
    expect(standard?.taxAmount).toBe(135);

    expect(zeroRated?.taxableAmount).toBe(450);
    expect(zeroRated?.taxAmount).toBe(0);

    expect(result.taxAmount).toBe(135);
  });

  it('preserves exemption reason when an adjustment creates a new EXEMPT group', () => {
    const result =
      mapInvoiceLinesToZatcaTaxTotal(
        [
          standardLine(
            'line-018',
            1,
            1000,
            150,
            15
          ),
        ],
        [
          {
            charge: false,
            amount: 100,
            taxCategory: 'EXEMPT',
            taxRate: 0,
            reasonCode: 'TEST-EXEMPT',
            reason: 'Exempt adjustment',
            taxExemptionReasonCode: 'TEST-EXEMPT',
            taxExemptionReason: 'Exempt adjustment',
          },
        ]
      );

    const exempt =
      result.taxSubtotals.find(
        (subtotal) =>
          subtotal.taxCategory.code === 'E'
      );

    expect(exempt).toBeDefined();
    expect(
      exempt?.taxableAmount
    ).toBe(-100);
    expect(
      exempt?.taxAmount
    ).toBe(0);
    expect(
      exempt?.taxCategory.taxExemptionReasonCode
    ).toBe('TEST-EXEMPT');
    expect(
      exempt?.taxCategory.taxExemptionReason
    ).toBe('Exempt adjustment');
  });

  it('rejects a negative tax amount', () => {
    const line =
      standardLine(
        'line-008',
        1,
        100,
        15
      );

    line.taxAmount = -1;

    expect(() =>
      mapInvoiceLinesToZatcaTaxTotal([
        line,
      ])
    ).toThrow(
      'Invoice line tax amount must be non-negative'
    );
  });
});







