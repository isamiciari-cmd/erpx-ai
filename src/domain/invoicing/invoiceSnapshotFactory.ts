import type {
  InvoiceLineInput,
} from './invoiceTypes';

import type {
  InvoiceLineSnapshot,
} from './invoiceLineSnapshot';

import type {
  InvoiceLineCalculation,
} from './invoiceTypes';

export interface InvoiceLineSnapshotContext {
  lineId: string;
  lineNumber: number;
  productCode?: string;
  unitOfMeasure?: string;
  taxExemptionReasonCode?: string;
  taxExemptionReason?: string;
}

export function createInvoiceLineSnapshot(
  input: InvoiceLineInput,
  calculation: InvoiceLineCalculation,
  context: InvoiceLineSnapshotContext
): InvoiceLineSnapshot {
  if (!context.lineId.trim()) {
    throw new Error(
      'Invoice line ID is required'
    );
  }

  if (
    !Number.isInteger(context.lineNumber) ||
    context.lineNumber <= 0
  ) {
    throw new Error(
      'Invoice line number must be a positive integer'
    );
  }

  if (calculation.description !== input.description) {
    throw new Error(
      'Invoice line calculation does not match input description'
    );
  }

  if (calculation.quantity !== input.quantity) {
    throw new Error(
      'Invoice line calculation does not match input quantity'
    );
  }

  if (calculation.unitPrice !== input.unitPrice) {
    throw new Error(
      'Invoice line calculation does not match input unit price'
    );
  }

  if (
    calculation.taxSnapshot.category !==
    input.taxCategory
  ) {
    throw new Error(
      'Invoice line calculation does not match tax category'
    );
  }

  if (
    calculation.taxSnapshot.rate !==
    input.taxRate
  ) {
    throw new Error(
      'Invoice line calculation does not match tax rate'
    );
  }

  if (
    calculation.taxSnapshot.mode !==
    input.taxMode
  ) {
    throw new Error(
      'Invoice line calculation does not match tax mode'
    );
  }

  return {
    lineId: context.lineId,
    lineNumber: context.lineNumber,
    productId: input.productId,
    productCode: context.productCode,
    description: calculation.description,
    unitOfMeasure: context.unitOfMeasure,

    quantity: calculation.quantity,
    unitPrice: calculation.unitPrice,

    discountType: input.discountType,
    discountValue: input.discountValue,

    grossAmount: calculation.grossAmount,
    discountAmount: calculation.discountAmount,
    netAmount: calculation.netAmount,

    taxCategory:
      calculation.taxSnapshot.category,

    taxCode:
      calculation.taxSnapshot.code,

    taxRate:
      calculation.taxSnapshot.rate,

    taxMode:
      calculation.taxSnapshot.mode,

    taxExemptionReasonCode:
      context.taxExemptionReasonCode,

    taxExemptionReason:
      context.taxExemptionReason,

    taxableAmount:
      calculation.taxableAmount,

    taxAmount:
      calculation.taxAmount,

    totalAmount:
      calculation.totalAmount,
  };
}
