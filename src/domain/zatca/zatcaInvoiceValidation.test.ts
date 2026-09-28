import { describe, expect, it } from 'vitest';

import type { InvoiceDocument } from '../invoicing/invoiceDocument';
import type { ZatcaInvoice } from './zatcaTypes';

import {
  mapInvoiceDocumentToZatca,
} from './zatcaInvoiceMapper';

import {
  validateZatcaInvoice,
} from './zatcaInvoiceValidation';

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

    references: {},

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

function createMappedInvoice(): {
  document: InvoiceDocument;
  zatca: ZatcaInvoice;
} {
  const document = createDocument();

  return {
    document,
    zatca:
      mapInvoiceDocumentToZatca(
        document
      ),
  };
}

describe('ZATCA Invoice Cross-Validation', () => {
  it('accepts a fully reconciled invoice', () => {
    const { document, zatca } =
      createMappedInvoice();

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects subtotal mismatch', () => {
    const { document, zatca } =
      createMappedInvoice();

    document.totals.subtotal = 950;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'SUBTOTAL_MISMATCH'
      )
    ).toBe(true);
  });

  it('detects taxable total mismatch', () => {
    const { document, zatca } =
      createMappedInvoice();

    document.totals.taxableTotal = 850;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'TAXABLE_TOTAL_RECONCILIATION_FAILED'
      )
    ).toBe(true);
  });
  it('accepts document-level charge reconciliation', () => {
    const document = createDocument();

    document.allowanceCharges = [
      {
        charge: true,
        amount: 100,
        reasonCode: 'AAA',
        reason: 'Service charge',
        taxCategory: 'STANDARD',
        taxRate: 15,
      },
    ];

    document.totals = {
      subtotal: 1000,
      discountTotal: 100,
      taxableTotal: 1000,
      taxTotal: 150,
      grandTotal: 1150,
      amountPaid: 0,
      amountDue: 1150,
    };

    const zatca =
      mapInvoiceDocumentToZatca(
        document
      );

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);

    expect(
      zatca.lines[0].lineExtensionAmount
    ).toBe(900);

    expect(
      zatca.monetaryTotals.taxExclusiveAmount
    ).toBe(1000);

    expect(
      zatca.taxTotal.taxAmount
    ).toBe(150);

    expect(
      zatca.monetaryTotals.taxInclusiveAmount
    ).toBe(1150);
  });
  it('accepts document-level allowance reconciliation', () => {
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

    const zatca =
      mapInvoiceDocumentToZatca(
        document
      );

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);

    expect(
      zatca.lines[0].lineExtensionAmount
    ).toBe(900);

    expect(
      zatca.monetaryTotals.taxExclusiveAmount
    ).toBe(800);

    expect(
      zatca.taxTotal.taxAmount
    ).toBe(120);

    expect(
      zatca.monetaryTotals.taxInclusiveAmount
    ).toBe(920);
  });

  it('detects VAT mismatch', () => {
    const { document, zatca } =
      createMappedInvoice();

    document.totals.taxTotal = 150;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'TAX_TOTAL_RECONCILIATION_FAILED'
      )
    ).toBe(true);
  });

  it('detects tax inclusive total mismatch', () => {
    const { document, zatca } =
      createMappedInvoice();

    document.totals.grandTotal = 1040;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'TAX_INCLUSIVE_MISMATCH'
      )
    ).toBe(true);
  });

  it('detects payable amount mismatch', () => {
    const { document, zatca } =
      createMappedInvoice();

    document.totals.amountDue = 900;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'PAYABLE_AMOUNT_MISMATCH'
      )
    ).toBe(true);
  });

  it('detects amount due reconciliation failure', () => {
    const { document, zatca } =
      createMappedInvoice();

    document.totals.amountPaid = 100;
    document.totals.amountDue = 1035;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'AMOUNT_DUE_RECONCILIATION_FAILED'
      )
    ).toBe(true);
  });

  it('detects negative amount paid', () => {
    const { document, zatca } =
      createMappedInvoice();

    document.totals.amountPaid = -1;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'NEGATIVE_AMOUNT_PAID'
      )
    ).toBe(true);
  });

  it('detects negative amount due', () => {
    const { document, zatca } =
      createMappedInvoice();

    document.totals.amountDue = -1;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'NEGATIVE_AMOUNT_DUE'
      )
    ).toBe(true);
  });

  it('detects tax subtotal amount mismatch', () => {
    const { document, zatca } =
      createMappedInvoice();

    zatca.taxTotal.taxSubtotals[0]
      .taxAmount = 140;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'TAX_SUBTOTAL_AMOUNT_MISMATCH'
      )
    ).toBe(true);
  });

  it('detects VAT amount calculated incorrectly for a tax subtotal', () => {
    const { document, zatca } =
      createMappedInvoice();

    zatca.taxTotal.taxSubtotals[0].taxAmount = 100;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'VAT_SUBTOTAL_CALCULATION_MISMATCH'
      )
    ).toBe(true);
  });
  it('detects tax subtotal total mismatch independently from line tax total', () => {
    const { document, zatca } =
      createMappedInvoice();

    zatca.taxTotal.taxSubtotals[0].taxableAmount = 800;
    zatca.taxTotal.taxSubtotals[0].taxAmount = 120;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'TAX_SUBTOTAL_MISMATCH'
      )
    ).toBe(true);
  });
  it('detects incorrect VAT caused by a document-level charge', () => {
    const document = createDocument();

    document.allowanceCharges = [
      {
        charge: true,
        amount: 100,
        reasonCode: 'AAA',
        reason: 'Service charge',
        taxCategory: 'STANDARD',
        taxRate: 15,
      },
    ];

    document.totals = {
      subtotal: 1000,
      discountTotal: 100,
      taxableTotal: 1000,
      taxTotal: 150,
      grandTotal: 1150,
      amountPaid: 0,
      amountDue: 1150,
    };

    const zatca =
      mapInvoiceDocumentToZatca(
        document
      );

    zatca.taxTotal.taxAmount = 140;
    zatca.taxTotal.taxSubtotals[0].taxAmount = 140;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'TAX_TOTAL_RECONCILIATION_FAILED'
      )
    ).toBe(true);
  });
  it('detects document-level charge VAT calculation mismatch independently', () => {
    const document = createDocument();

    document.allowanceCharges = [
      {
        charge: true,
        amount: 100,
        reasonCode: 'AAA',
        reason: 'Service charge',
        taxCategory: 'STANDARD',
        taxRate: 15,
      },
    ];

    document.totals = {
      subtotal: 1000,
      discountTotal: 100,
      taxableTotal: 1000,
      taxTotal: 150,
      grandTotal: 1150,
      amountPaid: 0,
      amountDue: 1150,
    };

    const zatca =
      mapInvoiceDocumentToZatca(
        document
      );

    zatca.taxTotal.taxAmount = 135;
    zatca.taxTotal.taxSubtotals[0].taxAmount = 135;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'VAT_DOCUMENT_ADJUSTMENT_MISMATCH'
      )
    ).toBe(true);
  });
  it('detects tax exclusive amount mismatch', () => {
    const { document, zatca } =
      createMappedInvoice();

    zatca.monetaryTotals
      .taxExclusiveAmount = 850;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'TAX_EXCLUSIVE_MISMATCH'
      )
    ).toBe(true);
  });

  it('detects grand total reconciliation failure', () => {
    const { document, zatca } =
      createMappedInvoice();

    zatca.monetaryTotals
      .taxInclusiveAmount = 1040;

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(false);

    expect(
      result.issues.some(
        (issue) =>
          issue.code ===
          'GRAND_TOTAL_RECONCILIATION_FAILED'
      )
    ).toBe(true);
  });


  it('accepts STANDARD and ZERO_RATED tax categories in one invoice', () => {
    const document = createDocument();

    document.lines.push({
      lineId: 'line-002',
      lineNumber: 2,
      productId: 'product-002',
      productCode: 'ZERO-001',
      description: 'Zero Rated Service',
      unitOfMeasure: 'EA',
      quantity: 1,
      unitPrice: 300,
      grossAmount: 300,
      discountAmount: 0,
      netAmount: 300,
      taxCategory: 'ZERO_RATED',
      taxCode: 'Z',
      taxRate: 0,
      taxMode: 'EXCLUSIVE',
      taxExemptionReasonCode: 'TEST',
      taxExemptionReason: 'Test reason',
      taxableAmount: 300,
      taxAmount: 0,
      totalAmount: 300,
    });

    document.totals = {
      subtotal: 1300,
      discountTotal: 100,
      taxableTotal: 1200,
      taxTotal: 135,
      grandTotal: 1335,
      amountPaid: 0,
      amountDue: 1335,
    };

    const zatca =
      mapInvoiceDocumentToZatca(
        document
      );

    const result =
      validateZatcaInvoice(
        document,
        zatca
      );

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);

    expect(zatca.taxTotal.taxSubtotals).toHaveLength(2);

    const standard =
      zatca.taxTotal.taxSubtotals.find(
        (subtotal) =>
          subtotal.taxCategory.code === 'S'
      );

    const zeroRated =
      zatca.taxTotal.taxSubtotals.find(
        (subtotal) =>
          subtotal.taxCategory.code === 'Z'
      );

    expect(standard?.taxableAmount).toBe(900);
    expect(standard?.taxAmount).toBe(135);

    expect(zeroRated?.taxableAmount).toBe(300);
    expect(zeroRated?.taxAmount).toBe(0);

    expect(zatca.taxTotal.taxAmount).toBe(135);
    expect(
      zatca.monetaryTotals.taxExclusiveAmount
    ).toBe(1200);
    expect(
      zatca.monetaryTotals.taxInclusiveAmount
    ).toBe(1335);
  });
});




