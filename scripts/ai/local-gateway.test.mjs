import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createGateway } from './local-gateway.mjs';

const config = { token: randomBytes(32).toString('base64url'), model: 'qwen3:1.7b', port: 11435 };
const chat = { model: config.model, messages: [{ role: 'system', content: 'Synthetic test rules.' },
  { role: 'user', content: 'Synthetic test question.' }], stream: false };
const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const reply = extra => json({ model: config.model, done: true, message: { role: 'assistant', content: 'Synthetic response.' }, ...extra });
const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };

async function gateway(t, fetchImpl, options = {}) {
  const server = createGateway(config, { fetchImpl, ...options });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin, request: (body = chat, endpoint = '/api/chat', init = {}) =>
    fetch(origin + endpoint, { method: 'POST', headers, body: JSON.stringify(body), ...init }) };
}

test('private configuration rejects weak credentials, external URLs, bind overrides and invalid ports', () => {
  for (const invalid of [null, { ...config, token: 'short' }, { ...config, token: 'a'.repeat(64) },
    { ...config, token: config.token + '\n' }, { ...config, model: 'https://external.invalid/model' },
    { ...config, host: '0.0.0.0' }, { ...config, port: 0 }, { ...config, port: 65536 }]) {
    assert.throws(() => createGateway(invalid), /gateway_configuration_invalid/);
  }
});

test('the CLI rejects credential arguments without printing their values or reading configuration', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./local-gateway.mjs', import.meta.url)),
    '--token', 'SYNTHETIC_CLI_CREDENTIAL_CANARY'], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.deepEqual(JSON.parse(result.stderr), { error: 'gateway_configuration_invalid' });
});

test('every endpoint requires its own exact bearer credential before any upstream call', async t => {
  let calls = 0;
  const app = await gateway(t, async () => { calls += 1; return reply(); });
  for (const authorization of [undefined, 'Basic dummy', `Bearer ${config.token}x`, `Bearer  ${config.token}`]) {
    for (const endpoint of ['/health', '/api/chat']) {
      const response = await fetch(app.origin + endpoint, { headers: authorization ? { Authorization: authorization } : {} });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'unauthorized' });
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('access-control-allow-origin'), null);
    }
  }
  assert.equal(calls, 0);
});

test('health checks only the fixed local catalog and exact pinned installed model', async t => {
  const app = await gateway(t, async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/tags');
    assert.equal(init.method, 'GET');
    assert.equal(init.redirect, 'error');
    assert(!JSON.stringify(init.headers).includes(config.token));
    return json({ models: [{ name: config.model, private_metadata: 'must not be returned' }] });
  });
  const response = await fetch(app.origin + '/health', { headers });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, ready: true, model: config.model });
});

test('offline, missing-model and failed health probes expose only safe readiness', async t => {
  let mode = 0;
  const app = await gateway(t, async () => {
    if (mode++ === 0) throw new Error('synthetic private upstream failure');
    return json({ models: [{ name: config.model + '-other' }] });
  });
  for (let index = 0; index < 2; index += 1) {
    const response = await fetch(app.origin + '/health', { headers });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, ready: false, model: config.model });
  }
});

test('chat forwards only the pinned model and controlled generation parameters', async t => {
  const app = await gateway(t, async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    assert(!JSON.stringify(init.headers).includes(config.token));
    assert.deepEqual(JSON.parse(init.body), { model: config.model, messages: chat.messages, stream: false,
      think: false, options: { num_predict: 512, num_ctx: 4096, temperature: 0.2 } });
    return reply({ thinking: 'not returned', total_duration: 999 });
  });
  const response = await app.request();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { model: config.model,
    message: { role: 'assistant', content: 'Synthetic response.' }, done: true });
});

test('client model, tool, URL, option, role and size overrides never reach Ollama', async t => {
  let calls = 0;
  const app = await gateway(t, async () => { calls += 1; return reply(); });
  for (const body of [null, [], 'plain', { ...chat, model: 'another:1b' }, { ...chat, stream: true },
    { ...chat, options: { num_predict: 9999 } }, { ...chat, think: true }, { ...chat, url: 'http://external.invalid' },
    { ...chat, tools: [] }, { messages: [] }, { messages: [{ role: 'system', content: 'No user' }] },
    ...['assistant', 'tool', 'function'].map(role => ({ messages: [{ role, content: 'Synthetic' }] })),
    { messages: [{ role: 'user', content: 'Synthetic', images: ['injected'] }] },
    { messages: [{ role: 'user', content: ' ' }] }, { messages: [{ role: 'user', content: 'x'.repeat(16001) }] },
    { messages: [{ role: 'system', content: 'x'.repeat(10000) }, { role: 'user', content: 'y'.repeat(10001) }] },
    { messages: Array.from({ length: 17 }, () => ({ role: 'user', content: 'Synthetic' })) }]) {
    const response = await app.request(body);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'invalid_chat_request' });
  }
  assert.equal(calls, 0);
  assert.equal((await app.request()).status, 200, 'Validation failure must release the inference slot');
});

test('Ollama admin routes, arbitrary URLs, query variants and unsupported methods are unavailable', async t => {
  let calls = 0;
  const app = await gateway(t, async () => { calls += 1; return reply(); });
  for (const endpoint of ['/api/pull', '/api/tags', '/api/show', '/api/generate', '/api/chat?model=other', '/health?url=other']) {
    assert.equal((await app.request(chat, endpoint)).status, 404);
  }
  assert.equal((await fetch(app.origin + '/api/chat', { headers })).status, 405);
  assert.equal((await app.request(chat, '/health')).status, 405);
  assert.equal(calls, 0);
});

test('malformed JSON, wrong media and oversized declared requests are rejected', async t => {
  let calls = 0;
  const app = await gateway(t, async () => { calls += 1; return reply(); });
  assert.equal((await app.request(chat, '/api/chat', { body: '{' })).status, 400);
  assert.equal((await app.request(chat, '/api/chat', { headers: { ...headers, 'Content-Type': 'text/plain' } })).status, 415);
  const response = await app.request(chat, '/api/chat', { body: 'x'.repeat(24 * 1024 + 1) });
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});

test('chunked requests cannot bypass the 24 KiB byte limit', async t => {
  let calls = 0;
  const app = await gateway(t, async () => { calls += 1; return reply(); });
  const result = await new Promise((resolve, reject) => {
    const request = http.request(app.origin + '/api/chat', { method: 'POST', headers }, response => {
      let body = ''; response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(body) }));
    });
    request.on('error', reject);
    request.write('x'.repeat(16 * 1024));
    request.end('y'.repeat(9 * 1024));
  });
  assert.equal(result.status, 413);
  assert.deepEqual(result.body, { error: 'request_too_large' });
  assert.equal(calls, 0);
});

test('duplicate authorization headers are refused even if one contains the correct credential', async t => {
  let calls = 0;
  const app = await gateway(t, async () => { calls += 1; return reply(); });
  const status = await new Promise((resolve, reject) => {
    const request = http.request(app.origin + '/health', { method: 'GET',
      headers: ['Host', new URL(app.origin).host, 'Authorization', `Bearer ${config.token}`, 'Authorization', 'Bearer wrong'] }, response => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject); request.end();
  });
  assert.equal(status, 401);
  assert.equal(calls, 0);
});

test('health never accepts a request body or forwards it to the model catalog', async t => {
  let calls = 0;
  const app = await gateway(t, async () => { calls += 1; return reply(); });
  const status = await new Promise((resolve, reject) => {
    const request = http.request(app.origin + '/health', { method: 'GET', headers: { ...headers, 'Content-Length': '2' } }, response => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject); request.end('{}');
  });
  assert.equal(status, 400);
  assert.equal(calls, 0);
});

test('upstream private errors, malformed responses, tool calls and excessive output are not exposed', async t => {
  const responses = [new Response('synthetic private error details', { status: 500 }), new Response('{'),
    reply({ message: { role: 'assistant', content: '' } }), reply({ model: 'other:1b' }),
    reply({ message: { role: 'tool', content: 'Synthetic' } }),
    reply({ message: { role: 'assistant', content: 'Synthetic', tool_calls: [] } }),
    reply({ message: { role: 'assistant', content: 'x'.repeat(8193) } }),
    new Response('x'.repeat(128 * 1024 + 1))];
  const app = await gateway(t, async () => responses.shift());
  for (let index = 0; index < 8; index += 1) {
    const response = await app.request();
    assert.equal(response.status, 502);
    const body = await response.json();
    assert(['upstream_unavailable', 'invalid_upstream_response', 'upstream_response_too_large'].includes(body.error));
    assert.deepEqual(Object.keys(body), ['error']);
  }
});

test('single-flight chat returns 429 while health remains readable and releases its slot afterward', async t => {
  let entered, release;
  const ready = new Promise(resolve => { entered = resolve; });
  const waiting = new Promise(resolve => { release = resolve; });
  let chats = 0;
  const app = await gateway(t, async url => {
    if (url.endsWith('/tags')) return json({ models: [{ model: config.model }] });
    if (chats++ === 0) { entered(); await waiting; }
    return reply();
  });
  const first = app.request();
  await ready;
  const busy = await app.request();
  assert.equal(busy.status, 429);
  assert.deepEqual(await busy.json(), { error: 'gateway_busy' });
  assert.equal((await fetch(app.origin + '/health', { headers })).status, 200);
  release();
  assert.equal((await first).status, 200);
  assert.equal((await app.request()).status, 200);
});

test('generation timeout aborts upstream work without revealing raw errors', async t => {
  let aborted = false;
  const app = await gateway(t, async (_url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => { aborted = true; reject(new Error('synthetic private abort')); }, { once: true });
  }), { timeoutMs: 25 });
  const response = await app.request();
  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), { error: 'upstream_timeout' });
  assert.equal(aborted, true);
});

test('health timeout fails safely without generating any tokens', async t => {
  const app = await gateway(t, async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/tags');
    return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('synthetic abort')), { once: true }));
  }, { healthTimeoutMs: 25 });
  const response = await fetch(app.origin + '/health', { headers });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, ready: false, model: config.model });
});

test('response streaming is bounded by the same generation deadline', async t => {
  const app = await gateway(t, async () => new Response(new ReadableStream({ start() {} })), { timeoutMs: 25 });
  const response = await app.request();
  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), { error: 'upstream_timeout' });
});

test('disconnecting a chat caller aborts upstream work and frees the single-flight slot', async t => {
  let entered, cancelled;
  const ready = new Promise(resolve => { entered = resolve; });
  const aborted = new Promise(resolve => { cancelled = resolve; });
  let count = 0;
  const app = await gateway(t, async (_url, init) => {
    if (count++ > 0) return reply();
    entered();
    return new Promise((_, reject) => init.signal.addEventListener('abort', () => {
      cancelled(); reject(new Error('synthetic caller disconnect'));
    }, { once: true }));
  });
  const request = http.request(app.origin + '/api/chat', { method: 'POST', headers });
  request.on('error', () => {});
  request.end(JSON.stringify(chat));
  await ready;
  request.destroy();
  await aborted;
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal((await app.request()).status, 200);
});
