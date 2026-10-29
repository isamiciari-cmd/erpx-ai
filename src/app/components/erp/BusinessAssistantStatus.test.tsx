import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BusinessAssistantError,
  type BusinessAssistantStatus as Status,
} from '../../../services/aiGatewayService';
import BusinessAssistantStatus from './BusinessAssistantStatus';

const locale = vi.hoisted(() => ({ language: 'en' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: locale.language } }),
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
  it('identifies the free local model while distinguishing gateway health from generation', () => {
    const html = render();
    expect(html).toContain('Free local model');
    expect(html).toContain('qwen2.5:3b');
    expect(html).toContain('Local service connected');
    expect(html).toContain('model generation is confirmed only by a successful answer');
  });
  it('does not claim a model is connected from configuration alone', () => {
    const html = render({
      status: { ...status, healthChecked: false, healthScope: 'configuration' },
    });
    expect(html).toContain('Connection unverified');
    expect(html).not.toContain('Local service connected');
  });
  it('shows offline state without retaining the connected indicator', () => {
    const html = render({ status: { ...status, available: false } });
    expect(html).toContain('Model offline');
    expect(html).not.toContain('Local service connected');
  });
  it('does not claim a connection before a status check finishes', () => {
    const html = render({ status: null, loading: true });
    expect(html).toContain('Checking connection');
    expect(html).not.toContain('Local service connected');
  });
  it('localizes the actual model state and safe error in Arabic', () => {
    locale.language = 'ar';
    const html = render({
      status: { ...status, available: false },
      error: new BusinessAssistantError('provider_unavailable'),
    });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('نموذج محلي مجاني');
    expect(html).toContain('النموذج غير متصل');
    expect(html).toContain('أبقِ جهاز النموذج المحلي');
  });
});
