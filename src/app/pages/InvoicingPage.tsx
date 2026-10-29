import { issueBusinessInvoice } from '../../services/businessReceivablesService';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { listInvoices, getInvoice, type Invoice } from '../../services/invoicesService';
import { listProducts, type Product } from '../../services/productsService';
import { listCustomers, type Customer } from '../../services/customersService';
import { saveInvoiceDraft } from '../../services/invoiceDraftService';
import { downloadCsv, printReport } from '../utils/reporting';

const control = 'rounded-lg border border-white/20 bg-gray-900 text-white p-2';
export default function InvoicingPage() {
  const { user } = useAuth(); const companyId = user?.company_id;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1, discount_percentage: 0 }]);
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [search, setSearch] = useState(''); const requestId = useRef(crypto.randomUUID());
  const load = useCallback(async () => {
    if (!companyId) return;
    setBusy(true); setError('');
    try { const [invoices, products, customers] = await Promise.all([listInvoices(companyId), listProducts(companyId), listCustomers(companyId)]); setInvoices(invoices); setProducts(products.filter(p => p.is_active)); setCustomers(customers); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, [companyId]);
  useEffect(() => { void load(); }, [load]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!companyId || busy) return;
    setBusy(true); setError('');
    try {
      const result = await saveInvoiceDraft({ companyId, customerId: customer, items, dueDate, notes, requestId: requestId.current });
      setNotice(`Saved ${result.invoice_number}. This is a draft; it has not been issued or sent to ZATCA.`);
      requestId.current = crypto.randomUUID(); setOpen(false); setItems([{ product_id: '', quantity: 1, discount_percentage: 0 }]); setNotes('');
      await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const issue = async (invoice: Invoice) => {
    if (busy || !confirm('Issue this invoice and post its receivable, revenue and VAT? Inventory dispatch is handled separately.')) return;
    setBusy(true); setError('');
    try { await issueBusinessInvoice(invoice.id); setNotice(`Issued ${invoice.invoice_number}.`); await load(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const filtered = invoices.filter(i => `${i.invoice_number} ${i.status}`.toLowerCase().includes(search.toLowerCase()));
  const rows = filtered.map(i => ({ number: i.invoice_number, date: i.issue_date, customer: customers.find(c => c.id === i.customer_id)?.company_name || i.customer_id, net: i.subtotal, VAT: i.vat_amount, total: i.total_amount, paid: i.amount_paid, due: i.amount_due, status: i.status, currency: i.currency_code }));
  const print = async (invoice: Invoice) => {
    setError('');
    try {
      const detail = await getInvoice(invoice.id) as (Invoice & { lines?: Record<string, unknown>[] }) | null;
      printReport(`Invoice ${invoice.invoice_number}`, (detail?.lines ?? []).map(line => ({ description: line.description ?? line.product_name ?? line.product_id, quantity: line.quantity, unit_price: line.unit_price, VAT: line.vat_amount, total: line.total_amount ?? line.line_total })), { Customer: customers.find(c => c.id === invoice.customer_id)?.company_name || invoice.customer_id, Status: invoice.status, Total: `${invoice.total_amount} ${invoice.currency_code}`, VAT: String(invoice.vat_amount) });
    } catch (e) { setError((e as Error).message); }
  };
  const change = (index: number, patch: Partial<typeof items[number]>) => { requestId.current = crypto.randomUUID(); setItems(old => old.map((item, i) => i === index ? { ...item, ...patch } : item)); };
  return <section className="space-y-5">
    <h1 className="text-3xl font-bold">Invoices</h1>
    <div className="flex gap-3 flex-wrap"><button className={control} onClick={() => { requestId.current = crypto.randomUUID(); setOpen(!open); }}>New draft</button><Link className={control} to="/pos">Create a paid sale</Link><button disabled={busy} className={control} onClick={load}>Refresh</button><button className={control} onClick={() => downloadCsv('invoices', rows)}>Export CSV</button><input aria-label="Search invoices" className={control} placeholder="Search invoices" value={search} onChange={e => setSearch(e.target.value)} /></div>
    {error && <p role="alert" className="text-red-400">{error}</p>}{notice && <p role="status" className="text-green-400">{notice}</p>}
    {open && <form onSubmit={save} className="rounded-xl border border-white/20 p-5 space-y-4">
      <div className="flex flex-wrap gap-4"><label>Customer<select required className={`block ${control}`} value={customer} onChange={e => { requestId.current = crypto.randomUUID(); setCustomer(e.target.value); }}><option value="">Choose customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></label><label>Due date<input required type="date" className={`block ${control}`} value={dueDate} onChange={e => { requestId.current = crypto.randomUUID(); setDueDate(e.target.value); }} /></label></div>
      {items.map((item, index) => <div key={index} className="flex flex-wrap gap-3"><select aria-label={`Product ${index + 1}`} required className={control} value={item.product_id} onChange={e => change(index, { product_id: e.target.value })}><option value="">Choose product</option>{products.map(p => <option key={p.id} value={p.id}>{p.sku} ? {p.product_name} ({p.unit_price})</option>)}</select><label>Quantity<input required type="number" min="0.001" step="0.001" className={`block w-28 ${control}`} value={item.quantity} onChange={e => change(index, { quantity: Number(e.target.value) })} /></label><label>Discount %<input required type="number" min="0" max="100" step="0.01" className={`block w-28 ${control}`} value={item.discount_percentage} onChange={e => change(index, { discount_percentage: Number(e.target.value) })} /></label><button type="button" disabled={items.length === 1} className={control} onClick={() => { requestId.current = crypto.randomUUID(); setItems(old => old.filter((_, i) => i !== index)); }}>Remove</button></div>)}
      <button type="button" className={control} onClick={() => { requestId.current = crypto.randomUUID(); setItems(old => [...old, { product_id: '', quantity: 1, discount_percentage: 0 }]); }}>Add line</button>
      <label className="block">Notes<textarea className={`block w-full ${control}`} value={notes} onChange={e => { requestId.current = crypto.randomUUID(); setNotes(e.target.value); }} /></label>
      <p className="text-gray-400">Prices, tax rates and totals are calculated from company product records on the server. Creating a draft does not change stock or record payment.</p>
      <button disabled={busy} className="bg-blue-600 px-4 py-2 rounded-lg disabled:opacity-40">{busy ? 'Saving?' : 'Save draft'}</button>
    </form>}
    <div className="overflow-auto"><table className="w-full text-left"><thead><tr>{['Invoice', 'Date', 'Customer', 'Total', 'Paid', 'Due', 'Status', ''].map((h, i) => <th className="p-3" key={i}>{h}</th>)}</tr></thead><tbody>{filtered.map((invoice, index) => <tr className="border-t border-white/10" key={invoice.id}><td className="p-3">{invoice.invoice_number}</td><td>{invoice.issue_date}</td><td>{rows[index].customer}</td><td>{Number(invoice.total_amount).toFixed(2)}</td><td>{Number(invoice.amount_paid).toFixed(2)}</td><td>{Number(invoice.amount_due).toFixed(2)}</td><td>{invoice.status}</td><td><button className={control} onClick={() => print(invoice)}>Print</button>{invoice.status.toLowerCase() === 'draft' && <button disabled={busy} className={control} onClick={() => issue(invoice)}>Issue invoice</button>}</td></tr>)}</tbody></table></div>
    {!busy && !filtered.length && <p>No invoices found.</p>}
  </section>;
}
