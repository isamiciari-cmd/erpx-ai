import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.106.1';
import { authenticate, corsHeaders, HttpError, integrationError, json, readBody } from '../_shared/auth.ts';
import { assertAssignableRole, parseUserMutation, protectedRoles } from './rules.ts';

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ ok: false, error: 'POST required' }, 405);
  try {
    const { db, user, profile } = await authenticate(request, ['owner', 'developer', 'super_admin', 'admin']);
    const body = await readBody(request);
    let input: ReturnType<typeof parseUserMutation>;
    try { input = parseUserMutation(body, user.id); }
    catch (error) { throw new HttpError(400, (error as Error).message); }

    // Recheck the caller's canonical role scope before creating a privileged client.
    const { data: actor, error: actorError } = await db.from('users').select('id,company_id,role_id,status').eq('id', user.id).single();
    if (actorError || !actor || actor.status !== 'active' || actor.company_id !== profile.company_id) throw new HttpError(403, 'Company membership is unavailable.');
    const { data: actorRole, error: actorRoleError } = await db.from('roles').select('*').eq('id', actor.role_id).single();
    if (actorRoleError || !actorRole || !['owner', 'developer', 'super_admin', 'admin'].includes(actorRole.name)
      || (actorRole.company_id != null && actorRole.company_id !== actor.company_id)
      || (actorRole.status != null && actorRole.status !== 'active')) throw new HttpError(403, 'Active administrator access is required.');

    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const url = Deno.env.get('SUPABASE_URL');
    if (!key || !url) throw new HttpError(503, 'User administration is not configured on the server.');
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: company, error: companyError } = await admin.from('companies').select('id,status').eq('id', actor.company_id).single();
    if (companyError || company?.status !== 'active') throw new HttpError(403, 'Your company is not active.');
    const { data: role, error: roleError } = await admin.from('roles').select('*').eq('id', input.roleId).single();
    if (roleError || !role) throw new HttpError(400, 'The selected role is unavailable.');
    try { assertAssignableRole(role, actor.company_id); }
    catch (error) { throw new HttpError(403, (error as Error).message); }
    if (role.name === 'cashier' && !input.branchId) throw new HttpError(400, 'Cashier accounts require a branch.');
    if (input.branchId) {
      const { data: branch, error } = await admin.from('branches').select('id,company_id,status').eq('id', input.branchId).single();
      if (error || !branch || branch.company_id !== actor.company_id || branch.status !== 'active') throw new HttpError(403, 'Select an active branch in your company.');
    }
    const fields = {
      first_name: input.firstName, last_name: input.lastName, role_id: input.roleId,
      branch_id: input.branchId, status: input.status,
    };
    if (input.action === 'invite') {
      const site = Deno.env.get('APP_SITE_URL');
      if (!site) throw new HttpError(503, 'Set APP_SITE_URL and the Supabase redirect allowlist before inviting users.');
      let siteUrl: URL;
      try { siteUrl = new URL(site); } catch { throw new HttpError(503, 'APP_SITE_URL is invalid.'); }
      if (siteUrl.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(siteUrl.hostname)) throw new HttpError(503, 'APP_SITE_URL requires HTTPS.');
      const { data: existing, error: existingError } = await admin.from('users').select('id').ilike('email', input.email).limit(1);
      if (existingError) throw new HttpError(503, 'Existing company accounts could not be checked.');
      if (existing?.length) throw new HttpError(409, 'This email already has a company account. Edit the existing account instead.');
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
        data: { first_name: input.firstName, last_name: input.lastName },
        redirectTo: new URL('/reset-password', siteUrl.origin).href,
      });
      if (inviteError || !invited.user) throw new HttpError(409, 'Invitation could not be created. The email may already belong to an account; check the authentication service.');
      const { error: insertError } = await admin.from('users').insert({
        ...fields, id: invited.user.id, email: input.email, company_id: actor.company_id,
      });
      if (insertError) {
        // Invitation APIs may return an existing pending identity. Never delete an
        // auth account on this ambiguous failure. No ERP profile means no ERP access.
        console.error('Invited identity requires company-profile review', invited.user.id);
        throw new HttpError(500, 'The invitation was created, but the company profile could not be saved. ERP access remains blocked. An administrator must review the account before retrying.');
      }
      const auditWarning = await audit(admin, actor.company_id, actor.id, invited.user.id, 'user_invited', null, fields);
      return json({ ok: true, user_id: invited.user.id, message: 'Invitation sent. The user must open the email and set a password.', audit_warning: auditWarning });
    }

    const { data: target, error: targetError } = await admin.from('users').select('id,company_id,role_id,status').eq('id', input.targetId).eq('company_id', actor.company_id).single();
    if (targetError || !target) throw new HttpError(404, 'User not found in your company.');
    const { data: targetRole, error: targetRoleError } = await admin.from('roles').select('name').eq('id', target.role_id).single();
    if (targetRoleError || !targetRole || protectedRoles.includes(targetRole.name.toLowerCase())) throw new HttpError(403, 'Platform accounts cannot be changed here.');
    const { data: updated, error: updateError } = await admin.from('users').update(fields).eq('id', target.id).eq('company_id', actor.company_id).select('id').single();
    if (updateError || !updated) throw new HttpError(409, 'The user could not be updated. Refresh the list and retry.');
    const auditWarning = await audit(admin, actor.company_id, actor.id, updated.id, 'user_updated', target, fields);
    return json({ ok: true, user_id: updated.id, audit_warning: auditWarning });
  } catch (error) { return integrationError(error); }
});

async function audit(admin: SupabaseClient<any, 'public'>, companyId: string, actorId: string, targetId: string, action: string, before: unknown, after: unknown) {
  const { error } = await admin.from('audit_logs').insert({
    company_id: companyId, user_id: actorId, action, entity_type: 'users',
    entity_id: targetId, old_values: before, new_values: after,
  });
  if (error) {
    console.error('User administration audit requires review', targetId);
    return 'تم حفظ الحساب، لكن تعذر تسجيل حدث التدقيق. راجع سجلات الخادم قبل أي إجراء آخر.';
  }
  return undefined;
}
