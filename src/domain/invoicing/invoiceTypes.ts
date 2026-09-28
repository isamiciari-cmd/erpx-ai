import type {
  DiscountType,
  TaxCalculationMode,
  TaxCategory,
} from '../tax/taxTypes';

export interface InvoiceLineInput {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;

  discountType?: DiscountType;
  discountValue?: number;

  taxCategory: TaxCategory;
  taxRate: number;
  taxCode?: string;

  taxMode: TaxCalculationMode;
}

export interface InvoiceLineCalculation {
  productId?: string;
  description: string;

  quantity: number;
  unitPrice: number;

  grossAmount: number;
  discountAmount: number;
  netAmount: number;

  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;

  taxSnapshot: TaxSnapshot;
}

export interface TaxSnapshot {
  category: TaxCategory;
  rate: number;
  code?: string;
  mode: TaxCalculationMode;

  taxableAmount: number;
  taxAmount: number;
}

export interface InvoiceDocumentAllowanceChargeInput {
  charge: boolean;
  amount: number;
  taxCategory: TaxCategory;
  taxRate: number;
  reasonCode?: string;
  reason?: string;
  taxExemptionReasonCode?: string;
  taxExemptionReason?: string;
}

export interface InvoiceCalculationInput {
  lines: InvoiceLineInput[];
  allowanceCharges?: InvoiceDocumentAllowanceChargeInput[];
}

export interface InvoiceTaxBreakdown {
  taxCategory: TaxCategory;
  taxRate: number;
  taxCode?: string;
  taxExemptionReasonCode?: string;
  taxExemptionReason?: string;
  taxableAmount: number;
  taxAmount: number;
}

export interface InvoiceCalculationResult {
  lines: InvoiceLineCalculation[];

  subtotal: number;
  discountTotal: number;

  documentAllowanceTotal: number;
  documentChargeTotal: number;

  taxableTotal: number;
  taxTotal: number;
  grandTotal: number;

  taxBreakdowns: InvoiceTaxBreakdown[];

  allowanceCharges: InvoiceDocumentAllowanceChargeInput[];
}



