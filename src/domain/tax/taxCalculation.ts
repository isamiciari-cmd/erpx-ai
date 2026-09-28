import {
  add,
  money,
  multiply,
  subtract,
  divide,
  toNumber,
} from '../money/money';

import type {
  TaxCalculationInput,
  TaxCalculationResult,
  DiscountInput,
  DiscountResult,
} from './taxTypes';

export const MONEY_SCALE = 100;

function validateTaxInput(input: TaxCalculationInput): void {
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error('Tax amount must be a non-negative number');
  }

  if (
    !Number.isFinite(input.taxRate) ||
    input.taxRate < 0 ||
    input.taxRate > 100
  ) {
    throw new Error('Tax rate must be between 0 and 100');
  }

  if (
    input.category !== 'STANDARD' &&
    input.category !== 'ZERO_RATED' &&
    input.category !== 'EXEMPT' &&
    input.category !== 'OUT_OF_SCOPE'
  ) {
    throw new Error('Invalid tax category');
  }

  if (
    input.mode !== 'EXCLUSIVE' &&
    input.mode !== 'INCLUSIVE'
  ) {
    throw new Error('Invalid tax calculation mode');
  }
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Money value must be a finite number');
  }

  return toNumber(money(value));
}

export function calculateDiscount(
  amount: number,
  discount: DiscountInput
): DiscountResult {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Amount must be a non-negative number');
  }

  if (!Number.isFinite(discount.value) || discount.value < 0) {
    throw new Error('Discount value must be a non-negative number');
  }

  const amountMoney = money(amount);

  let discountAmountMoney;

  if (discount.type === 'FIXED') {
    discountAmountMoney = money(discount.value);
  } else {
    if (discount.value > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    discountAmountMoney = multiply(
      amountMoney,
      discount.value / 100
    );
  }

  if (discountAmountMoney.amount > amountMoney.amount) {
    throw new Error('Discount cannot exceed the amount');
  }

  const discountedMoney = subtract(
    amountMoney,
    discountAmountMoney
  );

  return {
    originalAmount: toNumber(amountMoney),
    discountAmount: toNumber(discountAmountMoney),
    discountedAmount: toNumber(discountedMoney),
  };
}

export function calculateTax(
  input: TaxCalculationInput
): TaxCalculationResult {
  validateTaxInput(input);

  const { amount, taxRate, category, mode, taxCode } = input;

  const amountMoney = money(amount);

  /*
   * ZERO_RATED, EXEMPT and OUT_OF_SCOPE:
   * The supplied amount remains the reportable base.
   * VAT is zero.
   */
  if (
    category === 'ZERO_RATED' ||
    category === 'EXEMPT' ||
    category === 'OUT_OF_SCOPE'
  ) {
    const baseAmount = toNumber(amountMoney);

    return {
      baseAmount,
      taxableAmount: baseAmount,
      taxAmount: 0,
      totalAmount: baseAmount,
      taxRate: 0,
      category,
      taxCode,
    };
  }

  if (mode === 'EXCLUSIVE') {
    const baseAmount = toNumber(amountMoney);

    const taxMoney = multiply(
      amountMoney,
      taxRate / 100
    );

    const totalMoney = add(
      amountMoney,
      taxMoney
    );

    return {
      baseAmount,
      taxableAmount: baseAmount,
      taxAmount: toNumber(taxMoney),
      totalAmount: toNumber(totalMoney),
      taxRate,
      category,
      taxCode,
    };
  }

  /*
   * INCLUSIVE:
   * The supplied amount already contains VAT.
   *
   * taxable = total / (1 + rate)
   * VAT     = total - taxable
   */
  const totalMoney = amountMoney;

  const divisor = 1 + taxRate / 100;

  const taxableMoney = divide(
    totalMoney,
    divisor
  );

  const taxMoney = subtract(
    totalMoney,
    taxableMoney
  );

  return {
    baseAmount: toNumber(taxableMoney),
    taxableAmount: toNumber(taxableMoney),
    taxAmount: toNumber(taxMoney),
    totalAmount: toNumber(totalMoney),
    taxRate,
    category,
    taxCode,
  };
}

export function calculateDiscountedTax(
  amount: number,
  discount: DiscountInput,
  taxRate: number,
  category: TaxCalculationInput['category'],
  mode: TaxCalculationInput['mode'],
  taxCode?: string
): TaxCalculationResult {
  const discountResult = calculateDiscount(amount, discount);

  return calculateTax({
    amount: discountResult.discountedAmount,
    taxRate,
    category,
    mode,
    taxCode,
  });
}
