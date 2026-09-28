import type {
  InvoiceBaseType,
  InvoiceDocumentReference,
  InvoiceDocumentType,
  InvoiceIndicators,
} from './invoiceDocumentTypes';

export interface InvoiceDocumentValidationInput {
  documentType: InvoiceDocumentType;

  sellerVatNumber?: string;
  buyerVatNumber?: string;

  originalInvoice?: InvoiceDocumentReference;

  indicators?: Partial<InvoiceIndicators>;
}

export interface InvoiceDocumentValidationIssue {
  code: string;
  message: string;
  field?: string;
}

export interface InvoiceDocumentValidationResult {
  valid: boolean;
  issues: InvoiceDocumentValidationIssue[];
}

function isNonEmpty(value?: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateVatNumber(
  value: string | undefined,
  field: string,
  issues: InvoiceDocumentValidationIssue[]
): void {
  if (!isNonEmpty(value)) {
    issues.push({
      code: 'VAT_NUMBER_REQUIRED',
      message: 'VAT registration number is required',
      field,
    });

    return;
  }

  const normalized = value!.trim();

  if (!/^\d{15}$/.test(normalized)) {
    issues.push({
      code: 'INVALID_VAT_NUMBER',
      message: 'VAT registration number must contain exactly 15 digits',
      field,
    });
  }
}

function validateOriginalInvoiceReference(
  reference: InvoiceDocumentReference | undefined,
  issues: InvoiceDocumentValidationIssue[]
): void {
  if (!reference) {
    issues.push({
      code: 'ORIGINAL_INVOICE_REFERENCE_REQUIRED',
      message:
        'Original invoice reference is required for credit and debit notes',
      field: 'originalInvoice',
    });

    return;
  }

  if (
    !isNonEmpty(reference.invoiceId) &&
    !isNonEmpty(reference.invoiceNumber)
  ) {
    issues.push({
      code: 'ORIGINAL_INVOICE_IDENTIFIER_REQUIRED',
      message:
        'Original invoice ID or invoice number is required',
      field: 'originalInvoice',
    });
  }
}

function validateIndicators(
  indicators: Partial<InvoiceIndicators> | undefined,
  issues: InvoiceDocumentValidationIssue[]
): void {
  if (!indicators) {
    return;
  }

  const fields: Array<keyof InvoiceIndicators> = [
    'thirdParty',
    'selfBilled',
    'nominal',
    'export',
  ];

  for (const field of fields) {
    const value = indicators[field];

    if (
      value !== undefined &&
      typeof value !== 'boolean'
    ) {
      issues.push({
        code: 'INVALID_INVOICE_INDICATOR',
        message: `${field} indicator must be boolean`,
        field: `indicators.${field}`,
      });
    }
  }
}

export function validateInvoiceDocument(
  input: InvoiceDocumentValidationInput
): InvoiceDocumentValidationResult {
  const issues: InvoiceDocumentValidationIssue[] = [];

  if (!input || !input.documentType) {
    issues.push({
      code: 'DOCUMENT_TYPE_REQUIRED',
      message: 'Invoice document type is required',
      field: 'documentType',
    });

    return {
      valid: false,
      issues,
    };
  }

  if (
    input.documentType === 'CREDIT_NOTE' ||
    input.documentType === 'DEBIT_NOTE'
  ) {
    validateOriginalInvoiceReference(
      input.originalInvoice,
      issues
    );
  }

  if (
    input.documentType === 'TAX_INVOICE' ||
    input.documentType === 'CREDIT_NOTE' ||
    input.documentType === 'DEBIT_NOTE'
  ) {
    if (input.buyerVatNumber !== undefined) {
      validateVatNumber(
        input.buyerVatNumber,
        'buyerVatNumber',
        issues
      );
    }
  }

  if (input.sellerVatNumber !== undefined) {
    validateVatNumber(
      input.sellerVatNumber,
      'sellerVatNumber',
      issues
    );
  }

  if (
    input.documentType === 'SIMPLIFIED_TAX_INVOICE' &&
    input.indicators?.export === true
  ) {
    issues.push({
      code: 'INVALID_DOCUMENT_INDICATOR',
      message:
        'Export indicator requires document and tax treatment validation',
      field: 'indicators.export',
    });
  }

  validateIndicators(
    input.indicators,
    issues
  );

  return {
    valid: issues.length === 0,
    issues,
  };
}