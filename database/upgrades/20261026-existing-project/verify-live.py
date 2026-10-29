"""Read-only post-upgrade role, privilege and data-integrity checks."""
import importlib.util,json,sys,urllib.request,urllib.error
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];PRIVATE=ROOT/'.tmp/supabase-review'
spec=importlib.util.spec_from_file_location('management_read',ROOT/'database/inspection/management-read.py')
api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)

def read_role_query(query):
    # The provider's read-only connection cannot SET ROLE. Use the owner connection
    # solely inside an explicit READ ONLY transaction that always rolls back.
    if not query.startswith('BEGIN READ ONLY;') or not query.endswith('ROLLBACK;'):
        raise RuntimeError('Role verification requires a read-only transaction wrapper.')
    project,token=api.configuration()
    request=urllib.request.Request('https://api.supabase.com/v1/projects/'+project+'/database/query',data=json.dumps({'query':query,'read_only':False}).encode(),method='POST',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=55) as response:return json.load(response)
    except urllib.error.HTTPError as error:
        (PRIVATE/'role-verification-error.private.json').write_bytes(error.read())
        raise RuntimeError('Read-only role verification failed; private diagnostic saved.') from None

def main():
    roles=api.request_api('/database/query',"SELECT id,company_id FROM public.users WHERE status='active' ORDER BY id")
    results=[]
    for actor in roles:
        # UUIDs originate from the typed database columns, never user-supplied SQL.
        import uuid
        uid=str(uuid.UUID(actor['id']));company=str(uuid.UUID(actor['company_id']))
        sql="BEGIN READ ONLY; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','"+uid+"',true); SELECT jsonb_build_object(\
          'company_matches',public.get_user_company_id()='"+company+"'::uuid,\
          'has_roles',EXISTS(SELECT 1 FROM public.get_user_roles('"+uid+"'::uuid)),\
          'has_permissions',EXISTS(SELECT 1 FROM public.get_user_permissions('"+uid+"'::uuid)),\
          'roles_visible',EXISTS(SELECT 1 FROM public.roles),\
          'permission_catalog_visible',EXISTS(SELECT 1 FROM public.permissions),\
          'no_foreign_sales',NOT EXISTS(SELECT 1 FROM public.sales WHERE company_id<>'"+company+"'::uuid),\
          'no_foreign_invoices',NOT EXISTS(SELECT 1 FROM public.invoices WHERE company_id<>'"+company+"'::uuid),\
          'no_foreign_users',NOT EXISTS(SELECT 1 FROM public.users WHERE company_id<>'"+company+"'::uuid),\
          'no_role_write',NOT has_table_privilege(current_user,'public.roles','INSERT') AND NOT has_table_privilege(current_user,'public.roles','UPDATE') AND NOT has_table_privilege(current_user,'public.roles','DELETE'),\
          'no_inventory_write',NOT has_table_privilege(current_user,'public.inventory','UPDATE'),\
          'no_audit_forgery',NOT has_table_privilege(current_user,'public.audit_logs','INSERT'),\
          'no_legacy_recalculation',NOT has_function_privilege(current_user,'public.recalculate_invoice_payment_state(uuid)','EXECUTE')\
        ) AS checks; ROLLBACK;"
        response=read_role_query(sql)
        checks=next((r['checks'] for r in response if 'checks' in r),None)
        if not checks or not all(v is True for v in checks.values()):raise RuntimeError('A live authenticated role check failed; inspect privately.')
        results.append(checks)
    privileges=api.request_api('/database/query',"SELECT jsonb_build_object('anon_no_audit',NOT has_table_privilege('anon','public.audit_logs','SELECT'),'anon_no_checkout',NOT has_function_privilege('anon','public.complete_pos_sale(uuid,uuid,uuid,uuid,text,uuid,jsonb,numeric,text,uuid,uuid)','EXECUTE'),'anon_no_rbac',NOT has_function_privilege('anon','public.get_user_roles(uuid)','EXECUTE'),'service_can_audit',has_table_privilege('service_role','public.audit_logs','INSERT'),'no_foreign_invoice_products',NOT EXISTS(SELECT 1 FROM public.invoice_lines l JOIN public.invoices i ON i.id=l.invoice_id JOIN public.products p ON p.id=l.product_id WHERE i.company_id<>p.company_id),'balanced_journals',NOT EXISTS(SELECT 1 FROM public.journal_entries j JOIN public.journal_entry_lines l ON l.journal_entry_id=j.id WHERE j.status='posted' GROUP BY j.id HAVING sum(l.debit_amount)<>sum(l.credit_amount))) AS checks;")[0]['checks']
    if not all(v is True for v in privileges.values()):raise RuntimeError('A live privilege or accounting-integrity check failed.')
    report={'passed':True,'read_only':True,'authenticated_users_checked':len(results),'role_checks_per_user':len(results[0]) if results else 0,'platform_checks':privileges,'checked_at':datetime.now(timezone.utc).isoformat()}
    (PRIVATE/'post-upgrade-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report))

if __name__=='__main__':
    try:main()
    except Exception as error:print(str(error),file=sys.stderr);sys.exit(1)
