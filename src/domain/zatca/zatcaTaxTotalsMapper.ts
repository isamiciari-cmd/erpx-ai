import type {
  InvoiceLineSnapshot,
} from '../invoicing/invoiceLineSnapshot';

import type {
  ZatcaTaxSubtotal,
  ZatcaTaxTotal,
} from './zatcaTypes';

import {
  mapTaxCategoryToZatca,
} from './zatcaTaxMapping';

interface TaxGroup {
  category: InvoiceLineSnapshot['taxCategory'];
  rate: number;
  taxCode?: string;
  taxExemptionReasonCode?: string;
  taxExemptionReason?: string;
  taxableAmount: number;
  taxAmount: number;
}

function buildGroupKey(
  line: InvoiceLineSnapshot
): string {
  const baseKey: Array<string | number> = [
    line.taxCategory,
    line.taxRate,
  ];

  if (
    line.taxCategory === 'ZERO_RATED' ||
    line.taxCategory === 'EXEMPT'
  ) {
    baseKey.push(
      line.taxExemptionReasonCode ?? '',
      line.taxExemptionReason ?? ''
    );
  }

  return baseKey.join('|');
}

function addAmount(
  current: number,
  value: number
): number {
  const result =
    Math.round(
      (current + value) * 100
    ) / 100;

  return Object.is(result, -0)
    ? 0
    : result;
}

export function mapInvoiceLinesToZatcaTaxTotal(
  lines: InvoiceLineSnapshot[],
  allowanceCharges: Array<{
    charge: boolean;
    amount: number;
    taxCategory: InvoiceLineSnapshot['taxCategory'];
    taxRate: number;
    reasonCode?: string;
    reason?: string;
    taxExemptionReasonCode?: string;
    taxExemptionReason?: string;
  }> = []
): ZatcaTaxTotal {
  if (!Array.isArray(lines)) {
    throw new Error(
      'Invoice lines must be an array'
    );
  }

  if (lines.length === 0) {
    throw new Error(
      'At least one invoice line is required'
    );
  }

  const groups = new Map<string, TaxGroup>();

  for (const line of lines) {
    if (!line) {
      throw new Error(
        'Invoice line is required'
      );
    }

    if (
      !Number.isFinite(line.taxableAmount) ||
      line.taxableAmount < 0
    ) {
      throw new Error(
        'Invoice line taxable amount must be non-negative'
      );
    }

    if (
      !Number.isFinite(line.taxAmount) ||
      line.taxAmount < 0
    ) {
      throw new Error(
        'Invoice line tax amount must be non-negative'
      );
    }

    const key = buildGroupKey(line);

    const existing = groups.get(key);

    if (existing) {
      existing.taxableAmount = addAmount(
        existing.taxableAmount,
        line.taxableAmount
      );

      existing.taxAmount = addAmount(
        existing.taxAmount,
        line.taxAmount
      );
    } else {
      groups.set(key, {
        category: line.taxCategory,
        rate: line.taxRate,
        taxCode: line.taxCode,
        taxExemptionReasonCode:
          line.taxExemptionReasonCode,
        taxExemptionReason:
          line.taxExemptionReason,
        taxableAmount: line.taxableAmount,
        taxAmount: line.taxAmount,
      });
    }
  }

  for (const adjustment of allowanceCharges) {
    if (
      !Number.isFinite(adjustment.amount) ||
      adjustment.amount < 0
    ) {
      throw new Error(
        'Allowance or charge amount must be non-negative'
      );
    }

    if (
      !Number.isFinite(adjustment.taxRate) ||
      adjustment.taxRate < 0 ||
      adjustment.taxRate > 100
    ) {
      throw new Error(
        'Allowance or charge tax rate must be between 0 and 100'
      );
    }

    const adjustmentKeyParts: Array<string | number> = [
      adjustment.taxCategory,
      adjustment.taxRate,
    ];

    if (
      adjustment.taxCategory === 'ZERO_RATED' ||
      adjustment.taxCategory === 'EXEMPT'
    ) {
      adjustmentKeyParts.push(
        adjustment.taxExemptionReasonCode ?? '',
        adjustment.taxExemptionReason ?? ''
      );
    }

    const key =
      adjustmentKeyParts.join('|');

    const adjustmentTax =
      adjustment.taxCategory === 'STANDARD'
        ? Math.round(
            adjustment.amount *
              (adjustment.taxRate / 100) *
              100
          ) / 100
        : 0;

    const signedTaxableAmount =
      adjustment.charge
        ? adjustment.amount
        : -adjustment.amount;

    const signedTaxAmount =
      adjustment.charge
        ? adjustmentTax
        : -adjustmentTax;

    const existing = groups.get(key);

    if (existing) {
      existing.taxableAmount = addAmount(
        existing.taxableAmount,
        signedTaxableAmount
      );

      existing.taxAmount = addAmount(
        existing.taxAmount,
        signedTaxAmount
      );
    } else {
      groups.set(key, {
        category: adjustment.taxCategory,
        rate: adjustment.taxRate,
        taxableAmount: signedTaxableAmount,
        taxAmount: addAmount(
          0,
          signedTaxAmount
        ),
        taxCode: undefined,
        taxExemptionReasonCode:
          adjustment.taxCategory === 'ZERO_RATED' ||
          adjustment.taxCategory === 'EXEMPT'
            ? adjustment.taxExemptionReasonCode
            : undefined,
        taxExemptionReason:
          adjustment.taxCategory === 'ZERO_RATED' ||
          adjustment.taxCategory === 'EXEMPT'
            ? adjustment.taxExemptionReason
            : undefined,
      });
    }
  }

  const taxSubtotals: ZatcaTaxSubtotal[] =
    Array.from(groups.values()).map(
      (group) => ({
        taxableAmount: group.taxableAmount,
        taxAmount: group.taxAmount,
        taxCategory:
          mapTaxCategoryToZatca({
            category: group.category,
            rate: group.rate,
            taxCode: group.taxCode,
            taxExemptionReasonCode:
              group.taxExemptionReasonCode,
            taxExemptionReason:
              group.taxExemptionReason,
          }),
      })
    );

  const taxAmount = taxSubtotals.reduce(
    (total, subtotal) =>
      addAmount(
        total,
        subtotal.taxAmount
      ),
    0
  );

  return {
    taxAmount,
    taxSubtotals,
  };
}













