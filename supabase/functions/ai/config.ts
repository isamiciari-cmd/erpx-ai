export type AIErrorCode = 'configuration_required' | 'provider_unavailable' | 'rate_limited' | 'auth_error' | 'invalid_request' | 'data_unavailable';
export class AIError extends Error {
  constructor(public status: number, public code: AIErrorCode, message: string) { super(message); }
}
export const AI_LIMITS = Object.freeze({ invoiceLimit: 1000, messageCharacters: 4000, responseTokens: 512, currencyGroups: 16 });
export const PROVIDER_REQUEST_BYTES = 16384;
export const PROVIDER_RESPONSE_BYTES = 131072;
export const PROVIDER_TIMEOUT_MS = 90000;
export const HEALTH_TIMEOUT_MS = 3000;
export type EnvReader = (name: string) => string | undefined;
export type ProviderConfig =
  | { provider: 'unconfigured'; configured: false; model: null; deploymentMode: 'unconfigured' }
  | { provider: 'ollama'; configured: true; model: string; deploymentMode: 'local_gateway'; origin: string; key: string }
  | { provider: 'openai'; configured: true; model: string; deploymentMode: 'hosted_api'; key: string };
export type ConfiguredProvider = Exclude<ProviderConfig, { configured: false }>;
export function gatewayOrigin(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new AIError(503, 'configuration_required', 'The AI gateway is not configured correctly.'); }
  const hostname = url.hostname.toLowerCase();
  if (value !== value.trim() || value.includes('?') || value.includes('#') || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.port && url.port !== '443')
    || !hostname.includes('.') || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')
    || /^[\d.]+$/.test(hostname) || hostname.includes(':')) throw new AIError(503, 'configuration_required', 'The AI gateway is not configured correctly.');
  return url.origin;
}
export function resolveProvider(env: EnvReader): ProviderConfig {
  const unavailable: ProviderConfig = { provider: 'unconfigured', configured: false, model: null, deploymentMode: 'unconfigured' };
  const selected = env('AI_PROVIDER') || 'ollama';
  if (selected !== 'ollama' && selected !== 'openai') return unavailable;
  const model = env(selected === 'ollama' ? 'OLLAMA_MODEL' : 'OPENAI_MODEL') || '';
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(model)) return unavailable;
  if (selected === 'ollama') {
    const key = env('OLLAMA_API_KEY') || '';
    if (!/^[A-Za-z0-9_-]{43,256}$/.test(key) || new Set(key).size < 10) return unavailable;
    let origin: string;
    try { origin = gatewayOrigin(env('OLLAMA_BASE_URL') || ''); } catch { return unavailable; }
    return { provider: 'ollama', configured: true, model, deploymentMode: 'local_gateway', origin, key };
  }
  // Paid providers are opt-in twice. Missing Ollama never selects OpenAI.
  if (env('AI_ALLOW_PAID_PROVIDER') !== 'true') return unavailable;
  const key = env('OPENAI_API_KEY') || '';
  if (key.length < 20 || key.length > 4096 || /\s/.test(key)) return unavailable;
  return { provider: 'openai', configured: true, model, deploymentMode: 'hosted_api', key };
}
