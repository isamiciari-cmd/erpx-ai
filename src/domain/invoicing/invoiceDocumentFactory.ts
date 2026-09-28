import type {
  InvoiceCalculationResult,
  InvoiceLineInput,
} from './invoiceTypes';

import type {
  InvoiceDocument,
  InvoiceDocumentDates,
  InvoiceDocumentIdentifiers,
  InvoiceDocumentReferences,
  InvoiceDocumentTotals,
  InvoiceParty,
} from './invoiceDocument';

import type {
  InvoiceBaseType,
  InvoiceDocumentType,
  InvoiceIndicators,
  InvoicePartyType,
} from './invoiceDocumentTypes';

import {
  createInvoiceLineSnapshot,
} from './invoiceSnapshotFactory';

export interface InvoiceDocumentFactoryInput {
  identifiers: InvoiceDocumentIdentifiers;

  documentType: InvoiceDocumentType;

  baseType: InvoiceBaseType;

  partyType: InvoicePartyType;

  dates: InvoiceDocumentDates;

  currency: string;

  seller: InvoiceParty;

  buyer?: InvoiceParty;

  indicators?: InvoiceIndicators;

  references?: InvoiceDocumentReferences;

  lineInputs: InvoiceLineInput[];

  calculation: InvoiceCalculationResult;

  allowanceCharges?: InvoiceCalculationResult['allowanceCharges'];

  lineContexts: Array<{
    lineId: string;
    lineNumber: number;
    productCode?: string;
    unitOfMeasure?: string;
  }>;

  amountPaid?: number;
}

function validateFactoryInput(
  input: InvoiceDocumentFactoryInput
): void {
  if (!input) {
    throw new Error('Invoice document input is required');
  }

  if (!input.identifiers.invoiceId.trim()) {
    throw new Error('Invoice ID is required');
  }

  if (!input.identifiers.invoiceNumber.trim()) {
    throw new Error('Invoice number is required');
  }

  if (!input.identifiers.uuid.trim()) {
    throw new Error('Invoice UUID is required');
  }

  if (!input.currency.trim()) {
    throw new Error('Invoice currency is required');
  }

  if (!input.seller.legalName.trim()) {
    throw new Error('Seller legal name is required');
  }

  if (
    input.lineInputs.length !==
    input.calculation.lines.length
  ) {
    throw new Error(
      'Line input count must match calculated line count'
    );
  }

  if (
    input.lineContexts.length !==
    input.calculation.lines.length
  ) {
    throw new Error(
      'Line context count must match calculated line count'
    );
  }

  const amountPaid = input.amountPaid ?? 0;

  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    throw new Error(
      'Amount paid must be a non-negative number'
    );
  }

  if (amountPaid > input.calculation.grandTotal) {
    throw new Error(
      'Amount paid cannot exceed invoice grand total'
    );
  }
}

export function createInvoiceDocument(
  input: InvoiceDocumentFactoryInput
): InvoiceDocument {
  validateFactoryInput(input);

  const lines = input.calculation.lines.map(
    (calculationLine, index) => {
      const lineInput = input.lineInputs[index];
      const context = input.lineContexts[index];

      return createInvoiceLineSnapshot(
        lineInput,
        calculationLine,
        context
      );
    }
  );

  const amountPaid = input.amountPaid ?? 0;

  const totals: InvoiceDocumentTotals = {
    subtotal: input.calculation.subtotal,
    discountTotal: input.calculation.discountTotal,
    taxableTotal: input.calculation.taxableTotal,
    taxTotal: input.calculation.taxTotal,
    grandTotal: input.calculation.grandTotal,
    amountPaid,
    amountDue:
      input.calculation.grandTotal - amountPaid,
  };

  return {
    identifiers: input.identifiers,

    documentType: input.documentType,

    baseType: input.baseType,

    partyType: input.partyType,

    dates: input.dates,

    currency: input.currency,

    seller: input.seller,

    buyer: input.buyer,

    indicators: input.indicators ?? {
      thirdParty: false,
      selfBilled: false,
      nominal: false,
      export: false,
    },

    references: input.references ?? {},

    lines,

    allowanceCharges: input.allowanceCharges ?? input.calculation.allowanceCharges,

    totals,
  };
}

