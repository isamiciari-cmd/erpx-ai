import { authenticate, HttpError } from '../../supabase/functions/_shared/auth.ts';
import { createAIHandler } from '../../supabase/functions/ai/handler.ts';
import type { AIDatabase } from '../../supabase/functions/ai/snapshot.ts';
import type { ReadDatabase } from '../../supabase/functions/ai/tools.ts';
import { createPreviewFetch } from './preview-provider.ts';

const company = Deno.env.get('AI_PREVIEW_COMPANY');
const marker = Deno.env.get('AI_PREVIEW_MARKER');
const port = Number(Deno.env.get('AI_PREVIEW_PORT'));
const token = Deno.env.get('AI_PREVIEW_SESSION');
if (Deno.env.get('AI_LOCAL_PREVIEW') !== 'true' || !company || !marker || !token ||
    !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Explicit local QA preview configuration is required.');

Deno.serve({ hostname: '127.0.0.1', port }, createAIHandler({
  authenticate: async (request, roles) => {
    if (request.headers.get('authorization') !== 'Bearer ' + token) throw new HttpError(403, 'QA session required.');
    const { db, user, profile, role } = await authenticate(request, roles);
    if (profile.company_id !== company || !profile.branch_id || !user.email?.endsWith('@example.test') ||
        user.app_metadata.erpx_release_acceptance?.marker !== marker) throw new HttpError(403, 'QA scope required.');
    const branch = await db.from('branches').select('name,status').eq('company_id', company).eq('id', profile.branch_id).single();
    if (branch.error || branch.data.status !== 'active') throw new HttpError(403, 'An active QA branch is required.');
    return { db: db as unknown as AIDatabase, profile: { company_id: company }, context: {
      db: db as unknown as ReadDatabase, company, branch: profile.branch_id, branchName: branch.data.name, user: user.id, role,
    } };
  },
  env: () => undefined,
  preview: { fetch: createPreviewFetch(), timeoutMs: 250 },
}));
