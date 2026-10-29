import { createClient } from 'npm:@supabase/supabase-js@2.106.1';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
/** Use the caller's JWT for database reads. Never trust roles or tenant IDs in request JSON. */
export async function authenticate(request: Request, allowedRoles: string[]) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'Sign in to continue.');
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !key) throw new HttpError(503, 'Server database connection is not configured.');
  const db = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user }, error } = await db.auth.getUser(authorization.slice(7));
  if (error || !user) throw new HttpError(401, 'Session expired. Please sign in again.');
  const { data: profile, error: profileError } = await db.from('users').select('id,company_id,branch_id,status,role:roles(name,company_id)').eq('id', user.id).single();
  if (profileError || !profile || profile.status !== 'active') throw new HttpError(403, 'An active company membership is required.');
  const roleRow = Array.isArray(profile.role) ? profile.role[0] : profile.role;
  const trustedRole = roleRow as { name?: string; company_id?: string | null } | null;
  if (trustedRole?.company_id && trustedRole.company_id !== profile.company_id) throw new HttpError(403, 'Invalid company role.');
  const { data: company, error: companyError } = await db.from('companies').select('status').eq('id', profile.company_id).single();
  if (companyError || company?.status !== 'active') throw new HttpError(403, 'Company is not active.');
  const role = trustedRole?.name;
  if (!role || !allowedRoles.includes(role)) throw new HttpError(403, 'Your role cannot use this integration.');
  return { db, user, profile, role };
}
export async function readBody(request: Request, maxBytes = 16384): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'A JSON request body is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, 'Request is too large.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new HttpError(400, 'Invalid JSON request.'); }
}
export function integrationError(error: unknown) {
  if (error instanceof HttpError) return json({ ok: false, error: error.message }, error.status);
  console.error('Integration failed', error instanceof Error ? error.name : 'UnknownError');
  return json({ ok: false, error: 'The integration could not complete. Retry or contact your administrator.' }, 502);
}
