"""Offline boundary tests. No real credentials, network, processes or apply CLI."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('publish_local_ai', Path(__file__).with_name('publish-connection.py'))
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)
GATEWAY = 'SYNTHETIC_GATEWAY_TOKEN_0123456789abcdefghijk'
PAT = 'sbp_SYNTHETIC_OFFLINE_MANAGEMENT_TOKEN_CANARY'
ORIGIN = 'https://synthetic-offline-test.trycloudflare.com'


def configuration():
    return {'model': module.MODEL, 'port': 11435, 'token': GATEWAY}


def state():
    records = {name: {'id': index + 101, 'startedAt': '2026-10-28T11:00:00.0000000Z',
        'executable': str(module.RUNTIME / (name + '.exe'))} for index, name in enumerate(('ollama', 'gateway', 'tunnel'))}
    records['tunnel'].update(url=ORIGIN, target=module.LOCAL_ORIGIN)
    return records


def bundle():
    return module.validate_runtime(configuration(), state())


class Response:
    def __init__(self, body=b'', status=200):
        self.body, self.status, self.reads = body, status, 0

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, size):
        self.reads += 1
        return self.body[:size]


class PublishConnectionTests(unittest.TestCase):
    def test_default_plan_never_reads_private_runtime_pat_or_network(self):
        fail = lambda *args, **kwargs: self.fail('An offline plan must not touch private configuration or a provider')
        result = module.run(runtime_loader=fail, ownership_checker=fail, probe=fail, configuration_loader=fail, api=fail)
        self.assertFalse(result['applied'])
        self.assertFalse(result['pat_read'])
        self.assertFalse(result['network_requests'])
        self.assertEqual(result['secret_names'], list(module.SECRET_NAMES))
        self.assertNotIn(GATEWAY, json.dumps(result))
        self.assertNotIn(PAT, json.dumps(result))

    def test_only_explicit_apply_or_plan_is_accepted_and_arguments_are_not_echoed(self):
        self.assertFalse(module.parse_arguments([]))
        self.assertFalse(module.parse_arguments(['--plan']))
        self.assertTrue(module.parse_arguments(['--apply']))
        for arguments in [['--token', PAT], ['--apply', '--origin', ORIGIN], ['--plan', GATEWAY]]:
            with self.assertRaises(module.ConnectionError) as error:
                module.parse_arguments(arguments)
            self.assertNotIn(PAT, str(error.exception))
            self.assertNotIn(GATEWAY, str(error.exception))

    def test_apply_checks_local_remote_auth_and_ownership_before_exact_five_secret_write(self):
        calls = []
        def load_runtime():
            calls.append('runtime')
            return bundle()
        def ownership(value):
            self.assertEqual(value, bundle())
            calls.append('ownership')
        def probe(origin, token, authenticated):
            calls.append(('health', origin, authenticated))
            self.assertEqual(token, GATEWAY if authenticated else None)
        def loader():
            calls.append('pat')
            return module.PROJECT_REF, PAT
        def api(project, token, **kwargs):
            self.assertEqual(project, module.PROJECT_REF)
            self.assertEqual(token, PAT)
            if kwargs.get('method') == 'POST':
                calls.append('write')
                module.validate_payload(kwargs['payload'])
                values = {row['name']: row['value'] for row in kwargs['payload']}
                self.assertEqual(values, {'AI_PROVIDER':'ollama', 'AI_ALLOW_PAID_PROVIDER':'false',
                    'OLLAMA_BASE_URL':ORIGIN, 'OLLAMA_MODEL':module.MODEL, 'OLLAMA_API_KEY':GATEWAY})
                return None
            calls.append('names')
            return set(module.SECRET_NAMES) | {'OPENAI_API_KEY'}
        result = module.run(True, load_runtime, ownership, probe, loader, api)
        self.assertEqual(calls, ['runtime','ownership',('health',module.LOCAL_ORIGIN,True),
            ('health',ORIGIN,False),('health',ORIGIN,True),'pat','runtime','ownership','write','names'])
        self.assertTrue(result['applied'])
        self.assertTrue(result['anonymous_health_rejected'])
        self.assertFalse(result['openai_secrets_changed'])
        self.assertNotIn(PAT, json.dumps(result))
        self.assertNotIn(GATEWAY, json.dumps(result))

    def test_health_failure_prevents_reading_pat_or_calling_management(self):
        def fail(*args):
            raise module.ConnectionError('synthetic_health_unavailable')
        never = lambda *args, **kwargs: self.fail('Private Management access must not occur')
        with self.assertRaises(module.ConnectionError):
            module.run(True, bundle, lambda value: None, fail, never, never)

    def test_runtime_change_during_preflight_prevents_any_secret_write(self):
        values = [bundle(), {**bundle(), 'token': GATEWAY[::-1]}]
        with self.assertRaisesRegex(module.ConnectionError, 'changed during preflight'):
            module.run(True, lambda: values.pop(0), lambda value: None, lambda *args: True,
                lambda: (module.PROJECT_REF, PAT), lambda *args, **kwargs: self.fail('No write'))

    def test_wrong_management_project_prevents_any_secret_write(self):
        with self.assertRaisesRegex(module.ConnectionError, 'pinned'):
            module.run(True, bundle, lambda value: None, lambda *args: True,
                lambda: ('wrong-project', PAT), lambda *args, **kwargs: self.fail('No write'))

    def test_name_verification_failure_never_retries_the_completed_write(self):
        writes = []
        def api(*args, **kwargs):
            if kwargs.get('method') == 'POST':
                writes.append(kwargs)
                return None
            return set()
        with self.assertRaisesRegex(module.ConnectionError, 'do not repeat automatically'):
            module.run(True, bundle, lambda value: None, lambda *args: True,
                lambda: (module.PROJECT_REF, PAT), api)
        self.assertEqual(len(writes), 1)

    def test_only_strict_origin_without_credentials_paths_ports_queries_or_suffix_attacks_is_allowed(self):
        for invalid in ['http://synthetic.trycloudflare.com', 'https://127.0.0.1', ORIGIN + '.evil.invalid',
            ORIGIN + '/health', ORIGIN + ':443', ORIGIN + '?token=' + GATEWAY, ORIGIN + '#fragment',
            ORIGIN.replace('https://', 'https://user:password@'), 'https://UPPER.trycloudflare.com',
            'https://-bad.trycloudflare.com', 'https://bad-.trycloudflare.com']:
            with self.assertRaises(module.ConnectionError) as error:
                module.quick_origin(invalid)
            self.assertNotIn(GATEWAY, str(error.exception))

    def test_invalid_token_model_raw_ollama_target_and_ownership_records_are_refused(self):
        for mutate in [lambda c,s: c.update(token='short'), lambda c,s: c.update(model='other:1b'),
            lambda c,s: c.update(port=11434), lambda c,s: c.update(host='0.0.0.0'),
            lambda c,s: s['tunnel'].update(target='http://127.0.0.1:11434'),
            lambda c,s: s['gateway'].update(executable=None), lambda c,s: s['gateway'].update(id=True),
            lambda c,s: s['gateway'].update(startedAt='unrecognized')]:
            config, records = configuration(), state()
            mutate(config, records)
            with self.assertRaises(module.ConnectionError):
                module.validate_runtime(config, records)

    def test_api_transport_refuses_extra_secrets_paid_provider_or_other_project_before_network(self):
        for payload in [module.secret_payload(bundle()) + [{'name':'OPENAI_API_KEY','value':PAT}],
            [{'name':row['name'],'value':'true' if row['name']=='AI_ALLOW_PAID_PROVIDER' else row['value']}
             for row in module.secret_payload(bundle())]]:
            with patch.object(module.urllib.request, 'build_opener', side_effect=AssertionError('No network')):
                with self.assertRaises(module.ConnectionError):
                    module.request_api(module.PROJECT_REF, PAT, 'POST', payload)
        with self.assertRaises(module.ConnectionError):
            module.request_api('wrong-project', PAT)

    def test_successful_post_body_is_never_read_or_stored(self):
        response = Response(PAT.encode())
        class Opener:
            def open(self, request, timeout):
                self_request = json.loads(request.data)
                module.validate_payload(self_request)
                return response
        with patch.object(module.urllib.request, 'build_opener', return_value=Opener()):
            self.assertIsNone(module.request_api(module.PROJECT_REF, PAT, 'POST', module.secret_payload(bundle())))
        self.assertEqual(response.reads, 0)

    def test_management_http_errors_and_transport_outcomes_are_sanitized_without_retry(self):
        for error in [urllib.error.HTTPError('https://api.supabase.com', 403, PAT, {}, io.BytesIO(PAT.encode())),
            urllib.error.URLError(PAT)]:
            opener = unittest.mock.Mock()
            opener.open.side_effect = error
            with patch.object(module.urllib.request, 'build_opener', return_value=opener):
                with self.assertRaises(module.ConnectionError) as caught:
                    module.request_api(module.PROJECT_REF, PAT, 'POST', module.secret_payload(bundle()))
            self.assertEqual(opener.open.call_count, 1)
            self.assertNotIn(PAT, str(caught.exception))

    def test_redirects_are_never_followed(self):
        self.assertIsNone(module.NoRedirects().redirect_request(None, None, 302, '', {}, 'https://evil.invalid'))

    def test_anonymous_remote_health_requires_401_and_does_not_read_an_open_endpoint_body(self):
        response = Response(GATEWAY.encode())
        opener = unittest.mock.Mock()
        opener.open.return_value = response
        with patch.object(module.urllib.request, 'build_opener', return_value=opener):
            with self.assertRaisesRegex(module.ConnectionError, 'did not require authentication'):
                module.health_probe(ORIGIN, None, False)
        self.assertEqual(response.reads, 0)
        self.assertIsNone(opener.open.call_args.args[0].get_header('Authorization'))
        error = urllib.error.HTTPError(ORIGIN, 401, GATEWAY, {}, io.BytesIO(GATEWAY.encode()))
        opener.open.side_effect = error
        with patch.object(module.urllib.request, 'build_opener', return_value=opener):
            self.assertTrue(module.health_probe(ORIGIN, None, False))

    def test_authenticated_health_accepts_only_ready_pinned_model(self):
        for body, expected in [({'ok':True,'ready':True,'model':module.MODEL}, True),
            ({'ok':True,'ready':False,'model':module.MODEL}, False), ({'ok':True,'ready':True,'model':'other:1b'}, False)]:
            response = Response(json.dumps(body).encode())
            opener = unittest.mock.Mock()
            opener.open.return_value = response
            with patch.object(module.urllib.request, 'build_opener', return_value=opener):
                if expected:
                    self.assertTrue(module.health_probe(ORIGIN, GATEWAY, True))
                else:
                    with self.assertRaises(module.ConnectionError):
                        module.health_probe(ORIGIN, GATEWAY, True)
            self.assertEqual(opener.open.call_args.args[0].get_header('Authorization'), 'Bearer ' + GATEWAY)

    def test_utf8_bom_runtime_state_is_supported_without_real_private_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            runtime = root / '.tmp/ai-runtime'
            runtime.mkdir(parents=True)
            (runtime / 'gateway.private.json').write_text(json.dumps(configuration()), encoding='utf-8')
            (runtime / 'processes.json').write_text(json.dumps(state()), encoding='utf-8-sig')
            with patch.object(module, 'ROOT', root), patch.object(module, 'RUNTIME', runtime), \
                 patch.object(module, 'private_acl') as acl:
                self.assertEqual(module.load_runtime()['origin'], ORIGIN)
                self.assertEqual(acl.call_count, 2)

    def test_ownership_checks_exact_executable_start_time_and_command_without_real_process_reads(self):
        current = bundle()
        node = str(module.ROOT / 'synthetic-node.exe')
        paths = {'ollama':str(module.RUNTIME / 'ollama/ollama.exe'), 'gateway':node, 'tunnel':str(module.RUNTIME / 'cloudflared.exe')}
        arguments = {'ollama':['serve'], 'gateway':[str(module.ROOT / 'scripts/ai/local-gateway.mjs'),'--config',str(module.RUNTIME / 'gateway.private.json')],
            'tunnel':['tunnel','--url',module.LOCAL_ORIGIN,'--protocol','http2','--no-autoupdate']}
        for name, row in current['processes'].items():
            row['executable'] = paths[name]
        actual = {row['id']:{**row, 'commandLine':subprocess.list2cmdline([paths[name], *arguments[name]])}
            for name,row in current['processes'].items()}
        def inspect(script):
            process_id = next(value for value in actual if ('-Id ' + str(value) + ';') in script)
            return actual[process_id]
        with patch.object(module.shutil, 'which', return_value=node), patch.object(module, 'powershell_json', side_effect=inspect):
            module.verify_ownership(current)
            actual[current['processes']['gateway']['id']]['startedAt'] = '2026-10-28T12:00:00.0000000Z'
            with self.assertRaises(module.ConnectionError):
                module.verify_ownership(current)
            actual[current['processes']['gateway']['id']]['startedAt'] = current['processes']['gateway']['startedAt']
            actual[current['processes']['gateway']['id']]['commandLine'] = subprocess.list2cmdline([node, 'unrelated.mjs'])
            with self.assertRaises(module.ConnectionError):
                module.verify_ownership(current)


if __name__ == '__main__':
    unittest.main()
