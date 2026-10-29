// Build only the web client, validate its public configuration and package static
// files for the Vercel Build Output API. Credentials never enter CLI arguments.
import {readFile,writeFile,readdir,mkdir,cp,rename,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const project='prj_Xca6Agc2dDe9aRbA8CQ6EN913eG4',team='team_0FRlTvxOjZpXO6nIsgV0l5E1',supabase='svxmlejmhlocsjjtftxd';
const previousIndex=process.argv.indexOf('--previous-production-id');
const previousDeployment=previousIndex<0?undefined:process.argv[previousIndex+1];
if(!/^dpl_[A-Za-z0-9]+$/.test(previousDeployment||''))throw Error('Pass the reviewed current production deployment using --previous-production-id.');
const sha=b=>createHash('sha256').update(b).digest('hex');
function envEntries(text){return Object.fromEntries(text.split(/\r?\n/).flatMap(line=>{const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);if(!m)return [];let value=m[2];if(value.startsWith('"')&&value.endsWith('"')){try{value=JSON.parse(value);}catch{throw Error('Invalid quoted private configuration.');}}else if(value.startsWith("'")&&value.endsWith("'"))value=value.slice(1,-1);return [[m[1],value]];}));}
async function walk(directory){const result=[];for(const e of await readdir(directory,{withFileTypes:true})){const p=path.join(directory,e.name);if(e.isSymbolicLink())throw Error('Symlinks are not allowed in release inputs.');if(e.isDirectory())result.push(...await walk(p));else if(e.isFile())result.push(p);}return result.sort();}
const projectMetadata=JSON.parse(await readFile(path.join(root,'.vercel/project.json'),'utf8'));
if(projectMetadata.projectId!==project||projectMetadata.orgId!==team)throw Error('The linked Vercel project differs from the reviewed production project.');
const production=envEntries(await readFile(path.join(root,'.vercel/.env.production.local'),'utf8'));
const localPublic=envEntries(await readFile(path.join(root,'.env'),'utf8'));
const remoteReadbackAvailable=Boolean(production.VITE_SUPABASE_URL?.trim()&&production.VITE_SUPABASE_ANON_KEY?.trim());
// Some provider responses withhold values. A static release can still embed the
// existing verified PUBLIC connection, independently checked in the artifact.
const url=(production.VITE_SUPABASE_URL||localPublic.VITE_SUPABASE_URL)?.trim(),key=(production.VITE_SUPABASE_ANON_KEY||localPublic.VITE_SUPABASE_ANON_KEY)?.trim();
if(url!=='https://'+supabase+'.supabase.co'||!key)throw Error('Production public Supabase configuration is absent or targets another project.');
let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));}catch{throw Error('Expected the reviewed anonymous public key.');}
if(claims.role!=='anon'||claims.ref!==supabase)throw Error('The browser key is not the reviewed public anonymous key.');
const inherited=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('VITE_')));
const build=spawnSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build'],{cwd:root,stdio:'inherit',env:{...inherited,VITE_SUPABASE_URL:url,VITE_SUPABASE_ANON_KEY:key,VITE_DEMO_MODE:'false',NODE_ENV:'production'}});
if(build.status!==0)throw Error('Production build did not exit successfully; release packaging stopped.');
const privateValues=[];
for(const filename of ['.env.server.local','.env.local','.vercel/.env.production.local']){
 const entries=envEntries(await readFile(path.join(root,filename),'utf8'));
 for(const[name,value]of Object.entries(entries))if(value.length>=16&&!/^(VITE_|NEXT_PUBLIC_)/.test(name)&&!/(ANON|PUBLISHABLE)/.test(name)&&/(TOKEN|SECRET|PASSWORD|SERVICE_ROLE|POSTGRES.*URL)/.test(name))privateValues.push(value);
}
try{const localGateway=JSON.parse(await readFile(path.join(root,'.tmp/ai-runtime/gateway.private.json'),'utf8'));if(typeof localGateway.token!=='string'||localGateway.token.length<32)throw Error('The local AI credential cannot be validated for the artifact scan.');privateValues.push(localGateway.token);}catch(error){if(error.code!=='ENOENT')throw error;}
const dist=path.join(root,'dist'),files=await walk(dist);let bytes=0;const hashes=[];let publicKeyPresent=false;
for(const file of files){const relative=path.relative(dist,file).replaceAll('\\','/');if(/(^|\/)(\.env|\.git|\.tmp|node_modules|database|supabase)(\/|\.|$)|\.map$|\.dpapi$|\.private\./i.test(relative))throw Error('Private or source artifact found in production output.');
 const data=await readFile(file);bytes+=data.length;
 if(privateValues.some(secret=>data.includes(Buffer.from(secret))))throw Error('A private credential value was detected in build output. No deployment was requested.');
 const text=data.toString('utf8');if(/sbp_[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))throw Error('A server credential pattern was detected in build output.');
 for(const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)){try{const payload=JSON.parse(Buffer.from(m[0].split('.')[1],'base64url'));if(payload.role==='service_role')throw Error('Privileged token found in build output.');}catch(e){if(e.message==='Privileged token found in build output.')throw e;}}
 if(text.includes(key)&&text.includes(url))publicKeyPresent=true;
 hashes.push({path:relative,bytes:data.length,sha256:sha(data)});
}
if(!publicKeyPresent)throw Error('The compiled application does not contain the intended public connection.');
const artifactHash=sha(JSON.stringify(hashes));const id='erpx-'+new Date().toISOString().replace(/[^\dTZ]/g,'')+'-'+artifactHash.slice(0,10);
const privateDirectory=path.join(root,'.tmp/release-acceptance');await mkdir(privateDirectory,{recursive:true});
const output=path.join(root,'.vercel/output');
// Both rename targets are resolved within this workspace; retain the previous
// packaged output instead of deleting a potentially useful rollback artifact.
if(!output.startsWith(root+path.sep))throw Error('Invalid output path.');
try{await stat(output);const old=path.join(privateDirectory,'previous-output-'+Date.now());if(!old.startsWith(root+path.sep))throw Error('Invalid archive path.');await rename(output,old);}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(output,{recursive:true});await cp(dist,path.join(output,'static'),{recursive:true});
const release={id,artifact_sha256:artifactHash,built_at:new Date().toISOString()};
await writeFile(path.join(output,'static/release.json'),JSON.stringify(release));
await writeFile(path.join(output,'config.json'),JSON.stringify({version:3,routes:[
 {src:'/release.json',headers:{'Cache-Control':'no-store'},continue:true},
 {src:'/assets/(.*)',headers:{'Cache-Control':'public, max-age=31536000, immutable'},continue:true},
 {src:'/index.html',headers:{'Cache-Control':'public, max-age=0, must-revalidate'},continue:true},
 {handle:'filesystem'},
 {src:'/(.*)',dest:'/index.html',headers:{'Cache-Control':'public, max-age=0, must-revalidate'}}
]},null,2));
await writeFile(path.join(privateDirectory,'release-manifest.json'),JSON.stringify({release,project_id:project,team_id:team,files:hashes,file_count:files.length,bytes,credential_scan_passed:true,source_upload:false,remote_public_values_readback_available:remoteReadbackAvailable,public_config_source:remoteReadbackAvailable?'vercel-production':'verified-local-public-fallback',previous_production_id:previousDeployment},null,2));
console.log(JSON.stringify({prepared:true,release_id:id,file_count:files.length,bytes,credential_scan_passed:true,static_output:'.vercel/output',live_deployment_requested:false}));
