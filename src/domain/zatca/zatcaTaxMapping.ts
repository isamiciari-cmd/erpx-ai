import type {
  TaxCategory,
} from '../tax/taxTypes';

import type {
  ZatcaTaxCategory,
  ZatcaTaxCategoryCode,
} from './zatcaTypes';

const TAX_CATEGORY_CODES: Record<
  TaxCategory,
  ZatcaTaxCategoryCode
> = {
  STANDARD: 'S',
  ZERO_RATED: 'Z',
  EXEMPT: 'E',
  OUT_OF_SCOPE: 'O',
};

export interface ZatcaTaxMappingInput {
  category: TaxCategory;
  rate: number;
  taxCode?: string;
  taxExemptionReasonCode?: string;
  taxExemptionReason?: string;
}

function validateRate(rate: number): void {
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new Error(
      'ZATCA tax rate must be between 0 and 100'
    );
  }
}

function validateCategoryRate(
  category: TaxCategory,
  rate: number
): void {
  if (
    category !== 'STANDARD' &&
    rate !== 0
  ) {
    throw new Error(
      `${category} tax category must have a zero tax rate`
    );
  }
}

function validateExemptionReason(
  category: TaxCategory,
  input: ZatcaTaxMappingInput
): void {
  if (
    category === 'ZERO_RATED' ||
    category === 'EXEMPT'
  ) {
    if (
      !input.taxExemptionReasonCode ||
      !input.taxExemptionReason
    ) {
      throw new Error(
        `${category} requires a tax exemption reason code and reason`
      );
    }
  }

  if (
    category === 'STANDARD' ||
    category === 'OUT_OF_SCOPE'
  ) {
    if (
      input.taxExemptionReasonCode ||
      input.taxExemptionReason
    ) {
      throw new Error(
        `${category} cannot contain a tax exemption reason`
      );
    }
  }
}

export function mapTaxCategoryToZatca(
  input: ZatcaTaxMappingInput
): ZatcaTaxCategory {
  if (!input) {
    throw new Error(
      'ZATCA tax mapping input is required'
    );
  }

  validateRate(input.rate);

  validateCategoryRate(
    input.category,
    input.rate
  );

  validateExemptionReason(
    input.category,
    input
  );

  return {
    code: TAX_CATEGORY_CODES[input.category],
    rate: input.category === 'STANDARD'
      ? input.rate
      : 0,
    taxExemptionReasonCode:
      input.taxExemptionReasonCode,
    taxExemptionReason:
      input.taxExemptionReason,
  };
}
