export type InvoiceDocumentType =
  | 'TAX_INVOICE'
  | 'SIMPLIFIED_TAX_INVOICE'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'PREPAYMENT_INVOICE';

export type InvoiceBaseType =
  | 'TAX_INVOICE'
  | 'SIMPLIFIED_TAX_INVOICE';

export type InvoicePartyType =
  | 'B2B'
  | 'B2C'
  | 'B2G'
  | 'EXPORT';

export type ZatcaInvoiceTypeCode =
  | '388'
  | '381'
  | '383'
  | '386';

export type ZatcaInvoiceSubtype =
  | '01'
  | '02';

export interface InvoiceIndicators {
  thirdParty: boolean;
  selfBilled: boolean;
  nominal: boolean;
  export: boolean;
}

export interface InvoiceDocumentReference {
  invoiceId?: string;
  invoiceNumber?: string;
  issueDate?: string;
}

export interface InvoiceDocumentTypeDefinition {
  documentType: InvoiceDocumentType;

  baseType: InvoiceBaseType;

  zatcaTypeCode: ZatcaInvoiceTypeCode;

  zatcaSubtype: ZatcaInvoiceSubtype;

  requiresOriginalInvoiceReference: boolean;

  requiresQrCode: boolean;
}
export function getZatcaDocumentDefinition(
  documentType: InvoiceDocumentType,
  baseType: InvoiceBaseType = 'TAX_INVOICE'
): InvoiceDocumentTypeDefinition {
  switch (documentType) {
    case 'TAX_INVOICE':
      return {
        documentType,
        baseType: 'TAX_INVOICE',
        zatcaTypeCode: '388',
        zatcaSubtype: '01',
        requiresOriginalInvoiceReference: false,
        requiresQrCode: false,
      };

    case 'SIMPLIFIED_TAX_INVOICE':
      return {
        documentType,
        baseType: 'SIMPLIFIED_TAX_INVOICE',
        zatcaTypeCode: '388',
        zatcaSubtype: '02',
        requiresOriginalInvoiceReference: false,
        requiresQrCode: true,
      };

    case 'CREDIT_NOTE':
      return {
        documentType,
        baseType,
        zatcaTypeCode: '381',
        zatcaSubtype:
          baseType === 'TAX_INVOICE' ? '01' : '02',
        requiresOriginalInvoiceReference: true,
        requiresQrCode:
          baseType === 'SIMPLIFIED_TAX_INVOICE',
      };

    case 'DEBIT_NOTE':
      return {
        documentType,
        baseType,
        zatcaTypeCode: '383',
        zatcaSubtype:
          baseType === 'TAX_INVOICE' ? '01' : '02',
        requiresOriginalInvoiceReference: true,
        requiresQrCode:
          baseType === 'SIMPLIFIED_TAX_INVOICE',
      };

    case 'PREPAYMENT_INVOICE':
      return {
        documentType,
        baseType,
        zatcaTypeCode: '386',
        zatcaSubtype:
          baseType === 'TAX_INVOICE' ? '01' : '02',
        requiresOriginalInvoiceReference: false,
        requiresQrCode:
          baseType === 'SIMPLIFIED_TAX_INVOICE',
      };
  }
}