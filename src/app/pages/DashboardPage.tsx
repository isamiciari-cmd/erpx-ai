import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { listInvoices, type Invoice } from '../../services/invoicesService';
import { invoiceMetrics } from '../../domain/dashboard/invoiceMetrics';
import { downloadCsv, printReport } from '../utils/reporting';

export default function DashboardPage() {
  const { user } = useAuth(); const companyId = user?.company_id;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true); setError('');
    try { setInvoices(await listInvoices(companyId)); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [companyId]);
  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => invoices.filter(i => (!from || i.issue_date.slice(0, 10) >= from) && (!to || i.issue_date.slice(0, 10) <= to)), [invoices, from, to]);
  const metrics = invoiceMetrics(filtered);
  const currency = user?.company?.currency || 'SAR';
  const format = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  const cards = [['Issued invoice total', metrics.total], ['Collected', metrics.collected], ['Outstanding', metrics.outstanding], ['Invoice VAT', metrics.vat]] as const;
  const rows = filtered.map(i => ({ number: i.invoice_number, date: i.issue_date, net: i.subtotal, vat: i.vat_amount, total: i.total_amount, collected: i.amount_paid, status: i.status }));
  return <section className="space-y-6">
    <div className="flex justify-between gap-4 flex-wrap"><div><h1 className="text-3xl font-bold">Company overview</h1><p className="text-gray-400 mt-2">{user?.company?.name} ? Invoice totals from saved records. Drafts and cancelled invoices are excluded from the cards.</p></div><button disabled={loading} onClick={load} className="px-4 py-2 rounded-xl border disabled:opacity-40">{loading ? 'Loading?' : 'Refresh'}</button></div>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    <div className="flex flex-wrap gap-3 items-end"><label>From<input type="date" className="block p-2 rounded bg-gray-900 text-white border" value={from} onChange={e => setFrom(e.target.value)} /></label><label>To<input type="date" min={from} className="block p-2 rounded bg-gray-900 text-white border" value={to} onChange={e => setTo(e.target.value)} /></label><button className="p-2 rounded border" onClick={() => downloadCsv('company-invoices', rows)}>Export CSV</button><button className="p-2 rounded border" onClick={() => printReport('Company invoice report', rows, { Company: user?.company?.name || '', Currency: currency })}>Print report</button></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map(([name, value]) => <article key={name} className="p-5 rounded-2xl border border-white/15 bg-white/5"><p className="text-gray-400">{name}</p><p className="text-2xl mt-3 font-bold">{format(value)}</p></article>)}</div>
    <div className="rounded-xl border border-white/15 p-4"><h2 className="font-bold mb-4">Last six calendar months</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={metrics.months}><CartesianGrid strokeDasharray="3 3" stroke="#475569" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="total" name="Invoice total" fill="#3b82f6" /><Bar dataKey="collected" name="Collected" fill="#10b981" /></BarChart></ResponsiveContainer></div></div>
    <div className="flex flex-wrap gap-3">{[['Invoices', '/finance/invoicing'], ['Point of sale', '/pos'], ['Stock', '/inventory'], ['Financial reports', '/finance/reports'], ['Business assistant', '/ai/recommendations']].map(([name, path]) => <Link key={path} to={path} className="p-3 rounded-xl border">{name}</Link>)}</div>
    {!loading && !invoices.length && <p>No invoice records yet. Create your products and customers, then record your first sale.</p>}
  </section>;
}
