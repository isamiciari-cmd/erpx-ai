"""Apply the tested warehouse/branch configuration once, without stock changes."""
import hashlib,importlib.util,json,sys,urllib.request,urllib.error
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];PRIVATE=ROOT/'.tmp/supabase-review';HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('management_read',ROOT/'database/inspection/management-read.py');api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)

def main():
    project,token=api.configuration()
    if project!='svxmlejmhlocsjjtftxd':raise RuntimeError('Wrong reviewed project.')
    receipt=PRIVATE/'warehouse-configuration-receipt.json'
    if receipt.exists():raise RuntimeError('An attempt exists; reconcile it read-only before any retry.')
    main_receipt=json.loads((PRIVATE/'upgrade-apply-receipt.json').read_text())
    if main_receipt['status']!='applied_original_data_verified':raise RuntimeError('Main upgrade must be verified first.')
    sql=(HERE/'configure-warehouses.sql').read_bytes().decode('utf-8');digest=hashlib.sha256(sql.encode()).hexdigest()
    test=json.loads((PRIVATE/'upgrade-test.json').read_text())
    if not test['passed'] or test['checks']<14 or test.get('warehouse_configuration_sha256')!=digest:raise RuntimeError('Exact warehouse configuration must pass local tests first.')
    backup=max(PRIVATE.glob('public-backup-*.manifest.json'),key=lambda p:p.stat().st_mtime)
    manifest=json.loads(backup.read_text())
    if manifest['project_ref']!=project or manifest['table_count']!=51 or (datetime.now(timezone.utc)-datetime.fromisoformat(manifest['captured_at'])).total_seconds()>1200:raise RuntimeError('A fresh current-schema backup is required.')
    backup_spec=importlib.util.spec_from_file_location('backup',ROOT/'database/inspection/backup-live.py');backup_module=importlib.util.module_from_spec(backup_spec);backup_spec.loader.exec_module(backup_module)
    backup_path=backup.with_name(backup.name.replace('.manifest.json','.dpapi'));backup_module.verify(backup_path)
    # Capture business/inventory rows independently. Configuration/audit tables are the only expected changes.
    apply_spec=importlib.util.spec_from_file_location('reviewed',HERE/'apply-reviewed.py');reviewed=importlib.util.module_from_spec(apply_spec);apply_spec.loader.exec_module(reviewed)
    schema=json.loads((PRIVATE/'post-upgrade-private-schema.json').read_text(encoding='utf-8'))[0]['private_schema'];schema['tables']=[t for t in schema['tables'] if t['name'] not in ['warehouses','audit_logs']]
    query_hashes=reviewed.fingerprint_query(schema);before=api.request_api('/database/query',query_hashes)
    record={'status':'applying','sha256':digest,'backup':str(backup_path.relative_to(ROOT)),'started_at':datetime.now(timezone.utc).isoformat()}
    with receipt.open('x') as file:json.dump(record,file,indent=2)
    query=sql.replace('\nBEGIN;\n','\n',1)
    if not query.endswith('COMMIT;\n'):raise RuntimeError('Unexpected SQL wrapper.')
    query=query[:-len('COMMIT;\n')]
    request=urllib.request.Request('https://api.supabase.com/v1/projects/'+project+'/database/migrations',data=json.dumps({'name':'erpx_warehouse_branch_configuration_20261026','query':query}).encode(),method='POST',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=55) as response:json.load(response)
    except Exception as error:
        record['status']='outcome_requires_read_only_reconciliation';receipt.write_text(json.dumps(record,indent=2))
        if isinstance(error,urllib.error.HTTPError):(PRIVATE/'warehouse-api-error.private.json').write_bytes(error.read())
        raise RuntimeError('Configuration response failed or uncertain; no retry attempted.') from None
    after=api.request_api('/database/query',query_hashes)
    record['business_and_stock_unchanged']=before==after;record['status']='applied_verified' if before==after else 'applied_requires_data_review';record['verified_at']=datetime.now(timezone.utc).isoformat();receipt.write_text(json.dumps(record,indent=2))
    if before!=after:raise RuntimeError('Business or stock hashes changed; review before further work.')
    print(json.dumps({'status':record['status'],'business_and_stock_unchanged':True,'backup_verified':True}))

if __name__=='__main__':
    try:main()
    except Exception as error:print(str(error),file=sys.stderr);sys.exit(1)
