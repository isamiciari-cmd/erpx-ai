export type ZatcaInvoiceTypeCode =
  | '388'
  | '381'
  | '383'
  | '386';

export type ZatcaInvoiceSubtype =
  | '01'
  | '02';

export type ZatcaTaxCategoryCode =
  | 'S'
  | 'Z'
  | 'E'
  | 'O';

export type ZatcaAllowanceChargeReason =
  | 'discount'
  | 'charge';

export type ZatcaPaymentMeansCode =
  | '10'
  | '30'
  | '48'
  | '54'
  | '55'
  | '57'
  | '58'
  | '59'
  | '97'
  | 'ZZZ';

export interface ZatcaDocumentReference {
  id: string;
  issueDate?: string;
  documentTypeCode?: string;
}

export interface ZatcaPartyIdentification {
  schemeId: string;
  value: string;
}

export interface ZatcaAddress {
  streetName?: string;
  buildingNumber?: string;
  plotIdentification?: string;
  citySubdivisionName?: string;
  cityName?: string;
  postalZone?: string;
  countryCode: string;
}

export interface ZatcaParty {
  legalName: string;
  vatNumber?: string;
  identification?: ZatcaPartyIdentification;
  address: ZatcaAddress;
}

export interface ZatcaTaxCategory {
  code: ZatcaTaxCategoryCode;
  rate: number;
  taxExemptionReasonCode?: string;
  taxExemptionReason?: string;
}

export interface ZatcaInvoiceLine {
  id: string;
  lineNumber: number;
  quantity: number;
  unitCode?: string;
  itemName: string;
  productCode?: string;
  unitPrice: number;
  baseQuantity?: number;
  allowanceAmount?: number;
  chargeAmount?: number;
  lineExtensionAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxCategory: ZatcaTaxCategory;
}

export interface ZatcaAllowanceCharge {
  chargeIndicator: boolean;
  amount: number;
  taxCategory: ZatcaTaxCategory;
  reasonCode?: string;
  reason?: string;
}

export interface ZatcaTaxSubtotal {
  taxableAmount: number;
  taxAmount: number;
  taxCategory: ZatcaTaxCategory;
}

export interface ZatcaTaxTotal {
  taxAmount: number;
  taxSubtotals: ZatcaTaxSubtotal[];
}

export interface ZatcaMonetaryTotals {
  lineExtensionAmount: number;
  allowanceTotalAmount?: number;
  chargeTotalAmount?: number;
  taxExclusiveAmount: number;
  taxInclusiveAmount: number;
  payableAmount: number;
}

export interface ZatcaPaymentMeans {
  code: ZatcaPaymentMeansCode;
  instructionNote?: string;
}

export interface ZatcaInvoice {
  uuid: string;
  invoiceNumber: string;

  issueDate: string;
  issueTime?: string;

  invoiceTypeCode: ZatcaInvoiceTypeCode;
  invoiceSubtype: ZatcaInvoiceSubtype;

  currencyCode: string;
  taxCurrencyCode?: string;

  seller: ZatcaParty;
  buyer?: ZatcaParty;

  originalInvoiceReference?: ZatcaDocumentReference;

  billingReference?: ZatcaDocumentReference;

  lines: ZatcaInvoiceLine[];

  allowanceCharges: ZatcaAllowanceCharge[];

  taxTotal: ZatcaTaxTotal;

  monetaryTotals: ZatcaMonetaryTotals;

  paymentMeans?: ZatcaPaymentMeans;
}




