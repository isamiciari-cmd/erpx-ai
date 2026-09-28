import { describe, expect, it } from 'vitest';

import type {
  InvoiceDocument,
} from '../invoicing/invoiceDocument';

import {
  mapInvoiceDocumentToZatca,
} from './zatcaInvoiceMapper';

function createDocument(): InvoiceDocument {
  return {
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
      issueTime: '15:30:00',
    },

    currency: 'SAR',

    seller: {
      legalName: 'ERPX AI Company',
      vatNumber: '300000000000003',
      identificationType: 'CRN',
      identificationValue: '1010000000',
      address: {
        street: 'King Road',
        buildingNumber: '1234',
        city: 'Jeddah',
        district: 'Al Hamdaniyah',
        postalCode: '23743',
        countryCode: 'SA',
      },
    },

    buyer: {
      legalName: 'Customer Company',
      vatNumber: '310000000000003',
      identificationType: 'CRN',
      identificationValue: '4030000000',
      address: {
        street: 'Prince Street',
        buildingNumber: '5678',
        city: 'Jeddah',
        district: 'Al Rawdah',
        postalCode: '23435',
        countryCode: 'SA',
      },
    },

    indicators: {
      thirdParty: false,
      selfBilled: false,
      nominal: false,
      export: false,
    },

    references: {
      salesOrderId: 'order-001',
      salesOrderNumber: 'SO-000001',
    },

    lines: [
      {
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
      },
    ],

    totals: {
      subtotal: 1000,
      discountTotal: 100,
      taxableTotal: 900,
      taxTotal: 135,
      grandTotal: 1035,
      amountPaid: 0,
      amountDue: 1035,
    },
  };
}

describe('ZATCA Invoice Mapper', () => {
  it('maps the complete invoice document', () => {
    const document = createDocument();

    const result =
      mapInvoiceDocumentToZatca(
        document
      );

    expect(result.uuid).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );

    expect(result.invoiceNumber).toBe(
      'INV-000001'
    );

    expect(result.issueDate).toBe(
      '2026-09-26'
    );

    expect(result.issueTime).toBe(
      '15:30:00'
    );

    expect(result.invoiceTypeCode).toBe(
      '388'
    );

    expect(result.invoiceSubtype).toBe(
      '01'
    );

    expect(result.currencyCode).toBe(
      'SAR'
    );
  });

  it('maps seller correctly', () => {
    const result =
      mapInvoiceDocumentToZatca(
        createDocument()
      );

    expect(result.seller.legalName).toBe(
      'ERPX AI Company'
    );

    expect(result.seller.vatNumber).toBe(
      '300000000000003'
    );

    expect(
      result.seller.identification?.schemeId
    ).toBe('CRN');

    expect(
      result.seller.identification?.value
    ).toBe('1010000000');

    expect(
      result.seller.address.countryCode
    ).toBe('SA');

    expect(
      result.seller.address.cityName
    ).toBe('Jeddah');
  });

  it('maps buyer correctly', () => {
    const result =
      mapInvoiceDocumentToZatca(
        createDocument()
      );

    expect(result.buyer?.legalName).toBe(
      'Customer Company'
    );

    expect(result.buyer?.vatNumber).toBe(
      '310000000000003'
    );

    expect(
      result.buyer?.address.cityName
    ).toBe('Jeddah');
  });

  it('maps invoice lines', () => {
    const result =
      mapInvoiceDocumentToZatca(
        createDocument()
      );

    expect(result.lines).toHaveLength(1);

    expect(
      result.lines[0].id
    ).toBe('line-001');

    expect(
      result.lines[0].quantity
    ).toBe(2);

    expect(
      result.lines[0].unitPrice
    ).toBe(500);

    expect(
      result.lines[0].lineExtensionAmount
    ).toBe(900);

    expect(
      result.lines[0].taxableAmount
    ).toBe(900);

    expect(
      result.lines[0].taxAmount
    ).toBe(135);

    expect(
      result.lines[0].taxCategory.code
    ).toBe('S');

    expect(
      result.lines[0].taxCategory.rate
    ).toBe(15);
  });

  it('maps tax totals from invoice lines', () => {
    const result =
      mapInvoiceDocumentToZatca(
        createDocument()
      );

    expect(
      result.taxTotal.taxAmount
    ).toBe(135);

    expect(
      result.taxTotal.taxSubtotals
    ).toHaveLength(1);

    expect(
      result.taxTotal.taxSubtotals[0]
        .taxableAmount
    ).toBe(900);

    expect(
      result.taxTotal.taxSubtotals[0]
        .taxAmount
    ).toBe(135);
  });

  it('maps monetary totals correctly', () => {
    const result =
      mapInvoiceDocumentToZatca(
        createDocument()
      );

    expect(result.monetaryTotals.lineExtensionAmount).toBe(900);

    expect(result.monetaryTotals.allowanceTotalAmount).toBeUndefined();

    expect(
      result.monetaryTotals
        .taxExclusiveAmount
    ).toBe(900);

    expect(
      result.monetaryTotals
        .taxInclusiveAmount
    ).toBe(1035);

    expect(
      result.monetaryTotals
        .payableAmount
    ).toBe(1035);
  });

  it('maps sales order reference', () => {
    const result =
      mapInvoiceDocumentToZatca(
        createDocument()
      );

    expect(
      result.billingReference?.id
    ).toBe('SO-000001');
  });

  it('does not duplicate line-level discounts as document allowances', () => {
    const result =
      mapInvoiceDocumentToZatca(
        createDocument()
      );

    expect(
      result.allowanceCharges
    ).toHaveLength(0);

    expect(
      result.monetaryTotals.allowanceTotalAmount
    ).toBeUndefined();
  });
  it('maps document-level allowance charges and includes them in tax totals', () => {
    const document = createDocument();

    document.allowanceCharges = [
      {
        charge: false,
        amount: 100,
        reasonCode: '95',
        reason: 'Discount',
        taxCategory: 'STANDARD',
        taxRate: 15,
      },
    ];

    document.totals = {
      subtotal: 1000,
      discountTotal: 100,
      taxableTotal: 800,
      taxTotal: 120,
      grandTotal: 920,
      amountPaid: 0,
      amountDue: 920,
    };

    const result =
      mapInvoiceDocumentToZatca(
        document
      );

    expect(
      result.allowanceCharges
    ).toHaveLength(1);

    expect(
      result.allowanceCharges[0].chargeIndicator
    ).toBe(false);

    expect(
      result.allowanceCharges[0].amount
    ).toBe(100);

    expect(
      result.allowanceCharges[0].reasonCode
    ).toBe('95');

    expect(
      result.allowanceCharges[0].reason
    ).toBe('Discount');

    expect(
      result.allowanceCharges[0].taxCategory.code
    ).toBe('S');

    expect(
      result.allowanceCharges[0].taxCategory.rate
    ).toBe(15);

    expect(
      result.taxTotal.taxSubtotals
    ).toHaveLength(1);

    expect(
      result.taxTotal.taxSubtotals[0]
        .taxableAmount
    ).toBe(800);

    expect(
      result.taxTotal.taxSubtotals[0]
        .taxAmount
    ).toBe(120);

    expect(
      result.taxTotal.taxAmount
    ).toBe(120);
  });
  it('maps line extension and tax exclusive totals separately when document adjustments exist', () => {
    const document = createDocument();

    document.allowanceCharges = [
      {
        charge: false,
        amount: 100,
        reasonCode: '95',
        reason: 'Discount',
        taxCategory: 'STANDARD',
        taxRate: 15,
      },
      {
        charge: true,
        amount: 50,
        reasonCode: 'AAA',
        reason: 'Service charge',
        taxCategory: 'STANDARD',
        taxRate: 15,
      },
    ];

    document.totals = {
      subtotal: 1000,
      discountTotal: 100,
      taxableTotal: 850,
      taxTotal: 127.5,
      grandTotal: 977.5,
      amountPaid: 0,
      amountDue: 977.5,
    };

    const result =
      mapInvoiceDocumentToZatca(
        document
      );

    expect(
      result.monetaryTotals.lineExtensionAmount
    ).toBe(900);

    expect(
      result.monetaryTotals.allowanceTotalAmount
    ).toBe(100);

    expect(
      result.monetaryTotals.chargeTotalAmount
    ).toBe(50);

    expect(
      result.monetaryTotals.taxExclusiveAmount
    ).toBe(850);

    expect(
      result.monetaryTotals.taxInclusiveAmount
    ).toBe(977.5);

    expect(
      result.monetaryTotals.payableAmount
    ).toBe(977.5);
  });
  it('rejects an invoice without UUID', () => {
    const document = createDocument();

    document.identifiers.uuid = '   ';

    expect(() =>
      mapInvoiceDocumentToZatca(
        document
      )
    ).toThrow(
      'Invoice UUID is required'
    );
  });

  it('rejects an invoice without invoice number', () => {
    const document = createDocument();

    document.identifiers.invoiceNumber =
      '   ';

    expect(() =>
      mapInvoiceDocumentToZatca(
        document
      )
    ).toThrow(
      'Invoice number is required'
    );
  });

  it('rejects an invoice without lines', () => {
    const document = createDocument();

    document.lines = [];

    expect(() =>
      mapInvoiceDocumentToZatca(
        document
      )
    ).toThrow(
      'Invoice must contain at least one line'
    );
  });

  it('maps credit notes to ZATCA type 381', () => {
    const document = createDocument();

    document.documentType =
      'CREDIT_NOTE';

    const result =
      mapInvoiceDocumentToZatca(
        document
      );

    expect(
      result.invoiceTypeCode
    ).toBe('381');
  });

  it('maps debit notes to ZATCA type 383', () => {
    const document = createDocument();

    document.documentType =
      'DEBIT_NOTE';

    const result =
      mapInvoiceDocumentToZatca(
        document
      );

    expect(
      result.invoiceTypeCode
    ).toBe('383');
  });

  it('maps prepayment invoices to ZATCA type 386', () => {
    const document = createDocument();

    document.documentType =
      'PREPAYMENT_INVOICE';

    const result =
      mapInvoiceDocumentToZatca(
        document
      );

    expect(
      result.invoiceTypeCode
    ).toBe('386');
  });
  it('maps ZERO_RATED document-level allowance with exemption reason', () => {
    const document = createDocument();

    document.lines[0] = {
      ...document.lines[0],
      taxCategory: 'ZERO_RATED',
      taxCode: 'Z',
      taxRate: 0,
      taxExemptionReasonCode: 'TEST',
      taxExemptionReason: 'Test reason',
      taxableAmount: 900,
      taxAmount: 0,
      totalAmount: 900,
    };

    document.allowanceCharges = [
      {
        charge: false,
        amount: 100,
        reasonCode: '95',
        reason: 'Discount',
        taxExemptionReasonCode: 'TEST',
        taxExemptionReason: 'Test reason',
        taxCategory: 'ZERO_RATED',
        taxRate: 0,
      },
    ];

    const result =
      mapInvoiceDocumentToZatca(
        document
      );

    expect(
      result.allowanceCharges
    ).toHaveLength(1);

    expect(
      result.allowanceCharges[0].taxCategory.code
    ).toBe('Z');

    expect(
      result.allowanceCharges[0].taxCategory.rate
    ).toBe(0);

    expect(
      result.allowanceCharges[0].taxCategory.taxExemptionReasonCode
    ).toBe('TEST');

    expect(
      result.allowanceCharges[0].taxCategory.taxExemptionReason
    ).toBe('Test reason');
  });
});


