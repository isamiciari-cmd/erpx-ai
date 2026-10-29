"""Suspend only the marker-verified acceptance company/accounts; retain ledgers."""
import importlib.util
import json
import re
import sys
import uuid
from pathlib import Path

SOURCE = Path(__file__).with_name('provision-live-fixture.py')
SPEC = importlib.util.spec_from_file_location('erpx_fixture_support', SOURCE)
support = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(support)


def finalize(gateway, store, expected_run_id):
    receipt = store.read()
    if not receipt or receipt['metadata']['runId'] != expected_run_id:
        raise support.FixtureError('The expected acceptance run does not match the private receipt; no changes are permitted.')
    if receipt['metadata']['state'] not in ('ready', 'finalizing', 'finalized'):
        raise support.FixtureError('An incomplete fixture requires explicit review; unknown Auth creation outcomes are never guessed.')
    support.verify_ready(gateway, receipt)
    if receipt['metadata']['state'] == 'finalized':
        return receipt
    company = support.verify_company(gateway, receipt)
    tenant = support.exactly_one(gateway.rows('tenants', id=receipt['tenantId']), 'Fixture tenant could not be identified.')
    tenant_companies = gateway.rows('companies', tenant_id=receipt['tenantId'])
    allowed_users = {receipt['admin']['userId'], receipt['cashier']['userId']}
    members = gateway.rows('user_tenants', tenant_id=receipt['tenantId'])
    company_users = gateway.rows('users', company_id=receipt['companyId'])
    if (tenant.get('id') != receipt['tenantId'] or tenant.get('name') != receipt['companyName']
        or len(tenant_companies) != 1 or tenant_companies[0]['id'] != receipt['companyId']
        or any(row.get('user_id') not in allowed_users for row in members)
        or {row.get('id') for row in company_users} != allowed_users):
        raise support.FixtureError('The fixture tenant is shared or unexpected; no account/company will be suspended.')
    receipt['metadata']['state'] = 'finalizing'
    receipt['allowLiveMutations'] = False
    receipt['metadata'].setdefault('finalizationStartedAt', support.now())
    receipt['metadata'].setdefault('finalizationAuditId', str(uuid.uuid4()))
    store.save(receipt)
    settings = {**(company.get('settings') or {}), 'erpx_release_acceptance_finalized_at':receipt['metadata']['finalizationStartedAt']}
    changed = gateway.write('companies', {'status':'suspended', 'settings':settings}, method='PATCH', id=receipt['companyId'],
        name=receipt['companyName'], onboarding_owner_id=receipt['admin']['userId'], **{'settings->erpx_release_acceptance->>marker':receipt['metadata']['marker']})
    support.exactly_one(changed, 'The marker-guarded fixture company suspension was not confirmed.')
    for name in ('admin', 'cashier'):
        support.verify_auth(gateway, receipt, name)
        changed = gateway.write('users', {'status':'suspended'}, method='PATCH', id=receipt[name]['userId'], company_id=receipt['companyId'])
        support.exactly_one(changed, 'Fixture ERP suspension was not confirmed.')
        changed = gateway.write('profiles', {'status':'suspended'}, method='PATCH', id=receipt[name]['userId'], email=receipt[name]['email'])
        support.exactly_one(changed, 'Fixture Auth profile suspension was not confirmed.')
        gateway.request('/auth/v1/admin/users/' + support.identifier(receipt[name]['userId']), method='PUT', body={'ban_duration':'876000h'})
    changed = gateway.write('tenants', {'status':'suspended'}, method='PATCH', id=receipt['tenantId'], name=receipt['companyName'])
    support.exactly_one(changed, 'Fixture tenant suspension was not confirmed.')
    audit_id = receipt['metadata']['finalizationAuditId']
    if not gateway.rows('audit_logs', id=audit_id, company_id=receipt['companyId']):
        gateway.write('audit_logs', {'id':audit_id, 'company_id':receipt['companyId'], 'user_id':receipt['admin']['userId'], 'action':'release_acceptance_finalized',
            'entity_type':'companies', 'entity_id':receipt['companyId'], 'new_values':{'run_id':expected_run_id, 'retained_test_transactions':True, 'test_identities_suspended':True}})
    receipt['metadata']['state'] = 'finalized'
    receipt['metadata']['finalizedAt'] = support.now()
    store.save(receipt)
    return receipt


def main(arguments=None):
    args = sys.argv[1:] if arguments is None else arguments
    if len(args) != 3 or args[0] != '--expected-run-id' or args[2] not in ('--plan', '--apply') or not re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}', args[1]):
        raise support.FixtureError('Usage: python scripts/finalize-live-fixture.py --expected-run-id <receipt-run-id> [--plan | --apply].')
    store = support.Store()
    receipt = store.read()
    if not receipt or receipt['metadata']['runId'] != args[1]:
        raise support.FixtureError('The expected acceptance run does not match the private receipt.')
    if args[2] == '--plan':
        print(json.dumps({**support.summary(receipt), 'mode':'offline_finalization_plan', 'posted_transactions_retained':True, 'delete_requested':False, 'applied':False}))
        return
    gateway = support.Gateway(support.private_configuration(), support.public_configuration())
    with store.lock():
        finalized = finalize(gateway, store, args[1])
    print(json.dumps({**support.summary(finalized), 'posted_transactions_retained':True, 'delete_requested':False}))


if __name__ == '__main__':
    try:
        main()
    except support.FixtureError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Fixture finalization could not complete. No provider details or credentials were printed; review the private receipt before retrying.', file=sys.stderr)
        sys.exit(1)
