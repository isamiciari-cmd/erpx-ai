export type TaxCategory =
  | 'STANDARD'
  | 'ZERO_RATED'
  | 'EXEMPT'
  | 'OUT_OF_SCOPE';

export type TaxCalculationMode =
  | 'EXCLUSIVE'
  | 'INCLUSIVE';

export type DiscountType =
  | 'FIXED'
  | 'PERCENTAGE';

export interface TaxRule {
  code: string;
  category: TaxCategory;
  rate: number;
}

export interface TaxCalculationInput {
  amount: number;
  taxRate: number;
  category: TaxCategory;
  mode: TaxCalculationMode;
  taxCode?: string;
}

export interface TaxCalculationResult {
  baseAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  category: TaxCategory;
  taxCode?: string;
}

export interface DiscountInput {
  type: DiscountType;
  value: number;
}

export interface DiscountResult {
  originalAmount: number;
  discountAmount: number;
  discountedAmount: number;
}
