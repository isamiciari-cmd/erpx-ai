import type { CompletePOSSaleResult } from '../../../services/salesService';

export function receiptSnapshot(
  sale: CompletePOSSaleResult, company: string, currency: string, codes: ReadonlyMap<string, string>,
) {
  return {
    company, currency, invoiceNumber: sale.invoice_number, saleNumber: sale.sale_number,
    receiptNumber: sale.payment_number,
    subtotal: sale.subtotal, discount: sale.discount_amount, vat: sale.vat_amount, paid: sale.total_amount,
    lines: (sale.items ?? []).map((line) => ({
      name: line.product_name, quantity: line.quantity, price: line.unit_price,
      total: line.total, code: codes.get(line.product_id),
    })),
  };
}

export type Receipt = ReturnType<typeof receiptSnapshot>;

const labels = {
  en: {
    invoice: 'Invoice number', sale: 'Sale number', receipt: 'Receipt number', item: 'Item', code: 'Barcode / SKU',
    quantity: 'Qty', price: 'Unit price', total: 'Total', subtotal: 'Subtotal',
    discount: 'Discount', vat: 'VAT', paid: 'Paid', pending: 'Electronic invoice submission pending.',
  },
  ar: {
    invoice: 'رقم الفاتورة', sale: 'رقم البيع', receipt: 'رقم الإيصال', item: 'الصنف', code: 'الباركود / رمز الصنف',
    quantity: 'الكمية', price: 'سعر الوحدة', total: 'الإجمالي', subtotal: 'المجموع الفرعي',
    discount: 'الخصم', vat: 'ضريبة القيمة المضافة', paid: 'المدفوع',
    pending: 'إرسال الفاتورة الإلكترونية قيد الانتظار.',
  },
};

export function renderReceipt(doc: Document, receipt: Receipt, language: 'ar' | 'en') {
  const label = labels[language];
  const element = <K extends keyof HTMLElementTagNameMap>(tag: K, value?: string) => {
    const node = doc.createElement(tag);
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const isolated = (value: string, direction = 'ltr') => {
    const node = element('bdi', value);
    node.dir = direction;
    return node;
  };
  const money = (value: number) => `${Number(value).toFixed(2)} ${receipt.currency}`;
  doc.documentElement.lang = language;
  doc.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  doc.title = receipt.invoiceNumber;
  doc.head.append(element('style', `
    body { font: 14px system-ui, sans-serif; margin: 16px; text-align: start; }
    h1, h2 { font-size: 18px; margin: 8px 0; }
    p { margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 4px; text-align: start; border-bottom: 1px solid #ddd; }
    td:not(:first-child) bdi { white-space: nowrap; }
    td small { display: block; overflow-wrap: anywhere; }
    @media print { body { margin: 0; } tr { break-inside: avoid; } }
  `));
  const company = element('h1');
  company.append(isolated(receipt.company, 'auto'));
  doc.body.append(company);
  const summary = (tag: 'p' | 'h2', name: string, value: string) => {
    const row = element(tag, name + ': ');
    row.append(isolated(value));
    doc.body.append(row);
  };
  summary('p', label.invoice, receipt.invoiceNumber);
  summary('p', label.sale, receipt.saleNumber);
  if (receipt.receiptNumber) summary('p', label.receipt, receipt.receiptNumber);

  const table = element('table');
  const header = table.createTHead().insertRow();
  for (const title of [label.item, label.quantity, label.price, label.total]) {
    const cell = element('th', title);
    cell.scope = 'col';
    header.append(cell);
  }
  const body = table.createTBody();
  for (const line of receipt.lines) {
    const row = body.insertRow();
    const product = row.insertCell();
    product.append(isolated(line.name, 'auto'));
    if (line.code) {
      const code = element('small', label.code + ': ');
      code.append(isolated(line.code));
      product.append(code);
    }
    for (const value of [String(line.quantity), money(line.price), money(line.total)]) {
      row.insertCell().append(isolated(value));
    }
  }
  doc.body.append(table);
  summary('p', label.subtotal, money(receipt.subtotal));
  summary('p', label.discount, money(receipt.discount));
  summary('p', label.vat, money(receipt.vat));
  summary('h2', label.paid, money(receipt.paid));
  doc.body.append(element('p', label.pending));
}
