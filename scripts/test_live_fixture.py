import base64
import copy
import importlib.util
import json
import unittest
import uuid
from pathlib import Path


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


provision = load('fixture_provision_test', 'provision-live-fixture.py')
finish = load('fixture_finalize_test', 'finalize-live-fixture.py')
PUBLIC_KEY = 'sb_publishable_OFFLINE_FIXTURE_TEST_ONLY'


class MemoryStore:
    def __init__(self):
        self.receipt = None

    def read(self):
        if self.receipt:
            provision.validate_receipt(self.receipt)
        return copy.deepcopy(self.receipt)

    def save(self, receipt):
        provision.validate_receipt(receipt)
        self.receipt = copy.deepcopy(receipt)


class FakeGateway:
    def __init__(self):
        self.data = {name:[] for name in ('companies','users','warehouses','branches','profiles','tenants','user_roles','user_tenants','customers','audit_logs')}
        self.data['roles'] = [{'id':str(uuid.uuid4()),'name':name,'status':'active','is_system_role':True,'company_id':None,'permissions':{'all':True} if name=='admin' else {'pos_access':True,'open_close_shift':True}} for name in ('admin','cashier')]
        self.auth = {}
        self.mutations = []
        self.create_count = 0
        self.fail_create = False

    def rows(self, table, select='*', **filters):
        return copy.deepcopy([row for row in self.data[table] if all((str(row.get(key)).lower() if isinstance(row.get(key),bool) else row.get(key)) == value for key,value in filters.items())])

    def write(self, table, body, method='POST', **filters):
        self.mutations.append((table, method, copy.deepcopy(body), copy.deepcopy(filters)))
        if method == 'POST':
            row = {'id':str(uuid.uuid4()), **copy.deepcopy(body)}
            self.data[table].append(row)
            return [copy.deepcopy(row)]
        changed = []
        for row in self.data[table]:
            matches = True
            for key,value in filters.items():
                actual = row.get('settings',{}).get('erpx_release_acceptance',{}).get('marker') if key=='settings->erpx_release_acceptance->>marker' else row.get(key)
                matches = matches and actual == value
            if matches:
                row.update(copy.deepcopy(body))
                changed.append(copy.deepcopy(row))
        return changed

    def auth_user(self, user_id):
        return copy.deepcopy(self.auth[user_id])

    def create_auth(self, user, marker):
        self.create_count += 1
        if self.fail_create:
            raise provision.FixtureError('Unknown Auth creation outcome')
        result = {'id':str(uuid.uuid4()), 'email':user['email'],'app_metadata':{'erpx_release_acceptance':copy.deepcopy(marker)}}
        self.auth[result['id']] = result
        self.mutations.append(('auth','POST',{'email_confirm':True},{}))
        return copy.deepcopy(result)

    def sign_in(self, user):
        return 'OFFLINE_SESSION_NOT_FOR_PERSISTENCE'

    def request(self, endpoint, method='GET', body=None, token=None, preference=None):
        if endpoint == '/rest/v1/rpc/register_company_account':
            assert token == 'OFFLINE_SESSION_NOT_FOR_PERSISTENCE'
            company,branch,warehouse,tenant = [str(uuid.uuid4()) for unused in range(4)]
            admin = next(row for row in self.auth.values() if row['email'].endswith('.admin@example.test'))
            role = next(row for row in self.data['roles'] if row['name']=='admin')
            self.data['companies'].append({'id':company,'name':body['p_company_name'],'onboarding_owner_id':admin['id'],'tenant_id':tenant,'currency':'SAR','status':'active','settings':{'subscription':{'status':'unpaid'}}})
            self.data['users'].append({'id':admin['id'],'company_id':company,'branch_id':branch,'role_id':role['id'],'email':admin['email'],'status':'active'})
            self.data['profiles'].append({'id':admin['id'],'email':admin['email'],'status':'active'})
            self.data['branches'].append({'id':branch,'company_id':company,'status':'active'})
            self.data['warehouses'].append({'id':warehouse,'company_id':company,'branch_id':branch,'is_active':True})
            self.data['tenants'].append({'id':tenant,'name':body['p_company_name'],'status':'active'})
            self.mutations.append(('onboard','POST',{},{}))
            return {'success':True,'company_id':company,'branch_id':branch,'tenant_id':tenant,'role_id':role['id'],'user_id':admin['id']}
        if method=='PUT' and endpoint.startswith('/auth/v1/admin/users/'):
            user_id=endpoint.rsplit('/',1)[1]
            self.auth[user_id]['banned_duration']=body['ban_duration']
            self.mutations.append(('auth','PUT',copy.deepcopy(body),{'id':user_id}))
            return copy.deepcopy(self.auth[user_id])
        raise AssertionError('Unexpected offline API operation')


class FixtureTests(unittest.TestCase):
    def ready(self):
        gateway,store=FakeGateway(),MemoryStore()
        receipt=provision.provision(gateway,store,PUBLIC_KEY,provision.APP_ORIGIN)
        return gateway,store,receipt

    def test_receipt_contract_has_only_ephemeral_passwords_and_public_key(self):
        gateway,store,receipt=self.ready()
        required={'baseUrl','supabaseUrl','supabaseAnonKey','companyId','companyName','branchId','warehouseId','customerId','admin','cashier','allowLiveMutations'}
        self.assertTrue(required.issubset(receipt))
        self.assertTrue(receipt['companyName'].startswith('ERPX RELEASE ACCEPTANCE '))
        self.assertTrue(receipt['allowLiveMutations'])
        self.assertEqual(gateway.create_count,2)
        self.assertNotIn('OFFLINE_SESSION_NOT_FOR_PERSISTENCE',json.dumps(receipt))
        self.assertTrue(all(user['email'].endswith('@example.test') for user in (receipt['admin'],receipt['cashier'])))
        self.assertNotEqual(receipt['admin']['password'],receipt['cashier']['password'])

    def test_second_provision_is_read_only_and_reuses_only_the_same_run(self):
        gateway,store,receipt=self.ready()
        count=len(gateway.mutations)
        replay=provision.provision(gateway,store,PUBLIC_KEY,provision.APP_ORIGIN)
        self.assertEqual(receipt,replay)
        self.assertEqual(len(gateway.mutations),count)

    def test_active_global_cashier_with_legacy_false_system_flag_is_reused_unchanged(self):
        gateway,store=FakeGateway(),MemoryStore()
        role=next(row for row in gateway.data['roles'] if row['name']=='cashier')
        role.update({'is_system_role':False,'permissions':{}})
        original_roles=copy.deepcopy(gateway.data['roles'])
        receipt=provision.provision(gateway,store,PUBLIC_KEY,provision.APP_ORIGIN)
        self.assertEqual(receipt['metadata']['state'],'ready')
        self.assertEqual(gateway.data['roles'],original_roles)
        cashier=next(row for row in gateway.data['users'] if row['id']==receipt['cashier']['userId'])
        self.assertEqual(cashier['role_id'],role['id'])
        self.assertFalse(any(change[0]=='roles' for change in gateway.mutations))

    def test_uncertain_auth_creation_is_never_retried(self):
        gateway,store=FakeGateway(),MemoryStore()
        gateway.fail_create=True
        with self.assertRaisesRegex(provision.FixtureError,'Unknown'):
            provision.provision(gateway,store,PUBLIC_KEY,provision.APP_ORIGIN)
        gateway.fail_create=False
        with self.assertRaisesRegex(provision.FixtureError,'uncertain'):
            provision.provision(gateway,store,PUBLIC_KEY,provision.APP_ORIGIN)
        self.assertEqual(gateway.create_count,1)

    def test_foreign_company_marker_refuses_any_resume_mutation(self):
        gateway,store,receipt=self.ready()
        gateway.data['companies'][0]['settings']['erpx_release_acceptance']['marker']='different'
        before=len(gateway.mutations)
        with self.assertRaisesRegex(provision.FixtureError,'marker differs'):
            provision.provision(gateway,store,PUBLIC_KEY,provision.APP_ORIGIN)
        self.assertEqual(len(gateway.mutations),before)

    def test_gateway_selects_service_key_in_memory_and_never_returns_it_in_fixture(self):
        payload=base64.urlsafe_b64encode(b'{"role":"service_role"}').decode().rstrip('=')
        key='header.'+payload+'.signature'
        requests=[]
        def api(url,**kwargs):
            requests.append(url)
            return [{'name':'service_role','api_key':key},{'name':'anon','api_key':'NOT_SELECTED'}]
        gateway=provision.Gateway('FAKE_PAT',PUBLIC_KEY,transport=api)
        self.assertEqual(gateway._service,key)
        self.assertEqual(requests,['https://api.supabase.com/v1/projects/'+provision.PROJECT_REF+'/api-keys?reveal=true'])
        receipt=provision.new_receipt(PUBLIC_KEY,provision.APP_ORIGIN)
        self.assertNotIn(key,json.dumps(receipt))
        self.assertNotIn('FAKE_PAT',json.dumps(receipt))

    def test_original_identity_or_other_run_is_never_finalized(self):
        gateway,store,receipt=self.ready()
        before=len(gateway.mutations)
        with self.assertRaisesRegex(RuntimeError,'expected acceptance run'):
            finish.finalize(gateway,store,'20000101T000000Z-aaaaaaaaaaaa')
        gateway.auth[receipt['cashier']['userId']]['app_metadata']={}
        with self.assertRaisesRegex(RuntimeError,'Auth identity ownership'):
            finish.finalize(gateway,store,receipt['metadata']['runId'])
        self.assertEqual(len(gateway.mutations),before)

    def test_finalization_suspends_exact_fixture_without_deletes_and_is_replayable(self):
        gateway,store,receipt=self.ready()
        ledger_sentinel={'id':'POSTED_LEDGER_MUST_REMAIN','company_id':receipt['companyId']}
        gateway.data['posted_ledger']=[ledger_sentinel]
        finalized=finish.finalize(gateway,store,receipt['metadata']['runId'])
        self.assertEqual(finalized['metadata']['state'],'finalized')
        self.assertFalse(finalized['allowLiveMutations'])
        self.assertEqual(gateway.data['companies'][0]['status'],'suspended')
        self.assertTrue(all(row['status']=='suspended' for row in gateway.data['users']))
        self.assertTrue(all(row.get('banned_duration')=='876000h' for row in gateway.auth.values()))
        self.assertEqual(gateway.data['posted_ledger'],[ledger_sentinel])
        self.assertFalse(any(action[1]=='DELETE' for action in gateway.mutations))
        count=len(gateway.mutations)
        finish.finalize(gateway,store,receipt['metadata']['runId'])
        self.assertEqual(len(gateway.mutations),count)
        self.assertEqual(len(gateway.data['audit_logs']),1)

    def test_finalized_receipt_cannot_be_reactivated_by_provisioning(self):
        gateway,store,receipt=self.ready()
        finish.finalize(gateway,store,receipt['metadata']['runId'])
        before=len(gateway.mutations)
        with self.assertRaisesRegex(provision.FixtureError,'finalized'):
            provision.provision(gateway,store,PUBLIC_KEY,provision.APP_ORIGIN)
        self.assertEqual(len(gateway.mutations),before)

    def test_ready_fixture_is_not_reactivated_after_external_suspension(self):
        gateway,store,receipt=self.ready()
        gateway.data['companies'][0]['status']='suspended'
        before=len(gateway.mutations)
        with self.assertRaisesRegex(provision.FixtureError,'no longer active'):
            provision.provision(gateway,store,PUBLIC_KEY,provision.APP_ORIGIN)
        self.assertEqual(len(gateway.mutations),before)

    def test_fixture_identities_must_be_distinct(self):
        receipt=provision.new_receipt(PUBLIC_KEY,provision.APP_ORIGIN)
        user_id=str(uuid.uuid4())
        receipt['admin']['userId']=user_id
        receipt['cashier']['userId']=user_id
        with self.assertRaisesRegex(provision.FixtureError,'separate identities'):
            provision.validate_receipt(receipt)

    def test_finalization_refuses_additional_tenant_member_without_mutations(self):
        gateway,store,receipt=self.ready()
        gateway.data['user_tenants'].append({'tenant_id':receipt['tenantId'],'user_id':str(uuid.uuid4())})
        before=len(gateway.mutations)
        with self.assertRaisesRegex(RuntimeError,'tenant is shared'):
            finish.finalize(gateway,store,receipt['metadata']['runId'])
        self.assertEqual(len(gateway.mutations),before)

    def test_finalization_refuses_missing_profile_before_mutations(self):
        gateway,store,receipt=self.ready()
        gateway.data['profiles']=[row for row in gateway.data['profiles'] if row['id']!=receipt['cashier']['userId']]
        before=len(gateway.mutations)
        with self.assertRaisesRegex(RuntimeError,'Auth profile is unavailable'):
            finish.finalize(gateway,store,receipt['metadata']['runId'])
        self.assertEqual(len(gateway.mutations),before)

    def test_receipt_validation_blocks_cross_project_endpoints_and_persisted_service_role_keys(self):
        receipt=provision.new_receipt(PUBLIC_KEY,provision.APP_ORIGIN)
        receipt['supabaseUrl']='https://wrong.example'
        with self.assertRaisesRegex(provision.FixtureError,'endpoints'):
            provision.validate_receipt(receipt)
        receipt['supabaseUrl']=provision.SUPABASE_URL
        receipt['supabaseAnonKey']='header.'+base64.urlsafe_b64encode(b'{"role":"service_role"}').decode().rstrip('=')+'.signature'
        with self.assertRaisesRegex(provision.FixtureError,'public browser key'):
            provision.validate_receipt(receipt)


if __name__=='__main__':
    unittest.main()
