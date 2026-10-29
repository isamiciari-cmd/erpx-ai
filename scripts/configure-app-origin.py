"""Plan or create APP_SITE_URL only, using a freshly verified Auth HTTPS origin.

No token/project/origin arguments are accepted. The default is read-only.
API contract: https://supabase.com/docs/reference/api/v1-bulk-create-secrets
"""
import importlib.util
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT_REF = 'svxmlejmhlocsjjtftxd'
REVIEWED_ORIGIN = 'https://code-isamiciari-5169s-projects.vercel.app'
SECRET_NAME = 'APP_SITE_URL'
API_ORIGIN = 'https://api.supabase.com'


class ConfigurationError(RuntimeError):
    """Only fixed, credential-free diagnostics may be raised with this type."""


class NoRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


def parse_arguments(arguments):
    if arguments in ([], ['--plan']):
        return False
    if arguments == ['--apply']:
        return True
    raise ConfigurationError('Usage: python scripts/configure-app-origin.py [--plan | --apply]. Token, project and origin arguments are not accepted.')


def configuration():
    """Reuse the reviewed private loader, without exporting its values to logs."""
    source = ROOT / 'database/inspection/management-read.py'
    try:
        spec = importlib.util.spec_from_file_location('erpx_management_private_loader', source)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        project, token = module.configuration()
        linked = (ROOT / 'supabase/.temp/project-ref').read_text(encoding='utf-8-sig').strip()
    except Exception:
        raise ConfigurationError('Private Management API configuration or linked project is unavailable; no provider call was made.') from None
    if project != PROJECT_REF or linked != PROJECT_REF or not token:
        raise ConfigurationError('The configured and linked project must match the pinned reviewed project.')
    return project, token


def request_api(project, token, endpoint, method='GET', payload=None):
    if project != PROJECT_REF:
        raise ConfigurationError('Management API target does not match the pinned project.')
    allowed = (method == 'GET' and endpoint in ('/config/auth', '/secrets') and payload is None)
    allowed = allowed or (method == 'POST' and endpoint == '/secrets' and payload == [{'name': SECRET_NAME, 'value': REVIEWED_ORIGIN}])
    if not allowed:
        raise ConfigurationError('Only the reviewed Auth/secrets reads and single APP_SITE_URL creation are permitted.')
    encoded = json.dumps(payload, separators=(',', ':')).encode('utf-8') if payload is not None else None
    request = urllib.request.Request(
        API_ORIGIN + '/v1/projects/' + PROJECT_REF + endpoint,
        method=method, data=encoded,
        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json', 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.build_opener(NoRedirects()).open(request, timeout=45) as response:
            data = response.read(1024 * 1024 + 1)
            if len(data) > 1024 * 1024:
                raise ConfigurationError('Management API response exceeded the inspection limit; no response content was retained.')
            if not data:
                return None
            try:
                return json.loads(data.decode('utf-8'))
            except (ValueError, UnicodeError):
                raise ConfigurationError('Management API response was not recognized; provider content was withheld.') from None
    except urllib.error.HTTPError as error:
        status = int(error.code)
        error.close()
        # Do not read/log provider error bodies, headers or the private PAT.
        raise ConfigurationError('Management API returned HTTP ' + str(status) + '. Inspect current secret names before retrying any write.') from None
    except (urllib.error.URLError, TimeoutError, OSError):
        if method == 'POST':
            raise ConfigurationError('APP_SITE_URL creation outcome is unknown after a transport failure. Inspect names before retrying; no automatic retry was made.') from None
        raise ConfigurationError('Management API read failed. No secret write was requested.') from None


def reviewed_origin(auth_config):
    if not isinstance(auth_config, dict) or not isinstance(auth_config.get('site_url'), str):
        raise ConfigurationError('Fresh Auth configuration did not contain a recognized site_url.')
    try:
        site = urllib.parse.urlsplit(auth_config['site_url'])
        if site.scheme != 'https' or site.username is not None or site.password is not None:
            raise ValueError()
        if site.port not in (None, 443) or site.query or site.fragment or site.path not in ('', '/'):
            raise ValueError()
        origin = 'https://' + (site.hostname or '')
        if origin != REVIEWED_ORIGIN:
            raise ValueError()
    except ValueError:
        raise ConfigurationError('Fresh Auth site_url does not match the reviewed HTTPS origin; no setting will be written.') from None
    return origin


def secret_names(payload):
    if not isinstance(payload, list) or any(not isinstance(item, dict) or not isinstance(item.get('name'), str) for item in payload):
        raise ConfigurationError('Secret-name inventory was not recognized; creation is blocked.')
    # Discard values, digests and all other fields immediately. Never return them.
    return {item['name'] for item in payload}


def run(apply=False, configuration_loader=None, api=None):
    loader = configuration_loader or configuration
    api = api or request_api
    project, token = loader()
    if project != PROJECT_REF:
        raise ConfigurationError('Management API target does not match the pinned project.')
    origin = reviewed_origin(api(project, token, '/config/auth'))
    if SECRET_NAME in secret_names(api(project, token, '/secrets')):
        raise ConfigurationError('APP_SITE_URL already exists. Its value was not read and it will not be overwritten.')
    plan = {
        'mode': 'apply' if apply else 'read_only_plan',
        'project_ref': PROJECT_REF, 'secret_name': SECRET_NAME, 'origin': origin,
        'source': 'fresh Supabase Auth site_url', 'app_site_url_present_before': False,
        'auth_settings_changed': False, 'emails_sent': False, 'other_secrets_changed': False,
        'creation_guard': 'Fresh names check; apply rechecks immediately before POST. The API offers upsert, not an atomic create-only operation.',
        'checked_at': datetime.now(timezone.utc).isoformat(),
    }
    if not apply:
        plan.update(write_requested=False, applied=False)
        return plan
    if SECRET_NAME in secret_names(api(project, token, '/secrets')):
        raise ConfigurationError('APP_SITE_URL appeared during preflight. No value was written or overwritten.')
    # One fixed write. Never retry automatically or alter Auth redirect settings.
    api(project, token, '/secrets', method='POST', payload=[{'name': SECRET_NAME, 'value': origin}])
    try:
        verified = SECRET_NAME in secret_names(api(project, token, '/secrets'))
    except ConfigurationError:
        raise ConfigurationError('The create request completed, but names-only verification failed. Inspect current secret names; do not repeat the write automatically.') from None
    if not verified:
        raise ConfigurationError('The create request completed, but APP_SITE_URL is not yet listed. Inspect current secret names; do not repeat the write automatically.')
    plan.update(write_requested=True, applied=True, secret_name_verified=True)
    return plan


def main(arguments=None):
    apply = parse_arguments(sys.argv[1:] if arguments is None else arguments)
    result = run(apply=apply)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except ConfigurationError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        # Unexpected errors must never reflect a private configuration or payload.
        print('Origin configuration could not complete. Provider details and credentials were withheld; review current state before any retry.', file=sys.stderr)
        sys.exit(1)
