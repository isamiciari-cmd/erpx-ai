import type {
  DiscountType,
  TaxCalculationMode,
  TaxCategory,
} from '../tax/taxTypes';

export interface InvoiceLineSnapshot {
  lineId: string;
  lineNumber: number;
  productId?: string;
  productCode?: string;
  description: string;
  unitOfMeasure?: string;

  quantity: number;
  unitPrice: number;

  discountType?: DiscountType;
  discountValue?: number;

  grossAmount: number;
  discountAmount: number;
  netAmount: number;

  taxCategory: TaxCategory;
  taxCode?: string;
  taxRate: number;
  taxMode: TaxCalculationMode;

  taxExemptionReasonCode?: string;
  taxExemptionReason?: string;

  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
}
