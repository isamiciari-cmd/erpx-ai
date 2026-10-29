"""Private logical public-schema backup, encrypted for the current Windows user."""
import argparse,ctypes,hashlib,importlib.util,io,json,sys,urllib.request,urllib.error,zipfile
from ctypes import wintypes
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'.tmp/supabase-review'
spec=importlib.util.spec_from_file_location('management_read',Path(__file__).with_name('management-read.py'))
api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)
class Blob(ctypes.Structure):
    _fields_=[('size',wintypes.DWORD),('data',ctypes.POINTER(ctypes.c_ubyte))]
def crypt(data,decrypt=False):
    buffer=ctypes.create_string_buffer(data)
    source=Blob(len(data),ctypes.cast(buffer,ctypes.POINTER(ctypes.c_ubyte)));target=Blob()
    library=ctypes.WinDLL('crypt32',use_last_error=True)
    if decrypt:
        function=library.CryptUnprotectData
        function.argtypes=[ctypes.POINTER(Blob),ctypes.POINTER(wintypes.LPWSTR),ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.c_void_p,wintypes.DWORD,ctypes.POINTER(Blob)]
        ok=function(ctypes.byref(source),None,None,None,None,1,ctypes.byref(target))
    else:
        function=library.CryptProtectData
        function.argtypes=[ctypes.POINTER(Blob),wintypes.LPCWSTR,ctypes.POINTER(Blob),ctypes.c_void_p,ctypes.c_void_p,wintypes.DWORD,ctypes.POINTER(Blob)]
        ok=function(ctypes.byref(source),'ERPX public database logical backup',None,None,None,1,ctypes.byref(target))
    if not ok:raise RuntimeError('Windows backup encryption operation failed.')
    try:return ctypes.string_at(target.data,target.size)
    finally:
        free=ctypes.WinDLL('kernel32').LocalFree;free.argtypes=[ctypes.c_void_p];free(target.data)
def verify(path):
    manifest=json.loads(path.with_suffix('.manifest.json').read_text(encoding='utf-8'))
    encrypted=path.read_bytes()
    if hashlib.sha256(encrypted).hexdigest()!=manifest['encrypted_sha256']:raise RuntimeError('Encrypted backup checksum mismatch.')
    archive=crypt(encrypted,True)
    if hashlib.sha256(archive).hexdigest()!=manifest['archive_sha256']:raise RuntimeError('Decrypted backup checksum mismatch.')
    with zipfile.ZipFile(io.BytesIO(archive)) as backup:
        if backup.testzip():raise RuntimeError('Backup archive verification failed.')
        for name,checksum in manifest['members'].items():
            if hashlib.sha256(backup.read(name)).hexdigest()!=checksum:raise RuntimeError('Backup member checksum mismatch.')
    return manifest

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--verify');parser.add_argument('--catalog',default='live-catalog.json');parser.add_argument('--schema',default='live-private-schema.json');args=parser.parse_args()
    if args.verify:
        path=(ROOT/args.verify).resolve()
        if not path.is_relative_to(BASE.resolve()):raise ValueError('Backup must be in the private workspace folder.')
        manifest=verify(path);print(json.dumps({'verified':True,'tables':manifest['table_count'],'rows':manifest['row_count']}));return
    catalog_path=(BASE/args.catalog).resolve();schema_path=(BASE/args.schema).resolve()
    if not catalog_path.is_relative_to(BASE.resolve()) or not schema_path.is_relative_to(BASE.resolve()):raise ValueError('Snapshot files must be inside the private workspace folder.')
    catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
    current=api.catalog_from(api.request_api('/database/query',(ROOT/'database/inspection/schema-audit.sql').read_text(encoding='utf-8-sig')))
    if not current or sorted((t['name'],json.dumps(t['columns'],sort_keys=True)) for t in current['tables'])!=sorted((t['name'],json.dumps(t['columns'],sort_keys=True)) for t in catalog['tables']):raise RuntimeError('Reviewed catalog differs from live tables. Capture fresh catalog/schema before making a new backup.')
    def ident(name):return '"'+name.replace('"','""')+'"'
    def literal(name):return "'"+name.replace("'","''")+"'"
    def object_sql(pairs):
        # PostgreSQL functions accept at most 100 arguments (50 key/value pairs).
        return '('+' || '.join('jsonb_build_object('+','.join(pairs[i:i+40])+')' for i in range(0,len(pairs),40))+')' if pairs else "'{}'::jsonb"
    tables=[row['name'] for row in catalog['tables'] if row['kind'] in ['r','p']]
    parts=[literal(table)+",(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) FROM public."+ident(table)+" t)" for table in tables]
    sequences=[literal(s['name'])+",(SELECT jsonb_build_object('last_value',last_value,'is_called',is_called) FROM public."+ident(s['name'])+")" for s in catalog.get('sequences',[])]
    sql="SELECT jsonb_build_object('captured_at',now(),'tables',"+object_sql(parts)+",'sequence_state',"+object_sql(sequences)+",'auth_identity_ids',(SELECT coalesce(jsonb_agg(id ORDER BY id),'[]'::jsonb) FROM auth.users)) AS logical_backup;"
    project,token=api.configuration()
    request=urllib.request.Request('https://api.supabase.com/v1/projects/'+project+'/database/query',data=json.dumps({'query':sql,'read_only':True}).encode(),method='POST',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(request,timeout=55) as response:raw=response.read()
    except Exception as error:
        if isinstance(error,urllib.error.HTTPError):(BASE/'backup-error.private.json').write_bytes(error.read())
        raise RuntimeError('Read-only logical backup request failed ('+type(error).__name__+'). No backup was committed.') from None
    document=json.loads(raw)[0]['logical_backup'];counts={name:len(document['tables'][name]) for name in tables}
    members={'public-data.api.json':raw,'schema.json':schema_path.read_bytes(),'catalog.json':catalog_path.read_bytes()}
    buffer=io.BytesIO()
    with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as archive:
        for name,value in members.items():archive.writestr(name,value)
    archive=buffer.getvalue();encrypted=crypt(archive)
    if crypt(encrypted,True)!=archive:raise RuntimeError('Encryption roundtrip failed.')
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    output=BASE/('public-backup-'+stamp+'.dpapi')
    manifest={'project_ref':project,'captured_at':document['captured_at'],'scope':'All public base tables and schema; Auth identity UUIDs only, no Auth passwords/tokens; not a complete Supabase platform backup','encryption':'Windows DPAPI current user; restore requires the same Windows account','table_count':len(tables),'row_count':sum(counts.values()),'row_counts':counts,'archive_sha256':hashlib.sha256(archive).hexdigest(),'encrypted_sha256':hashlib.sha256(encrypted).hexdigest(),'members':{k:hashlib.sha256(v).hexdigest() for k,v in members.items()}}
    with output.open('xb') as handle:handle.write(encrypted)
    with output.with_suffix('.manifest.json').open('x',encoding='utf-8') as handle:json.dump(manifest,handle,indent=2)
    verify(output)
    print(json.dumps({'saved':str(output.relative_to(ROOT)),'verified':True,'encrypted':True,'tables':len(tables),'rows':sum(counts.values()),'scope':manifest['scope']}))
if __name__=='__main__':
    try:main()
    except Exception as error:print(str(error),file=sys.stderr);sys.exit(1)
