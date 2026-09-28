export const DEFAULT_MONEY_SCALE = 2;

export type MoneyValue = number | string;

export interface Money {
  readonly amount: bigint;
  readonly scale: number;
}

function assertValidScale(scale: number): void {
  if (!Number.isInteger(scale) || scale < 0 || scale > 6) {
    throw new Error('Money scale must be an integer between 0 and 6');
  }
}

function normalizeDecimal(value: MoneyValue): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Money value must be finite');
    }

    return value.toString();
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Money value must be a valid number or string');
  }

  const normalized = value.trim();

  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error('Money value must be a valid decimal');
  }

  return normalized;
}

function pow10(scale: number): bigint {
  return 10n ** BigInt(scale);
}

function parseToMinorUnits(value: MoneyValue, scale: number): bigint {
  const normalized = normalizeDecimal(value);
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;

  const [integerPart, fractionalPart = ''] = unsigned.split('.');

  if (fractionalPart.length > scale) {
    throw new Error(
      `Money value has more than ${scale} decimal places`
    );
  }

  const paddedFraction = fractionalPart.padEnd(scale, '0');

  const integerUnits = BigInt(integerPart) * pow10(scale);
  const fractionalUnits =
    paddedFraction === '' ? 0n : BigInt(paddedFraction);

  const result = integerUnits + fractionalUnits;

  return negative ? -result : result;
}

export function money(
  value: MoneyValue,
  scale = DEFAULT_MONEY_SCALE
): Money {
  assertValidScale(scale);

  return {
    amount: parseToMinorUnits(value, scale),
    scale,
  };
}

function assertSameScale(a: Money, b: Money): void {
  if (a.scale !== b.scale) {
    throw new Error('Money values must use the same scale');
  }
}

export function add(a: Money, b: Money): Money {
  assertSameScale(a, b);

  return {
    amount: a.amount + b.amount,
    scale: a.scale,
  };
}

export function subtract(a: Money, b: Money): Money {
  assertSameScale(a, b);

  return {
    amount: a.amount - b.amount,
    scale: a.scale,
  };
}

export function multiply(
  value: Money,
  multiplier: MoneyValue
): Money {
  const normalized = normalizeDecimal(multiplier);

  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;

  const [integerPart, fractionalPart = ''] = unsigned.split('.');

  const multiplierScale = fractionalPart.length;

  const multiplierUnits =
    BigInt(integerPart) * pow10(multiplierScale) +
    (fractionalPart ? BigInt(fractionalPart) : 0n);

  let result = value.amount * multiplierUnits;

  if (multiplierScale > 0) {
    const divisor = pow10(multiplierScale);

    const remainder = result % divisor;
    result /= divisor;

    const absoluteRemainder = remainder < 0n ? -remainder : remainder;

    if (absoluteRemainder * 2n >= divisor) {
      result += result < 0n ? -1n : 1n;
    }
  }

  if (negative && multiplierUnits !== 0n) {
    result = -result;
  }

  return {
    amount: result,
    scale: value.scale,
  };
}

export function divide(
  value: Money,
  divisor: MoneyValue
): Money {
  const normalized = normalizeDecimal(divisor);

  if (normalized === '0' || normalized === '0.0' || /^0\.0+$/.test(normalized)) {
    throw new Error('Cannot divide money by zero');
  }

  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;

  const [integerPart, fractionalPart = ''] = unsigned.split('.');

  const divisorScale = fractionalPart.length;

  const divisorUnits =
    BigInt(integerPart) * pow10(divisorScale) +
    (fractionalPart ? BigInt(fractionalPart) : 0n);

  let numerator = value.amount * pow10(divisorScale);

  let quotient = numerator / divisorUnits;
  const remainder = numerator % divisorUnits;

  if (remainder !== 0n) {
    const absoluteRemainder =
      remainder < 0n ? -remainder : remainder;

    if (absoluteRemainder * 2n >= divisorUnits) {
      quotient += quotient < 0n ? -1n : 1n;
    }
  }

  if (negative) {
    quotient = -quotient;
  }

  return {
    amount: quotient,
    scale: value.scale,
  };
}

export function compare(a: Money, b: Money): number {
  assertSameScale(a, b);

  if (a.amount < b.amount) return -1;
  if (a.amount > b.amount) return 1;

  return 0;
}

export function isZero(value: Money): boolean {
  return value.amount === 0n;
}

export function toNumber(value: Money): number {
  return Number(value.amount) / Number(pow10(value.scale));
}

export function toString(value: Money): string {
  const negative = value.amount < 0n;
  const absolute = negative ? -value.amount : value.amount;

  const factor = pow10(value.scale);
  const integerPart = absolute / factor;
  const fractionalPart = absolute % factor;

  if (value.scale === 0) {
    return `${negative ? '-' : ''}${integerPart}`;
  }

  const fraction = fractionalPart
    .toString()
    .padStart(value.scale, '0');

  return `${negative ? '-' : ''}${integerPart}.${fraction}`;
}
