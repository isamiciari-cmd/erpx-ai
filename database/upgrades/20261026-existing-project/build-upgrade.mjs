import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../../../',import.meta.url);const read=p=>readFile(new URL(p,root),'utf8');
const strip=s=>s.replace(/^\s*(BEGIN|COMMIT);\s*$/gm,'');
const core=await read('database/01_schema.sql');
let sql=`-- Target-specific upgrade for the inspected ERPX Supabase project.
-- Existing tables, identity IDs, financial rows and migration history are preserved.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='45s';
SET LOCAL search_path=public,extensions,pg_catalog;
`;
sql+=`DO $$ BEGIN IF to_regclass('public.roles') IS NULL OR to_regclass('public.user_roles') IS NULL OR to_regclass('public.users') IS NULL THEN RAISE EXCEPTION 'Wrong database baseline'; END IF; END $$;
`;
sql+=`-- Fail the entire transaction if any original public value changes.
-- Short transaction-level locks also prevent concurrent writes during this check.
CREATE TEMP TABLE erpx_upgrade_original_rows(table_name text,column_names text[],row_hash text,row_count bigint) ON COMMIT DROP;
DO $$ DECLARE t record; columns_sql text; checksum text; n bigint; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace WHERE s.nspname='public' AND c.relkind='r' ORDER BY c.relname LOOP
  EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',t.relname);
 END LOOP;
 FOR t IN SELECT c.relname,array_agg(a.attname::text ORDER BY a.attnum) cols FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped WHERE s.nspname='public' AND c.relkind='r' GROUP BY c.relname LOOP
  SELECT string_agg(quote_ident(x),',') INTO columns_sql FROM unnest(t.cols) x;
  EXECUTE format('SELECT md5(coalesce(jsonb_agg(x ORDER BY x::text)::text,''[]'')),count(*) FROM (SELECT to_jsonb(r) x FROM (SELECT %s FROM public.%I) r) s',columns_sql,t.relname) INTO checksum,n;
  INSERT INTO erpx_upgrade_original_rows VALUES(t.relname,t.cols,checksum,n);
 END LOOP;
END $$;
`;
for(const name of ['chart_of_accounts','journal_entries','journal_entry_lines']){
 const start=core.indexOf('CREATE TABLE '+name+' (');const end=core.indexOf('\n);',start);
 if(start<0||end<0)throw new Error('Missing reviewed ledger definition '+name);
 sql+=core.slice(start,end+4).replace('CREATE TABLE ','CREATE TABLE IF NOT EXISTS ').replaceAll('uuid_generate_v4()','gen_random_uuid()')+'\n';
}
sql+=strip(await read('database/007_schema_compatibility.sql'))+'\n';
let pos=strip(await read('database/008_transactional_sales.sql'));
// Mandatory new request arguments keep the legacy 9-argument RPC unambiguous.
pos=pos.replace('p_discount_amount numeric DEFAULT 0,\n  p_notes text DEFAULT NULL,p_idempotency_key uuid DEFAULT NULL,p_warehouse_id uuid DEFAULT NULL','p_discount_amount numeric,\n  p_notes text,p_idempotency_key uuid,p_warehouse_id uuid');
pos=pos.replace('JOIN public.roles r ON r.company_id=c.id WHERE c.id=NEW.company_id','JOIN public.roles r ON r.id=NEW.role_id AND (r.company_id IS NULL OR r.company_id=c.id) WHERE c.id=NEW.company_id');
sql+=pos+'\n';
for(const file of ['20261022000300_business_records.sql','20261022000400_integration_quota.sql','20261022000500_zatca_submissions.sql','20261022000600_company_settings.sql','20261026000100_role_write_hardening.sql']){
 let source=strip(await read('supabase/migrations/'+file));
 if(file==='20261022000300_business_records.sql'){
  source=source.replace("WHERE u.id=auth.uid() AND u.company_id=p_company AND u.status='active'","WHERE u.id=auth.uid() AND u.company_id=p_company AND u.company_id=public.get_user_company_id() AND u.status='active'");
  source=source.replace('    v_count:=v_count+1;',"    IF v_line.product_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.products p WHERE p.id=v_line.product_id AND p.company_id=v_invoice.company_id) THEN RAISE EXCEPTION 'Invoice product must belong to this company'; END IF;\n    v_count:=v_count+1;");
 }
 sql+=source+'\n';
}
sql+=await read('database/upgrades/20261026-existing-project/target-overrides.sql');
sql+=`DO $$ DECLARE t record; columns_sql text; checksum text; n bigint; BEGIN
 FOR t IN SELECT * FROM erpx_upgrade_original_rows LOOP
  SELECT string_agg(quote_ident(x),',') INTO columns_sql FROM unnest(t.column_names) x;
  EXECUTE format('SELECT md5(coalesce(jsonb_agg(x ORDER BY x::text)::text,''[]'')),count(*) FROM (SELECT to_jsonb(r) x FROM (SELECT %s FROM public.%I) r) s',columns_sql,t.table_name) INTO checksum,n;
  IF checksum IS DISTINCT FROM t.row_hash OR n IS DISTINCT FROM t.row_count THEN RAISE EXCEPTION 'Original data preservation failed on %',t.table_name; END IF;
 END LOOP;
END $$;
`;
sql+="\nNOTIFY pgrst, 'reload schema';\nCOMMIT;\n";
await writeFile(new URL('./upgrade.sql',import.meta.url),sql);console.log('Prepared target-specific upgrade; not applied to any database.');
