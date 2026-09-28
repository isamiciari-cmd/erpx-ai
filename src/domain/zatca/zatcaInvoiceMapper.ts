import type {
  InvoiceDocument,
  InvoiceParty,
} from '../invoicing/invoiceDocument';

import type {
  ZatcaInvoice,
  ZatcaParty,
  ZatcaAddress,
} from './zatcaTypes';

import {
  mapInvoiceLineToZatca,
} from './zatcaInvoiceLineMapper';

import {
  mapInvoiceLinesToZatcaTaxTotal,
} from './zatcaTaxTotalsMapper';

import {
  mapTaxCategoryToZatca,
} from './zatcaTaxMapping';

function mapAddress(
  address: InvoiceParty['address']
): ZatcaAddress {
  return {
    streetName: address.street,
    buildingNumber: address.buildingNumber,
    citySubdivisionName: address.district,
    cityName: address.city,
    postalZone: address.postalCode,
    countryCode: address.countryCode,
  };
}

function mapParty(
  party: InvoiceParty
): ZatcaParty {
  return {
    legalName: party.legalName,
    vatNumber: party.vatNumber,
    identification:
      party.identificationType &&
      party.identificationValue
        ? {
            schemeId:
              party.identificationType,
            value:
              party.identificationValue,
          }
        : undefined,
    address: mapAddress(party.address),
  };
}

export function mapInvoiceDocumentToZatca(
  document: InvoiceDocument
): ZatcaInvoice {
  if (!document) {
    throw new Error(
      'Invoice document is required'
    );
  }

  if (
    !document.identifiers.uuid.trim()
  ) {
    throw new Error(
      'Invoice UUID is required'
    );
  }

  if (
    !document.identifiers.invoiceNumber.trim()
  ) {
    throw new Error(
      'Invoice number is required'
    );
  }

  if (
    !document.currency.trim()
  ) {
    throw new Error(
      'Invoice currency is required'
    );
  }

  if (
    !document.dates.issueDate.trim()
  ) {
    throw new Error(
      'Invoice issue date is required'
    );
  }

  if (
    !document.seller.legalName.trim()
  ) {
    throw new Error(
      'Seller legal name is required'
    );
  }

  if (document.lines.length === 0) {
    throw new Error(
      'Invoice must contain at least one line'
    );
  }

  const lines = document.lines.map(
    (line) =>
      mapInvoiceLineToZatca(line, {
        unitCode:
          line.unitOfMeasure,
      })
  );

  const taxTotal =
    mapInvoiceLinesToZatcaTaxTotal(
      document.lines,
      document.allowanceCharges
    );

  const allowanceCharges =
    (document.allowanceCharges ?? []).map(
      (adjustment) => ({
        chargeIndicator:
          adjustment.charge,
        amount:
          adjustment.amount,
        reasonCode:
          adjustment.reasonCode,
        reason:
          adjustment.reason,
        taxCategory:
          mapTaxCategoryToZatca({
            category:
              adjustment.taxCategory,
            rate:
              adjustment.taxRate,
            taxExemptionReasonCode:
              adjustment.taxExemptionReasonCode,
            taxExemptionReason:
              adjustment.taxExemptionReason,
          }),
      })
    );

  const documentAllowanceTotal =
    (document.allowanceCharges ?? [])
      .filter(
        (adjustment) =>
          !adjustment.charge
      )
      .reduce(
        (total, adjustment) =>
          total + adjustment.amount,
        0
      );

  const documentChargeTotal =
    (document.allowanceCharges ?? [])
      .filter(
        (adjustment) =>
          adjustment.charge
      )
      .reduce(
        (total, adjustment) =>
          total + adjustment.amount,
        0
      );

  const lineExtensionAmount =
    document.totals.subtotal -
    document.totals.discountTotal;

  const taxExclusiveAmount =
    document.totals.taxableTotal;

  const taxInclusiveAmount =
    document.totals.grandTotal;

  const payableAmount =
    document.totals.amountDue;

  return {
    uuid:
      document.identifiers.uuid,

    invoiceNumber:
      document.identifiers.invoiceNumber,

    issueDate:
      document.dates.issueDate,

    issueTime:
      document.dates.issueTime,

    invoiceTypeCode:
      document.documentType ===
      'CREDIT_NOTE'
        ? '381'
        : document.documentType ===
            'DEBIT_NOTE'
          ? '383'
          : document.documentType ===
              'PREPAYMENT_INVOICE'
            ? '386'
            : '388',

    invoiceSubtype:
      document.baseType ===
      'SIMPLIFIED_TAX_INVOICE'
        ? '02'
        : '01',

    currencyCode:
      document.currency,

    seller:
      mapParty(document.seller),

    buyer:
      document.buyer
        ? mapParty(document.buyer)
        : undefined,

    originalInvoiceReference:
      document.references.originalInvoice
        ? {
            id:
              document.references
                .originalInvoice
                .invoiceNumber ??
              document.references
                .originalInvoice
                .invoiceId ??
              '',
            issueDate:
              document.references
                .originalInvoice
                .issueDate,
          }
        : undefined,

    billingReference:
      document.references.salesOrderId
        ? {
            id:
              document.references
                .salesOrderNumber ??
              document.references
                .salesOrderId,
          }
        : undefined,

    lines,

    allowanceCharges,

    taxTotal,

    monetaryTotals: {
      lineExtensionAmount,

      allowanceTotalAmount:
        documentAllowanceTotal > 0
          ? documentAllowanceTotal
          : undefined,

      chargeTotalAmount:
        documentChargeTotal > 0
          ? documentChargeTotal
          : undefined,

      taxExclusiveAmount,

      taxInclusiveAmount,

      payableAmount,
    },
  };
}
