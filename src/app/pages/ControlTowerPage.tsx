import { useCallback,useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
export default function ControlTowerPage(){
 const {user}=useAuth();const companyId=user?.company_id;
 const [results,setResults]=useState<{table:string;count:number|null;latency:number;error:string|null}[]>([]);const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{if(!companyId)return;setBusy(true);const results=await Promise.all(['users','products','invoices','sales'].map(async table=>{const start=performance.now();const {count,error}=await supabase.from(table).select('id',{head:true,count:'exact'}).eq('company_id',companyId);return{table,count,latency:Math.round(performance.now()-start),error:error?.message??null};}));setResults(results);setBusy(false);},[companyId]);
 useEffect(()=>{void refresh();},[refresh]);
 return <section className="space-y-5"><h1 className="text-3xl font-bold">Control tower</h1><p>Current company database checks. Latency is measured from this browser; it is not server uptime.</p><button disabled={busy} onClick={refresh} className="rounded-lg border px-4 py-2">{busy?'Checking?':'Run checks'}</button><div className="grid md:grid-cols-2 gap-4">{results.map(result=><article key={result.table} className="p-5 rounded-xl border"><h2 className="font-bold capitalize">{result.table}</h2><p>{result.error?result.error:`${result.count} records ? ${result.latency} ms`}</p></article>)}</div><div className="flex gap-3 flex-wrap">{[['Company settings','/admin/tenants'],['Users','/admin/users'],['Audit log','/admin/audit-logs'],['Usage','/admin/usage']].map(([name,path])=><Link className="rounded-lg border p-3" key={path} to={path}>{name}</Link>)}</div></section>;
}
