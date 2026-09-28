import type { InvoiceDocument } from '../invoicing/invoiceDocument';
import type { ZatcaInvoice } from './zatcaTypes';

export interface ZatcaValidationIssue {
  code: string;
  message: string;
  field?: string;
}

export interface ZatcaValidationResult {
  valid: boolean;
  issues: ZatcaValidationIssue[];
}

const TOLERANCE = 0.01;

function nearlyEqual(
  a: number,
  b: number
): boolean {
  return Math.abs(a - b) <= TOLERANCE;
}

function roundMoney(
  value: number
): number {
  const rounded =
    Math.round(value * 100) / 100;

  return Object.is(rounded, -0)
    ? 0
    : rounded;
}

function sum(
  values: number[]
): number {
  return roundMoney(
    values.reduce(
      (total, value) =>
        total + value,
      0
    )
  );
}

export function validateZatcaInvoice(
  document: InvoiceDocument,
  zatcaInvoice: ZatcaInvoice
): ZatcaValidationResult {
  const issues: ZatcaValidationIssue[] = [];

  const documentTotals = document.totals;
  const zatcaTotals =
    zatcaInvoice.monetaryTotals;

  const lineGrossTotal = sum(
    document.lines.map(
      (line) =>
        line.grossAmount
    )
  );

  const lineDiscountTotal = sum(
    document.lines.map(
      (line) =>
        line.discountAmount
    )
  );

  const lineExtensionTotal = sum(
    zatcaInvoice.lines.map(
      (line) =>
        line.lineExtensionAmount
    )
  );

  const lineTaxTotal = sum(
    zatcaInvoice.lines.map(
      (line) =>
        line.taxAmount
    )
  );

  const lineTaxableTotal = sum(
    zatcaInvoice.lines.map(
      (line) =>
        line.taxableAmount
    )
  );

  const allowanceTotal = sum(
    zatcaInvoice.allowanceCharges
      .filter(
        (adjustment) =>
          !adjustment.chargeIndicator
      )
      .map(
        (adjustment) =>
          adjustment.amount
      )
  );

  const chargeTotal = sum(
    zatcaInvoice.allowanceCharges
      .filter(
        (adjustment) =>
          adjustment.chargeIndicator
      )
      .map(
        (adjustment) =>
          adjustment.amount
      )
  );

  const adjustedTaxableTotal =
    roundMoney(
      lineExtensionTotal -
        allowanceTotal +
        chargeTotal
    );

  interface ExpectedTaxGroup {
    category: InvoiceDocument['lines'][number]['taxCategory'];
    rate: number;
    taxExemptionReasonCode?: string;
    taxExemptionReason?: string;
    taxableAmount: number;
    taxAmount: number;
  }

  const expectedTaxGroups = new Map<
    string,
    ExpectedTaxGroup
  >();

  const buildExpectedTaxGroupKey = (
    category: ExpectedTaxGroup['category'],
    rate: number,
    taxExemptionReasonCode?: string,
    taxExemptionReason?: string
  ): string => {
    return [
      category,
      rate,
      taxExemptionReasonCode ?? '',
      taxExemptionReason ?? '',
    ].join('|');
  };

  const addExpectedTaxGroup = (
    category: ExpectedTaxGroup['category'],
    rate: number,
    taxableAmount: number,
    taxAmount: number,
    taxExemptionReasonCode?: string,
    taxExemptionReason?: string
  ): void => {
    const key =
      buildExpectedTaxGroupKey(
        category,
        rate,
        taxExemptionReasonCode,
        taxExemptionReason
      );

    const existing =
      expectedTaxGroups.get(key);

    if (existing) {
      existing.taxableAmount =
        roundMoney(
          existing.taxableAmount +
            taxableAmount
        );

      existing.taxAmount =
        roundMoney(
          existing.taxAmount +
            taxAmount
        );
      return;
    }

    expectedTaxGroups.set(key, {
      category,
      rate,
      taxExemptionReasonCode,
      taxExemptionReason,
      taxableAmount:
        roundMoney(taxableAmount),
      taxAmount:
        roundMoney(taxAmount),
    });
  };

  for (const line of document.lines) {
    const taxableAmount =
      roundMoney(
        line.taxableAmount
      );

    const taxAmount =
      line.taxCategory === 'STANDARD'
        ? roundMoney(
            taxableAmount *
              (line.taxRate / 100)
          )
        : 0;

    addExpectedTaxGroup(
      line.taxCategory,
      line.taxRate,
      taxableAmount,
      taxAmount,
      line.taxExemptionReasonCode,
      line.taxExemptionReason
    );
  }

  for (const adjustment of
    document.allowanceCharges ?? []) {
    const taxableAmount =
      adjustment.charge
        ? roundMoney(adjustment.amount)
        : roundMoney(-adjustment.amount);

    const taxAmount =
      adjustment.taxCategory === 'STANDARD'
        ? roundMoney(
            adjustment.charge
              ? adjustment.amount *
                  (adjustment.taxRate / 100)
              : -adjustment.amount *
                  (adjustment.taxRate / 100)
          )
        : 0;

    addExpectedTaxGroup(
      adjustment.taxCategory,
      adjustment.taxRate,
      taxableAmount,
      taxAmount,
      adjustment.taxExemptionReasonCode,
      adjustment.taxExemptionReason
    );
  }

  const expectedTaxableTotal =
    sum(
      Array.from(
        expectedTaxGroups.values()
      ).map(
        (group) =>
          group.taxableAmount
      )
    );

  const expectedTaxTotal =
    sum(
      Array.from(
        expectedTaxGroups.values()
      ).map(
        (group) =>
          group.taxAmount
      )
    );

  const taxSubtotalTotal = sum(
    zatcaInvoice.taxTotal.taxSubtotals.map(
      (subtotal) =>
        subtotal.taxableAmount
    )
  );

  for (const [index, subtotal] of
    zatcaInvoice.taxTotal.taxSubtotals.entries()
  ) {
    const rate =
      subtotal.taxCategory.rate;

    const expectedTaxAmount =
      subtotal.taxCategory.code === 'S'
        ? roundMoney(
            subtotal.taxableAmount *
              (rate / 100)
          )
        : 0;

    if (
      !nearlyEqual(
        subtotal.taxAmount,
        expectedTaxAmount
      )
    ) {
      issues.push({
        code:
          'VAT_SUBTOTAL_CALCULATION_MISMATCH',
        message:
          'VAT subtotal amount does not match taxable amount multiplied by the VAT rate.',
        field:
          "taxTotal.taxSubtotals[" + index + "].taxAmount",
      });
    }
  }

  const zatcaTaxGroups = new Map<
    string,
    {
      taxableAmount: number;
      taxAmount: number;
    }
  >();

  for (const subtotal of
    zatcaInvoice.taxTotal.taxSubtotals) {
    const code =
      subtotal.taxCategory.code;

    const category =
      code === 'S'
        ? 'STANDARD'
        : code === 'Z'
          ? 'ZERO_RATED'
          : code === 'E'
            ? 'EXEMPT'
            : 'OUT_OF_SCOPE';

    const key =
      buildExpectedTaxGroupKey(
        category,
        subtotal.taxCategory.rate,
        subtotal.taxCategory
          .taxExemptionReasonCode,
        subtotal.taxCategory
          .taxExemptionReason
      );

    const existing =
      zatcaTaxGroups.get(key);

    if (existing) {
      existing.taxableAmount =
        roundMoney(
          existing.taxableAmount +
            subtotal.taxableAmount
        );

      existing.taxAmount =
        roundMoney(
          existing.taxAmount +
            subtotal.taxAmount
        );
    } else {
      zatcaTaxGroups.set(key, {
        taxableAmount:
          roundMoney(
            subtotal.taxableAmount
          ),
        taxAmount:
          roundMoney(
            subtotal.taxAmount
          ),
      });
    }
  }

  for (const [key, expected] of
    expectedTaxGroups.entries()) {
    const actual =
      zatcaTaxGroups.get(key);

    if (!actual) {
      issues.push({
        code:
          'VAT_TAX_GROUP_MISSING',
        message:
          'ZATCA VAT breakdown is missing an expected tax category group.',
        field: 'taxTotal.taxSubtotals',
      });
      continue;
    }

    if (
      !nearlyEqual(
        actual.taxableAmount,
        expected.taxableAmount
      )
    ) {
      issues.push({
        code:
          'VAT_TAX_GROUP_TAXABLE_MISMATCH',
        message:
          'ZATCA VAT breakdown taxable amount does not match the source invoice tax group.',
        field: 'taxTotal.taxSubtotals',
      });
    }

    if (
      !nearlyEqual(
        actual.taxAmount,
        expected.taxAmount
      )
    ) {
      const isDocumentAdjustmentGroup =
        (document.allowanceCharges ?? []).some(
          (adjustment) =>
            buildExpectedTaxGroupKey(
              adjustment.taxCategory,
              adjustment.taxRate,
              adjustment.taxExemptionReasonCode,
              adjustment.taxExemptionReason
            ) === key
        );

      issues.push({
        code:
          isDocumentAdjustmentGroup
            ? 'VAT_DOCUMENT_ADJUSTMENT_MISMATCH'
            : 'VAT_TAX_GROUP_AMOUNT_MISMATCH',
        message:
          isDocumentAdjustmentGroup
            ? 'VAT generated by a document-level allowance or charge does not match the independently calculated source VAT.'
            : 'ZATCA VAT breakdown amount does not match the independently calculated source VAT for the tax group.',
        field: 'taxTotal.taxSubtotals',
      });
    }
  }

  for (const [key] of
    zatcaTaxGroups.entries()) {
    if (!expectedTaxGroups.has(key)) {
      issues.push({
        code:
          'VAT_TAX_GROUP_UNEXPECTED',
        message:
          'ZATCA VAT breakdown contains a tax category group that is not present in the source invoice.',
        field: 'taxTotal.taxSubtotals',
      });
    }
  }

  if (
    !nearlyEqual(
      expectedTaxableTotal,
      documentTotals.taxableTotal
    )
  ) {
    issues.push({
      code:
        'SOURCE_TAXABLE_TOTAL_MISMATCH',
      message:
        'Source invoice tax groups do not reconcile with the invoice taxable total.',
      field: 'taxableTotal',
    });
  }

  if (
    !nearlyEqual(
      expectedTaxTotal,
      documentTotals.taxTotal
    )
  ) {
    issues.push({
      code:
        'SOURCE_TAX_TOTAL_MISMATCH',
      message:
        'Source invoice tax groups do not reconcile with the invoice VAT total.',
      field: 'taxTotal',
    });
  }

  const taxAmountFromSubtotals = sum(
    zatcaInvoice.taxTotal.taxSubtotals.map(
      (subtotal) =>
        subtotal.taxAmount
    )
  );

  if (
    !nearlyEqual(
      lineGrossTotal,
      documentTotals.subtotal
    )
  ) {
    issues.push({
      code: 'SUBTOTAL_MISMATCH',
      message:
        'Invoice line gross total does not match invoice subtotal.',
      field: 'subtotal',
    });
  }

  if (
    !nearlyEqual(
      lineDiscountTotal,
      documentTotals.discountTotal
    )
  ) {
    issues.push({
      code: 'DISCOUNT_TOTAL_MISMATCH',
      message:
        'Invoice line discount total does not match invoice discount total.',
      field: 'discountTotal',
    });
  }

  const lineNetTotal =
    roundMoney(
      documentTotals.subtotal -
        documentTotals.discountTotal
    );

  if (
    !nearlyEqual(
      lineNetTotal,
      lineExtensionTotal
    )
  ) {
    issues.push({
      code: 'LINE_NET_RECONCILIATION_FAILED',
      message:
        'Invoice subtotal minus line discounts does not reconcile with ZATCA line extension total.',
      field: 'lineExtensionAmount',
    });
  }

  if (
    !nearlyEqual(
      adjustedTaxableTotal,
      documentTotals.taxableTotal
    )
  ) {
    issues.push({
      code: 'TAXABLE_TOTAL_RECONCILIATION_FAILED',
      message:
        'ZATCA line extension total minus document allowances plus document charges does not reconcile with invoice taxable total.',
      field: 'taxableTotal',
    });
  }

  if (
    !nearlyEqual(
      adjustedTaxableTotal,
      taxSubtotalTotal
    )
  ) {
    issues.push({
      code: 'TAX_SUBTOTAL_MISMATCH',
      message:
        'ZATCA tax subtotals do not reconcile with the adjusted taxable total.',
      field: 'taxableTotal',
    });
  }

  const documentAdjustmentTaxTotal =
    roundMoney(
      taxAmountFromSubtotals -
        lineTaxTotal
    );

  const calculatedDocumentTaxTotal =
    roundMoney(
      lineTaxTotal +
        documentAdjustmentTaxTotal
    );

  if (
    !nearlyEqual(
      calculatedDocumentTaxTotal,
      documentTotals.taxTotal
    )
  ) {
    issues.push({
      code: 'TAX_TOTAL_RECONCILIATION_FAILED',
      message:
        'Invoice line VAT plus document-level adjustment VAT does not reconcile with invoice VAT total.',
      field: 'taxTotal',
    });
  }

  if (
    !nearlyEqual(
      taxAmountFromSubtotals,
      documentTotals.taxTotal
    )
  ) {
    issues.push({
      code: 'TAX_SUBTOTAL_AMOUNT_MISMATCH',
      message:
        'ZATCA tax subtotal amounts do not match invoice VAT total.',
      field: 'taxTotal',
    });
  }

  if (
    !nearlyEqual(
      zatcaInvoice.taxTotal.taxAmount,
      documentTotals.taxTotal
    )
  ) {
    issues.push({
      code: 'TAX_TOTAL_MISMATCH',
      message:
        'ZATCA tax total does not match invoice VAT total.',
      field: 'taxTotal',
    });
  }

  if (
    !nearlyEqual(
      zatcaTotals.taxExclusiveAmount,
      documentTotals.taxableTotal
    )
  ) {
    issues.push({
      code: 'TAX_EXCLUSIVE_MISMATCH',
      message:
        'ZATCA tax exclusive amount does not match taxable total.',
      field: 'taxExclusiveAmount',
    });
  }

  if (
    !nearlyEqual(
      zatcaTotals.taxInclusiveAmount,
      documentTotals.grandTotal
    )
  ) {
    issues.push({
      code: 'TAX_INCLUSIVE_MISMATCH',
      message:
        'ZATCA tax inclusive amount does not match invoice grand total.',
      field: 'taxInclusiveAmount',
    });
  }

  if (
    !nearlyEqual(
      zatcaTotals.payableAmount,
      documentTotals.amountDue
    )
  ) {
    issues.push({
      code: 'PAYABLE_AMOUNT_MISMATCH',
      message:
        'ZATCA payable amount does not match invoice amount due.',
      field: 'payableAmount',
    });
  }

  const calculatedGrandTotal =
    roundMoney(
      zatcaTotals.taxExclusiveAmount +
        zatcaInvoice.taxTotal.taxAmount
    );

  if (
    !nearlyEqual(
      calculatedGrandTotal,
      zatcaTotals.taxInclusiveAmount
    )
  ) {
    issues.push({
      code: 'GRAND_TOTAL_RECONCILIATION_FAILED',
      message:
        'Tax exclusive amount plus VAT does not reconcile with tax inclusive amount.',
      field: 'taxInclusiveAmount',
    });
  }

  if (documentTotals.amountPaid < 0) {
    issues.push({
      code: 'NEGATIVE_AMOUNT_PAID',
      message:
        'Amount paid cannot be negative.',
      field: 'amountPaid',
    });
  }

  if (documentTotals.amountDue < 0) {
    issues.push({
      code: 'NEGATIVE_AMOUNT_DUE',
      message:
        'Amount due cannot be negative.',
      field: 'amountDue',
    });
  }

  if (
    !nearlyEqual(
      documentTotals.amountDue,
      documentTotals.grandTotal -
        documentTotals.amountPaid
    )
  ) {
    issues.push({
      code: 'AMOUNT_DUE_RECONCILIATION_FAILED',
      message:
        'Amount due does not reconcile with grand total minus amount paid.',
      field: 'amountDue',
    });
  }

  return {
    valid:
      issues.length === 0,
    issues,
  };
}








