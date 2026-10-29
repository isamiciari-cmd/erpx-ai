"""Preserve a pinned existing Edge function privately before code replacement."""
import argparse,hashlib,importlib.util,io,json,sys,urllib.request,zipfile
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'.tmp/release-acceptance'
def module(name,path):
    s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--function',choices=['ai','zatca'],required=True);args=parser.parse_args()
    api=module('edge_private',ROOT/'database/inspection/management-read.py');project,token=api.configuration()
    if project!='svxmlejmhlocsjjtftxd':raise RuntimeError('Wrong reviewed project.')
    url='https://api.supabase.com/v1/projects/'+project+'/functions/'+args.function
    metadata=api.request_api('/functions/'+args.function)
    request=urllib.request.Request(url+'/body',headers={'Authorization':'Bearer '+token})
    with urllib.request.urlopen(request,timeout=45) as response:
        body=response.read(20*1024*1024+1);content_type=response.headers.get('Content-Type')
    if len(body)>20*1024*1024:raise RuntimeError('Function body exceeds snapshot limit.')
    selected={k:metadata.get(k) for k in ['id','slug','version','status','verify_jwt','entrypoint_path','import_map_path']}
    buffer=io.BytesIO()
    with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('function-body.original',body);archive.writestr('metadata.json',json.dumps(selected))
    backup=module('edge_encryption',ROOT/'database/inspection/backup-live.py');clear=buffer.getvalue();encrypted=backup.crypt(clear)
    if backup.crypt(encrypted,True)!=clear:raise RuntimeError('Snapshot encryption roundtrip failed.')
    BASE.mkdir(parents=True,exist_ok=True);stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ');path=BASE/('edge-'+args.function+'-v'+str(selected['version'])+'-'+stamp+'.dpapi')
    with path.open('xb') as file:file.write(encrypted)
    receipt={'function':args.function,'version':selected['version'],'encrypted':True,'verified':True,'body_bytes':len(body),'content_type':content_type,'encrypted_sha256':hashlib.sha256(encrypted).hexdigest(),'archive_sha256':hashlib.sha256(clear).hexdigest(),'captured_at':datetime.now(timezone.utc).isoformat()}
    path.with_suffix('.manifest.json').write_text(json.dumps(receipt,indent=2))
    print(json.dumps({'saved':str(path.relative_to(ROOT)),**receipt}))
if __name__=='__main__':
    try:main()
    except Exception as error:print('Function snapshot failed ('+type(error).__name__+'). No code was replaced.',file=sys.stderr);sys.exit(1)
