"""Inspect deployed service metadata; never persist provider secret values."""
import argparse,importlib.util,json,sys,urllib.request,urllib.error
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('management_read',Path(__file__).with_name('management-read.py'))
api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',default='service-readiness.json');parser.add_argument('--probe-manage-users',action='store_true');args=parser.parse_args()
    functions=api.request_api('/functions')
    secrets=api.request_api('/secrets')
    auth=api.request_api('/config/auth')
    names={s['name'] for s in secrets}
    report={'checked_at':datetime.now(timezone.utc).isoformat(),'read_only':True,
        'functions':[{k:f.get(k) for k in ['slug','status','version','verify_jwt']} for f in functions],
        'configured_secret_names':{name:name in names for name in ['APP_SITE_URL','OPENAI_API_KEY','OPENAI_MODEL','ZATCA_COMPANY_CREDENTIALS']},
        'auth':{k:auth.get(k) for k in ['site_url','uri_allow_list','mailer_autoconfirm','disable_signup']}}
    if args.probe_manage_users:
        project,_=api.configuration()
        request=urllib.request.Request('https://'+project+'.supabase.co/functions/v1/manage-users',data=b'{}',method='POST',headers={'Content-Type':'application/json'})
        try:
            with urllib.request.urlopen(request,timeout=30) as response:status=response.status
        except urllib.error.HTTPError as error:status=error.code;error.close()
        report['manage_users_unauthenticated_http_status']=status
        if status!=401:raise RuntimeError('The deployed function did not reject an unauthenticated request as expected.')
    base=ROOT/'.tmp/supabase-review';output=(base/args.output).resolve()
    if not output.is_relative_to(base.resolve()):raise RuntimeError('Output must remain in the private workspace folder.')
    if output.exists():raise RuntimeError('Readiness export already exists; preserve it before recapturing.')
    output.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps({'saved':str(output.relative_to(ROOT)),'read_only':True,'function_count':len(functions),'app_functions':{name:any(f['slug']==name and f.get('status')=='ACTIVE' for f in functions) for name in ['manage-users','ai','zatca']},'configured_secret_names':report['configured_secret_names'],'manage_users_unauthenticated_http_status':report.get('manage_users_unauthenticated_http_status')}))

if __name__=='__main__':
    try:main()
    except Exception as error:print(str(error),file=sys.stderr);sys.exit(1)
