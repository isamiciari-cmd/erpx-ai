import { useTranslation } from 'react-i18next';
import { RefreshCw, Server } from 'lucide-react';
import {
  businessAssistantErrorMessage,
  type BusinessAssistantStatus as AssistantStatus,
} from '../../../services/aiGatewayService';
import { Button, StatusBadge } from './WorkspaceUI';

interface Props {
  status: AssistantStatus | null;
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  compact?: boolean;
}
export default function BusinessAssistantStatus({
  status,
  loading,
  error,
  refresh,
  compact = false,
}: Props) {
  const { t, i18n } = useTranslation('workspace');
  const isRtl = (i18n.resolvedLanguage || i18n.language).startsWith('ar');
  const connected =
    status?.available === true && status.healthChecked && status.healthScope === 'gateway';
  const provider =
    status?.provider === 'ollama'
      ? 'assistant.local'
      : status?.provider === 'openai'
        ? 'assistant.paid'
        : 'assistant.title';
  const connection = loading
    ? 'assistant.checking'
    : connected
      ? status?.provider === 'ollama'
        ? 'assistant.connectedLocal'
        : 'assistant.connectedHosted'
      : status?.available
        ? 'assistant.unverified'
        : status
          ? 'assistant.offline'
          : 'assistant.unavailable';
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={
        compact
          ? 'min-w-0 space-y-3'
          : 'rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4'
      }
      aria-live="polite"
      aria-busy={loading}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Server size={16} aria-hidden="true" />
            {t(provider)}
          </p>
          <div className="mt-3">
            {status?.preview && !compact && <StatusBadge tone="warning">{t('assistant.previewBadge')}</StatusBadge>}
            <StatusBadge
              tone={
                connected && !loading
                  ? 'success'
                  : status && !status.available && !loading
                    ? 'warning'
                    : 'neutral'
              }
            >
              {t(connection)}
            </StatusBadge>
          </div>
          {status?.model && (
            <p dir="ltr" className="mt-2 break-all font-mono text-xs ws-muted" title={status.model}>
              {status.model}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          disabled={loading}
          aria-label={t('assistant.refresh')}
          title={t('assistant.refresh')}
          onClick={() => void refresh()}
          icon={<RefreshCw size={16} className={loading ? 'ws-spin' : ''} />}
        />
      </div>
      {error != null && (
        <p role="alert" className="ws-inline-message ws-warning mt-3 text-sm">
          {businessAssistantErrorMessage(error, isRtl ? 'ar' : 'en')}
        </p>
      )}
      {!compact && (
        <p className="ws-muted mt-3 text-sm">
          {t(status?.provider === 'ollama' ? 'assistant.localHint' : 'assistant.hostedHint')}
        </p>
      )}
    </div>
  );
}
