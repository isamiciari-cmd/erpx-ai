"""Read-only Supabase Management API access. Secrets never appear in arguments/logs."""
import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DESTINATION = ROOT / '.tmp' / 'supabase-review'

def configuration():
    values = {}
    for line in (ROOT / '.env.server.local').read_text(encoding='utf-8-sig').splitlines():
        match = re.match(r'^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$', line)
        if match:
            values[match[1]] = match[2].strip(chr(34) + chr(39))
    project = values.get('SUPABASE_PROJECT_REF', '')
    token = values.get('SUPABASE_ACCESS_TOKEN', '')
    if not token or not re.fullmatch(r'[a-z0-9]{20}', project):
        raise ValueError('Missing valid private Management API configuration.')
    linked = ROOT / 'supabase/.temp/project-ref'
    if linked.exists() and linked.read_text().strip() != project:
        raise ValueError('Configured project differs from the linked application project. Review the target first.')
    return project, token

def request_api(path, query=None):
    project, token = configuration()
    data = json.dumps({'query': query, 'read_only': True}).encode() if query else None
    request = urllib.request.Request('https://api.supabase.com/v1/projects/' + project + path, data=data,
        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json', 'Content-Type': 'application/json'},
        method='POST' if query else 'GET')
    try:
        with urllib.request.urlopen(request, timeout=55) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Keep provider diagnostics private; SQL errors can contain business data.
        from time import time_ns
        DESTINATION.mkdir(parents=True,exist_ok=True)
        (DESTINATION / ('read-error-'+str(time_ns())+'.private.json')).write_bytes(error.read())
        raise RuntimeError('Management API returned HTTP ' + str(error.code) + '. No write was requested.') from None
    except urllib.error.URLError as error:
        raise RuntimeError('Management API connection failed: ' + type(error.reason).__name__) from None

def catalog_from(value):
    if isinstance(value, dict):
        if value.get('format') == 'erpx_schema_catalog_v1':
            return value
        for item in value.values():
            found = catalog_from(item)
            if found:
                return found
    if isinstance(value, list):
        for item in value:
            found = catalog_from(item)
            if found:
                return found
    if isinstance(value, str) and value.lstrip().startswith(('{', '[')):
        try:
            return catalog_from(json.loads(value))
        except json.JSONDecodeError:
            pass
    return None

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['catalog', 'backups', 'read'])
    parser.add_argument('output', help='A NEW filename inside .tmp/supabase-review')
    parser.add_argument('--sql', help='Read-only SQL file for the read operation')
    args = parser.parse_args()
    output = (DESTINATION / args.output).resolve()
    if not output.is_relative_to(DESTINATION.resolve()) or output.exists():
        raise ValueError('Choose a new output path within .tmp/supabase-review; exports are never overwritten.')
    if args.operation == 'backups':
        result = request_api('/database/backups')
    else:
        source = ROOT / 'database/inspection/schema-audit.sql' if args.operation == 'catalog' else ROOT / (args.sql or '')
        source = source.resolve()
        if not source.is_relative_to(ROOT) or not source.is_file():
            raise ValueError('Provide a SQL file inside the workspace.')
        result = request_api('/database/query', source.read_text(encoding='utf-8-sig'))
        if args.operation == 'catalog':
            result = catalog_from(result)
            if not result:
                raise RuntimeError('The read-only query returned no recognized schema catalog. No file was written.')
    DESTINATION.mkdir(parents=True, exist_ok=True)
    with output.open('x', encoding='utf-8') as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
    summary = {'operation': args.operation, 'read_only': True, 'saved': str(output.relative_to(ROOT))}
    if args.operation == 'catalog':
        summary.update(relations=len(result['tables']), routines=len(result['functions']))
    elif isinstance(result, list):
        summary['result_rows'] = len(result)
    print(json.dumps(summary))

if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
