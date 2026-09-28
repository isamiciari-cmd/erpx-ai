import type {
  InvoiceCalculationResult,
  InvoiceLineInput,
} from '../invoicing/invoiceTypes';

import type {
  ValidationContext,
  ValidationIssue,
  ValidationResult,
} from './validationTypes';

const VALID_TAX_CATEGORIES = new Set([
  'STANDARD',
  'ZERO_RATED',
  'EXEMPT',
  'OUT_OF_SCOPE',
]);

const VALID_TAX_MODES = new Set([
  'EXCLUSIVE',
  'INCLUSIVE',
]);

const VALID_DISCOUNT_TYPES = new Set([
  'FIXED',
  'PERCENTAGE',
]);

function addIssue(
  issues: ValidationIssue[],
  issue: ValidationIssue
): void {
  issues.push(issue);
}

function validateLine(
  line: InvoiceLineInput,
  lineIndex: number,
  issues: ValidationIssue[]
): void {
  const prefix = `lines[${lineIndex}]`;

  if (
    typeof line.description !== 'string' ||
    !line.description.trim()
  ) {
    addIssue(issues, {
      code: 'INVOICE_LINE_DESCRIPTION_REQUIRED',
      message: 'Invoice line description is required',
      field: `${prefix}.description`,
      lineIndex,
      severity: 'ERROR',
    });
  }

  if (
    !Number.isFinite(line.quantity) ||
    line.quantity <= 0
  ) {
    addIssue(issues, {
      code: 'INVOICE_LINE_INVALID_QUANTITY',
      message: 'Invoice line quantity must be greater than zero',
      field: `${prefix}.quantity`,
      lineIndex,
      severity: 'ERROR',
    });
  }

  if (
    !Number.isFinite(line.unitPrice) ||
    line.unitPrice < 0
  ) {
    addIssue(issues, {
      code: 'INVOICE_LINE_INVALID_UNIT_PRICE',
      message: 'Invoice line unit price must be non-negative',
      field: `${prefix}.unitPrice`,
      lineIndex,
      severity: 'ERROR',
    });
  }

  if (
    line.discountType !== undefined &&
    !VALID_DISCOUNT_TYPES.has(line.discountType)
  ) {
    addIssue(issues, {
      code: 'INVOICE_LINE_INVALID_DISCOUNT_TYPE',
      message: 'Invoice line discount type is invalid',
      field: `${prefix}.discountType`,
      lineIndex,
      severity: 'ERROR',
    });
  }

  if (
    line.discountType !== undefined &&
    line.discountValue === undefined
  ) {
    addIssue(issues, {
      code: 'INVOICE_LINE_DISCOUNT_VALUE_REQUIRED',
      message:
        'Discount value is required when discount type is provided',
      field: `${prefix}.discountValue`,
      lineIndex,
      severity: 'ERROR',
    });
  }

  if (
    line.discountValue !== undefined &&
    (
      !Number.isFinite(line.discountValue) ||
      line.discountValue < 0
    )
  ) {
    addIssue(issues, {
      code: 'INVOICE_LINE_INVALID_DISCOUNT_VALUE',
      message: 'Discount value must be non-negative',
      field: `${prefix}.discountValue`,
      lineIndex,
      severity: 'ERROR',
    });
  }

  if (
    line.discountType === 'PERCENTAGE' &&
    line.discountValue !== undefined &&
    line.discountValue > 100
  ) {
    addIssue(issues, {
      code: 'INVOICE_LINE_DISCOUNT_EXCEEDS_100',
      message: 'Percentage discount cannot exceed 100%',
      field: `${prefix}.discountValue`,
      lineIndex,
      severity: 'ERROR',
    });
  }

  if (!VALID_TAX_CATEGORIES.has(line.taxCategory)) {
    addIssue(issues, {
      code: 'INVOICE_LINE_INVALID_TAX_CATEGORY',
      message: 'Invoice line tax category is invalid',
      field: `${prefix}.taxCategory`,
      lineIndex,
      severity: 'ERROR',
    });
  }

  if (
    !Number.isFinite(line.taxRate) ||
    line.taxRate < 0 ||
    line.taxRate > 100
  ) {
    addIssue(issues, {
      code: 'INVOICE_LINE_INVALID_TAX_RATE',
      message: 'Tax rate must be between 0% and 100%',
      field: `${prefix}.taxRate`,
      lineIndex,
      severity: 'ERROR',
    });
  }

  if (!VALID_TAX_MODES.has(line.taxMode)) {
    addIssue(issues, {
      code: 'INVOICE_LINE_INVALID_TAX_MODE',
      message: 'Invoice line tax mode is invalid',
      field: `${prefix}.taxMode`,
      lineIndex,
      severity: 'ERROR',
    });
  }

  if (
    (
      line.taxCategory === 'ZERO_RATED' ||
      line.taxCategory === 'EXEMPT' ||
      line.taxCategory === 'OUT_OF_SCOPE'
    ) &&
    line.taxRate !== 0
  ) {
    addIssue(issues, {
      code: 'INVOICE_LINE_NON_STANDARD_TAX_RATE',
      message:
        'Zero-rated, exempt, and out-of-scope lines must use a zero tax rate',
      field: `${prefix}.taxRate`,
      lineIndex,
      severity: 'ERROR',
    });
  }
}

function validateCalculatedTotals(
  calculation: InvoiceCalculationResult,
  issues: ValidationIssue[]
): void {
  const values = [
    ['subtotal', calculation.subtotal],
    ['discountTotal', calculation.discountTotal],
    ['taxableTotal', calculation.taxableTotal],
    ['taxTotal', calculation.taxTotal],
    ['grandTotal', calculation.grandTotal],
  ] as const;

  for (const [field, value] of values) {
    if (!Number.isFinite(value) || value < 0) {
      addIssue(issues, {
        code: 'INVOICE_INVALID_CALCULATED_AMOUNT',
        message: `${field} must be a finite non-negative amount`,
        field,
        severity: 'ERROR',
      });
    }
  }

  if (issues.some((issue) => issue.severity === 'ERROR')) {
    return;
  }

  const expectedTaxableTotal =
    calculation.subtotal - calculation.discountTotal;

  const expectedGrandTotal =
    calculation.taxableTotal + calculation.taxTotal;

  const tolerance = 0.01;

  if (
    Math.abs(
      expectedTaxableTotal - calculation.taxableTotal
    ) > tolerance
  ) {
    addIssue(issues, {
      code: 'INVOICE_TAXABLE_TOTAL_MISMATCH',
      message:
        'Taxable total does not reconcile with subtotal minus discount',
      field: 'taxableTotal',
      severity: 'ERROR',
    });
  }

  if (
    Math.abs(
      expectedGrandTotal - calculation.grandTotal
    ) > tolerance
  ) {
    addIssue(issues, {
      code: 'INVOICE_GRAND_TOTAL_MISMATCH',
      message:
        'Grand total does not reconcile with taxable total plus tax',
      field: 'grandTotal',
      severity: 'ERROR',
    });
  }
}

export function validateInvoice(
  lines: InvoiceLineInput[],
  calculation?: InvoiceCalculationResult,
  context?: ValidationContext
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(lines)) {
    addIssue(issues, {
      code: 'INVOICE_LINES_REQUIRED',
      message: 'Invoice lines are required',
      field: 'lines',
      severity: 'ERROR',
    });

    return {
      valid: false,
      issues,
    };
  }

  if (lines.length === 0) {
    addIssue(issues, {
      code: 'INVOICE_LINES_EMPTY',
      message: 'Invoice must contain at least one line',
      field: 'lines',
      severity: 'ERROR',
    });
  }

  lines.forEach((line, index) => {
    validateLine(line, index, issues);
  });

  if (context?.currency !== undefined) {
    if (
      typeof context.currency !== 'string' ||
      !context.currency.trim()
    ) {
      addIssue(issues, {
        code: 'INVOICE_INVALID_CURRENCY',
        message: 'Currency must be a non-empty string',
        field: 'currency',
        severity: 'ERROR',
      });
    }
  }

  if (calculation) {
    validateCalculatedTotals(calculation, issues);
  }

  return {
    valid: !issues.some(
      (issue) => issue.severity === 'ERROR'
    ),
    issues,
  };
}