"""Apply only the locally tested, project-specific additive upgrade once."""
import hashlib,importlib.util,json,subprocess,sys,urllib.error,urllib.request
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
PRIVATE=ROOT/'.tmp/supabase-review'
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('management_read',ROOT/'database/inspection/management-read.py')
api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)
EXPECTED_PROJECT='svxmlejmhlocsjjtftxd'
RECEIPT=PRIVATE/'upgrade-apply-receipt.json'

def save(path,value):
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')

def normalized(value):
    if isinstance(value,dict):return {k:normalized(v) for k,v in sorted(value.items())}
    if isinstance(value,list):return sorted((normalized(x) for x in value),key=lambda x:json.dumps(x,sort_keys=True))
    return value

def fingerprint_query(schema):
    def qi(s):return '"'+s.replace('"','""')+'"'
    parts=[]
    for table in schema['tables']:
        name=table['name'];columns=','.join(qi(c['name']) for c in table['columns'])
        parts.append("SELECT '"+name.replace("'","''")+"' AS table_name,count(*) AS row_count,md5(coalesce(jsonb_agg(x ORDER BY x::text)::text,'[]')) AS row_hash FROM (SELECT to_jsonb(r) x FROM (SELECT "+columns+' FROM public.'+qi(name)+') r) s')
    return 'SELECT jsonb_agg(t ORDER BY table_name) AS fingerprints FROM ('+' UNION ALL '.join(parts)+') t;'

def main():
    project,token=api.configuration()
    if project!=EXPECTED_PROJECT:raise RuntimeError('Project differs from the reviewed target.')
    if RECEIPT.exists():raise RuntimeError('An apply attempt already exists. Inspect remote state and the private receipt; never retry automatically.')
    # Preserve exact Windows/Unix line endings used by the Node test checksum.
    sql=(HERE/'upgrade.sql').read_bytes().decode('utf-8')
    digest=hashlib.sha256(sql.encode()).hexdigest()
    test=json.loads((PRIVATE/'upgrade-test.json').read_text())
    if not test.get('passed') or test.get('checks',0)<13 or test.get('upgrade_sha256')!=digest:raise RuntimeError('This exact upgrade has not passed the target clone acceptance tests.')
    if (datetime.now(timezone.utc)-datetime.fromisoformat(test['checkedAt'].replace('Z','+00:00'))).total_seconds()>3600:raise RuntimeError('Rerun acceptance tests before applying.')
    before=json.loads((PRIVATE/'live-private-schema.json').read_text(encoding='utf-8'))[0]['private_schema']
    observed=api.request_api('/database/query',(PRIVATE/'private-schema.sql').read_text(encoding='utf-8-sig'))[0]['private_schema']
    if normalized(before)!=normalized(observed):raise RuntimeError('Live schema changed since review. Reconcile drift before applying.')
    save(PRIVATE/'pre-upgrade-fingerprints.json',api.request_api('/database/query',fingerprint_query(before)))
    backup=subprocess.run([sys.executable,str(ROOT/'database/inspection/backup-live.py')],cwd=ROOT,capture_output=True,text=True)
    if backup.returncode:raise RuntimeError('Fresh encrypted backup failed. No write requested.')
    backup_result=json.loads(backup.stdout)
    if not backup_result.get('verified'):raise RuntimeError('Fresh backup verification missing. No write requested.')
    # The migration endpoint owns the outer atomic transaction and history row.
    query=sql.replace('\nBEGIN;\n','\n',1)
    if not query.endswith('COMMIT;\n'):raise RuntimeError('Unexpected upgrade transaction wrapper.')
    query=query[:-len('COMMIT;\n')]
    record={'project_ref':project,'name':'erpx_existing_project_20261026','upgrade_sha256':digest,'started_at':datetime.now(timezone.utc).isoformat(),'status':'applying','backup':backup_result['saved'],'local_acceptance_checks':test['checks']}
    with RECEIPT.open('x',encoding='utf-8') as handle:json.dump(record,handle,indent=2)
    request=urllib.request.Request('https://api.supabase.com/v1/projects/'+project+'/database/migrations',method='POST',data=json.dumps({'name':record['name'],'query':query}).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','Accept':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=55) as response:
            payload=json.load(response)
        save(PRIVATE/'upgrade-api-response.json',payload)
    except Exception as error:
        record['status']='outcome_requires_read_only_reconciliation';record['error_type']=type(error).__name__
        if isinstance(error,urllib.error.HTTPError):
            record['http_status']=error.code
            (PRIVATE/'upgrade-api-error.private.txt').write_bytes(error.read())
        save(RECEIPT,record)
        raise RuntimeError('Apply response failed or was uncertain. No retry was attempted. Reconcile read-only remote state.') from None
    record['status']='applied_pending_verification';record['responded_at']=datetime.now(timezone.utc).isoformat();save(RECEIPT,record)
    after=api.request_api('/database/query',fingerprint_query(before));save(PRIVATE/'post-upgrade-fingerprints.json',after)
    baseline=json.loads((PRIVATE/'pre-upgrade-fingerprints.json').read_text(encoding='utf-8'))
    if baseline!=after:raise RuntimeError('Original-row fingerprints changed after commit; inspect private evidence before further work.')
    record['status']='applied_original_data_verified';record['verified_at']=datetime.now(timezone.utc).isoformat();save(RECEIPT,record)
    print(json.dumps({'status':record['status'],'original_tables_preserved':len(before['tables']),'local_acceptance_checks':test['checks'],'backup_verified':True}))

if __name__=='__main__':
    try:main()
    except Exception as error:print(str(error),file=sys.stderr);sys.exit(1)
