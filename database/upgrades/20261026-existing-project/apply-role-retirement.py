"""Apply only the reviewed role-retirement migration to the pinned live project."""
import argparse
import hashlib
import json
import runpy
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PRIVATE = ROOT / '.tmp/supabase-review'
PROJECT = 'svxmlejmhlocsjjtftxd'
MIGRATION = '20261123000100_retire_replaced_primary_role'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--backup', type=Path)
    args = parser.parse_args()
    source = ROOT / 'supabase/migrations' / (MIGRATION + '.sql')
    sql = source.read_bytes()
    digest = hashlib.sha256(sql).hexdigest()
    if not args.apply:
        print(json.dumps({'mode': 'offline_plan', 'project': PROJECT, 'migration': MIGRATION, 'sha256': digest}))
        return
    api = runpy.run_path(str(ROOT / 'database/inspection/management-read.py'))
    project, token = api['configuration']()
    if project != PROJECT or (ROOT / 'supabase/.temp/project-ref').read_text().strip() != PROJECT:
        raise RuntimeError('The linked project does not match the reviewed project.')
    if not args.backup:
        raise RuntimeError('Supply a fresh encrypted backup with --backup.')
    backup_path = args.backup.resolve()
    if not backup_path.is_relative_to(PRIVATE.resolve()) or backup_path.suffix != '.dpapi':
        raise RuntimeError('Backup must be the private DPAPI archive under .tmp/supabase-review.')
    backup = runpy.run_path(str(ROOT / 'database/inspection/backup-live.py'))
    manifest = backup['verify'](backup_path)
    age = (datetime.now(timezone.utc) - datetime.fromisoformat(manifest['captured_at'])).total_seconds()
    if manifest['project_ref'] != PROJECT or not 0 <= age <= 1200:
        raise RuntimeError('A verified backup of this project from the last 20 minutes is required.')
    receipt = PRIVATE / 'role-retirement-apply-receipt.json'
    if receipt.exists():
        raise RuntimeError('An apply attempt exists. Reconcile it read-only before retrying.')
    tests = subprocess.run(['node', 'database/tests/role-security.mjs'], cwd=ROOT, capture_output=True)
    if tests.returncode or source.read_bytes() != sql:
        raise RuntimeError('Exact SQL must pass the isolated role-security checks.')
    exists = api['request_api']('/database/query', """
        select to_regclass('public.user_roles') is not null
          and to_regclass('public.user_tenants') is not null
          and to_regprocedure('public.get_user_roles(uuid)') is not null
          and to_regprocedure('public.retire_replaced_primary_role()') is null as ready
        """)
    if exists != [{'ready': True}]:
        raise RuntimeError('The linked authorization schema differs or the migration already exists.')
    payload = {'name': MIGRATION, 'query': "SET LOCAL lock_timeout = '3s';\n" + sql.decode('utf-8')}
    request = urllib.request.Request(
        'https://api.supabase.com/v1/projects/' + PROJECT + '/database/migrations',
        data=json.dumps(payload).encode(), method='POST',
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
    )
    record = {'project': PROJECT, 'migration': MIGRATION, 'sha256': digest, 'status': 'applying'}
    with receipt.open('x', encoding='utf-8') as handle:
        json.dump(record, handle)
    try:
        with urllib.request.urlopen(request, timeout=55) as response:
            json.load(response)
    except Exception:
        record['status'] = 'outcome_requires_read_only_reconciliation'
        receipt.write_text(json.dumps(record), encoding='utf-8')
        raise RuntimeError('Migration response failed or was uncertain. No retry was attempted.') from None
    record['status'] = 'applied_pending_qa_verification'
    receipt.write_text(json.dumps(record), encoding='utf-8')
    print(json.dumps(record))


if __name__ == '__main__':
    try:
        main()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Role-retirement apply could not complete. Provider details were withheld.', file=sys.stderr)
        sys.exit(1)
