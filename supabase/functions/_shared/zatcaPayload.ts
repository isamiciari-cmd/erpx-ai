export interface PreparedInvoice {
  uuid: string | null;
  xml_content: string | null;
  invoice_hash: string | null;
  status: string;
  invoice_subtype: string;
}
export function preparedPayload(invoice: PreparedInvoice) {
  if (['draft', 'cancelled', 'void'].includes(invoice.status.toLowerCase())) throw new Error('Only an issued invoice can be submitted.');
  if (!invoice.uuid || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(invoice.uuid)) throw new Error('The invoice needs a valid UUID.');
  if (!invoice.xml_content || !invoice.invoice_hash || !/^[A-Za-z0-9+/]{43}=$/.test(invoice.invoice_hash)) throw new Error('A signed XML document and SHA-256 invoice hash from your signing service are required.');
  if (!invoice.xml_content.includes(invoice.uuid) || !/<(?:\w+:)?Signature(?:\s|>)/.test(invoice.xml_content)) throw new Error('The signed XML must include this invoice UUID and a digital signature.');
  if (!['01', '02'].includes(invoice.invoice_subtype)) throw new Error('Unsupported invoice subtype.');
  const bytes = new TextEncoder().encode(invoice.xml_content);
  if (bytes.length > 2_000_000) throw new Error('Signed XML exceeds the submission size limit.');
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return { mode: invoice.invoice_subtype === '02' ? 'reporting' : 'clearance', body: { uuid: invoice.uuid, invoiceHash: invoice.invoice_hash, invoice: btoa(binary) } };
}
export function acceptedSubmission(mode: string, httpOk: boolean, response: Record<string, unknown>): boolean {
  const status = mode === 'reporting' ? response.reportingStatus : response.clearanceStatus;
  return httpOk && status === (mode === 'reporting' ? 'REPORTED' : 'CLEARED');
}
