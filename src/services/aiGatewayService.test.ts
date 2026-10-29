import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), demo: false }));
vi.mock('../lib/supabase', () => ({
  get isDemoMode() {
    return mocks.demo;
  },
  supabase: { functions: { invoke: mocks.invoke } },
}));
import {
  askBusinessAssistant,
  askBusinessAssistantReply,
  getBusinessAssistantStatus,
  businessAssistantErrorMessage,
  BusinessAssistantError,
} from './aiGatewayService';
const model = {
  ok: true,
  provider: 'ollama',
  model: 'qwen2.5:3b',
  readOnly: true,
  mode: 'generative',
  dataScope: 'Issued company invoices only',
  limits: { invoiceLimit: 1000, messageCharacters: 4000, responseTokens: 512 },
};
const status = {
  ...model,
  available: true,
  configured: true,
  deploymentMode: 'local_gateway',
  healthChecked: true,
  healthScope: 'gateway',
  inferenceVerified: false,
};
const reply = {
  ...model,
  message: 'An answer from the configured model.',
  generatedAt: '2026-10-28T10:00:00Z',
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.demo = false;
});
describe('Business assistant gateway contract', () => {
  it('requests provider status without a chat message or client provider overrides', async () => {
    mocks.invoke.mockResolvedValue({ data: status, error: null });
    expect(await getBusinessAssistantStatus()).toMatchObject({
      provider: 'ollama',
      model: 'qwen2.5:3b',
      available: true,
      healthScope: 'gateway',
      inferenceVerified: false,
    });
    expect(mocks.invoke).toHaveBeenCalledWith('ai/chat', { body: { action: 'status' } });
  });
  it('retains an explicitly offline or unverified model state without claiming inference', async () => {
    mocks.invoke.mockResolvedValue({
      data: { ...status, available: false, healthChecked: false, healthScope: 'configuration' },
      error: null,
    });
    expect((await getBusinessAssistantStatus()).available).toBe(false);
    mocks.invoke.mockResolvedValue({
      data: {
        ...status,
        provider: 'unconfigured',
        model: null,
        configured: false,
        available: false,
        deploymentMode: 'unconfigured',
        healthScope: 'none',
        healthChecked: false,
      },
      error: null,
    });
    expect((await getBusinessAssistantStatus()).configured).toBe(false);
  });
  it('preserves the string-answer API and sends only the trimmed question', async () => {
    mocks.invoke.mockResolvedValue({ data: reply, error: null });
    expect(await askBusinessAssistant('  سؤال عن الشركة  ')).toBe(reply.message);
    expect(mocks.invoke).toHaveBeenCalledWith('ai/chat', { body: { message: 'سؤال عن الشركة' } });
    expect(await askBusinessAssistantReply('Question')).toMatchObject({
      provider: 'ollama',
      model: 'qwen2.5:3b',
      readOnly: true,
      mode: 'generative',
    });
  });
  it.each(['', ' '.repeat(3), 'x'.repeat(4001)])(
    'rejects an invalid question before invoking the service',
    async (question) => {
      await expect(askBusinessAssistant(question)).rejects.toMatchObject({
        code: 'invalid_request',
      });
      expect(mocks.invoke).not.toHaveBeenCalled();
    },
  );
  it.each([
    { ...status, readOnly: false },
    { ...status, mode: 'rules' },
    { ...status, provider: 'unknown' },
    { ...status, available: 'yes' },
    { ...status, limits: { ...model.limits, responseTokens: -1 } },
    { ...status, configured: false, available: true },
    { ...status, model: undefined },
  ])('rejects malformed model status %#', async (data) => {
    mocks.invoke.mockResolvedValue({ data, error: null });
    await expect(getBusinessAssistantStatus()).rejects.toMatchObject({ code: 'invalid_response' });
  });
  it.each([
    { ...reply, message: '' },
    { ...reply, generatedAt: 'invalid' },
    { ok: true, message: 'Unidentified reply' },
    { ...reply, mode: 'rules' },
  ])('rejects malformed/unidentified chat replies %#', async (data) => {
    mocks.invoke.mockResolvedValue({ data, error: null });
    await expect(askBusinessAssistant('Question')).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });
  it('never exposes upstream configuration, credentials or raw response text in errors', async () => {
    const raw = {
      ok: false,
      code: 'configuration_required',
      error: 'SECRET_KEY=private https://internal.example',
    };
    mocks.invoke.mockResolvedValue({
      data: null,
      error: { context: new Response(JSON.stringify(raw), { status: 503 }) },
    });
    let failure;
    try {
      await askBusinessAssistant('Question');
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({ code: 'configuration_required' });
    expect(String(failure)).not.toMatch(/SECRET_KEY|private|internal.example/);
    expect(businessAssistantErrorMessage(failure, 'ar')).toContain('اتصال النموذج');
  });
  it.each([
    [401, 'auth_error'],
    [403, 'forbidden'],
    [429, 'rate_limited'],
  ])('classifies HTTP %s without displaying server messages', async (status, code) => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: { context: new Response('private server failure', { status }) },
    });
    await expect(getBusinessAssistantStatus()).rejects.toMatchObject({ code });
  });
  it('handles offline responses, network rejection and demo mode without fabricated answers', async () => {
    mocks.invoke.mockResolvedValue({
      data: { ok: false, code: 'provider_unavailable', error: 'private provider details' },
      error: null,
    });
    await expect(askBusinessAssistant('Question')).rejects.toMatchObject({
      code: 'provider_unavailable',
    });
    mocks.invoke.mockRejectedValue(new Error('private transport details'));
    await expect(getBusinessAssistantStatus()).rejects.toMatchObject({ code: 'network_error' });
    mocks.demo = true;
    mocks.invoke.mockClear();
    await expect(getBusinessAssistantStatus()).rejects.toMatchObject({ code: 'demo_unavailable' });
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(businessAssistantErrorMessage(new Error('internal secret'), 'en')).not.toContain(
      'secret',
    );
    expect(
      businessAssistantErrorMessage(new BusinessAssistantError('provider_unavailable'), 'ar'),
    ).toContain('غير متصل');
  });
});
