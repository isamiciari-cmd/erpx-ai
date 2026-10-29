-- ERPX metadata audit v1. Run the entire file in Supabase SQL Editor or psql.
-- Returns one JSON cell. No application/Auth/Storage rows or tokens are read.
-- The only non-catalog rows read are validated migration-version/checksum dates.
-- Keep include_storage_policies=false for a public-schema-only policy inventory.
-- Definition literals/comments are redacted; exact-definition hashes detect drift.
-- This is an inspection artifact, never an installation or migration script.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '2s';
SET LOCAL idle_in_transaction_session_timeout = '30s';
SET LOCAL search_path = pg_catalog;

WITH
options AS (SELECT false AS include_storage_policies),
relations AS MATERIALIZED (
  SELECT c.*,n.nspname
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')
),
routines AS MATERIALIZED (
  SELECT p.*,n.nspname,l.lanname,
    e.extname AS extension_name
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  JOIN pg_language l ON l.oid=p.prolang
  LEFT JOIN pg_depend d ON d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e'
  LEFT JOIN pg_extension e ON e.oid=d.refobjid
  WHERE n.nspname='public' AND p.prokind IN ('f','p','w')
),
policy_sources AS MATERIALIZED (
  SELECT p.*,c.relname,n.nspname
  FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' OR (n.nspname='storage' AND (SELECT include_storage_policies FROM options))
),
-- Uniform sanitization for every expression-bearing metadata field. Function
-- outer dollar delimiters are removed before nested dollar payloads are redacted.
raw_definitions AS MATERIALIZED (
  SELECT 'column_default' AS kind,a.attrelid::text||':'||a.attnum::text AS key,pg_get_expr(d.adbin,d.adrelid) AS definition
    FROM pg_attribute a JOIN relations r ON r.oid=a.attrelid JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attnum>0 AND NOT a.attisdropped
  UNION ALL SELECT 'constraint',c.oid::text,pg_get_constraintdef(c.oid,true) FROM pg_constraint c JOIN relations r ON r.oid=c.conrelid
  UNION ALL SELECT 'index',i.indexrelid::text,pg_get_indexdef(i.indexrelid) FROM pg_index i JOIN relations r ON r.oid=i.indrelid
  UNION ALL SELECT 'policy_using',p.oid::text,pg_get_expr(p.polqual,p.polrelid) FROM policy_sources p
  UNION ALL SELECT 'policy_check',p.oid::text,pg_get_expr(p.polwithcheck,p.polrelid) FROM policy_sources p
  UNION ALL SELECT 'trigger',t.oid::text,pg_get_triggerdef(t.oid,true) FROM pg_trigger t JOIN relations r ON r.oid=t.tgrelid WHERE NOT t.tgisinternal
  UNION ALL SELECT 'view',r.oid::text,pg_get_viewdef(r.oid,true) FROM relations r WHERE r.relkind IN ('v','m')
  UNION ALL SELECT 'partition_key',r.oid::text,pg_get_partkeydef(r.oid) FROM relations r WHERE r.relkind='p'
  UNION ALL SELECT 'function',p.oid::text,
    CASE WHEN p.lanname IN ('sql','plpgsql','c','internal') THEN pg_get_functiondef(p.oid) ELSE NULL END FROM routines p
),
unwrapped AS MATERIALIZED (
  SELECT kind,key,definition,
    CASE WHEN kind='function' THEN regexp_replace(definition,
      $rx$\mAS[[:space:]]+(\$[A-Za-z_0-9]*\$)(.*)\1$rx$,
      $replacement$AS __BODY_START__\2__BODY_END__$replacement$,'s')
    ELSE definition END AS body FROM raw_definitions
),
dollar_redacted AS MATERIALIZED (
  SELECT kind,key,definition,regexp_replace(body,
    $rx$(\$[A-Za-z_][A-Za-z_0-9]*\$|\$\$).*?\1$rx$,
    '__DOLLAR_LITERAL__','gs') AS body FROM unwrapped
),
literal_redacted AS MATERIALIZED (
  SELECT kind,key,definition,regexp_replace(body,
    $rx$(?:[eE]|[uU]&)?'(?:''|\\.|[^'\\])*'$rx$,
    $replacement$'__LITERAL__'$replacement$,'g') AS body FROM dollar_redacted
),
safe_definitions AS MATERIALIZED (
  SELECT kind,key,md5(definition) AS definition_hash,
    regexp_replace(regexp_replace(body,$rx$/\*.*\*/$rx$,'/*__COMMENT__*/','gs'),$rx$--[^\r\n]*$rx$,'--__COMMENT__','g') AS definition
  FROM literal_redacted
),
columns AS (
  SELECT a.attrelid,jsonb_agg(jsonb_build_object(
    'name',a.attname,'ordinal',a.attnum,'data_type',format_type(a.atttypid,a.atttypmod),
    'udt_schema',tn.nspname,'udt_name',t.typname,'nullable',NOT a.attnotnull,
    'default',s.definition,'default_hash',s.definition_hash,
    'identity',a.attidentity,'generated',a.attgenerated,
    'collation',CASE WHEN a.attcollation<>0 THEN cn.nspname||'.'||coll.collname END
  ) ORDER BY a.attnum) AS items
  FROM pg_attribute a JOIN relations r ON r.oid=a.attrelid
  JOIN pg_type t ON t.oid=a.atttypid JOIN pg_namespace tn ON tn.oid=t.typnamespace
  LEFT JOIN pg_collation coll ON coll.oid=a.attcollation LEFT JOIN pg_namespace cn ON cn.oid=coll.collnamespace
  LEFT JOIN safe_definitions s ON s.kind='column_default' AND s.key=a.attrelid::text||':'||a.attnum::text
  WHERE a.attnum>0 AND NOT a.attisdropped GROUP BY a.attrelid
),
constraints AS (
  SELECT c.conrelid,jsonb_agg(jsonb_build_object(
    'name',c.conname,'type',c.contype,'validated',c.convalidated,'deferrable',c.condeferrable,'initially_deferred',c.condeferred,
    'definition',s.definition,'definition_hash',s.definition_hash,
    'columns',coalesce((SELECT jsonb_agg(a.attname ORDER BY k.ordinality) FROM unnest(c.conkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum),'[]'::jsonb),
    'referenced_schema',rn.nspname,'referenced_table',ref.relname,
    'referenced_columns',coalesce((SELECT jsonb_agg(a.attname ORDER BY k.ordinality) FROM unnest(c.confkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.attnum),'[]'::jsonb),
    'update_action',c.confupdtype,'delete_action',c.confdeltype,'match_type',c.confmatchtype
  ) ORDER BY c.conname) AS items
  FROM pg_constraint c JOIN relations r ON r.oid=c.conrelid
  LEFT JOIN pg_class ref ON ref.oid=c.confrelid LEFT JOIN pg_namespace rn ON rn.oid=ref.relnamespace
  LEFT JOIN safe_definitions s ON s.kind='constraint' AND s.key=c.oid::text GROUP BY c.conrelid
),
indexes AS (
  SELECT i.indrelid,jsonb_agg(jsonb_build_object('name',idx.relname,'unique',i.indisunique,'primary',i.indisprimary,
    'valid',i.indisvalid,'ready',i.indisready,'replica_identity',i.indisreplident,
    'definition',s.definition,'definition_hash',s.definition_hash) ORDER BY idx.relname) AS items
  FROM pg_index i JOIN relations r ON r.oid=i.indrelid JOIN pg_class idx ON idx.oid=i.indexrelid
  JOIN safe_definitions s ON s.kind='index' AND s.key=i.indexrelid::text GROUP BY i.indrelid
),
policies AS (
  SELECT p.polrelid,p.nspname,jsonb_agg(jsonb_build_object(
    'name',p.polname,'command',CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE 'ALL' END,
    'roles',(SELECT coalesce(jsonb_agg(CASE WHEN role_id=0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_id) END ORDER BY role_id),'[]'::jsonb) FROM unnest(p.polroles) role_id),
    'permissive',p.polpermissive,'using',u.definition,'using_hash',u.definition_hash,'with_check',c.definition,'with_check_hash',c.definition_hash
  ) ORDER BY p.polname) AS items
  FROM policy_sources p LEFT JOIN safe_definitions u ON u.kind='policy_using' AND u.key=p.oid::text
  LEFT JOIN safe_definitions c ON c.kind='policy_check' AND c.key=p.oid::text GROUP BY p.polrelid,p.nspname
),
triggers AS (
  SELECT t.tgrelid,jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'function_schema',n.nspname,'function_name',p.proname,
    'function_identity_arguments',pg_get_function_identity_arguments(p.oid),'definition',s.definition,'definition_hash',s.definition_hash,
    'deferrable',t.tgdeferrable,'initially_deferred',t.tginitdeferred) ORDER BY t.tgname) AS items
  FROM pg_trigger t JOIN relations r ON r.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace
  JOIN safe_definitions s ON s.kind='trigger' AND s.key=t.oid::text WHERE NOT t.tgisinternal GROUP BY t.tgrelid
),
table_catalog AS (
  SELECT jsonb_build_object('name',r.relname,'kind',r.relkind,'owner',pg_get_userbyid(r.relowner),
    'rls_enabled',r.relrowsecurity,'rls_forced',r.relforcerowsecurity,'persistence',r.relpersistence,'is_partition',r.relispartition,
    'partition_key',part.definition,'partition_key_hash',part.definition_hash,
    'columns',coalesce(c.items,'[]'::jsonb),'constraints',coalesce(con.items,'[]'::jsonb),'indexes',coalesce(i.items,'[]'::jsonb),
    'policies',coalesce(p.items,'[]'::jsonb),'triggers',coalesce(t.items,'[]'::jsonb),
    'view_definition',v.definition,'view_definition_hash',v.definition_hash) AS item
  FROM relations r LEFT JOIN columns c ON c.attrelid=r.oid LEFT JOIN constraints con ON con.conrelid=r.oid
  LEFT JOIN indexes i ON i.indrelid=r.oid LEFT JOIN policies p ON p.polrelid=r.oid LEFT JOIN triggers t ON t.tgrelid=r.oid
  LEFT JOIN safe_definitions v ON v.kind='view' AND v.key=r.oid::text
  LEFT JOIN safe_definitions part ON part.kind='partition_key' AND part.key=r.oid::text WHERE r.relkind<>'S'
),
function_catalog AS (
  SELECT jsonb_build_object('name',p.proname,'identity_arguments',pg_get_function_identity_arguments(p.oid),
    'result',pg_get_function_result(p.oid),'kind',p.prokind,'language',p.lanname,'owner',pg_get_userbyid(p.proowner),
    'security_definer',p.prosecdef,'volatility',p.provolatile,'parallel',p.proparallel,'strict',p.proisstrict,'leakproof',p.proleakproof,
    'extension',p.extension_name,'definition',s.definition,
    'definition_hash',CASE WHEN s.definition_hash IS NOT NULL THEN s.definition_hash ELSE md5(p.prosrc) END,
    'definition_omitted_reason',CASE WHEN p.lanname NOT IN ('sql','plpgsql','c','internal') THEN 'Non-SQL function body omitted to avoid leaking language-specific literals' END,
    'config_keys',coalesce((SELECT jsonb_agg(split_part(setting,'=',1) ORDER BY setting) FROM unnest(p.proconfig) setting),'[]'::jsonb),
    'config_hash',md5(array_to_string(p.proconfig,E'\n'))
  ) AS item FROM routines p JOIN safe_definitions s ON s.kind='function' AND s.key=p.oid::text
),
table_grants AS (
  SELECT r.relname AS table_name,CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
    pg_get_userbyid(x.grantor) AS grantor,x.privilege_type AS privilege,x.is_grantable AS grantable
  FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault(CASE WHEN r.relkind='S' THEN 'S'::"char" ELSE 'r'::"char" END,r.relowner))) x
),
column_grants AS (
  SELECT r.relname AS table_name,a.attname AS column_name,CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
    pg_get_userbyid(x.grantor) AS grantor,x.privilege_type AS privilege,x.is_grantable AS grantable
  FROM pg_attribute a JOIN relations r ON r.oid=a.attrelid CROSS JOIN LATERAL aclexplode(a.attacl) x WHERE a.attnum>0 AND NOT a.attisdropped
),
function_grants AS (
  SELECT p.proname AS function_name,pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
    pg_get_userbyid(x.grantor) AS grantor,x.privilege_type AS privilege,x.is_grantable AS grantable
  FROM routines p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x
),
schema_grants AS (
  SELECT n.nspname AS schema_name,CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
    pg_get_userbyid(x.grantor) AS grantor,x.privilege_type AS privilege,x.is_grantable AS grantable
  FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE n.nspname='public'
),
default_grants AS (
  SELECT pg_get_userbyid(d.defaclrole) AS owner,CASE WHEN d.defaclnamespace=0 THEN 'all_schemas' ELSE 'public' END AS scope,
    d.defaclobjtype AS object_type,CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
    x.privilege_type AS privilege,x.is_grantable AS grantable
  FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
  CROSS JOIN LATERAL aclexplode(d.defaclacl) x WHERE d.defaclnamespace=0 OR n.nspname='public'
),
-- Optional migration data: read only strictly validated version/checksum/date
-- metadata, never Supabase's statements/name blobs. CASE avoids missing-table or
-- inaccessible-table queries. No other application table is dynamically queried.
history_sources AS (
  SELECT 'public_tracker' AS source,n.oid AS namespace_oid,c.oid AS table_oid,
    NOT c.relrowsecurity AND c.relkind='r'
    AND EXISTS(SELECT FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='version' AND a.atttypid IN ('text'::regtype,'varchar'::regtype,'bpchar'::regtype) AND a.attnum>0 AND NOT a.attisdropped)
    AND EXISTS(SELECT FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='sha256' AND a.atttypid IN ('text'::regtype,'varchar'::regtype,'bpchar'::regtype) AND a.attnum>0 AND NOT a.attisdropped)
    AND EXISTS(SELECT FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='applied_at' AND a.atttypid IN ('timestamptz'::regtype,'timestamp'::regtype,'date'::regtype) AND a.attnum>0 AND NOT a.attisdropped) AS supported,
    $sql$SELECT version::text,CASE WHEN sha256::text ~ '^[0-9A-Fa-f]{64}$' THEN lower(sha256::text) END AS checksum,applied_at::timestamptz::text AS applied_at FROM public.erpx_migration_history WHERE version::text ~ '^[0-9]{1,14}(_[A-Za-z0-9_-]{1,150})?$' ORDER BY version::text$sql$ AS query
  FROM (SELECT 1) singleton LEFT JOIN pg_namespace n ON n.nspname='public' LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname='erpx_migration_history' AND c.relkind IN ('r','p')
  UNION ALL
  SELECT 'supabase_tracker',n.oid,c.oid,
    NOT c.relrowsecurity AND c.relkind='r'
    AND EXISTS(SELECT FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='version' AND a.atttypid IN ('text'::regtype,'varchar'::regtype,'bpchar'::regtype) AND a.attnum>0 AND NOT a.attisdropped),
    $sql$SELECT version::text FROM supabase_migrations.schema_migrations WHERE version::text ~ '^[0-9]{1,14}$' ORDER BY version::text$sql$
  FROM (SELECT 1) singleton LEFT JOIN pg_namespace n ON n.nspname='supabase_migrations' LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname='schema_migrations' AND c.relkind IN ('r','p')
),
history_documents AS MATERIALIZED (
  SELECT source,table_oid IS NOT NULL AS present,supported,
    coalesce(has_schema_privilege(namespace_oid,'USAGE') AND has_table_privilege(table_oid,'SELECT'),false) AS readable,
    CASE WHEN table_oid IS NOT NULL AND supported AND has_schema_privilege(namespace_oid,'USAGE') AND has_table_privilege(table_oid,'SELECT')
      THEN query_to_xml(query,true,false,'') END AS document FROM history_sources
),
history_catalog AS (
  SELECT h.source,jsonb_build_object('present',h.present,'supported',h.supported,'readable',h.readable,
    'entries',coalesce((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'version',(xpath('/row/version/text()',row_xml))[1]::text,
      'checksum',(xpath('/row/checksum/text()',row_xml))[1]::text,
      'applied_at',(xpath('/row/applied_at/text()',row_xml))[1]::text
    ))) FROM unnest(xpath('/table/row',h.document)) row_xml),'[]'::jsonb)) AS item FROM history_documents h
),
identity_candidates AS (
  SELECT r.relname AS table_name,a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS data_type,
    EXISTS(SELECT FROM pg_constraint c JOIN pg_class target ON target.oid=c.confrelid JOIN pg_namespace tn ON tn.oid=target.relnamespace
      WHERE c.conrelid=r.oid AND c.contype='f' AND a.attnum=ANY(c.conkey) AND tn.nspname='auth' AND target.relname='users') AS references_auth_users,
    EXISTS(SELECT FROM pg_constraint c JOIN pg_class target ON target.oid=c.confrelid JOIN pg_namespace tn ON tn.oid=target.relnamespace
      WHERE c.conrelid=r.oid AND c.contype='f' AND a.attnum=ANY(c.conkey) AND tn.nspname='public' AND target.relname='users') AS references_public_users,
    CASE WHEN a.attname IN ('firebase_uid','auth_id','auth_user_id','supabase_user_id') THEN 'Legacy or alternate identity column; compare application lookup contract'
      WHEN r.relname IN ('users','profiles') AND a.attname='id' THEN 'Check identity relationship against Supabase Auth through a separately authorized data audit'
      ELSE 'Identity-like column; missing foreign key is a review signal, not proof of orphan rows' END AS review_reason
  FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid
  WHERE r.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped
    AND (a.attname IN ('user_id','auth_id','auth_user_id','supabase_user_id','firebase_uid') OR (r.relname IN ('users','profiles','user_roles','user_tenants') AND a.attname='id'))
)
SELECT jsonb_build_object(
  'format','erpx_schema_catalog_v1','schema','public','captured_at',current_timestamp,
  'server_version',current_setting('server_version'),'read_only',current_setting('transaction_read_only'),
  'redaction',jsonb_build_object('sql_literals',true,'comments',true,'nested_dollar_payloads',true,'non_sql_bodies_omitted',true,'hash_algorithm','md5 exact original definition; drift hint only','definitions_are_executable',false),
  'scope',jsonb_build_object('business_rows_read',false,'auth_rows_read',false,'storage_rows_read',false,'migration_versions_read',true,'migration_statement_bodies_read',false,'storage_policies_included',(SELECT include_storage_policies FROM options)),
  'tables',coalesce((SELECT jsonb_agg(item ORDER BY item->>'name') FROM table_catalog),'[]'::jsonb),
  'functions',coalesce((SELECT jsonb_agg(item ORDER BY item->>'name',item->>'identity_arguments') FROM function_catalog),'[]'::jsonb),
  'sequences',coalesce((SELECT jsonb_agg(jsonb_build_object('name',r.relname,'data_type',format_type(s.seqtypid,NULL),'start',s.seqstart,'increment',s.seqincrement,'minimum',s.seqmin,'maximum',s.seqmax,'cache',s.seqcache,'cycle',s.seqcycle) ORDER BY r.relname) FROM relations r JOIN pg_sequence s ON s.seqrelid=r.oid WHERE r.relkind='S'),'[]'::jsonb),
  'enums',coalesce((SELECT jsonb_agg(jsonb_build_object('name',t.typname,'label_count',(SELECT count(*) FROM pg_enum e WHERE e.enumtypid=t.oid),'labels_hash',(SELECT md5(string_agg(e.enumlabel,E'\n' ORDER BY e.enumsortorder)) FROM pg_enum e WHERE e.enumtypid=t.oid)) ORDER BY t.typname) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e'),'[]'::jsonb),
  'grants',jsonb_build_object(
    'schemas',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY schema_name,grantee,privilege) FROM schema_grants g),'[]'::jsonb),
    'tables',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY table_name,grantee,privilege) FROM table_grants g),'[]'::jsonb),
    'columns',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY table_name,column_name,grantee,privilege) FROM column_grants g),'[]'::jsonb),
    'functions',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY function_name,identity_arguments,grantee,privilege) FROM function_grants g),'[]'::jsonb),
    'default_privileges',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY owner,scope,object_type,grantee,privilege) FROM default_grants g),'[]'::jsonb)
  ),
  'migration_history',(SELECT jsonb_object_agg(source,item ORDER BY source) FROM history_catalog),
  'identity_review',jsonb_build_object('metadata_only',true,'orphan_rows_checked',false,'candidates',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY table_name,column_name) FROM identity_candidates i),'[]'::jsonb)),
  'storage_policies',coalesce((SELECT jsonb_agg(jsonb_build_object('table',c.relname,'policies',p.items) ORDER BY c.relname) FROM policies p JOIN pg_class c ON c.oid=p.polrelid WHERE p.nspname='storage'),'[]'::jsonb)
) AS schema_catalog;
COMMIT;
