import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const project='prj_Xca6Agc2dDe9aRbA8CQ6EN913eG4',team='team_0FRlTvxOjZpXO6nIsgV0l5E1';
if(process.argv.length>3||(process.argv[2]&&process.argv[2]!=='--apply'))throw Error('Use no arguments for plan, or --apply.');
const linked=JSON.parse(await readFile(path.join(root,'.vercel/project.json'),'utf8'));
if(linked.projectId!==project||linked.orgId!==team)throw Error('Wrong linked project.');
const text=await readFile(path.join(root,'.env'),'utf8'),values={};
for(const line of text.split(/\r?\n/)){const m=line.match(/^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)\s*=\s*(.*?)\s*$/);if(m)values[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2').trim();}
if(values.VITE_SUPABASE_URL!=='https://svxmlejmhlocsjjtftxd.supabase.co')throw Error('Public URL differs from reviewed Supabase project.');
let payload;try{payload=JSON.parse(Buffer.from(values.VITE_SUPABASE_ANON_KEY.split('.')[1],'base64url'));}catch{throw Error('Expected a reviewed public JWT key.');}
if(payload.role!=='anon'||payload.ref!=='svxmlejmhlocsjjtftxd')throw Error('Only the matching anonymous browser key can be configured.');
if(process.argv[2]==='--apply'){
 for(const[name,value]of Object.entries(values)){
  const result=spawnSync(process.execPath,[path.join(root,'node_modules/vercel/dist/index.js'),'env','update',name,'production','--yes','--scope',team,'--no-color'],{cwd:root,input:value+'\n',encoding:'utf8',maxBuffer:1024*1024});
  await mkdir(path.join(root,'.tmp/release-acceptance'),{recursive:true});
  await writeFile(path.join(root,'.tmp/release-acceptance','env-update-'+name+'.private.log'),(result.stdout||'')+'\n'+(result.stderr||''));
  if(/action_required/.test(result.stdout||''))throw Error('The CLI requested an additional noninteractive input; no completed update confirmed.');
  if(result.status!==0)throw Error('Public environment update did not exit successfully for '+name+'. Inspect remote metadata before retry.');
  console.log('Updated '+name+' in the existing production project. Value withheld.');
 }
}
console.log(JSON.stringify({project_id:project,names:Object.keys(values),public_anon_role_verified:true,applied:process.argv[2]==='--apply'}));
