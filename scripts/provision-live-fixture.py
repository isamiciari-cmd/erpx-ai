"""Prepare isolated release acceptance identities. Default is an offline plan.

Only --apply creates data. Credentials stay in the fixed private fixture file;
Management PAT, service-role keys and session tokens are never persisted/logged.
"""
import base64
import contextlib
import csv
import importlib.util
import json
import os
import re
import secrets
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT_REF = 'svxmlejmhlocsjjtftxd'
SUPABASE_URL = 'https://' + PROJECT_REF + '.supabase.co'
APP_ORIGIN = 'https://code-isamiciari-5169s-projects.vercel.app'
PREFIX = 'ERPX RELEASE ACCEPTANCE '
FIXTURE = ROOT / '.tmp/release-acceptance/live-fixture.private.json'
MARKER_KEY = 'erpx_release_acceptance'


class FixtureError(RuntimeError):
    pass


def now():
    return datetime.now(timezone.utc).isoformat()


def identifier(value):
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        raise FixtureError('Unexpected fixture identifier; operation blocked.') from None


def origin(value):
    parsed = urllib.parse.urlsplit(value)
    if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('', '/') or parsed.port not in (None, 443):
        raise FixtureError('Use the reviewed HTTPS production origin only.')
    normalized = 'https://' + (parsed.hostname or '')
    if normalized != APP_ORIGIN:
        raise FixtureError('Production origin differs from the reviewed application origin.')
    return normalized


def private_configuration():
    source = ROOT / 'database/inspection/management-read.py'
    spec = importlib.util.spec_from_file_location('erpx_fixture_private_loader', source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    project, token = module.configuration()
    if project != PROJECT_REF or (ROOT / 'supabase/.temp/project-ref').read_text().strip() != PROJECT_REF:
        raise FixtureError('Configured project does not match the pinned application project.')
    return token


def public_configuration():
    values = {}
    for name in ('.env', '.env.local'):
        file = ROOT / name
        if not file.exists():
            continue
        for line in file.read_text(encoding='utf-8-sig').splitlines():
            match = re.match(r'^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)\s*=\s*(.*?)\s*$', line)
            if match:
                values[match[1]] = match[2].strip('"\'')
    key = values.get('VITE_SUPABASE_ANON_KEY', '')
    if values.get('VITE_SUPABASE_URL', '').rstrip('/') != SUPABASE_URL or not key:
        raise FixtureError('Public browser configuration does not match the pinned project.')
    if not key.startswith('sb_publishable_') and jwt_role(key) != 'anon':
        raise FixtureError('The browser configuration must contain a public anonymous/publishable key.')
    return key


def jwt_role(value):
    try:
        middle = value.split('.')[1]
        return json.loads(base64.urlsafe_b64decode(middle + '=' * (-len(middle) % 4))).get('role')
    except (IndexError, ValueError, UnicodeError):
        return None


class NoRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


def http_json(url, method='GET', headers=None, body=None):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname not in ('api.supabase.com', PROJECT_REF + '.supabase.co') or parsed.username or parsed.password:
        raise FixtureError('Fixture network destination is not permitted.')
    request = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(), headers={
        'Accept': 'application/json', 'Content-Type': 'application/json', **(headers or {}),
    })
    try:
        with urllib.request.build_opener(NoRedirects()).open(request, timeout=45) as response:
            data = response.read(2 * 1024 * 1024 + 1)
            if len(data) > 2 * 1024 * 1024:
                raise FixtureError('Provider response exceeded the fixture limit; no body was retained.')
            return json.loads(data) if data else None
    except urllib.error.HTTPError as error:
        status = int(error.code)
        error.close()
        raise FixtureError('Fixture API returned HTTP ' + str(status) + '; provider details withheld. Review the private receipt before retrying.') from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise FixtureError('Fixture API transport failed; a write outcome may be uncertain. No automatic retry was made; review the private receipt.') from None
    except (ValueError, UnicodeError):
        raise FixtureError('Provider response was not recognized; contents withheld.') from None


class Gateway:
    def __init__(self, token, anon_key, transport=http_json):
        self.anon = anon_key
        self.transport = transport
        keys = transport('https://api.supabase.com/v1/projects/' + PROJECT_REF + '/api-keys?reveal=true', headers={'Authorization': 'Bearer ' + token})
        matches = [row.get('api_key') for row in keys if isinstance(row, dict) and row.get('name') == 'service_role'] if isinstance(keys, list) else []
        if len(matches) != 1 or not isinstance(matches[0], str) or jwt_role(matches[0]) != 'service_role':
            raise FixtureError('A single legacy service-role API key was not available; no fixture was created.')
        self._service = matches[0]

    def request(self, endpoint, method='GET', body=None, token=None, preference=None):
        headers = {'apikey': self._service if token is None else self.anon, 'Authorization': 'Bearer ' + (token or self._service)}
        if preference:
            headers['Prefer'] = preference
        return self.transport(SUPABASE_URL + endpoint, method=method, headers=headers, body=body)

    def rows(self, table, select='*', **filters):
        allowed = {'users', 'companies', 'branches', 'warehouses', 'roles', 'profiles', 'customers', 'user_roles', 'user_tenants', 'tenants', 'audit_logs'}
        if table not in allowed:
            raise FixtureError('Unexpected fixture table read.')
        query = urllib.parse.urlencode({'select': select, **{key: ('is.null' if value is None else 'eq.' + str(value)) for key, value in filters.items()}})
        result = self.request('/rest/v1/' + table + '?' + query)
        if not isinstance(result, list):
            raise FixtureError('Fixture row lookup did not return a recognized list.')
        return result

    def write(self, table, body, method='POST', **filters):
        if table not in {'users', 'companies', 'profiles', 'user_roles', 'user_tenants', 'customers', 'audit_logs', 'tenants'}:
            raise FixtureError('Unexpected fixture table mutation.')
        query = '?' + urllib.parse.urlencode({key: 'eq.' + str(value) for key, value in filters.items()}) if filters else ''
        return self.request('/rest/v1/' + table + query, method=method, body=body, preference='return=representation')

    def auth_user(self, user_id):
        result = self.request('/auth/v1/admin/users/' + identifier(user_id))
        return result.get('user', result) if isinstance(result, dict) else {}

    def create_auth(self, user, marker):
        # This is Auth admin createUser, not inviteUserByEmail/signUp. It sends no
        # confirmation or invitation email; synthetic reserved domains stay local.
        return self.request('/auth/v1/admin/users', method='POST', body={'email': user['email'], 'password': user['password'], 'email_confirm': True,
            'app_metadata': {MARKER_KEY: marker}, 'user_metadata': {'full_name': 'ERPX release acceptance'}})

    def sign_in(self, user):
        result = self.transport(SUPABASE_URL + '/auth/v1/token?grant_type=password', method='POST',
            headers={'apikey': self.anon}, body={'email': user['email'], 'password': user['password']})
        if not isinstance(result, dict) or not isinstance(result.get('access_token'), str) or result.get('user', {}).get('id') != user['userId']:
            raise FixtureError('The isolated fixture identity could not establish its own session.')
        return result['access_token']


def secure_file(file):
    if os.name != 'nt':
        os.chmod(file, 0o600)
        return
    result = subprocess.run(['whoami', '/user', '/fo', 'csv', '/nh'], capture_output=True, text=True, check=True)
    sid = next(csv.reader([result.stdout.strip()]))[-1]
    if not re.fullmatch(r'S-1-[0-9-]+', sid):
        raise FixtureError('The private fixture owner could not be resolved.')
    result = subprocess.run(['icacls', str(file), '/inheritance:r', '/grant:r', '*' + sid + ':(F)', '*S-1-5-18:(F)'], capture_output=True)
    if result.returncode:
        raise FixtureError('Private fixture file permissions could not be restricted; no credentials were written.')


class Store:
    def __init__(self, file=FIXTURE):
        self.file = Path(file)

    @contextlib.contextmanager
    def lock(self):
        self.file.parent.mkdir(parents=True, exist_ok=True)
        lock = self.file.with_suffix('.lock')
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        except FileExistsError:
            raise FixtureError('A fixture operation lock exists; review its running process before retrying.') from None
        os.close(fd)
        try:
            yield
        finally:
            lock.unlink()

    def read(self):
        if self.file.is_symlink():
            raise FixtureError('Private fixture paths may not be symbolic links.')
        if self.file.exists():
            data = json.loads(self.file.read_text(encoding='utf-8'))
            validate_receipt(data)
            return data
        return None

    def save(self, receipt):
        validate_receipt(receipt)
        temporary = self.file.with_name('.live-fixture-' + uuid.uuid4().hex + '.private.tmp')
        fd = os.open(temporary, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.close(fd)
        try:
            secure_file(temporary)
            with temporary.open('w', encoding='utf-8') as handle:
                json.dump(receipt, handle, indent=2)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self.file)
        finally:
            if temporary.exists():
                temporary.unlink()


def validate_receipt(receipt):
    metadata = receipt.get('metadata', {}) if isinstance(receipt, dict) else {}
    run_id = metadata.get('runId', '')
    if receipt.get('projectRef') != PROJECT_REF or not re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}', run_id):
        raise FixtureError('Private fixture project/run receipt is not recognized.')
    if receipt.get('companyName') != PREFIX + run_id or not re.fullmatch(r'[a-f0-9]{48}', metadata.get('marker', '')):
        raise FixtureError('Private fixture ownership marker does not match this run.')
    if receipt.get('supabaseUrl') != SUPABASE_URL or receipt.get('baseUrl') != APP_ORIGIN:
        raise FixtureError('Private fixture endpoints do not match the pinned project/origin.')
    if metadata.get('state') not in ('provisioning', 'ready', 'finalizing', 'finalized'):
        raise FixtureError('Private fixture lifecycle state is not recognized.')
    public_key = receipt.get('supabaseAnonKey', '')
    if not isinstance(public_key, str) or (not public_key.startswith('sb_publishable_') and jwt_role(public_key) != 'anon'):
        raise FixtureError('Only a public browser key may be persisted with the fixture.')
    for name in ('admin', 'cashier'):
        row = receipt.get(name, {})
        if row.get('email') != 'erpx.acceptance.' + run_id.lower() + '.' + name + '@example.test' or not isinstance(row.get('password'), str) or len(row['password']) < 24:
            raise FixtureError('Private fixture credentials do not match the isolated run.')
        if row.get('userId'):
            identifier(row['userId'])
    for name in ('companyId', 'branchId', 'warehouseId', 'customerId', 'tenantId'):
        if receipt.get(name):
            identifier(receipt[name])
    if receipt.get('admin', {}).get('userId') and receipt['admin']['userId'] == receipt.get('cashier', {}).get('userId'):
        raise FixtureError('Fixture administrator and cashier must be separate identities.')


def new_receipt(anon_key, base_url):
    run_id = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ-') + secrets.token_hex(6)
    return {'projectRef': PROJECT_REF, 'baseUrl': origin(base_url), 'supabaseUrl': SUPABASE_URL, 'supabaseAnonKey': anon_key,
        'companyName': PREFIX + run_id, 'companyId': None, 'branchId': None, 'warehouseId': None, 'customerId': None, 'tenantId': None,
        'admin': {'userId': None, 'email': 'erpx.acceptance.' + run_id.lower() + '.admin@example.test', 'password': secrets.token_urlsafe(32) + 'aA9!', 'creationRequested': False},
        'cashier': {'userId': None, 'email': 'erpx.acceptance.' + run_id.lower() + '.cashier@example.test', 'password': secrets.token_urlsafe(32) + 'aA9!', 'creationRequested': False},
        'allowLiveMutations': False, 'metadata': {'runId': run_id, 'marker': secrets.token_hex(24), 'createdAt': now(), 'state': 'provisioning', 'version': 1}}


def marker(receipt):
    return {'run_id': receipt['metadata']['runId'], 'marker': receipt['metadata']['marker']}


def verify_auth(gateway, receipt, name):
    user = receipt[name]
    remote = gateway.auth_user(user['userId'])
    if remote.get('id') != user['userId'] or remote.get('email', '').lower() != user['email'] or remote.get('app_metadata', {}).get(MARKER_KEY) != marker(receipt):
        raise FixtureError('Auth identity ownership does not match the isolated fixture; no changes are permitted.')
    return remote


def exactly_one(rows, message):
    if not isinstance(rows, list) or len(rows) != 1:
        raise FixtureError(message)
    return rows[0]


def verify_company(gateway, receipt, require_marker=True):
    company = exactly_one(gateway.rows('companies', id=identifier(receipt['companyId'])), 'Isolated test company was not uniquely identified.')
    if company.get('name') != receipt['companyName'] or company.get('onboarding_owner_id') != receipt['admin']['userId']:
        raise FixtureError('Company is not owned by this isolated acceptance run; operation refused.')
    stored = (company.get('settings') or {}).get(MARKER_KEY)
    if require_marker and stored != marker(receipt):
        raise FixtureError('Company test marker differs; original/other-run records must not be changed.')
    return company


def verify_ready(gateway, receipt, require_active=False):
    validate_receipt(receipt)
    company = verify_company(gateway, receipt)
    if require_active and (company.get('status') != 'active' or company.get('currency') != 'SAR'):
        raise FixtureError('The prepared fixture company is no longer active in SAR; it will not be reactivated.')
    for name in ('admin', 'cashier'):
        verify_auth(gateway, receipt, name)
        auth_profile = exactly_one(gateway.rows('profiles', id=receipt[name]['userId']), 'Fixture Auth profile is unavailable.')
        if auth_profile.get('email') != receipt[name]['email'] or (require_active and auth_profile.get('status') != 'active'):
            raise FixtureError('Fixture Auth profile does not match the prepared active identity.')
        profile = exactly_one(gateway.rows('users', id=receipt[name]['userId']), 'Fixture ERP identity is unavailable.')
        if profile.get('company_id') != receipt['companyId'] or profile.get('branch_id') != receipt['branchId']:
            raise FixtureError('Fixture ERP membership differs from its company/branch.')
        if require_active and profile.get('status') != 'active':
            raise FixtureError('A fixture ERP identity is no longer active; it will not be reactivated.')
        role = exactly_one(gateway.rows('roles', id=profile.get('role_id')), 'Fixture user role is unavailable.')
        if role.get('name') != name or role.get('company_id') not in (None, receipt['companyId']) or role.get('status') != 'active':
            raise FixtureError('Fixture identity role is not the reviewed active company role.')
    for table, field in (('branches', 'branchId'), ('warehouses', 'warehouseId'), ('customers', 'customerId')):
        row = exactly_one(gateway.rows(table, id=receipt[field]), 'Fixture company resource is unavailable.')
        if row.get('company_id') != receipt['companyId'] or (table == 'warehouses' and row.get('branch_id') != receipt['branchId']):
            raise FixtureError('Fixture resource belongs to another company or branch.')
        if require_active and (row.get('is_active') is not True if table == 'warehouses' else row.get('status') != 'active'):
            raise FixtureError('A fixture branch, warehouse or customer is no longer active.')
        if table == 'customers' and (row.get('customer_code') != 'ACCEPT-' + receipt['metadata']['runId'] or row.get('company_name') != 'RELEASE ACCEPTANCE CUSTOMER ' + receipt['metadata']['runId']):
            raise FixtureError('Fixture customer no longer matches the unique acceptance run.')


def provision(gateway, store, anon_key, base_url):
    receipt = store.read()
    if receipt:
        if receipt['metadata']['state'] in ('finalizing', 'finalized'):
            raise FixtureError('This receipt has been finalized. Preserve it and prepare a separately reviewed new run instead of reusing identities.')
        if receipt['metadata']['state'] == 'ready':
            verify_ready(gateway, receipt, require_active=True)
            return receipt
    else:
        receipt = new_receipt(anon_key, base_url)
        store.save(receipt)
    for name in ('admin', 'cashier'):
        user = receipt[name]
        if not user['userId']:
            if user['creationRequested']:
                raise FixtureError('An Auth creation outcome is uncertain. Do not recreate or search unrelated accounts; review the private receipt manually.')
            user['creationRequested'] = True
            store.save(receipt)
            created = gateway.create_auth(user, marker(receipt))
            created = created.get('user', created) if isinstance(created, dict) else {}
            user['userId'] = identifier(created.get('id'))
            store.save(receipt)
        verify_auth(gateway, receipt, name)
    profiles = gateway.rows('users', id=receipt['admin']['userId'])
    if profiles:
        admin_profile = exactly_one(profiles, 'Admin fixture profile is ambiguous.')
        receipt['companyId'] = identifier(admin_profile['company_id'])
        receipt['branchId'] = identifier(admin_profile['branch_id'])
        verify_company(gateway, receipt, require_marker=False)
    else:
        session = gateway.sign_in(receipt['admin'])
        result = gateway.request('/rest/v1/rpc/register_company_account', method='POST', token=session, body={
            'p_company_name':receipt['companyName'], 'p_legal_name':receipt['companyName'], 'p_tax_id':'', 'p_vat_number':'',
            'p_business_sector':'Acceptance testing', 'p_company_size':'test', 'p_country':'SA', 'p_city':'Release acceptance',
            'p_address':'Synthetic test fixture', 'p_website':'', 'p_branch_name':'Acceptance Branch', 'p_branch_code':'ACCEPTANCE',
            'p_subscription_plan':'trial', 'p_billing_cycle':'trial', 'p_max_branches':1, 'p_max_users':2,
            'p_modules':['sales','inventory','finance'], 'p_full_name':'Release Acceptance Admin', 'p_job_title':'Acceptance tester', 'p_mobile_number':'',
        })
        if not isinstance(result, dict) or result.get('success') is not True or result.get('user_id') != receipt['admin']['userId']:
            raise FixtureError('Onboarding returned an unexpected result; inspect the receipt before retrying.')
        for target, source in (('companyId','company_id'),('branchId','branch_id'),('tenantId','tenant_id')):
            receipt[target] = identifier(result.get(source))
        store.save(receipt)
    company = verify_company(gateway, receipt, require_marker=False)
    stored_marker = (company.get('settings') or {}).get(MARKER_KEY)
    if stored_marker not in (None, marker(receipt)):
        raise FixtureError('The company already belongs to another acceptance receipt.')
    if stored_marker is None:
        settings = {**(company.get('settings') or {}), MARKER_KEY: marker(receipt)}
        changed = gateway.write('companies', {'settings':settings}, method='PATCH', id=receipt['companyId'], name=receipt['companyName'], onboarding_owner_id=receipt['admin']['userId'])
        exactly_one(changed, 'Company marker could not be attached to the isolated company.')
    if company.get('currency') != 'SAR' or company.get('status') != 'active':
        raise FixtureError('The test company must be active and use SAR; existing accounting settings were not changed.')
    receipt['tenantId'] = identifier(company.get('tenant_id'))
    warehouse = exactly_one(gateway.rows('warehouses', company_id=receipt['companyId'], branch_id=receipt['branchId'], is_active='true'), 'Exactly one active branch warehouse is required for acceptance.')
    receipt['warehouseId'] = identifier(warehouse['id'])
    role = exactly_one(gateway.rows('roles', name='cashier', company_id=None, status='active'), 'One active trusted global cashier role is required; no shared role was altered.')
    if role.get('company_id') is not None or role.get('name') != 'cashier' or role.get('status') != 'active':
        raise FixtureError('Cashier role is not the reviewed active global cashier role.')
    existing = gateway.rows('users', id=receipt['cashier']['userId'])
    fields = {'id':receipt['cashier']['userId'], 'company_id':receipt['companyId'], 'branch_id':receipt['branchId'], 'role_id':role['id'], 'email':receipt['cashier']['email'], 'first_name':'Release Acceptance', 'last_name':'Cashier', 'status':'active'}
    if existing:
        if any(existing[0].get(key) != fields[key] for key in ('id','company_id','branch_id','role_id','email')):
            raise FixtureError('Cashier profile belongs to another identity/role/company; no changes were made.')
    else:
        gateway.write('users', fields)
    if not gateway.rows('profiles', id=receipt['cashier']['userId']):
        gateway.write('profiles', {'id':receipt['cashier']['userId'], 'email':receipt['cashier']['email'], 'full_name':'Release Acceptance Cashier', 'status':'active'})
    if not gateway.rows('user_roles', user_id=receipt['cashier']['userId'], role_id=role['id']):
        gateway.write('user_roles', {'user_id':receipt['cashier']['userId'], 'role_id':role['id']})
    if not gateway.rows('user_tenants', user_id=receipt['cashier']['userId'], tenant_id=receipt['tenantId']):
        gateway.write('user_tenants', {'user_id':receipt['cashier']['userId'], 'tenant_id':receipt['tenantId']})
    customer_code = 'ACCEPT-' + receipt['metadata']['runId']
    customers = gateway.rows('customers', company_id=receipt['companyId'], customer_code=customer_code)
    customer = exactly_one(customers, 'Acceptance customer lookup is ambiguous.') if customers else exactly_one(gateway.write('customers', {
        'company_id':receipt['companyId'], 'customer_code':customer_code, 'company_name':'RELEASE ACCEPTANCE CUSTOMER ' + receipt['metadata']['runId'], 'status':'active',
    }), 'Acceptance customer could not be created.')
    receipt['customerId'] = identifier(customer['id'])
    receipt['metadata']['state'] = 'ready'
    receipt['allowLiveMutations'] = True
    verify_ready(gateway, receipt, require_active=True)
    store.save(receipt)
    return receipt


def summary(receipt):
    return {'project_ref':PROJECT_REF, 'run_id':receipt['metadata']['runId'], 'state':receipt['metadata']['state'], 'company_id':receipt['companyId'],
        'private_fixture':'.tmp/release-acceptance/live-fixture.private.json', 'emails_sent':False, 'original_companies_modified':False}


def main(arguments=None):
    args = sys.argv[1:] if arguments is None else arguments
    if args not in ([], ['--plan'], ['--apply']):
        raise FixtureError('Usage: python scripts/provision-live-fixture.py [--plan | --apply]. Private credentials/project overrides are never accepted as arguments.')
    if args != ['--apply']:
        print(json.dumps({'mode':'offline_plan', 'project_ref':PROJECT_REF, 'base_url':APP_ORIGIN, 'company_prefix':PREFIX, 'auth_users_created_on_apply':2,
            'emails_sent':False, 'original_companies_modified':False, 'private_fixture':str(FIXTURE.relative_to(ROOT)), 'applied':False}))
        return
    key = public_configuration()
    gateway = Gateway(private_configuration(), key)
    store = Store()
    with store.lock():
        receipt = provision(gateway, store, key, APP_ORIGIN)
    print(json.dumps(summary(receipt)))


if __name__ == '__main__':
    try:
        main()
    except FixtureError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Fixture provisioning could not complete. Provider details and credentials were withheld; inspect the private receipt before retrying.', file=sys.stderr)
        sys.exit(1)
