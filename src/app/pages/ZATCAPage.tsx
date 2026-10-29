import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { listInvoices, type Invoice } from '../../services/invoicesService';
import { downloadCsv } from '../utils/reporting';

export default function ZATCAPage() {
  const { user } = useAuth();
  const companyId = user?.company_id;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState<string>();
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true); setError('');
    try { setInvoices(await listInvoices(companyId)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [companyId]);
  useEffect(() => { void load(); }, [load]);
  const submit = async (invoice: Invoice) => {
    if (busy) return;
    setBusy(invoice.id); setError(''); setResult('');
    try {
      const { data, error } = await supabase.functions.invoke('zatca/submit', { body: { invoiceId: invoice.id } });
      let response = data;
      if (error && 'context' in error && error.context instanceof Response) response = await error.context.json().catch(() => null);
      if (response) setResult(JSON.stringify(response, null, 2));
      if (error || !response?.ok) throw new Error(response?.error || error?.message || 'Submission failed.');
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(undefined); }
  };
  const xml = (invoice: Invoice) => {
    if (!invoice.xml_content) return;
    const url = URL.createObjectURL(new Blob([invoice.xml_content], { type: 'application/xml;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${invoice.invoice_number.replace(/[^a-zA-Z0-9_-]/g, '_')}.xml`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="space-y-5">
    <h1 className="text-3xl font-bold">ZATCA e-invoicing</h1>
    <p className="text-gray-400">Submit issued invoices prepared by your signing service. A signed XML document, invoice hash and company EGS credentials are required. Only an authority response marks an invoice as cleared or reported.</p>
    <div className="flex gap-3"><button onClick={load} disabled={loading || !!busy} className="px-4 py-2 rounded-lg bg-blue-600">Refresh</button><button onClick={() => downloadCsv('zatca-invoices', invoices.map(i => ({ number: i.invoice_number, clearance: i.clearance_status, reporting: i.reporting_status, environment: i.zatca_environment })))} className="px-4 py-2 rounded-lg border">Export CSV</button></div>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    {loading && <p role="status">Loading invoices?</p>}
    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{['Invoice', 'Date', 'Total', 'Clearance', 'Reporting', 'Environment', 'Actions'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>
      {invoices.map(invoice => <tr key={invoice.id} className="border-t border-white/10"><td className="p-3">{invoice.invoice_number}</td><td>{invoice.issue_date}</td><td>{Number(invoice.total_amount).toFixed(2)} {invoice.currency_code}</td><td>{invoice.clearance_status || 'not submitted'}</td><td>{invoice.reporting_status || 'not submitted'}</td><td>{invoice.zatca_environment || '?'}</td><td className="space-x-2"><button disabled={!!busy || !invoice.xml_content || invoice.status.toLowerCase() === 'draft'} onClick={() => submit(invoice)} className="px-3 py-2 rounded border disabled:opacity-40">{busy === invoice.id ? 'Submitting?' : 'Submit signed invoice'}</button><button disabled={!invoice.xml_content} onClick={() => xml(invoice)} className="px-3 py-2 rounded border disabled:opacity-40">XML</button></td></tr>)}
    </tbody></table></div>
    {!loading && !invoices.length && <p>No invoices found.</p>}
    {result && <pre aria-live="polite" className="p-4 bg-gray-900 text-gray-200 rounded-xl overflow-x-auto whitespace-pre-wrap">{result}</pre>}
  </section>;
}
