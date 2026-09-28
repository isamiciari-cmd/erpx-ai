import { describe, expect, it } from 'vitest';
import { calculateInvoice } from './invoiceCalculation';

describe('Invoice Calculation Engine', () => {
  it('calculates a simple 15% VAT invoice', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Product A',
          quantity: 2,
          unitPrice: 500,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
    });

    expect(result.subtotal).toBe(1000);
    expect(result.discountTotal).toBe(0);
    expect(result.documentAllowanceTotal).toBe(0);
    expect(result.documentChargeTotal).toBe(0);
    expect(result.taxableTotal).toBe(1000);
    expect(result.taxTotal).toBe(150);
    expect(result.grandTotal).toBe(1150);
  });

  it('calculates discount before VAT', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Product A',
          quantity: 2,
          unitPrice: 500,
          discountType: 'FIXED',
          discountValue: 100,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
    });

    expect(result.subtotal).toBe(1000);
    expect(result.discountTotal).toBe(100);
    expect(result.documentAllowanceTotal).toBe(0);
    expect(result.documentChargeTotal).toBe(0);
    expect(result.taxableTotal).toBe(900);
    expect(result.taxTotal).toBe(135);
    expect(result.grandTotal).toBe(1035);
  });

  it('calculates VAT from an inclusive price', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Inclusive Product',
          quantity: 1,
          unitPrice: 115,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'INCLUSIVE',
        },
      ],
    });

    expect(result.subtotal).toBe(115);
    expect(result.discountTotal).toBe(0);
    expect(result.taxableTotal).toBe(100);
    expect(result.taxTotal).toBe(15);
    expect(result.grandTotal).toBe(115);
  });

  it('calculates multiple invoice lines', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Product A',
          quantity: 2,
          unitPrice: 500,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
        {
          description: 'Product B',
          quantity: 1,
          unitPrice: 200,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
    });

    expect(result.subtotal).toBe(1200);
    expect(result.taxableTotal).toBe(1200);
    expect(result.taxTotal).toBe(180);
    expect(result.grandTotal).toBe(1380);
    expect(result.lines).toHaveLength(2);
  });

  it('supports zero-rated lines', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Zero Rated Product',
          quantity: 1,
          unitPrice: 1000,
          taxCategory: 'ZERO_RATED',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
    });

    expect(result.taxableTotal).toBe(1000);
    expect(result.taxTotal).toBe(0);
    expect(result.grandTotal).toBe(1000);
    expect(result.lines[0].taxSnapshot.category).toBe('ZERO_RATED');
    expect(result.lines[0].taxSnapshot.rate).toBe(0);
  });

  it('supports exempt lines', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Exempt Product',
          quantity: 1,
          unitPrice: 750,
          taxCategory: 'EXEMPT',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
    });

    expect(result.taxableTotal).toBe(750);
    expect(result.taxTotal).toBe(0);
    expect(result.grandTotal).toBe(750);
    expect(result.lines[0].taxSnapshot.category).toBe('EXEMPT');
  });

  it('preserves the tax snapshot on the invoice line', () => {
    const result = calculateInvoice({
      lines: [
        {
          productId: 'product-001',
          description: 'VAT Product',
          quantity: 1,
          unitPrice: 100,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxCode: 'VAT15',
          taxMode: 'EXCLUSIVE',
        },
      ],
    });

    expect(result.lines[0].taxSnapshot).toEqual({
      category: 'STANDARD',
      rate: 15,
      code: 'VAT15',
      mode: 'EXCLUSIVE',
      taxableAmount: 100,
      taxAmount: 15,
    });
  });

  it('supports percentage discounts', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Discounted Product',
          quantity: 1,
          unitPrice: 1000,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
    });

    expect(result.subtotal).toBe(1000);
    expect(result.discountTotal).toBe(100);
    expect(result.taxableTotal).toBe(900);
    expect(result.taxTotal).toBe(135);
    expect(result.grandTotal).toBe(1035);
  });

  it('supports decimal quantities', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Measured Product',
          quantity: 2.5,
          unitPrice: 10,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
    });

    expect(result.subtotal).toBe(25);
    expect(result.taxableTotal).toBe(25);
    expect(result.taxTotal).toBe(3.75);
    expect(result.grandTotal).toBe(28.75);
  });

  it('calculates a document allowance before VAT', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Product A',
          quantity: 1,
          unitPrice: 1000,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
      allowanceCharges: [
        {
          charge: false,
          amount: 100,
          taxCategory: 'STANDARD',
          taxRate: 15,
          reason: 'Document discount',
        },
      ],
    });

    expect(result.subtotal).toBe(1000);
    expect(result.discountTotal).toBe(0);
    expect(result.documentAllowanceTotal).toBe(100);
    expect(result.documentChargeTotal).toBe(0);
    expect(result.taxableTotal).toBe(900);
    expect(result.taxTotal).toBe(135);
    expect(result.grandTotal).toBe(1035);
  });

  it('calculates a document charge before VAT', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Product A',
          quantity: 1,
          unitPrice: 1000,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
      allowanceCharges: [
        {
          charge: true,
          amount: 50,
          taxCategory: 'STANDARD',
          taxRate: 15,
          reason: 'Shipping charge',
        },
      ],
    });

    expect(result.subtotal).toBe(1000);
    expect(result.documentAllowanceTotal).toBe(0);
    expect(result.documentChargeTotal).toBe(50);
    expect(result.taxableTotal).toBe(1050);
    expect(result.taxTotal).toBe(157.5);
    expect(result.grandTotal).toBe(1207.5);
  });

  it('combines line discount and document allowance without double counting', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Product A',
          quantity: 1,
          unitPrice: 1000,
          discountType: 'FIXED',
          discountValue: 100,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
      allowanceCharges: [
        {
          charge: false,
          amount: 50,
          taxCategory: 'STANDARD',
          taxRate: 15,
          reason: 'Additional document discount',
        },
      ],
    });

    expect(result.subtotal).toBe(1000);
    expect(result.discountTotal).toBe(100);
    expect(result.documentAllowanceTotal).toBe(50);
    expect(result.taxableTotal).toBe(850);
    expect(result.taxTotal).toBe(127.5);
    expect(result.grandTotal).toBe(977.5);
  });

  it('combines line discount, document allowance and document charge', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Product A',
          quantity: 1,
          unitPrice: 1000,
          discountType: 'FIXED',
          discountValue: 100,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
      allowanceCharges: [
        {
          charge: false,
          amount: 50,
          taxCategory: 'STANDARD',
          taxRate: 15,
          reason: 'Document discount',
        },
        {
          charge: true,
          amount: 25,
          taxCategory: 'STANDARD',
          taxRate: 15,
          reason: 'Shipping charge',
        },
      ],
    });

    expect(result.subtotal).toBe(1000);
    expect(result.discountTotal).toBe(100);
    expect(result.documentAllowanceTotal).toBe(50);
    expect(result.documentChargeTotal).toBe(25);
    expect(result.taxableTotal).toBe(875);
    expect(result.taxTotal).toBe(131.25);
    expect(result.grandTotal).toBe(1006.25);
  });

  it('rejects a document allowance greater than the taxable amount', () => {
    expect(() =>
      calculateInvoice({
        lines: [
          {
            description: 'Product A',
            quantity: 1,
            unitPrice: 100,
            taxCategory: 'STANDARD',
            taxRate: 15,
            taxMode: 'EXCLUSIVE',
          },
        ],
        allowanceCharges: [
          {
            charge: false,
            amount: 101,
            taxCategory: 'STANDARD',
            taxRate: 15,
          },
        ],
      })
    ).toThrow(
      'Document allowances cannot exceed the taxable amount'
    );
  });

  it('rejects a non-standard document adjustment with non-zero tax rate', () => {
    expect(() =>
      calculateInvoice({
        lines: [
          {
            description: 'Product A',
            quantity: 1,
            unitPrice: 100,
            taxCategory: 'STANDARD',
            taxRate: 15,
            taxMode: 'EXCLUSIVE',
          },
        ],
        allowanceCharges: [
          {
            charge: false,
            amount: 10,
            taxCategory: 'ZERO_RATED',
            taxRate: 15,
          },
        ],
      })
    ).toThrow(
      'Non-standard document allowance/charge tax categories must have a zero tax rate'
    );
  });

  it('preserves document allowance and charge inputs', () => {
    const adjustments = [
      {
        charge: false,
        amount: 50,
        taxCategory: 'STANDARD' as const,
        taxRate: 15,
        reasonCode: '95',
        reason: 'Document discount',
      },
      {
        charge: true,
        amount: 25,
        taxCategory: 'STANDARD' as const,
        taxRate: 15,
        reasonCode: 'S',
        reason: 'Shipping',
      },
    ];

    const result = calculateInvoice({
      lines: [
        {
          description: 'Product A',
          quantity: 1,
          unitPrice: 1000,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
      ],
      allowanceCharges: adjustments,
    });

    expect(result.allowanceCharges).toEqual(adjustments);
  });
});
  it('allocates document allowances across multiple VAT categories', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Standard Product',
          quantity: 1,
          unitPrice: 1000,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
        {
          description: 'Zero Rated Product',
          quantity: 1,
          unitPrice: 300,
          taxCategory: 'ZERO_RATED',
          taxRate: 0,
          taxMode: 'EXCLUSIVE',
        },
      ],
      allowanceCharges: [
        {
          charge: false,
          amount: 100,
          taxCategory: 'STANDARD',
          taxRate: 15,
          reasonCode: '95',
          reason: 'Standard discount',
        },
        {
          charge: false,
          amount: 50,
          taxCategory: 'ZERO_RATED',
          taxRate: 0,
          reasonCode: '95',
          reason: 'Zero-rated discount',
        },
      ],
    });

    expect(result.subtotal).toBe(1300);
    expect(result.discountTotal).toBe(0);
    expect(result.documentAllowanceTotal).toBe(150);
    expect(result.documentChargeTotal).toBe(0);
    expect(result.taxableTotal).toBe(1150);
    expect(result.taxTotal).toBe(135);
    expect(result.grandTotal).toBe(1285);
  });
  it('keeps document allowances separated between STANDARD and EXEMPT categories', () => {
    const result = calculateInvoice({
      lines: [
        {
          description: 'Standard Product',
          quantity: 1,
          unitPrice: 1000,
          taxCategory: 'STANDARD',
          taxRate: 15,
          taxMode: 'EXCLUSIVE',
        },
        {
          description: 'Exempt Product',
          quantity: 1,
          unitPrice: 500,
          taxCategory: 'EXEMPT',
          taxRate: 0,
          taxMode: 'EXCLUSIVE',
        },
      ],
      allowanceCharges: [
        {
          charge: false,
          amount: 100,
          taxCategory: 'STANDARD',
          taxRate: 15,
          reasonCode: '95',
          reason: 'Standard discount',
        },
        {
          charge: false,
          amount: 50,
          taxCategory: 'EXEMPT',
          taxRate: 0,
          reasonCode: '95',
          reason: 'Exempt discount',
          taxExemptionReasonCode: 'TEST',
          taxExemptionReason: 'Test reason',
        },
      ],
    });

    expect(result.subtotal).toBe(1500);
    expect(result.documentAllowanceTotal).toBe(150);
    expect(result.taxableTotal).toBe(1350);
    expect(result.taxTotal).toBe(135);
    expect(result.grandTotal).toBe(1485);
  });

