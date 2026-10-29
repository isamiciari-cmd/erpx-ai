"""Prepare or publish exactly five local-AI secrets. Default is entirely offline.

--apply is a separate approved operation after connect-site.ps1 has started its
protected temporary Quick Tunnel. Never pass credentials or URL overrides.
"""
import contextlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / '.tmp/ai-runtime'
PROJECT_REF = 'svxmlejmhlocsjjtftxd'
MODEL = 'qwen3:1.7b'
LOCAL_ORIGIN = 'http://127.0.0.1:11435'
SECRET_NAMES = ('AI_PROVIDER', 'AI_ALLOW_PAID_PROVIDER', 'OLLAMA_BASE_URL', 'OLLAMA_MODEL', 'OLLAMA_API_KEY')


class ConnectionError(RuntimeError):
    """Only fixed diagnostics; never attach provider bodies or credentials."""


class NoRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


def parse_arguments(arguments):
    if arguments in ([], ['--plan']):
        return False
    if arguments == ['--apply']:
        return True
    raise ConnectionError('Use --plan or --apply only. Credential and origin arguments are not accepted.')


def quick_origin(value):
    if not isinstance(value, str) or not re.fullmatch(
        r'https://[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.trycloudflare\.com', value
    ):
        raise ConnectionError('The recorded origin is not a reviewed temporary Quick Tunnel origin.')
    return value


def valid_token(value):
    return isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9_-]{43,256}', value) and len(set(value)) >= 10


def validate_runtime(configuration, state):
    if not isinstance(configuration, dict) or set(configuration) != {'token', 'model', 'port'} or \
       configuration.get('model') != MODEL or type(configuration.get('port')) is not int or configuration['port'] != 11435 or \
       not valid_token(configuration.get('token')) or not isinstance(state, dict):
        raise ConnectionError('The private local gateway configuration is not recognized.')
    records = {}
    for name in ('ollama', 'gateway', 'tunnel'):
        record = state.get(name)
        if not isinstance(record, dict) or type(record.get('id')) is not int or record['id'] < 1 or \
           not isinstance(record.get('executable'), str) or not record['executable'] or \
           not isinstance(record.get('startedAt'), str) or not re.fullmatch(
               r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{7}Z', record['startedAt']):
            raise ConnectionError('Recorded process ownership metadata is incomplete.')
        records[name] = {key: record[key] for key in ('id', 'startedAt', 'executable')}
    tunnel = state['tunnel']
    if tunnel.get('target') != LOCAL_ORIGIN:
        raise ConnectionError('The tunnel must expose only the protected local gateway.')
    return {'model': MODEL, 'token': configuration['token'], 'origin': quick_origin(tunnel.get('url')), 'processes': records}


def powershell_json(script):
    if os.name != 'nt':
        raise ConnectionError('Process ownership verification requires this Windows runtime.')
    result = subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', script],
        capture_output=True, text=True, timeout=15, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if result.returncode:
        raise ConnectionError('Local ownership or private ACL verification failed; details withheld.')
    try:
        return json.loads(result.stdout)
    except (ValueError, UnicodeError):
        raise ConnectionError('Local ownership verification returned unrecognized metadata.') from None


def private_acl(filename):
    # Only the fixed local filename enters this command; no key is a CLI argument.
    literal = str(filename).replace("'", "''")
    result = powershell_json("$ErrorActionPreference='Stop'; $a=Get-Acl -LiteralPath '" + literal + "'; "
        "$s=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; "
        "$ok=$a.AreAccessRulesProtected; foreach($r in $a.Access){ "
        "$id=$r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value; "
        "if($r.AccessControlType -eq 'Allow' -and $id -notin @($s,'S-1-5-18')){$ok=$false}}; "
        "@{private=$ok}|ConvertTo-Json -Compress")
    if not isinstance(result, dict) or result.get('private') is not True:
        raise ConnectionError('The gateway credential file must be private to its owner and SYSTEM.')


def load_runtime():
    if RUNTIME.resolve() != RUNTIME or not RUNTIME.is_relative_to(ROOT):
        raise ConnectionError('Runtime paths may not escape the ignored workspace directory.')
    private_file = RUNTIME / 'gateway.private.json'
    state_file = RUNTIME / 'processes.json'
    for filename, limit in ((private_file, 8192), (state_file, 32768)):
        if filename.resolve() != filename or not filename.is_file() or filename.stat().st_size > limit:
            raise ConnectionError('The fixed runtime configuration is unavailable or unsafe.')
    private_acl(private_file)
    private_acl(state_file)
    try:
        configuration = json.loads(private_file.read_text(encoding='utf-8-sig'))
        state = json.loads(state_file.read_text(encoding='utf-8-sig'))
    except (ValueError, UnicodeError, OSError):
        raise ConnectionError('Runtime configuration could not be read; contents withheld.') from None
    return validate_runtime(configuration, state)


def verify_ownership(bundle):
    node = shutil.which('node.exe')
    if not node:
        raise ConnectionError('The recorded gateway runtime is unavailable.')
    expected_paths = {'ollama': RUNTIME / 'ollama/ollama.exe', 'gateway': Path(node), 'tunnel': RUNTIME / 'cloudflared.exe'}
    expected_arguments = {
        'ollama': ['serve'],
        'gateway': [str(ROOT / 'scripts/ai/local-gateway.mjs'), '--config', str(RUNTIME / 'gateway.private.json')],
        'tunnel': ['tunnel', '--url', LOCAL_ORIGIN, '--protocol', 'http2', '--no-autoupdate'],
    }
    for name, record in bundle['processes'].items():
        process_id = record['id']
        actual = powershell_json("$ErrorActionPreference='Stop'; $p=Get-Process -Id " + str(process_id) + "; "
            "$c=Get-CimInstance Win32_Process -Filter 'ProcessId = " + str(process_id) + "'; "
            "@{id=$p.Id;executable=$p.Path;startedAt=$p.StartTime.ToUniversalTime().ToString('o');commandLine=$c.CommandLine}|ConvertTo-Json -Compress")
        path_key = lambda value: os.path.normcase(os.path.abspath(str(value)))
        if not isinstance(actual, dict) or actual.get('id') != process_id or actual.get('startedAt') != record['startedAt'] or \
           path_key(record['executable']) != path_key(expected_paths[name]) or \
           path_key(actual.get('executable', '')) != path_key(expected_paths[name]):
            raise ConnectionError('A recorded process no longer matches its executable and start time.')
        try:
            arguments = [item.strip('"') for item in shlex.split(actual.get('commandLine', ''), posix=False)]
        except ValueError:
            raise ConnectionError('Recorded process arguments are not recognized.') from None
        if len(arguments) != len(expected_arguments[name]) + 1 or path_key(arguments[0]) != path_key(expected_paths[name]):
            raise ConnectionError('Recorded process arguments differ from the reviewed local services.')
        actual_args = [os.path.normcase(item) for item in arguments[1:]]
        wanted_args = [os.path.normcase(item) for item in expected_arguments[name]]
        if actual_args != wanted_args:
            raise ConnectionError('Recorded process arguments differ from the reviewed local services.')


def health_probe(origin, token=None, authenticated=True):
    if origin != LOCAL_ORIGIN:
        quick_origin(origin)
    if authenticated and not valid_token(token):
        raise ConnectionError('An authenticated health check requires the private gateway credential.')
    headers = {'Accept': 'application/json'}
    if authenticated:
        headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(origin + '/health', method='GET', headers=headers)
    handlers = [NoRedirects()]
    if origin == LOCAL_ORIGIN:
        handlers.append(urllib.request.ProxyHandler({}))
    try:
        with urllib.request.build_opener(*handlers).open(request, timeout=5) as response:
            if not authenticated:
                raise ConnectionError('The public gateway did not require authentication; publication refused.')
            data = response.read(4097)
            if response.status != 200 or len(data) > 4096:
                raise ConnectionError('The authenticated gateway readiness check failed.')
            body = json.loads(data)
            if not isinstance(body, dict) or body.get('ok') is not True or body.get('ready') is not True or body.get('model') != MODEL:
                raise ConnectionError('The gateway is not ready with the reviewed local model.')
            return True
    except urllib.error.HTTPError as error:
        status = int(error.code)
        error.close()
        if not authenticated and status == 401:
            return True
        raise ConnectionError('Gateway health returned HTTP ' + str(status) + '; details withheld.') from None
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, UnicodeError):
        raise ConnectionError('Gateway health could not be verified; details withheld.') from None


def management_configuration():
    # This module/function is reached only after explicit apply and health checks.
    source = ROOT / 'database/inspection/management-read.py'
    try:
        spec = importlib.util.spec_from_file_location('erpx_ai_private_management_loader', source)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        project, token = module.configuration()
    except Exception:
        raise ConnectionError('Private Management API configuration is unavailable; details withheld.') from None
    if project != PROJECT_REF or not token or (ROOT / 'supabase/.temp/project-ref').read_text(encoding='utf-8-sig').strip() != PROJECT_REF:
        raise ConnectionError('The configured and linked project differ from the pinned reviewed project.')
    return project, token


def secret_payload(bundle):
    values = {'AI_PROVIDER': 'ollama', 'AI_ALLOW_PAID_PROVIDER': 'false', 'OLLAMA_BASE_URL': quick_origin(bundle['origin']),
        'OLLAMA_MODEL': MODEL, 'OLLAMA_API_KEY': bundle['token']}
    if not valid_token(values['OLLAMA_API_KEY']):
        raise ConnectionError('The local gateway credential is not valid.')
    return [{'name': name, 'value': values[name]} for name in SECRET_NAMES]


def validate_payload(payload):
    if not isinstance(payload, list) or len(payload) != len(SECRET_NAMES) or any(
        not isinstance(item, dict) or set(item) != {'name', 'value'} for item in payload):
        raise ConnectionError('Only the five reviewed AI secrets may be published.')
    values = {item['name']: item['value'] for item in payload}
    if set(values) != set(SECRET_NAMES) or values['AI_PROVIDER'] != 'ollama' or values['AI_ALLOW_PAID_PROVIDER'] != 'false' or \
       values['OLLAMA_MODEL'] != MODEL or not valid_token(values['OLLAMA_API_KEY']):
        raise ConnectionError('Only the reviewed local provider and model may be configured.')
    quick_origin(values['OLLAMA_BASE_URL'])


def request_api(project, token, method='GET', payload=None):
    if project != PROJECT_REF or method not in ('GET', 'POST') or (method == 'GET' and payload is not None):
        raise ConnectionError('Only the pinned project secret endpoint is permitted.')
    if method == 'POST':
        validate_payload(payload)
    request = urllib.request.Request('https://api.supabase.com/v1/projects/' + PROJECT_REF + '/secrets', method=method,
        data=json.dumps(payload, separators=(',', ':')).encode() if payload is not None else None,
        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json', 'Content-Type': 'application/json'})
    try:
        with urllib.request.build_opener(NoRedirects()).open(request, timeout=45) as response:
            if method == 'POST':
                return None  # Never read/store a successful write's provider body.
            data = response.read(65537)
            if len(data) > 65536:
                raise ConnectionError('Secret-name verification exceeded the inspection limit.')
            rows = json.loads(data)
            if not isinstance(rows, list) or any(not isinstance(row, dict) or not isinstance(row.get('name'), str) for row in rows):
                raise ConnectionError('Secret-name verification returned an unrecognized response.')
            return {row['name'] for row in rows}  # Values/digests are immediately discarded.
    except urllib.error.HTTPError as error:
        status = int(error.code)
        error.close()
        raise ConnectionError('Management API returned HTTP ' + str(status) + '; details withheld. Inspect current state before retrying.') from None
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, UnicodeError):
        raise ConnectionError('AI secret publication or verification outcome may be uncertain; no automatic retry was made.') from None


@contextlib.contextmanager
def runtime_lock():
    filename = RUNTIME / 'processes.connection.lock'
    if RUNTIME.resolve() != RUNTIME or not RUNTIME.is_dir():
        raise ConnectionError('The fixed local runtime is unavailable.')
    try:
        handle = os.open(filename, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        raise ConnectionError('A local connection operation is already recorded; inspect its process before retrying.') from None
    try:
        yield
    finally:
        os.close(handle)
        filename.unlink()


def run(apply=False, runtime_loader=load_runtime, ownership_checker=verify_ownership,
        probe=health_probe, configuration_loader=management_configuration, api=request_api):
    plan = {'mode': 'apply' if apply else 'offline_plan', 'project_ref': PROJECT_REF, 'provider': 'ollama', 'model': MODEL,
        'secret_names': list(SECRET_NAMES), 'paid_provider_enabled': False, 'openai_secrets_changed': False,
        'other_secrets_changed': False, 'frontend_changed': False, 'database_changed': False, 'generation_requested': False,
        'temporary_development_tunnel': True, 'service_level_agreement': False, 'applied': False}
    if not apply:
        return {**plan, 'pat_read': False, 'network_requests': False, 'approval_required_before_public_exposure_and_apply': True}
    bundle = runtime_loader()
    ownership_checker(bundle)
    probe(LOCAL_ORIGIN, bundle['token'], True)
    probe(bundle['origin'], None, False)
    probe(bundle['origin'], bundle['token'], True)
    project, token = configuration_loader()
    if project != PROJECT_REF:
        raise ConnectionError('Management API target differs from the pinned reviewed project.')
    current = runtime_loader()
    if current != bundle:
        raise ConnectionError('Local connection configuration changed during preflight; no secret write was requested.')
    ownership_checker(current)
    api(project, token, method='POST', payload=secret_payload(bundle))
    try:
        verified_names = api(project, token)
        if not isinstance(verified_names, set) or not set(SECRET_NAMES).issubset(verified_names):
            raise ConnectionError('The five AI secret names were not all confirmed after publication.')
    except Exception:
        raise ConnectionError('The publish request completed but name verification failed. Inspect current state; do not repeat automatically.') from None
    return {**plan, 'applied': True, 'origin': bundle['origin'], 'authenticated_health_verified': True,
        'anonymous_health_rejected': True, 'secret_names_verified': True}


def main(arguments=None):
    apply = parse_arguments(sys.argv[1:] if arguments is None else arguments)
    if apply:
        with runtime_lock():
            result = run(True)
    else:
        result = run(False)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    try:
        main()
    except ConnectionError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('AI connection preparation failed. Provider details and credentials were withheld; inspect current state before retrying.', file=sys.stderr)
        sys.exit(1)
