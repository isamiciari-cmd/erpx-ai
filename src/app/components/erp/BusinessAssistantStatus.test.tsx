import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BusinessAssistantError,
  type BusinessAssistantStatus as Status,
} from '../../../services/aiGatewayService';
import { workspaceResources } from '../../../i18n/workspace';
import BusinessAssistantStatus from './BusinessAssistantStatus';

const locale = vi.hoisted(() => ({ language: 'en' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: locale.language },
    t: (key: string) => {
      const resources = locale.language === 'ar' ? workspaceResources.ar : workspaceResources.en;
      return (
        key
          .split('.')
          .reduce<unknown>(
            (value, part) =>
              value && typeof value === 'object'
                ? (value as Record<string, unknown>)[part]
                : undefined,
            resources,
          ) ?? key
      );
    },
  }),
}));
const status: Status = {
  provider: 'ollama',
  model: 'qwen2.5:3b',
  available: true,
  configured: true,
  readOnly: true,
  mode: 'generative',
  deploymentMode: 'local_gateway',
  healthChecked: true,
  healthScope: 'gateway',
  inferenceVerified: false,
  dataScope: 'Company invoice summaries',
  limits: { invoiceLimit: 1000, messageCharacters: 4000, responseTokens: 512 },
};
const render = (overrides: Partial<Parameters<typeof BusinessAssistantStatus>[0]> = {}) =>
  renderToStaticMarkup(
    <BusinessAssistantStatus
      status={status}
      loading={false}
      error={null}
      refresh={async () => {}}
      {...overrides}
    />,
  );
beforeEach(() => {
  locale.language = 'en';
});

describe('Assistant connection display', () => {
  it('identifies the real returned model while distinguishing gateway health from generation', () => {
    const html = render();
    expect(html).toContain(workspaceResources.en.assistant.local);
    expect(html).toContain('qwen2.5:3b');
    expect(html).toContain(workspaceResources.en.assistant.connectedLocal);
    expect(html).toContain(workspaceResources.en.assistant.localHint);
  });
  it('does not claim a model is connected from configuration alone', () => {
    const html = render({
      status: { ...status, healthChecked: false, healthScope: 'configuration' },
    });
    expect(html).toContain(workspaceResources.en.assistant.unverified);
    expect(html).not.toContain(workspaceResources.en.assistant.connectedLocal);
  });
  it('shows offline state without retaining the connected indicator', () => {
    const html = render({ status: { ...status, available: false } });
    expect(html).toContain(workspaceResources.en.assistant.offline);
    expect(html).not.toContain(workspaceResources.en.assistant.connectedLocal);
  });
  it('does not claim a connection before a status check finishes', () => {
    const html = render({ status: null, loading: true });
    expect(html).toContain(workspaceResources.en.assistant.checking);
    expect(html).not.toContain(workspaceResources.en.assistant.connectedLocal);
  });
  it('localizes the actual model state and safe error in Arabic', () => {
    locale.language = 'ar';
    const html = render({
      status: { ...status, available: false },
      error: new BusinessAssistantError('provider_unavailable'),
    });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(workspaceResources.ar.assistant.local);
    expect(html).toContain(workspaceResources.ar.assistant.offline);
    expect(html).toContain(workspaceResources.ar.assistant.localHint);
    expect(html).toContain('النموذج غير متصل أو مشغول');
  });
  it('does not claim hosted configuration is verified connectivity or model inference', () => {
    const html = render({
      status: {
        ...status,
        provider: 'openai',
        deploymentMode: 'hosted_api',
        healthChecked: false,
        healthScope: 'configuration',
      },
    });
    expect(html).toContain(workspaceResources.en.assistant.paid);
    expect(html).toContain(workspaceResources.en.assistant.unverified);
    expect(html).not.toContain(workspaceResources.en.assistant.connectedHosted);
  });
  it('shows an unavailable neutral state when no check result exists', () => {
    const html = render({ status: null });
    expect(html).toContain(workspaceResources.en.assistant.unavailable);
    expect(html).not.toContain('ws-tone-success');
    expect(html).not.toContain('qwen2.5:3b');
  });
});
