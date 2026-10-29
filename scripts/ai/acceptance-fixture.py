"""Separate isolated identity/company receipt for post-connection AI acceptance."""
import importlib.util
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
FILE = ROOT / '.tmp/ai-runtime/acceptance.private.json'


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    arguments = sys.argv[1:]
    if arguments in ([], ['--plan']):
        print(json.dumps({'mode':'offline_plan', 'private_fixture':'.tmp/ai-runtime/acceptance.private.json',
            'creates_marked_test_company_on_provision':True, 'test_accounts':2,
            'financial_transactions_created':False, 'emails_sent':False,
            'previous_finalized_fixture_reused':False, 'applied':False}))
        return
    provision = arguments == ['--provision']
    finalize = len(arguments) == 3 and arguments[:2] == ['--finalize', '--expected-run-id'] and \
        re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}', arguments[2])
    if not provision and not finalize:
        raise RuntimeError('Use --plan, --provision, or --finalize --expected-run-id <reviewed-run-id>.')
    support = load('ai_acceptance_support', 'provision-live-fixture.py')
    store = support.Store(FILE)
    key = support.public_configuration()
    gateway = support.Gateway(support.private_configuration(), key)
    with store.lock():
        if provision:
            receipt = support.provision(gateway, store, key, support.APP_ORIGIN)
        else:
            receipt = load('ai_acceptance_finalizer', 'finalize-live-fixture.py').finalize(gateway, store, arguments[2])
    print(json.dumps({**support.summary(receipt), 'private_fixture':'.tmp/ai-runtime/acceptance.private.json',
        'financial_transactions_created':False, 'previous_finalized_fixture_reused':False}))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('AI acceptance fixture could not complete; private details withheld. Inspect its exact receipt before retrying.', file=sys.stderr)
        sys.exit(1)
