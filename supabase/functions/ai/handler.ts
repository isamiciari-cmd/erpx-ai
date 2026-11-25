import { corsHeaders, HttpError, json, readBody } from '../_shared/auth.ts';
import { AIError, AI_LIMITS, EnvReader, resolveProvider } from './config.ts';
import { gatewayHealth, generateAnswer, selectReadTool } from './provider.ts';
import { AIDatabase, DATA_SCOPE, loadInvoiceSnapshot } from './snapshot.ts';
import { allowedTools, runTool, type ToolContext } from './tools.ts';
export const ALLOWED_ROLES = ['owner', 'super_admin', 'admin', 'manager', 'accountant', 'developer', 'cashier'];
export type AIDependencies = {
  authenticate: (request: Request, roles: string[]) => Promise<{ db: AIDatabase; profile: { company_id: string }; context?: ToolContext }>;
  env: EnvReader; fetch?: typeof fetch; now?: () => Date;
  /** Injected only by the loopback QA runner. The deployed entry point never supplies it. */
  preview?: { fetch: typeof fetch; timeoutMs: number };
};
export function createAIHandler(dependencies: AIDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (request.method !== 'POST') return json({ ok: false, code: 'invalid_request', error: 'POST required.' }, 405);
    try {
      const { db, profile, context } = await dependencies.authenticate(request, ALLOWED_ROLES);
      const body = await readBody(request);
      const status = body.action === 'status';
      const allowedFields = status ? ['action'] : ['message', 'action'];
      if (Object.keys(body).some(key => !allowedFields.includes(key)) || (!status && body.action !== undefined && body.action !== 'chat')) throw new AIError(400, 'invalid_request', 'The AI request contains unsupported fields.');
      const preview = dependencies.preview;
      const config = preview
        ? { provider: 'openai', configured: true, model: 'qa-preview', deploymentMode: 'hosted_api', key: 'LOCAL_PREVIEW_ONLY' } as const
        : resolveProvider(dependencies.env);
      if (context?.role === 'cashier' && config.provider === 'ollama') throw new AIError(403, 'auth_error', 'This role requires the scoped assistant.');
      if (status) {
        const health = config.configured ? await gatewayHealth(config, { fetch: dependencies.fetch }) : { available: false, healthChecked: false, healthScope: 'none', inferenceVerified: false };
        return json({ ok: true, provider: config.provider, model: config.model, configured: config.configured, deploymentMode: config.deploymentMode,
          ...health, readOnly: true, mode: 'generative', dataScope: config.provider === 'openai' && context
            ? 'Scoped reads using the current company, assigned branch and authenticated role.' : DATA_SCOPE,
          tools: config.provider === 'openai' && context ? allowedTools(context.role) : [], preview: !!preview, limits: AI_LIMITS });
      }
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message || message.length > AI_LIMITS.messageCharacters) throw new AIError(400, 'invalid_request', 'Enter a message between 1 and 4000 characters.');
      if (!config.configured) throw new AIError(503, 'configuration_required', 'The AI service is not configured. Contact your administrator.');
      if (config.provider === 'openai' && !context) throw new AIError(503, 'configuration_required', 'Scoped read tools are unavailable.');
      if (!preview) {
        const { error } = await db.rpc('consume_integration_quota', { p_kind: 'ai' });
        if (error) throw new AIError(429, 'rate_limited', 'Request limit reached or AI access is unavailable. Retry later.');
      }
      if (config.provider === 'openai' && context) {
        const now = dependencies.now?.() ?? new Date();
        const chosen = await selectReadTool(config, context.role, message, { fetch: preview?.fetch ?? dependencies.fetch, timeoutMs: preview?.timeoutMs });
        const result = await runTool(context, chosen.name, chosen.args, message, now, /\p{Script=Arabic}/u.test(message));
        return json({ ok: true, message: result.message, recordPath: result.path, provider: config.provider, model: config.model,
          deploymentMode: config.deploymentMode, mode: 'generative', readOnly: true, dataScope: result.scope,
          preview: !!preview, generatedAt: now.toISOString(), limits: AI_LIMITS });
      }
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
