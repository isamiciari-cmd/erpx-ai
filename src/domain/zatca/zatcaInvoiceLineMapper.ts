import type {
  InvoiceLineSnapshot,
} from '../invoicing/invoiceLineSnapshot';

import type {
  ZatcaInvoiceLine,
} from './zatcaTypes';

import {
  mapTaxCategoryToZatca,
} from './zatcaTaxMapping';

export interface ZatcaInvoiceLineMappingContext {
  unitCode?: string;
}

export function mapInvoiceLineToZatca(
  line: InvoiceLineSnapshot,
  context: ZatcaInvoiceLineMappingContext = {}
): ZatcaInvoiceLine {
  if (!line) {
    throw new Error(
      'Invoice line is required'
    );
  }

  if (!line.lineId.trim()) {
    throw new Error(
      'Invoice line ID is required'
    );
  }

  if (
    !Number.isInteger(line.lineNumber) ||
    line.lineNumber <= 0
  ) {
    throw new Error(
      'Invoice line number must be a positive integer'
    );
  }

  if (!line.description.trim()) {
    throw new Error(
      'Invoice line description is required'
    );
  }

  if (
    !Number.isFinite(line.quantity) ||
    line.quantity <= 0
  ) {
    throw new Error(
      'Invoice line quantity must be greater than zero'
    );
  }

  if (
    !Number.isFinite(line.unitPrice) ||
    line.unitPrice < 0
  ) {
    throw new Error(
      'Invoice line unit price must be non-negative'
    );
  }

  const taxCategory = mapTaxCategoryToZatca({
    category: line.taxCategory,
    rate: line.taxRate,
    taxCode: line.taxCode,
    taxExemptionReasonCode:
      line.taxExemptionReasonCode,
    taxExemptionReason:
      line.taxExemptionReason,
  });

  return {
    id: line.lineId,

    lineNumber: line.lineNumber,

    quantity: line.quantity,

    unitCode: context.unitCode,

    itemName: line.description,

    productCode: line.productCode,

    unitPrice: line.unitPrice,

    allowanceAmount:
      line.discountAmount > 0
        ? line.discountAmount
        : undefined,

    lineExtensionAmount:
      line.netAmount,

    taxableAmount:
      line.taxableAmount,

    taxAmount:
      line.taxAmount,

    taxCategory,
  };
}

