import { describe, expect, it } from 'vitest';
import {
  money,
  add,
  subtract,
  multiply,
  divide,
  compare,
  isZero,
  toNumber,
  toString,
} from './money';

describe('Money Engine', () => {
  it('represents decimal money exactly', () => {
    const a = money('0.10');
    const b = money('0.20');

    const result = add(a, b);

    expect(toString(result)).toBe('0.30');
  });

  it('handles two decimal places correctly', () => {
    const result = money('19.99');

    expect(toString(result)).toBe('19.99');
    expect(toNumber(result)).toBe(19.99);
  });

  it('adds money values', () => {
    const result = add(
      money('100.25'),
      money('50.75')
    );

    expect(toString(result)).toBe('151.00');
  });

  it('subtracts money values', () => {
    const result = subtract(
      money('1000.00'),
      money('100.50')
    );

    expect(toString(result)).toBe('899.50');
  });

  it('multiplies money with decimal precision', () => {
    const result = multiply(
      money('19.99'),
      '0.15'
    );

    expect(toString(result)).toBe('3.00');
  });

  it('calculates VAT on 100 SAR', () => {
    const result = multiply(
      money('100.00'),
      '0.15'
    );

    expect(toString(result)).toBe('15.00');
  });

  it('calculates a discounted amount', () => {
    const result = subtract(
      money('1000.00'),
      money('100.00')
    );

    expect(toString(result)).toBe('900.00');
  });

  it('divides and rounds to the money scale', () => {
    const result = divide(
      money('1000.00'),
      '3'
    );

    expect(toString(result)).toBe('333.33');
  });

  it('supports negative money values', () => {
    const result = subtract(
      money('100.00'),
      money('150.00')
    );

    expect(toString(result)).toBe('-50.00');
  });

  it('compares money values', () => {
    expect(
      compare(money('100.00'), money('100.01'))
    ).toBe(-1);

    expect(
      compare(money('100.00'), money('100.00'))
    ).toBe(0);

    expect(
      compare(money('100.01'), money('100.00'))
    ).toBe(1);
  });

  it('detects zero', () => {
    expect(isZero(money('0.00'))).toBe(true);
    expect(isZero(money('0.01'))).toBe(false);
  });

  it('rejects values with more decimal places than the scale', () => {
    expect(() => money('10.123')).toThrow();
  });

  it('rejects invalid money values', () => {
    expect(() => money('abc')).toThrow();
    expect(() => money('')).toThrow();
    expect(() => money('NaN')).toThrow();
  });

  it('rejects division by zero', () => {
    expect(() =>
      divide(money('100.00'), '0')
    ).toThrow();
  });

  it('rejects arithmetic with different scales', () => {
    expect(() =>
      add(money('10.00', 2), money('10.000', 3))
    ).toThrow();
  });
});
