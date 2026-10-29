import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),manifest=JSON.parse(await readFile(new URL('.tmp/release-acceptance/release-manifest.json',root),'utf8'));
const origins=['https://www.erpx-ai.com','https://erpx-ai.com','https://code-isamiciari-5169s-projects.vercel.app'];
const results=await Promise.all(origins.map(async origin=>{
 try{
  const response=await fetch(origin+'/release.json',{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(25000)});
  if(response.status!==200)throw Error('marker_http_'+response.status);
  const marker=await response.json();if(marker.id!==manifest.release.id||marker.artifact_sha256!==manifest.release.artifact_sha256)throw Error('release_marker_mismatch');
  const htmlResponse=await fetch(origin+'/login',{signal:AbortSignal.timeout(25000)});if(htmlResponse.status!==200)throw Error('spa_route_http_'+htmlResponse.status);
  const html=await htmlResponse.text();const local=await readFile(new URL('dist/index.html',root),'utf8');if(html!==local)throw Error('published_index_mismatch');
  return {origin,passed:true,resolved_origin:new URL(response.url).origin,marker_cache_control:response.headers.get('cache-control'),spa_route_status:htmlResponse.status};
 }catch(e){return {origin,passed:false,error:/^[a-z_0-9]+$/.test(e.message)?e.message:e.name};}
}));
const assets=[];
const usableOrigin=results.find(r=>r.origin===origins[2]&&r.passed)?.origin||results.find(r=>r.passed)?.origin;
for(const item of manifest.files.filter(f=>f.path==='index.html'||f.path.endsWith('.css')||/assets\/(index-|supabase-vendor-|react-vendor-)/.test(f.path))){
 if(!usableOrigin){assets.push({path:item.path,hash_matches:false,error:'no_reachable_production_origin'});continue;}
 try{const response=await fetch(usableOrigin+'/'+item.path,{signal:AbortSignal.timeout(25000)});const body=Buffer.from(await response.arrayBuffer());
 assets.push({path:item.path,status:response.status,hash_matches:response.status===200&&createHash('sha256').update(body).digest('hex')===item.sha256});}catch(e){assets.push({path:item.path,hash_matches:false,error:e.name});}
}
const report={passed:Boolean(usableOrigin)&&assets.every(r=>r.hash_matches),custom_domains_ready:results.slice(0,2).every(r=>r.passed),workflow_origin:usableOrigin,release_id:manifest.release.id,origins:results,initial_assets:assets,checked_at:new Date().toISOString()};
await writeFile(new URL('.tmp/release-acceptance/production-verification.json',root),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
