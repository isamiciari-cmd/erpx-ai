import { describe, expect, it } from 'vitest';

import {
  mapTaxCategoryToZatca,
} from './zatcaTaxMapping';

describe('ZATCA Tax Mapping', () => {
  it('maps STANDARD to S with the supplied VAT rate', () => {
    const result = mapTaxCategoryToZatca({
      category: 'STANDARD',
      rate: 15,
    });

    expect(result.code).toBe('S');
    expect(result.rate).toBe(15);
    expect(result.taxExemptionReasonCode).toBeUndefined();
    expect(result.taxExemptionReason).toBeUndefined();
  });

  it('maps ZERO_RATED to Z with zero rate', () => {
    const result = mapTaxCategoryToZatca({
      category: 'ZERO_RATED',
      rate: 0,
      taxExemptionReasonCode: 'TEST',
      taxExemptionReason: 'Test reason',
    });

    expect(result.code).toBe('Z');
    expect(result.rate).toBe(0);
    expect(result.taxExemptionReasonCode).toBe('TEST');
    expect(result.taxExemptionReason).toBe('Test reason');
  });

  it('maps EXEMPT to E with zero rate', () => {
    const result = mapTaxCategoryToZatca({
      category: 'EXEMPT',
      rate: 0,
      taxExemptionReasonCode: 'TEST',
      taxExemptionReason: 'Test reason',
    });

    expect(result.code).toBe('E');
    expect(result.rate).toBe(0);
    expect(result.taxExemptionReasonCode).toBe('TEST');
    expect(result.taxExemptionReason).toBe('Test reason');
  });

  it('maps OUT_OF_SCOPE to O with zero rate', () => {
    const result = mapTaxCategoryToZatca({
      category: 'OUT_OF_SCOPE',
      rate: 0,
    });

    expect(result.code).toBe('O');
    expect(result.rate).toBe(0);
  });

  it('rejects a non-zero rate for ZERO_RATED', () => {
    expect(() =>
      mapTaxCategoryToZatca({
        category: 'ZERO_RATED',
        rate: 15,
        taxExemptionReasonCode: 'TEST',
        taxExemptionReason: 'Test reason',
      })
    ).toThrow(
      'ZERO_RATED tax category must have a zero tax rate'
    );
  });

  it('rejects a non-zero rate for EXEMPT', () => {
    expect(() =>
      mapTaxCategoryToZatca({
        category: 'EXEMPT',
        rate: 15,
        taxExemptionReasonCode: 'TEST',
        taxExemptionReason: 'Test reason',
      })
    ).toThrow(
      'EXEMPT tax category must have a zero tax rate'
    );
  });

  it('rejects a non-zero rate for OUT_OF_SCOPE', () => {
    expect(() =>
      mapTaxCategoryToZatca({
        category: 'OUT_OF_SCOPE',
        rate: 15,
      })
    ).toThrow(
      'OUT_OF_SCOPE tax category must have a zero tax rate'
    );
  });

  it('rejects an invalid VAT rate', () => {
    expect(() =>
      mapTaxCategoryToZatca({
        category: 'STANDARD',
        rate: 101,
      })
    ).toThrow(
      'ZATCA tax rate must be between 0 and 100'
    );
  });

  it('rejects missing exemption information for ZERO_RATED', () => {
    expect(() =>
      mapTaxCategoryToZatca({
        category: 'ZERO_RATED',
        rate: 0,
      })
    ).toThrow(
      'ZERO_RATED requires a tax exemption reason code and reason'
    );
  });

  it('rejects missing exemption information for EXEMPT', () => {
    expect(() =>
      mapTaxCategoryToZatca({
        category: 'EXEMPT',
        rate: 0,
      })
    ).toThrow(
      'EXEMPT requires a tax exemption reason code and reason'
    );
  });

  it('rejects exemption information for STANDARD', () => {
    expect(() =>
      mapTaxCategoryToZatca({
        category: 'STANDARD',
        rate: 15,
        taxExemptionReasonCode: 'TEST',
        taxExemptionReason: 'Test reason',
      })
    ).toThrow(
      'STANDARD cannot contain a tax exemption reason'
    );
  });

  it('rejects exemption information for OUT_OF_SCOPE', () => {
    expect(() =>
      mapTaxCategoryToZatca({
        category: 'OUT_OF_SCOPE',
        rate: 0,
        taxExemptionReasonCode: 'TEST',
        taxExemptionReason: 'Test reason',
      })
    ).toThrow(
      'OUT_OF_SCOPE cannot contain a tax exemption reason'
    );
  });
});
