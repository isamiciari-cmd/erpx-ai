"""Read-only hashes of original rows/columns; decrypt the old backup in memory only."""
import argparse
import importlib.util
import io
import json
import sys
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / '.tmp/supabase-review'
PROJECT = 'svxmlejmhlocsjjtftxd'


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def qi(value):
    return '"' + value.replace('"', '""') + '"'


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def original_filter(table, rows):
    if not rows:
        return 'false'
    primary = [c['columns'] for c in table['constraints'] if c['type'] == 'p']
    if len(primary) != 1 or not primary[0] or any(any(key not in row or row[key] is None for key in primary[0]) for row in rows):
        raise RuntimeError('An original populated table has no usable primary-key snapshot; comparison refused.')
    keys = [{key: row[key] for key in primary[0]} for row in rows]
    if len({json.dumps(row, sort_keys=True) for row in keys}) != len(keys):
        raise RuntimeError('Original key snapshot is not unique; comparison refused.')
    pairs = ','.join(literal(key) + ',t.' + qi(key) for key in primary[0])
    return 'EXISTS (SELECT 1 FROM jsonb_array_elements(' + literal(json.dumps(keys)) + '::jsonb) original_key WHERE original_key=jsonb_build_object(' + pairs + '))'


def build_query(catalog, data):
    parts = []
    for table in catalog['tables']:
        name = table['name']
        columns = ','.join('t.' + qi(c['name']) for c in table['columns'])
        predicate = original_filter(table, data[name])
        parts.append('SELECT ' + literal(name) + " AS table_name,count(*) AS row_count,md5(coalesce(jsonb_agg(x ORDER BY x::text)::text,'[]')) AS row_hash FROM (SELECT to_jsonb(r) x FROM (SELECT " + columns + ' FROM public.' + qi(name) + ' t WHERE ' + predicate + ') r) s')
    warehouse = next(t for t in catalog['tables'] if t['name'] == 'warehouses')
    predicate = original_filter(warehouse, data['warehouses'])
    before = literal(json.dumps(data['warehouses'])) + '::jsonb'
    comparisons = []
    for column in warehouse['columns']:
        name = column['name']
        # Return only column names and booleans, never old or new business values.
        old_hash = "(SELECT md5(coalesce(jsonb_agg(x ORDER BY x::text)::text,'[]')) FROM (SELECT to_jsonb(b." + qi(name) + ') x FROM jsonb_populate_recordset(NULL::public.warehouses,' + before + ') b) q)'
        new_hash = "(SELECT md5(coalesce(jsonb_agg(x ORDER BY x::text)::text,'[]')) FROM (SELECT to_jsonb(t." + qi(name) + ') x FROM public.warehouses t WHERE ' + predicate + ') q)'
        comparisons.append('SELECT ' + literal(name) + ' AS column_name,' + old_hash + '=' + new_hash + ' AS unchanged')
    return "BEGIN READ ONLY; SET LOCAL statement_timeout='20s'; SELECT jsonb_build_object('fingerprints',(SELECT jsonb_agg(t ORDER BY table_name) FROM (" + ' UNION ALL '.join(parts) + ") t),'warehouse_columns',(SELECT jsonb_agg(c ORDER BY column_name) FROM (" + ' UNION ALL '.join(comparisons) + ') c)) AS preservation; ROLLBACK;'


def request_readonly(query, token):
    class NoRedirects(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, request, fp, code, message, headers, new_url):
            return None
    request = urllib.request.Request('https://api.supabase.com/v1/projects/' + PROJECT + '/database/query',
        method='POST', data=json.dumps({'query': query, 'read_only': True}).encode(),
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Accept': 'application/json'})
    try:
        with urllib.request.build_opener(NoRedirects()).open(request, timeout=45) as response:
            raw = response.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            raise RuntimeError('Hash-only response exceeded the limit.')
        return json.loads(raw)[0]['preservation']
    except urllib.error.HTTPError as error:
        status = error.code
        error.close()
        raise RuntimeError('Read-only preservation query returned HTTP ' + str(status) + '; provider body withheld.') from None
    except (urllib.error.URLError, OSError, ValueError, KeyError, IndexError):
        raise RuntimeError('Read-only preservation query failed; provider details withheld. No write was requested.') from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, help='New hash-only JSON filename in .tmp/supabase-review')
    args = parser.parse_args()
    output = (BASE / args.output).resolve()
    if not output.is_relative_to(BASE.resolve()) or output.exists():
        raise RuntimeError('Choose a new output file inside the private review directory.')
    api = load('original_preservation_api', ROOT / 'database/inspection/management-read.py')
    project, token = api.configuration()
    if project != PROJECT:
        raise RuntimeError('The private project is not the reviewed pinned project.')
    receipt = json.loads((BASE / 'upgrade-apply-receipt.json').read_text())
    if receipt.get('status') != 'applied_original_data_verified' or receipt.get('project_ref') != PROJECT:
        raise RuntimeError('A verified original upgrade receipt is required.')
    backup_path = (ROOT / receipt['backup']).resolve()
    if not backup_path.is_relative_to(BASE.resolve()) or backup_path.suffix != '.dpapi':
        raise RuntimeError('Original backup path is outside the reviewed private backup directory.')
    backup = load('original_preservation_backup', ROOT / 'database/inspection/backup-live.py')
    manifest = backup.verify(backup_path)
    if manifest['project_ref'] != PROJECT or manifest['table_count'] != 43 or manifest['row_count'] != 193:
        raise RuntimeError('The backup is not the reviewed 43-table, 193-row original baseline.')
    archive_bytes = backup.crypt(backup_path.read_bytes(), True)
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        catalog = json.loads(archive.read('catalog.json'))
        data = json.loads(archive.read('public-data.api.json'))[0]['logical_backup']['tables']
    baseline = json.loads((BASE / 'pre-upgrade-fingerprints.json').read_text())[0]['fingerprints']
    if len(catalog['tables']) != 43 or sum(len(rows) for rows in data.values()) != 193:
        raise RuntimeError('Original backup contents differ from the reviewed baseline counts.')
    result = request_readonly(build_query(catalog, data), token)
    before = {r['table_name']: r for r in baseline}
    after = {r['table_name']: r for r in result['fingerprints']}
    if set(before) != set(after) or len(before) != 43:
        raise RuntimeError('Hash result table inventory differs; no preservation claim can be made.')
    changed = [name for name in sorted(before) if before[name] != after[name]]
    lost = [name for name in sorted(before) if before[name]['row_count'] != after[name]['row_count']]
    warehouse_changed = [r['column_name'] for r in result['warehouse_columns'] if not r['unchanged']]
    expected = set(changed).issubset({'warehouses'}) and not lost and set(warehouse_changed).issubset({'branch_id', 'updated_at'})
    report = {'checked_at': datetime.now(timezone.utc).isoformat(), 'read_only': True, 'project_ref': PROJECT,
        'original_tables': 43, 'original_rows_expected': 193, 'original_rows_observed': sum(r['row_count'] for r in after.values()),
        'unchanged_tables': 43 - len(changed), 'changed_tables': changed, 'tables_with_missing_original_keys': lost,
        'warehouse_changed_columns': warehouse_changed, 'only_expected_warehouse_routing_changes': expected,
        'all_original_rows_present': not lost, 'non_warehouse_original_values_unchanged': not [name for name in changed if name != 'warehouses'],
        'new_rows_excluded_by_original_primary_keys': True, 'fingerprints': result['fingerprints'],
        'baseline_backup_sha256': manifest['encrypted_sha256']}
    with output.open('x', encoding='utf-8') as handle:
        json.dump(report, handle, indent=2)
    print(json.dumps({k: v for k, v in report.items() if k not in ('fingerprints', 'baseline_backup_sha256')} | {'saved': str(output.relative_to(ROOT))}))
    if not expected:
        raise RuntimeError('Unexpected original value differences detected; review the hash-only report before proceeding.')


if __name__ == '__main__':
    try:
        main()
    except RuntimeError as error:
        # All RuntimeErrors above are fixed local messages or HTTP status codes;
        # provider bodies and original values are never attached.
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Original-preservation verification did not complete successfully. No database writes were requested; private values and provider details withheld.', file=sys.stderr)
        sys.exit(1)
