// Loopback-only Ollama gateway. No prompts, credentials or upstream errors logged.
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const UPSTREAM = 'http://127.0.0.1:11434/api/chat';
const HEALTH_UPSTREAM = 'http://127.0.0.1:11434/api/tags';
const REQUEST_LIMIT = 24 * 1024;
const RESPONSE_LIMIT = 128 * 1024;
const OUTPUT_LIMIT = 8192;
const TIMEOUT_MS = 90_000;

class GatewayError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

function validateConfig(config) {
  if (!config || Object.getPrototypeOf(config) !== Object.prototype ||
    Object.keys(config).some(key => !['token', 'model', 'port'].includes(key)) ||
    typeof config.token !== 'string' || !/^[A-Za-z0-9_-]{43,256}$/.test(config.token) ||
    new Set(config.token).size < 10 || typeof config.model !== 'string' || config.model.length > 128 ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]*(?::[A-Za-z0-9._-]+)?$/.test(config.model) ||
    !Number.isInteger(config.port ?? 11435) || (config.port ?? 11435) < 1 || (config.port ?? 11435) > 65535) {
    throw new Error('gateway_configuration_invalid');
  }
  return Object.freeze({ token: config.token, model: config.model, port: config.port ?? 11435 });
}

function authenticated(request, expected) {
  let count = 0;
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index].toLowerCase() === 'authorization') count += 1;
  }
  const match = typeof request.headers.authorization === 'string' &&
    request.headers.authorization.match(/^Bearer ([A-Za-z0-9_-]+)$/i);
  if (count !== 1 || !match) return false;
  const actual = Buffer.from(match[1]);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function send(response, status, body) {
  if (response.destroyed || response.writableEnded) return;
  const bytes = Buffer.from(JSON.stringify(body));
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    Connection: 'close' });
  response.end(bytes);
}

async function requestJson(request) {
  if ((request.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new GatewayError(415, 'json_required');
  }
  const declared = request.headers['content-length'];
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > REQUEST_LIMIT)) {
    throw new GatewayError(413, 'request_too_large');
  }
  const data = await new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    const cleanup = () => {
      clearTimeout(timer);
      request.removeListener('data', chunk);
      request.removeListener('end', end);
      request.removeListener('error', failed);
      request.removeListener('aborted', failed);
    };
    const fail = error => { cleanup(); reject(error); };
    const failed = () => fail(new GatewayError(400, 'invalid_request'));
    const chunk = value => {
      bytes += value.length;
      if (bytes > REQUEST_LIMIT) return fail(new GatewayError(413, 'request_too_large'));
      chunks.push(value);
    };
    const end = () => { cleanup(); resolve(Buffer.concat(chunks)); };
    const timer = setTimeout(() => fail(new GatewayError(408, 'request_timeout')), 15000);
    timer.unref();
    request.on('data', chunk);
    request.once('end', end);
    request.once('error', failed);
    request.once('aborted', failed);
  });
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)); }
  catch { throw new GatewayError(400, 'invalid_json'); }
}

function chatBody(body, model) {
  const plain = value => value && Object.getPrototypeOf(value) === Object.prototype;
  if (!plain(body) || Object.keys(body).some(key => !['model', 'messages', 'stream'].includes(key)) ||
    ('model' in body && body.model !== model) || ('stream' in body && body.stream !== false) ||
    !Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 16) {
    throw new GatewayError(400, 'invalid_chat_request');
  }
  let characters = 0;
  const messages = body.messages.map(message => {
    if (!plain(message) || Object.keys(message).some(key => !['role', 'content'].includes(key)) ||
      !['system', 'user'].includes(message.role) || typeof message.content !== 'string' ||
      !message.content.trim() || message.content.length > 16000) {
      throw new GatewayError(400, 'invalid_chat_request');
    }
    characters += message.content.length;
    return { role: message.role, content: message.content };
  });
  if (characters > 20000 || !messages.some(message => message.role === 'user')) {
    throw new GatewayError(400, 'invalid_chat_request');
  }
  return { model, messages, stream: false, think: false,
    options: { num_predict: 512, num_ctx: 4096, temperature: 0.2 } };
}

async function upstreamJson(response, signal) {
  const reader = response.body?.getReader();
  if (!reader) throw new GatewayError(502, 'invalid_upstream_response');
  const chunks = [];
  let bytes = 0;
  let abort;
  const aborted = new Promise((_, reject) => {
    abort = () => reject(new GatewayError(504, 'upstream_timeout'));
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
  try {
    for (;;) {
      const result = await Promise.race([reader.read(), aborted]);
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > RESPONSE_LIMIT) throw new GatewayError(502, 'upstream_response_too_large');
      chunks.push(result.value);
    }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { throw new GatewayError(502, 'invalid_upstream_response'); }
  } finally {
    signal.removeEventListener('abort', abort);
    void reader.cancel().catch(() => {});
  }
}

export function createGateway(configuration, { fetchImpl = globalThis.fetch, timeoutMs = TIMEOUT_MS, healthTimeoutMs = 2500 } = {}) {
  const config = validateConfig(configuration);
  const token = Buffer.from(config.token);
  let busy = false;
  const server = createServer({ maxHeaderSize: 8192 }, async (request, response) => {
    request.on('error', () => {});
    try {
      if (!authenticated(request, token)) throw new GatewayError(401, 'unauthorized');
      if (Number(request.headers['content-length'] || 0) > REQUEST_LIMIT) throw new GatewayError(413, 'request_too_large');
      if (request.url === '/health') {
        if (request.method !== 'GET') throw new GatewayError(405, 'method_not_allowed');
        if (Number(request.headers['content-length'] || 0) > 0 || request.headers['transfer-encoding']) {
          throw new GatewayError(400, 'health_body_not_allowed');
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), healthTimeoutMs);
        try {
          const upstream = await fetchImpl(HEALTH_UPSTREAM, { method: 'GET', redirect: 'error',
            headers: { Accept: 'application/json' }, signal: controller.signal });
          if (!upstream.ok) {
            void upstream.body?.cancel().catch(() => {});
            throw new Error('health_unavailable');
          }
          const result = await upstreamJson(upstream, controller.signal);
          if (!Array.isArray(result?.models) || !result.models.some(model =>
            model?.name === config.model || model?.model === config.model)) throw new Error('model_unavailable');
          return send(response, 200, { ok: true, ready: true, model: config.model });
        } catch {
          return send(response, 503, { ok: false, ready: false, model: config.model });
        } finally { clearTimeout(timeout); }
      }
      if (request.url !== '/api/chat') throw new GatewayError(404, 'not_found');
      if (request.method !== 'POST') throw new GatewayError(405, 'method_not_allowed');
      if (busy) throw new GatewayError(429, 'gateway_busy');
      busy = true;
      try {
        const body = chatBody(await requestJson(request), config.model);
        const controller = new AbortController();
        let timedOut = false;
        const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
        const disconnected = () => { if (!response.writableEnded) controller.abort(); };
        response.once('close', disconnected);
        try {
          const upstream = await fetchImpl(UPSTREAM, { method: 'POST', redirect: 'error',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(body), signal: controller.signal });
          if (!upstream.ok) {
            void upstream.body?.cancel().catch(() => {});
            throw new GatewayError(502, 'upstream_unavailable');
          }
          const result = await upstreamJson(upstream, controller.signal);
          if (result?.done !== true || (result.model !== undefined && result.model !== config.model) ||
            result.message?.role !== 'assistant' || typeof result.message.content !== 'string' ||
            !result.message.content.trim() || result.message.content.length > OUTPUT_LIMIT ||
            result.message.tool_calls !== undefined) throw new GatewayError(502, 'invalid_upstream_response');
          send(response, 200, { model: config.model,
            message: { role: 'assistant', content: result.message.content }, done: true });
        } catch (error) {
          if (timedOut) throw new GatewayError(504, 'upstream_timeout');
          if (error instanceof GatewayError) throw error;
          throw new GatewayError(502, 'upstream_unavailable');
        } finally {
          clearTimeout(timeout);
          response.removeListener('close', disconnected);
        }
      } finally { busy = false; }
    } catch (error) {
      request.resume();
      send(response, error instanceof GatewayError ? error.status : 400,
        { error: error instanceof GatewayError ? error.code : 'invalid_request' });
    }
  });
  server.maxHeadersCount = 20;
  server.headersTimeout = 10000;
  server.requestTimeout = 15000;
  server.keepAliveTimeout = 1000;
  return server;
}

async function main(args) {
  if (args.length !== 0 && !(args.length === 2 && args[0] === '--config')) throw new Error('gateway_configuration_invalid');
  const directory = await realpath(path.join(ROOT, '.tmp/ai-runtime'));
  if (path.relative(ROOT, directory) !== path.join('.tmp', 'ai-runtime')) throw new Error('gateway_configuration_invalid');
  const filename = await realpath(path.resolve(ROOT, args[1] || '.tmp/ai-runtime/gateway.private.json'));
  const relative = path.relative(directory, filename);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) ||
    !filename.endsWith('.private.json')) throw new Error('gateway_configuration_invalid');
  const info = await stat(filename);
  if (!info.isFile() || info.size > 8192) throw new Error('gateway_configuration_invalid');
  const config = validateConfig(JSON.parse(await readFile(filename, 'utf8')));
  const server = createGateway(config);
  server.on('error', () => { console.error(JSON.stringify({ error: 'gateway_server_error' })); process.exitCode = 1; });
  server.listen(config.port, '127.0.0.1', () => {
    console.log(JSON.stringify({ status: 'listening', host: '127.0.0.1', port: config.port, model: config.model }));
  });
  const close = () => { server.close(); server.closeAllConnections?.(); };
  process.once('SIGTERM', close);
  process.once('SIGINT', close);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(() => {
    console.error(JSON.stringify({ error: 'gateway_configuration_invalid' })); process.exitCode = 1;
  });
}
