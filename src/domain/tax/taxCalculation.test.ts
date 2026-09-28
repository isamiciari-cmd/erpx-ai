import { describe, expect, it } from 'vitest';
import {
  calculateTax,
  calculateDiscount,
  calculateDiscountedTax,
} from './taxCalculation';

describe('Tax Calculation Engine', () => {
  it('calculates 15% VAT on an exclusive amount', () => {
    const result = calculateTax({
      amount: 100,
      taxRate: 15,
      category: 'STANDARD',
      mode: 'EXCLUSIVE',
    });

    expect(result.baseAmount).toBe(100);
    expect(result.taxableAmount).toBe(100);
    expect(result.taxAmount).toBe(15);
    expect(result.totalAmount).toBe(115);
  });

  it('extracts 15% VAT from an inclusive amount', () => {
    const result = calculateTax({
      amount: 115,
      taxRate: 15,
      category: 'STANDARD',
      mode: 'INCLUSIVE',
    });

    expect(result.baseAmount).toBe(100);
    expect(result.taxableAmount).toBe(100);
    expect(result.taxAmount).toBe(15);
    expect(result.totalAmount).toBe(115);
  });

  it('calculates VAT after a fixed discount', () => {
    const result = calculateDiscountedTax(
      1000,
      { type: 'FIXED', value: 100 },
      15,
      'STANDARD',
      'EXCLUSIVE'
    );

    expect(result.taxableAmount).toBe(900);
    expect(result.taxAmount).toBe(135);
    expect(result.totalAmount).toBe(1035);
  });

  it('calculates a percentage discount', () => {
    const result = calculateDiscount(
      1000,
      { type: 'PERCENTAGE', value: 10 }
    );

    expect(result.originalAmount).toBe(1000);
    expect(result.discountAmount).toBe(100);
    expect(result.discountedAmount).toBe(900);
  });

  it('calculates VAT after a percentage discount', () => {
    const result = calculateDiscountedTax(
      1000,
      { type: 'PERCENTAGE', value: 10 },
      15,
      'STANDARD',
      'EXCLUSIVE'
    );

    expect(result.taxableAmount).toBe(900);
    expect(result.taxAmount).toBe(135);
    expect(result.totalAmount).toBe(1035);
  });

  it('keeps the taxable base for zero-rated supplies', () => {
    const result = calculateTax({
      amount: 1000,
      taxRate: 15,
      category: 'ZERO_RATED',
      mode: 'EXCLUSIVE',
    });

    expect(result.taxableAmount).toBe(1000);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(1000);
    expect(result.taxRate).toBe(0);
  });

  it('keeps the taxable base for exempt supplies', () => {
    const result = calculateTax({
      amount: 1000,
      taxRate: 15,
      category: 'EXEMPT',
      mode: 'EXCLUSIVE',
    });

    expect(result.taxableAmount).toBe(1000);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(1000);
    expect(result.taxRate).toBe(0);
  });

  it('keeps the base for out-of-scope supplies', () => {
    const result = calculateTax({
      amount: 1000,
      taxRate: 15,
      category: 'OUT_OF_SCOPE',
      mode: 'EXCLUSIVE',
    });

    expect(result.taxableAmount).toBe(1000);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(1000);
    expect(result.taxRate).toBe(0);
  });

  it('rounds monetary calculations to two decimals', () => {
    const result = calculateTax({
      amount: 19.99,
      taxRate: 15,
      category: 'STANDARD',
      mode: 'EXCLUSIVE',
    });

    expect(result.baseAmount).toBe(19.99);
    expect(result.taxAmount).toBe(3);
    expect(result.totalAmount).toBe(22.99);
  });

  it('supports a 100% percentage discount', () => {
    const result = calculateDiscount(
      500,
      { type: 'PERCENTAGE', value: 100 }
    );

    expect(result.discountAmount).toBe(500);
    expect(result.discountedAmount).toBe(0);
  });

  it('rejects a discount greater than the amount', () => {
    expect(() =>
      calculateDiscount(
        100,
        { type: 'FIXED', value: 150 }
      )
    ).toThrow();
  });

  it('rejects a percentage discount above 100%', () => {
    expect(() =>
      calculateDiscount(
        100,
        { type: 'PERCENTAGE', value: 101 }
      )
    ).toThrow();
  });

  it('rejects a tax rate above 100%', () => {
    expect(() =>
      calculateTax({
        amount: 100,
        taxRate: 101,
        category: 'STANDARD',
        mode: 'EXCLUSIVE',
      })
    ).toThrow();
  });
});
