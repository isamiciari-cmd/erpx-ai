import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolve,relative,isAbsolute} from 'node:path';
const root=new URL('../../',import.meta.url);
const qi=s=>'"'+s.replaceAll('"','""')+'"';
export async function cloneLive({backupPath}={}){
 const privateRoot=fileURLToPath(new URL('.tmp/supabase-review/',root));
 let selected='';if(backupPath){selected=resolve(fileURLToPath(root),backupPath);const rel=relative(privateRoot,selected);if(rel.startsWith('..')||isAbsolute(rel)||!selected.endsWith('.dpapi'))throw new Error('Backup must be a DPAPI archive within the private workspace folder.');}
 const py=`import importlib.util,io,zipfile,json,pathlib,sys
p=pathlib.Path('database/inspection/backup-live.py');s=importlib.util.spec_from_file_location('backup',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
files=sorted(pathlib.Path('.tmp/supabase-review').glob('public-backup-*.dpapi'));path=pathlib.Path(sys.argv[1]) if sys.argv[1] else files[-1];m.verify(path);z=zipfile.ZipFile(io.BytesIO(m.crypt(path.read_bytes(),True)));sys.stdout.buffer.write(b'{"data":'+z.read('public-data.api.json')+b',"schema":'+z.read('schema.json')+b',"catalog":'+z.read('catalog.json')+b'}')`;
 const raw=spawnSync('python',['-c',py,selected],{cwd:root,encoding:'utf8',maxBuffer:25*1024*1024});
 if(raw.status!==0)throw new Error('Private backup decryption failed');
 const archive=JSON.parse(raw.stdout),schema=archive.schema[0].private_schema,catalog=archive.catalog,data=archive.data[0].logical_backup;
 let entry;try{entry=import.meta.resolve('@electric-sql/pglite');}catch{entry=new URL('.tmp/db-validation/node_modules/@electric-sql/pglite/dist/index.js',root).href;}
 const {PGlite}=await import(entry);const {uuid_ossp}=await import(new URL('./contrib/uuid_ossp.js',entry));const {pgcrypto}=await import(new URL('./contrib/pgcrypto.js',entry));
 const db=new PGlite({extensions:{'uuid-ossp':uuid_ossp,pgcrypto}});let stage='platform';
 try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE SCHEMA extensions;
 CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth,public,extensions TO anon,authenticated,service_role;
 GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
 SET search_path=public,extensions,pg_catalog;`);
 stage='sequences';for(const sequence of catalog.sequences??[])await db.exec('CREATE SEQUENCE public.'+qi(sequence.name)+' AS '+sequence.data_type+' INCREMENT '+sequence.increment+' MINVALUE '+sequence.minimum+' NO MAXVALUE START '+sequence.start+' CACHE '+sequence.cache+(sequence.cycle?' CYCLE':' NO CYCLE'));
 stage='tables';
 for(const table of schema.tables){
 const columns=table.columns.map(c=>qi(c.name)+' '+c.type+(c.generated?` GENERATED ALWAYS AS (${c.default}) STORED`:c.identity?' GENERATED '+(c.identity==='a'?'ALWAYS':'BY DEFAULT')+' AS IDENTITY':c.default?' DEFAULT '+c.default:'')+(c.not_null?' NOT NULL':''));
 await db.exec('CREATE TABLE public.'+qi(table.name)+' ('+columns.join(',')+')');
 }
 stage='constraints';
 for(const type of ['p','u','c','f','x'])for(const table of schema.tables)for(const constraint of table.constraints.filter(c=>c.type===type))await db.exec('ALTER TABLE public.'+qi(table.name)+' ADD CONSTRAINT '+qi(constraint.name)+' '+constraint.definition);
 stage='functions';let pending=[...schema.functions];
 for(let round=0;pending.length&&round<schema.functions.length;round++){let next=[];for(const fn of pending){try{await db.exec(fn.definition);}catch(e){if(['42883','42P01'].includes(e.code))next.push(fn);else throw e;}}if(next.length===pending.length)throw new Error('Unresolved function dependencies');pending=next;}
 if(pending.length)throw new Error('Unresolved function dependencies');
 stage='indexes';for(const table of schema.tables)for(const index of table.indexes.filter(i=>!i.constraint_backed))await db.exec(index.definition);
 stage='private backup data';
 for(const id of data.auth_identity_ids)await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())',[id,'restored-'+id+'@local.test']);
 // Restore all rows before installing foreign keys so cross-table ordering cannot lose data.
 const fks=[];for(const table of schema.tables)for(const c of table.constraints.filter(c=>c.type==='f')){fks.push([table.name,c]);await db.exec('ALTER TABLE public.'+qi(table.name)+' DROP CONSTRAINT '+qi(c.name));}
 for(const table of schema.tables){const columns=table.columns.filter(c=>!c.generated).map(c=>c.name);for(const row of data.tables[table.name])await db.query('INSERT INTO public.'+qi(table.name)+' ('+columns.map(qi).join(',')+') SELECT '+columns.map(qi).join(',')+' FROM jsonb_populate_record(NULL::public.'+qi(table.name)+',$1::jsonb)',[JSON.stringify(row)]);}
 for(const [table,c]of fks)await db.exec('ALTER TABLE public.'+qi(table)+' ADD CONSTRAINT '+qi(c.name)+' '+c.definition);
 stage='triggers and policies';for(const table of schema.tables){for(const trigger of table.triggers)await db.exec(trigger.definition);if(table.rls)await db.exec('ALTER TABLE public.'+qi(table.name)+' ENABLE ROW LEVEL SECURITY');if(table.force_rls)await db.exec('ALTER TABLE public.'+qi(table.name)+' FORCE ROW LEVEL SECURITY');
 for(const p of table.policies){const command=({'*':'ALL','r':'SELECT','a':'INSERT','w':'UPDATE','d':'DELETE'})[p.command];await db.exec('CREATE POLICY '+qi(p.name)+' ON public.'+qi(table.name)+' AS '+(p.permissive?'PERMISSIVE':'RESTRICTIVE')+' FOR '+command+' TO '+p.roles.map(r=>r==='PUBLIC'?'PUBLIC':qi(r)).join(',')+(p.using?' USING ('+p.using+')':'')+(p.check?' WITH CHECK ('+p.check+')':''));}}
 stage='grants';
 for(const table of schema.tables)await db.exec('REVOKE ALL ON public.'+qi(table.name)+' FROM PUBLIC,anon,authenticated,service_role');
 for(const grant of catalog.grants.tables.filter(g=>['PUBLIC','anon','authenticated','service_role'].includes(g.grantee)))await db.exec('GRANT '+grant.privilege+' ON '+((catalog.sequences??[]).some(s=>s.name===grant.table_name)?'SEQUENCE ':'TABLE ')+'public.'+qi(grant.table_name)+' TO '+(grant.grantee==='PUBLIC'?'PUBLIC':qi(grant.grantee)));
 for(const fn of schema.functions)await db.exec('REVOKE ALL ON FUNCTION public.'+qi(fn.name)+'('+fn.identity_arguments+') FROM PUBLIC,anon,authenticated,service_role');
 for(const grant of catalog.grants.functions.filter(g=>['PUBLIC','anon','authenticated','service_role'].includes(g.grantee)))await db.exec('GRANT '+grant.privilege+' ON FUNCTION public.'+qi(grant.function_name)+'('+grant.identity_arguments+') TO '+(grant.grantee==='PUBLIC'?'PUBLIC':qi(grant.grantee)));
 const seqState=data.sequence_state??JSON.parse(await readFile(new URL('.tmp/supabase-review/live-sequence-state.json',root),'utf8'))[0].sequence_state;for(const[name,value]of Object.entries(seqState))await db.query('SELECT setval($1::regclass,$2::bigint,$3::boolean)',['public.'+qi(name),value.last_value,value.is_called]);
 return {db,schema,data};
 }catch(e){await writeFile(new URL('.tmp/supabase-review/clone-error.private.json',root),JSON.stringify({stage,message:e.message,code:e.code,detail:e.detail},null,2));await db.close();throw new Error('Local clone failed at '+stage+'; SQLSTATE '+(e.code||'n/a')+' (private diagnostic saved).');}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){let db;try{const c=await cloneLive({backupPath:process.argv[2]});db=c.db;console.log('Restored local-only schema+data clone: '+c.schema.tables.length+' tables, '+Object.values(c.data.tables).reduce((n,r)=>n+r.length,0)+' rows. No live writes.');}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}}
