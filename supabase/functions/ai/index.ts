import { authenticate } from '../_shared/auth.ts';
import { createAIHandler } from './handler.ts';
import type { AIDatabase } from './snapshot.ts';

Deno.serve(createAIHandler({
  authenticate: async (request, roles) => {
    const context = await authenticate(request, roles);
    return { db: context.db as unknown as AIDatabase, profile: { company_id: context.profile.company_id } };
  },
  env: name => Deno.env.get(name),
}));
