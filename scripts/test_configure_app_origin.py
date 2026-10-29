import importlib.util
import io
import json
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('configure_app_origin', Path(__file__).with_name('configure-app-origin.py'))
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)
FAKE_TOKEN = 'sbp_OFFLINE_TEST_VALUE_NEVER_A_REAL_PAT'
loader = lambda: (module.PROJECT_REF, FAKE_TOKEN)


class OriginConfigurationTests(unittest.TestCase):
    def test_default_plan_uses_fresh_reads_and_never_writes_or_returns_private_fields(self):
        calls = []
        def api(project, token, endpoint, **kwargs):
            calls.append((endpoint, kwargs))
            if endpoint == '/config/auth':
                return {'site_url': module.REVIEWED_ORIGIN + '/', 'smtp_password': FAKE_TOKEN}
            return [{'name': 'OTHER_SECRET', 'value': FAKE_TOKEN}]
        plan = module.run(configuration_loader=loader, api=api)
        self.assertEqual([call[0] for call in calls], ['/config/auth','/secrets'])
        self.assertTrue(all(not call[1] for call in calls))
        self.assertEqual(plan['origin'], module.REVIEWED_ORIGIN)
        self.assertFalse(plan['applied'])
        self.assertFalse(plan['emails_sent'])
        self.assertNotIn(FAKE_TOKEN, json.dumps(plan))

    def test_apply_writes_exactly_one_reviewed_secret_after_a_second_names_check(self):
        calls = []
        inventories = iter([[], [], [{'name': 'APP_SITE_URL', 'value': FAKE_TOKEN}]])
        def api(project, token, endpoint, **kwargs):
            calls.append((endpoint, kwargs))
            if endpoint == '/config/auth':
                return {'site_url': module.REVIEWED_ORIGIN + '/'}
            if kwargs.get('method') == 'POST':
                self.assertEqual(kwargs['payload'], [{'name':'APP_SITE_URL','value':module.REVIEWED_ORIGIN}])
                return None
            return next(inventories)
        result = module.run(apply=True, configuration_loader=loader, api=api)
        self.assertTrue(result['applied'])
        self.assertTrue(result['secret_name_verified'])
        self.assertEqual(len([call for call in calls if call[1].get('method') == 'POST']), 1)
        self.assertEqual([call[0] for call in calls], ['/config/auth','/secrets','/secrets','/secrets','/secrets'])
        self.assertNotIn(FAKE_TOKEN, json.dumps(result))

    def test_existing_secret_is_refused_without_reading_its_value_or_writing(self):
        calls = []
        def api(project, token, endpoint, **kwargs):
            calls.append(kwargs)
            return {'site_url':module.REVIEWED_ORIGIN} if endpoint == '/config/auth' else [{'name':'APP_SITE_URL','value':FAKE_TOKEN}]
        with self.assertRaisesRegex(module.ConfigurationError, 'already exists'):
            module.run(apply=True, configuration_loader=loader, api=api)
        self.assertTrue(all(not call for call in calls))

    def test_secret_appearing_before_write_is_not_overwritten(self):
        counts = {'names':0, 'writes':0}
        def api(project, token, endpoint, **kwargs):
            if endpoint == '/config/auth':
                return {'site_url':module.REVIEWED_ORIGIN}
            if kwargs.get('method') == 'POST':
                counts['writes'] += 1
            counts['names'] += 1
            return [] if counts['names'] == 1 else [{'name':'APP_SITE_URL'}]
        with self.assertRaisesRegex(module.ConfigurationError, 'appeared during preflight'):
            module.run(apply=True, configuration_loader=loader, api=api)
        self.assertEqual(counts['writes'], 0)

    def test_non_https_wrong_host_credentials_query_or_unreviewed_path_are_rejected(self):
        invalid = ['http://'+module.REVIEWED_ORIGIN.split('://')[1], 'https://wrong.example', module.REVIEWED_ORIGIN+'/app', module.REVIEWED_ORIGIN+'?token='+FAKE_TOKEN,
                   module.REVIEWED_ORIGIN.replace('https://','https://name:password@')]
        for site in invalid:
            with self.subTest(site_kind=invalid.index(site)):
                with self.assertRaisesRegex(module.ConfigurationError, 'does not match'):
                    module.reviewed_origin({'site_url':site})

    def test_unrecognized_secret_inventory_and_project_mismatch_fail_closed(self):
        with self.assertRaises(module.ConfigurationError):
            module.secret_names({'APP_SITE_URL': FAKE_TOKEN})
        with self.assertRaisesRegex(module.ConfigurationError, 'pinned project'):
            module.run(configuration_loader=lambda: ('wrong-project',FAKE_TOKEN), api=lambda *a,**k: self.fail('No API request is allowed'))

    def test_only_explicit_apply_is_allowed_and_argument_errors_do_not_echo_credentials(self):
        self.assertFalse(module.parse_arguments([]))
        self.assertFalse(module.parse_arguments(['--plan']))
        self.assertTrue(module.parse_arguments(['--apply']))
        with self.assertRaises(module.ConfigurationError) as error:
            module.parse_arguments(['--token', FAKE_TOKEN])
        self.assertNotIn(FAKE_TOKEN, str(error.exception))

    def test_transport_uses_only_fixed_endpoints_and_reflects_neither_pat_nor_upstream_body(self):
        error = urllib.error.HTTPError('https://api.supabase.com', 500, FAKE_TOKEN, {}, io.BytesIO(FAKE_TOKEN.encode()))
        with patch.object(module.urllib.request, 'build_opener') as opener:
            opener.return_value.open.side_effect = error
            with self.assertRaises(module.ConfigurationError) as captured:
                module.request_api(module.PROJECT_REF, FAKE_TOKEN, '/secrets')
            self.assertNotIn(FAKE_TOKEN, str(captured.exception))
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(request.full_url, 'https://api.supabase.com/v1/projects/'+module.PROJECT_REF+'/secrets')
            self.assertEqual(request.get_method(), 'GET')
        with self.assertRaisesRegex(module.ConfigurationError, 'Only the reviewed'):
            module.request_api(module.PROJECT_REF, FAKE_TOKEN, '/config/auth', method='PATCH', payload={'site_url':module.REVIEWED_ORIGIN})

    def test_uncertain_post_failure_is_not_retried(self):
        calls = {'post':0}
        def api(project, token, endpoint, **kwargs):
            if endpoint == '/config/auth':
                return {'site_url':module.REVIEWED_ORIGIN}
            if kwargs.get('method') == 'POST':
                calls['post'] += 1
                raise module.ConfigurationError('APP_SITE_URL creation outcome is unknown after a transport failure.')
            return []
        with self.assertRaisesRegex(module.ConfigurationError, 'outcome is unknown'):
            module.run(apply=True, configuration_loader=loader, api=api)
        self.assertEqual(calls['post'], 1)


if __name__ == '__main__':
    unittest.main()
