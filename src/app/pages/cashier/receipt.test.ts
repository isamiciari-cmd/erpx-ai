import { expect, it } from 'vitest';
import type { CompletePOSSaleResult } from '../../../services/salesService';
import { receiptSnapshot } from './receipt';

it('keeps the confirmed sale amounts and checkout code when reprinting from the session', () => {
  const sale: CompletePOSSaleResult = {
    success: true, sale_id: 'sale-id', sale_number: 'POS-01/A', invoice_id: 'invoice-id',
    invoice_number: 'INV-01/A', payment_id: 'payment-id', payment_number: 'PAY-01/A', customer_id: 'customer-id',
    subtotal: 100, discount_amount: 0, taxable_amount: 100, vat_amount: 15, total_amount: 115,
    items: [{ product_id: 'product', product_name: 'صنف QA-01', quantity: 2, unit_price: 50,
      discount_percentage: 0, subtotal: 100, total: 115 }],
  };
  const codes = new Map([['product', '00012-AB/9']]);
  const receipt = receiptSnapshot(sale, 'شركة اختبار', 'SAR', codes);
  codes.set('product', 'changed');
  sale.items![0].unit_price = 1;
  expect(receipt).toMatchObject({
    invoiceNumber: 'INV-01/A', saleNumber: 'POS-01/A', receiptNumber: 'PAY-01/A', subtotal: 100, vat: 15, paid: 115,
    lines: [{ name: 'صنف QA-01', quantity: 2, price: 50, total: 115, code: '00012-AB/9' }],
  });
});
