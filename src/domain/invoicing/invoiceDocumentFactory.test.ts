import { describe, expect, it } from 'vitest';

import {
  calculateInvoice,
} from './invoiceCalculation';

import {
  createInvoiceDocument,
} from './invoiceDocumentFactory';

import type {
  InvoiceLineInput,
} from './invoiceTypes';

describe('Invoice Document Factory', () => {
  it('creates a complete standard VAT invoice document', () => {
    const lineInputs: InvoiceLineInput[] = [
      {
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
      },
    ];

    const calculation = calculateInvoice({
      lines: lineInputs,
    });

    const document = createInvoiceDocument({
      identifiers: {
        invoiceId: 'invoice-001',
        invoiceNumber: 'INV-000001',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
      },

      documentType: 'TAX_INVOICE',

      baseType: 'TAX_INVOICE',

      partyType: 'B2B',

      dates: {
        issueDate: '2026-09-26',
        issueTime: '15:00:00',
      },

      currency: 'SAR',

      seller: {
        legalName: 'ERPX Demo Company',
        vatNumber: '300000000000003',
        address: {
          city: 'Jeddah',
          countryCode: 'SA',
        },
      },

      buyer: {
        legalName: 'Test Customer',
        vatNumber: '310000000000003',
        address: {
          city: 'Jeddah',
          countryCode: 'SA',
        },
      },

      lineInputs,

      calculation,

      lineContexts: [
        {
          lineId: 'line-001',
          lineNumber: 1,
          productCode: 'LAP-001',
          unitOfMeasure: 'EA',
        },
      ],

      amountPaid: 500,
    });

    expect(document.identifiers.invoiceNumber)
      .toBe('INV-000001');

    expect(document.documentType)
      .toBe('TAX_INVOICE');

    expect(document.baseType)
      .toBe('TAX_INVOICE');

    expect(document.partyType)
      .toBe('B2B');

    expect(document.currency)
      .toBe('SAR');

    expect(document.seller.legalName)
      .toBe('ERPX Demo Company');

    expect(document.buyer?.legalName)
      .toBe('Test Customer');

    expect(document.lines)
      .toHaveLength(1);

    expect(document.lines[0].productCode)
      .toBe('LAP-001');

    expect(document.lines[0].grossAmount)
      .toBe(1000);

    expect(document.lines[0].discountAmount)
      .toBe(100);

    expect(document.lines[0].taxableAmount)
      .toBe(900);

    expect(document.lines[0].taxAmount)
      .toBe(135);

    expect(document.lines[0].totalAmount)
      .toBe(1035);

    expect(document.totals.subtotal)
      .toBe(1000);

    expect(document.totals.discountTotal)
      .toBe(100);

    expect(document.totals.taxableTotal)
      .toBe(900);

    expect(document.totals.taxTotal)
      .toBe(135);

    expect(document.totals.grandTotal)
      .toBe(1035);

    expect(document.totals.amountPaid)
      .toBe(500);

    expect(document.totals.amountDue)
      .toBe(535);
  });

  it('creates a VAT-inclusive invoice document', () => {
    const lineInputs: InvoiceLineInput[] = [
      {
        productId: 'product-002',
        description: 'Service',
        quantity: 1,
        unitPrice: 115,
        taxCategory: 'STANDARD',
        taxRate: 15,
        taxMode: 'INCLUSIVE',
      },
    ];

    const calculation = calculateInvoice({
      lines: lineInputs,
    });

    const document = createInvoiceDocument({
      identifiers: {
        invoiceId: 'invoice-002',
        invoiceNumber: 'INV-000002',
        uuid: '550e8400-e29b-41d4-a716-446655440001',
      },

      documentType: 'TAX_INVOICE',

      baseType: 'TAX_INVOICE',

      partyType: 'B2B',

      dates: {
        issueDate: '2026-09-26',
      },

      currency: 'SAR',

      seller: {
        legalName: 'ERPX Demo Company',
        address: {
          city: 'Jeddah',
          countryCode: 'SA',
        },
      },

      lineInputs,

      calculation,

      lineContexts: [
        {
          lineId: 'line-002',
          lineNumber: 1,
          productCode: 'SRV-001',
          unitOfMeasure: 'EA',
        },
      ],
    });

    expect(document.lines[0].grossAmount)
      .toBe(115);

    expect(document.lines[0].taxableAmount)
      .toBe(100);

    expect(document.lines[0].taxAmount)
      .toBe(15);

    expect(document.lines[0].totalAmount)
      .toBe(115);

    expect(document.totals.grandTotal)
      .toBe(115);

    expect(document.totals.amountPaid)
      .toBe(0);

    expect(document.totals.amountDue)
      .toBe(115);
  });

  it('creates a zero-rated invoice document', () => {
    const lineInputs: InvoiceLineInput[] = [
      {
        productId: 'product-003',
        description: 'Zero Rated Item',
        quantity: 1,
        unitPrice: 1000,
        taxCategory: 'ZERO_RATED',
        taxRate: 0,
        taxMode: 'EXCLUSIVE',
      },
    ];

    const calculation = calculateInvoice({
      lines: lineInputs,
    });

    const document = createInvoiceDocument({
      identifiers: {
        invoiceId: 'invoice-003',
        invoiceNumber: 'INV-000003',
        uuid: '550e8400-e29b-41d4-a716-446655440002',
      },

      documentType: 'SIMPLIFIED_TAX_INVOICE',

      baseType: 'SIMPLIFIED_TAX_INVOICE',

      partyType: 'B2C',

      dates: {
        issueDate: '2026-09-26',
      },

      currency: 'SAR',

      seller: {
        legalName: 'ERPX Demo Company',
        address: {
          city: 'Jeddah',
          countryCode: 'SA',
        },
      },

      lineInputs,

      calculation,

      lineContexts: [
        {
          lineId: 'line-003',
          lineNumber: 1,
          productCode: 'ZR-001',
          unitOfMeasure: 'EA',
        },
      ],
    });

    expect(document.documentType)
      .toBe('SIMPLIFIED_TAX_INVOICE');

    expect(document.partyType)
      .toBe('B2C');

    expect(document.lines[0].taxCategory)
      .toBe('ZERO_RATED');

    expect(document.lines[0].taxRate)
      .toBe(0);

    expect(document.lines[0].taxAmount)
      .toBe(0);

    expect(document.lines[0].totalAmount)
      .toBe(1000);

    expect(document.totals.taxTotal)
      .toBe(0);

    expect(document.totals.grandTotal)
      .toBe(1000);
  });

  it('rejects mismatched line counts', () => {
    const lineInputs: InvoiceLineInput[] = [
      {
        description: 'Product',
        quantity: 1,
        unitPrice: 100,
        taxCategory: 'STANDARD',
        taxRate: 15,
        taxMode: 'EXCLUSIVE',
      },
    ];

    const calculation = calculateInvoice({
      lines: lineInputs,
    });

    expect(() =>
      createInvoiceDocument({
        identifiers: {
          invoiceId: 'invoice-004',
          invoiceNumber: 'INV-000004',
          uuid: '550e8400-e29b-41d4-a716-446655440003',
        },

        documentType: 'TAX_INVOICE',

        baseType: 'TAX_INVOICE',

        partyType: 'B2B',

        dates: {
          issueDate: '2026-09-26',
        },

        currency: 'SAR',

        seller: {
          legalName: 'ERPX Demo Company',
          address: {
            city: 'Jeddah',
            countryCode: 'SA',
          },
        },

        lineInputs,

        calculation,

        lineContexts: [],
      })
    ).toThrow(
      'Line context count must match calculated line count'
    );
  });

  it('rejects payment greater than invoice total', () => {
    const lineInputs: InvoiceLineInput[] = [
      {
        description: 'Product',
        quantity: 1,
        unitPrice: 100,
        taxCategory: 'STANDARD',
        taxRate: 15,
        taxMode: 'EXCLUSIVE',
      },
    ];

    const calculation = calculateInvoice({
      lines: lineInputs,
    });

    expect(() =>
      createInvoiceDocument({
        identifiers: {
          invoiceId: 'invoice-005',
          invoiceNumber: 'INV-000005',
          uuid: '550e8400-e29b-41d4-a716-446655440004',
        },

        documentType: 'TAX_INVOICE',

        baseType: 'TAX_INVOICE',

        partyType: 'B2B',

        dates: {
          issueDate: '2026-09-26',
        },

        currency: 'SAR',

        seller: {
          legalName: 'ERPX Demo Company',
          address: {
            city: 'Jeddah',
            countryCode: 'SA',
          },
        },

        lineInputs,

        calculation,

        lineContexts: [
          {
            lineId: 'line-005',
            lineNumber: 1,
          },
        ],

        amountPaid: 200,
      })
    ).toThrow(
      'Amount paid cannot exceed invoice grand total'
    );
  });
});
