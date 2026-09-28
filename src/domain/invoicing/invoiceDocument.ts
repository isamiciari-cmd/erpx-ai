import type { TaxCategory } from '../tax/taxTypes';
import type {
  InvoiceBaseType,
  InvoiceDocumentReference,
  InvoiceDocumentType,
  InvoiceIndicators,
  InvoicePartyType,
} from './invoiceDocumentTypes';

import type {
  InvoiceLineSnapshot,
} from './invoiceLineSnapshot';

export type InvoiceCurrency = string;

export interface InvoiceAddress {
  street?: string;
  buildingNumber?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  countryCode: string;
}

export interface InvoiceParty {
  legalName: string;

  vatNumber?: string;

  identificationType?: string;
  identificationValue?: string;

  address: InvoiceAddress;
}

export interface InvoiceDocumentIdentifiers {
  invoiceId: string;
  invoiceNumber: string;
  uuid: string;
}

export interface InvoiceDocumentDates {
  issueDate: string;
  issueTime?: string;

  supplyDate?: string;

  originalSupplyDate?: string;
}

export interface InvoiceDocumentReferences {
  originalInvoice?: InvoiceDocumentReference;

  salesOrderId?: string;
  salesOrderNumber?: string;

  purchaseOrderNumber?: string;

  contractNumber?: string;
}

export interface InvoiceZatcaSecurityData {
  previousInvoiceHash?: string;

  invoiceHash?: string;

  cryptographicStamp?: string;

  qrCode?: string;
}

export interface InvoiceZatcaStatus {
  clearanceStatus?:
    | 'NOT_REQUIRED'
    | 'PENDING'
    | 'CLEARED'
    | 'REJECTED';

  reportingStatus?:
    | 'NOT_REQUIRED'
    | 'PENDING'
    | 'REPORTED'
    | 'REJECTED';

  zatcaUuid?: string;

  submissionId?: string;

  lastSubmittedAt?: string;

  lastResponseAt?: string;

  lastErrorCode?: string;

  lastErrorMessage?: string;
}

export interface InvoiceDocumentAllowanceCharge {
  charge: boolean;
  amount: number;
  percentage?: number;
  reasonCode?: string;
  reason?: string;
  taxExemptionReasonCode?: string;
  taxExemptionReason?: string;
  taxCategory: TaxCategory;
  taxRate: number;
}
export interface InvoiceDocumentTotals {
  subtotal: number;

  discountTotal: number;

  taxableTotal: number;

  taxTotal: number;

  grandTotal: number;

  amountPaid: number;

  amountDue: number;
}

export interface InvoiceDocument {
  identifiers: InvoiceDocumentIdentifiers;

  documentType: InvoiceDocumentType;

  baseType: InvoiceBaseType;

  partyType: InvoicePartyType;

  dates: InvoiceDocumentDates;

  currency: InvoiceCurrency;

  seller: InvoiceParty;

  buyer?: InvoiceParty;

  indicators: InvoiceIndicators;

  references: InvoiceDocumentReferences;

  lines: InvoiceLineSnapshot[];

  allowanceCharges?: InvoiceDocumentAllowanceCharge[];

  totals: InvoiceDocumentTotals;

  zatcaSecurity?: InvoiceZatcaSecurityData;

  zatcaStatus?: InvoiceZatcaStatus;
}





