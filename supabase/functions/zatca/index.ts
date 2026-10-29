import { createClient } from 'npm:@supabase/supabase-js@2.106.1';
import { authenticate, corsHeaders, HttpError, integrationError, json, readBody } from '../_shared/auth.ts';
import { acceptedSubmission, preparedPayload } from '../_shared/zatcaPayload.ts';

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method !== 'POST') return json({ ok: false, error: 'POST required' }, 405);
  try {
    const { db, profile } = await authenticate(request, ['owner', 'super_admin', 'admin', 'accountant', 'manager']);
    const body = await readBody(request);
    if (typeof body.invoiceId !== 'string' || !/^[\da-f-]{36}$/i.test(body.invoiceId)) throw new HttpError(400, 'A valid invoice ID is required.');
    const { data: invoice, error } = await db.from('invoices').select('*').eq('id', body.invoiceId).eq('company_id', profile.company_id).single();
    if (error || !invoice) throw new HttpError(404, 'Invoice not found in your company.');
    let payload;
    try { payload = preparedPayload(invoice); } catch (error) { throw new HttpError(422, (error as Error).message); }
    // Each company has its own EGS credentials. No tenant can select another tenant's certificate.
    const configurations = JSON.parse(Deno.env.get('ZATCA_COMPANY_CREDENTIALS') || '{}');
    const config = configurations[profile.company_id];
    if (!config?.binarySecurityToken || !config?.secret || !['simulation', 'core'].includes(config.environment)) throw new HttpError(503, 'ZATCA credentials and environment are not configured for this company.');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) throw new HttpError(503, 'Submission audit storage is not configured.');
    const { error: quotaError } = await db.rpc('consume_integration_quota', { p_kind: 'zatca' });
    if (quotaError) throw new HttpError(429, 'Submission limit reached or integration access is unavailable.');
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });
    const claim = { company_id: profile.company_id, invoice_id: invoice.id, environment: config.environment, status: 'sending' };
    let { data: submission, error: insertError } = await admin.from('zatca_submissions').insert(claim).select('id').single();
    if (insertError?.code === '23505') {
      const { data: previous } = await admin.from('zatca_submissions').select('*').eq('invoice_id', invoice.id).eq('environment', config.environment).single();
      if (previous?.status === 'accepted') return json({ ok: true, status: 'accepted', response: previous.response });
      if (previous?.status !== 'rejected') throw new HttpError(409, 'A submission is pending or its outcome is uncertain. Reconcile it before resubmitting.');
      const retry = await admin.from('zatca_submissions').update({ status: 'sending', updated_at: new Date().toISOString() }).eq('id', previous.id).eq('status', 'rejected').select('id').single();
      submission = retry.data; insertError = retry.error;
    }
    if (insertError || !submission) throw new HttpError(503, 'Could not reserve a submission. No invoice was sent.');
    let result: Response;
    try {
      result = await fetch(`https://gw-fatoora.zatca.gov.sa/e-invoicing/${config.environment}/invoices/${payload.mode}/single`, {
        method: 'POST', signal: AbortSignal.timeout(45000),
        headers: { Authorization: `Basic ${btoa(`${config.binarySecurityToken}:${config.secret}`)}`, 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Version': 'V2', 'Accept-Language': 'en', 'Clearance-Status': '1' },
        body: JSON.stringify(payload.body),
      });
    } catch {
      await admin.from('zatca_submissions').update({ status: 'unknown', updated_at: new Date().toISOString() }).eq('id', submission.id);
      throw new HttpError(502, 'The submission outcome is unknown. Reconcile with ZATCA before retrying.');
    }
    const response = await result.json().catch(() => null);
    const accepted = response && acceptedSubmission(payload.mode, result.ok, response);
    const status = accepted ? 'accepted' : response && result.status < 500 ? 'rejected' : 'unknown';
    const { error: auditError } = await admin.from('zatca_submissions').update({ status, response: response ?? { httpStatus: result.status }, updated_at: new Date().toISOString() }).eq('id', submission.id);
    if (auditError) throw new HttpError(502, 'A response was received but could not be saved. Reconcile the submission before retrying.');
    if (accepted) {
      const { error: saveError } = await admin.from('invoices').update({
        [payload.mode === 'reporting' ? 'reporting_status' : 'clearance_status']: payload.mode === 'reporting' ? 'reported' : 'cleared',
        zatca_environment: config.environment, last_submitted_at: new Date().toISOString(), last_response_at: new Date().toISOString(),
      }).eq('id', invoice.id).eq('company_id', profile.company_id);
      if (saveError) return json({ ok: true, status, warning: 'Accepted; invoice status needs reconciliation.', response });
    }
    return json({ ok: Boolean(accepted), status, response, error: accepted ? undefined : 'ZATCA did not accept this invoice. Review the response before retrying.' }, accepted ? 200 : 422);
  } catch (error) { return integrationError(error); }
});
