import {
  add,
  compare,
  money,
  multiply,
  subtract,
  toNumber,
} from '../money/money';

import {
  calculateDiscount,
  calculateTax,
} from '../tax/taxCalculation';

import type {
  InvoiceCalculationInput,
  InvoiceCalculationResult,
  InvoiceTaxBreakdown,
  InvoiceDocumentAllowanceChargeInput,
  InvoiceLineCalculation,
  InvoiceLineInput,
} from './invoiceTypes';

function validateLine(line: InvoiceLineInput): void {
  if (!line.description.trim()) {
    throw new Error('Invoice line description is required');
  }

  if (
    !Number.isFinite(line.quantity) ||
    line.quantity <= 0
  ) {
    throw new Error('Invoice line quantity must be greater than zero');
  }

  if (
    !Number.isFinite(line.unitPrice) ||
    line.unitPrice < 0
  ) {
    throw new Error('Invoice line unit price must be non-negative');
  }

  if (
    line.discountType !== undefined &&
    line.discountValue === undefined
  ) {
    throw new Error(
      'Discount value is required when discount type is provided'
    );
  }

  if (
    line.discountValue !== undefined &&
    (
      !Number.isFinite(line.discountValue) ||
      line.discountValue < 0
    )
  ) {
    throw new Error('Discount value must be non-negative');
  }
}

function validateAllowanceCharge(
  adjustment: InvoiceDocumentAllowanceChargeInput
): void {
  if (
    typeof adjustment.charge !== 'boolean'
  ) {
    throw new Error(
      'Document allowance/charge indicator must be boolean'
    );
  }

  if (
    !Number.isFinite(adjustment.amount) ||
    adjustment.amount < 0
  ) {
    throw new Error(
      'Document allowance/charge amount must be non-negative'
    );
  }

  if (
    !Number.isFinite(adjustment.taxRate) ||
    adjustment.taxRate < 0 ||
    adjustment.taxRate > 100
  ) {
    throw new Error(
      'Document allowance/charge tax rate must be between 0 and 100'
    );
  }

  if (
    adjustment.taxCategory !== 'STANDARD' &&
    adjustment.taxRate !== 0
  ) {
    throw new Error(
      'Non-standard document allowance/charge tax categories must have a zero tax rate'
    );
  }
}

function calculateDocumentAdjustments(
  adjustments: InvoiceDocumentAllowanceChargeInput[]
): {
  allowanceTotal: number;
  chargeTotal: number;
} {
  let allowanceTotal = money('0');
  let chargeTotal = money('0');

  for (const adjustment of adjustments) {
    validateAllowanceCharge(adjustment);

    if (adjustment.charge) {
      chargeTotal = add(
        chargeTotal,
        money(adjustment.amount)
      );
    } else {
      allowanceTotal = add(
        allowanceTotal,
        money(adjustment.amount)
      );
    }
  }

  return {
    allowanceTotal: toNumber(allowanceTotal),
    chargeTotal: toNumber(chargeTotal),
  };
}

function calculateInvoiceLine(
  line: InvoiceLineInput
): InvoiceLineCalculation {
  validateLine(line);

  const grossMoney = multiply(
    money(line.unitPrice),
    line.quantity
  );

  const grossAmount = toNumber(grossMoney);

  const discountResult = line.discountType
    ? calculateDiscount(
        grossAmount,
        {
          type: line.discountType,
          value: line.discountValue ?? 0,
        }
      )
    : {
        originalAmount: grossAmount,
        discountAmount: 0,
        discountedAmount: grossAmount,
      };

  const netMoney = subtract(
    money(discountResult.originalAmount),
    money(discountResult.discountAmount)
  );

  const netAmount = toNumber(netMoney);

  const taxResult = calculateTax({
    amount: netAmount,
    taxRate: line.taxRate,
    category: line.taxCategory,
    mode: line.taxMode,
    taxCode: line.taxCode,
  });

  const taxableMoney = money(taxResult.taxableAmount);
  const taxMoney = money(taxResult.taxAmount);

  const totalMoney =
    line.taxMode === 'INCLUSIVE'
      ? money(taxResult.totalAmount)
      : add(taxableMoney, taxMoney);

  return {
    productId: line.productId,
    description: line.description,

    quantity: line.quantity,
    unitPrice: line.unitPrice,

    grossAmount,
    discountAmount: discountResult.discountAmount,
    netAmount,

    taxableAmount: toNumber(taxableMoney),
    taxAmount: toNumber(taxMoney),
    totalAmount: toNumber(totalMoney),

    taxSnapshot: {
      category: taxResult.category,
      rate: taxResult.taxRate,
      code: taxResult.taxCode,
      mode: line.taxMode,

      taxableAmount: taxResult.taxableAmount,
      taxAmount: taxResult.taxAmount,
    },
  };
}

function buildTaxBreakdowns(
  lines: InvoiceLineCalculation[],
  adjustments: InvoiceDocumentAllowanceChargeInput[]
): InvoiceTaxBreakdown[] {
  interface BreakdownAccumulator {
    taxCategory: InvoiceTaxBreakdown['taxCategory'];
    taxRate: number;
    taxCode?: string;
    taxExemptionReasonCode?: string;
    taxExemptionReason?: string;
    taxableAmount: number;
    taxAmount: number;
  }

  const groups = new Map<string, BreakdownAccumulator>();

  const getKey = (
    category: InvoiceTaxBreakdown['taxCategory'],
    rate: number,
    taxCode?: string,
    exemptionReasonCode?: string,
    exemptionReason?: string
  ): string =>
    [
      category,
      rate,
      taxCode ?? '',
      exemptionReasonCode ?? '',
      exemptionReason ?? '',
    ].join('|');

  const addToGroup = (
    category: InvoiceTaxBreakdown['taxCategory'],
    rate: number,
    taxableAmount: number,
    taxAmount: number,
    taxCode?: string,
    exemptionReasonCode?: string,
    exemptionReason?: string
  ): void => {
    const key = getKey(
      category,
      rate,
      taxCode,
      exemptionReasonCode,
      exemptionReason
    );

    const existing = groups.get(key);

    if (existing) {
      existing.taxableAmount = toNumber(
        add(
          money(existing.taxableAmount),
          money(taxableAmount)
        )
      );

      existing.taxAmount = toNumber(
        add(
          money(existing.taxAmount),
          money(taxAmount)
        )
      );

      return;
    }

    groups.set(key, {
      taxCategory: category,
      taxRate: rate,
      taxCode,
      taxExemptionReasonCode: exemptionReasonCode,
      taxExemptionReason: exemptionReason,
      taxableAmount,
      taxAmount,
    });
  };

  for (const line of lines) {
    addToGroup(
      line.taxSnapshot.category,
      line.taxSnapshot.rate,
      line.taxableAmount,
      line.taxAmount,
      line.taxSnapshot.code
    );
  }

  for (const adjustment of adjustments) {
    if (adjustment.amount === 0) {
      continue;
    }

    const taxResult = calculateTax({
      amount: adjustment.amount,
      taxRate: adjustment.taxRate,
      category: adjustment.taxCategory,
      mode: 'EXCLUSIVE',
    });

    const signedAmount = adjustment.charge
      ? adjustment.amount
      : -adjustment.amount;

    const signedTax = adjustment.charge
      ? taxResult.taxAmount
      : -taxResult.taxAmount;

    addToGroup(
      adjustment.taxCategory,
      taxResult.taxRate,
      signedAmount,
      signedTax,
      undefined,
      adjustment.taxExemptionReasonCode,
      adjustment.taxExemptionReason
    );
  }

  return Array.from(groups.values()).map((group) => ({
    taxCategory: group.taxCategory,
    taxRate: group.taxRate,
    taxCode: group.taxCode,
    taxExemptionReasonCode: group.taxExemptionReasonCode,
    taxExemptionReason: group.taxExemptionReason,
    taxableAmount: toNumber(money(group.taxableAmount)),
    taxAmount: toNumber(money(group.taxAmount)),
  }));
}
export function calculateInvoice(
  input: InvoiceCalculationInput
): InvoiceCalculationResult {
  if (!input || !Array.isArray(input.lines)) {
    throw new Error('Invoice lines are required');
  }

  if (input.lines.length === 0) {
    throw new Error('Invoice must contain at least one line');
  }

  const lines = input.lines.map(calculateInvoiceLine);

  let subtotal = money('0');
  let discountTotal = money('0');
  let lineTaxableTotal = money('0');
  let taxTotal = money('0');

  for (const line of lines) {
    subtotal = add(
      subtotal,
      money(line.grossAmount)
    );

    discountTotal = add(
      discountTotal,
      money(line.discountAmount)
    );

    lineTaxableTotal = add(
      lineTaxableTotal,
      money(line.taxableAmount)
    );

    taxTotal = add(
      taxTotal,
      money(line.taxAmount)
    );
  }

  const allowanceCharges =
    input.allowanceCharges ?? [];

  const documentAdjustments =
    calculateDocumentAdjustments(
      allowanceCharges
    );

  const taxableAfterDocumentAdjustments =
    subtract(
      add(
        lineTaxableTotal,
        money(documentAdjustments.chargeTotal)
      ),
      money(documentAdjustments.allowanceTotal)
    );

  if (
    compare(taxableAfterDocumentAdjustments, money('0')) < 0
  ) {
    throw new Error(
      'Document allowances cannot exceed the taxable amount'
    );
  }

  let documentTaxTotal = money('0');

  for (const adjustment of allowanceCharges) {
    if (adjustment.amount === 0) {
      continue;
    }

    const taxResult = calculateTax({
      amount: adjustment.amount,
      taxRate: adjustment.taxRate,
      category: adjustment.taxCategory,
      mode: 'EXCLUSIVE',
    });

    const adjustmentTax =
      money(taxResult.taxAmount);

    documentTaxTotal =
      adjustment.charge
        ? add(documentTaxTotal, adjustmentTax)
        : subtract(documentTaxTotal, adjustmentTax);
  }

  const finalTaxTotal = add(
    taxTotal,
    documentTaxTotal
  );

  const finalGrandTotal = add(
    taxableAfterDocumentAdjustments,
    finalTaxTotal
  );

  return {
    lines,

    subtotal: toNumber(subtotal),
    discountTotal: toNumber(discountTotal),

    documentAllowanceTotal:
      documentAdjustments.allowanceTotal,

    documentChargeTotal:
      documentAdjustments.chargeTotal,

    taxableTotal:
      toNumber(taxableAfterDocumentAdjustments),

    taxTotal:
      toNumber(finalTaxTotal),

    grandTotal:
      toNumber(finalGrandTotal),

    taxBreakdowns: buildTaxBreakdowns(
      lines,
      allowanceCharges
    ),

    allowanceCharges,
  };
}







