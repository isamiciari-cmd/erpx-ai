import { corsHeaders, HttpError, json, readBody } from '../_shared/auth.ts';
import { AIError, AI_LIMITS, EnvReader, resolveProvider } from './config.ts';
import { gatewayHealth, generateAnswer } from './provider.ts';
import { AIDatabase, DATA_SCOPE, loadInvoiceSnapshot } from './snapshot.ts';
export const ALLOWED_ROLES = ['owner', 'super_admin', 'admin', 'manager', 'accountant', 'developer'];
export type AIDependencies = {
  authenticate: (request: Request, roles: string[]) => Promise<{ db: AIDatabase; profile: { company_id: string } }>;
  env: EnvReader; fetch?: typeof fetch; now?: () => Date;
};
export function createAIHandler(dependencies: AIDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'POST') return json({ ok: false, code: 'invalid_request', error: 'POST required.' }, 405);
    try {
      const { db, profile } = await dependencies.authenticate(request, ALLOWED_ROLES);
      const body = await readBody(request);
      const status = body.action === 'status';
      const allowedFields = status ? ['action'] : ['message', 'action'];
      if (Object.keys(body).some(key => !allowedFields.includes(key)) || (!status && body.action !== undefined && body.action !== 'chat')) throw new AIError(400, 'invalid_request', 'The AI request contains unsupported fields.');
      const config = resolveProvider(dependencies.env);
      if (status) {
        const health = config.configured ? await gatewayHealth(config, { fetch: dependencies.fetch }) : { available: false, healthChecked: false, healthScope: 'none', inferenceVerified: false };
        return json({ ok: true, provider: config.provider, model: config.model, configured: config.configured, deploymentMode: config.deploymentMode,
          ...health, readOnly: true, mode: 'generative', dataScope: DATA_SCOPE, limits: AI_LIMITS });
      }
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message || message.length > AI_LIMITS.messageCharacters) throw new AIError(400, 'invalid_request', 'Enter a message between 1 and 4000 characters.');
      if (!config.configured) throw new AIError(503, 'configuration_required', 'The AI service is not configured. Contact your administrator.');
      const { error } = await db.rpc('consume_integration_quota', { p_kind: 'ai' });
      if (error) throw new AIError(429, 'rate_limited', 'Request limit reached or AI access is unavailable. Retry later.');
      const snapshot = await loadInvoiceSnapshot(db, profile.company_id);
      const messageText = await generateAnswer(config, snapshot, message, { fetch: dependencies.fetch });
      return json({ ok: true, message: messageText, provider: config.provider, model: config.model, deploymentMode: config.deploymentMode,
        mode: 'generative', readOnly: true, dataScope: snapshot.scope, generatedAt: (dependencies.now?.() || new Date()).toISOString(), limits: AI_LIMITS });
    } catch (error) {
      if (error instanceof AIError) return json({ ok: false, code: error.code, error: error.message }, error.status);
      if (error instanceof HttpError) return json({ ok: false, code: [401, 403].includes(error.status) ? 'auth_error' : error.status === 503 ? 'configuration_required' : 'invalid_request', error: error.message }, error.status);
      return json({ ok: false, code: 'provider_unavailable', error: 'The AI service could not complete the request. Retry later.' }, 502);
    }
  };
}
