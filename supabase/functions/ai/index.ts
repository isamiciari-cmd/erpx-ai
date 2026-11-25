import { authenticate, HttpError } from '../_shared/auth.ts';
import { createAIHandler } from './handler.ts';
import type { AIDatabase } from './snapshot.ts';
import type { ReadDatabase } from './tools.ts';

Deno.serve(createAIHandler({
  authenticate: async (request, roles) => {
    const context = await authenticate(request, roles);
    const { company_id, branch_id } = context.profile;
    let branchName: string | undefined;
    if (branch_id) {
      const { data, error } = await context.db.from('branches').select('name,status')
        .eq('id', branch_id).eq('company_id', company_id).single();
      if (error || data?.status !== 'active') throw new HttpError(403, 'An active branch is required.');
      branchName = data.name;
    } else if (context.role === 'cashier') {
      throw new HttpError(403, 'An active branch is required.');
    }
    return { db: context.db as unknown as AIDatabase, profile: { company_id },
      context: { db: context.db as unknown as ReadDatabase, company: company_id, branch: branch_id, branchName, user: context.user.id, role: context.role } };
  },
  env: name => Deno.env.get(name),
}));
