import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import {
  businessAssistantErrorMessage,
  type BusinessAssistantStatus as AssistantStatus,
} from '../../../services/aiGatewayService';

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
  const { i18n } = useTranslation();
  const ar = (i18n.resolvedLanguage || i18n.language).startsWith('ar');
  const provider =
    status?.provider === 'ollama'
      ? ar
        ? 'نموذج محلي مجاني'
        : 'Free local model'
      : status?.provider === 'openai'
        ? ar
          ? 'خدمة نموذج مدفوعة'
          : 'Paid model service'
        : ar
          ? 'المساعد الذكي'
          : 'AI assistant';
  const connected =
    status?.available === true && status.healthChecked && status.healthScope === 'gateway';
  const connection = loading
    ? ar
      ? 'جارٍ التحقق من الاتصال…'
      : 'Checking connection…'
    : connected
      ? ar
        ? 'الخدمة المحلية متصلة'
        : 'Local service connected'
      : status?.available
        ? ar
          ? 'الاتصال غير مؤكّد'
          : 'Connection unverified'
        : status
          ? ar
            ? 'النموذج غير متصل'
            : 'Model offline'
          : ar
            ? 'تعذر التحقق من الاتصال'
            : 'Connection unavailable';
  return (
    <div
      dir={ar ? 'rtl' : 'ltr'}
      className={
        compact
          ? 'min-w-0 text-xs'
          : 'rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4'
      }
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{provider}</p>
          <p className="mt-1 flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${connected && !loading ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            {connection}
          </p>
          {status?.model && (
            <p
              dir="ltr"
              className="mt-1 truncate font-mono text-xs opacity-75"
              title={status.model}
            >
              {status.model}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void refresh()}
          aria-label={ar ? 'تحديث حالة النموذج' : 'Refresh model status'}
          title={ar ? 'تحديث حالة النموذج' : 'Refresh model status'}
          className="rounded-lg border border-current/20 p-2 disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {error != null && (
        <p role="alert" className="mt-2 text-xs text-amber-600 dark:text-amber-300">
          {businessAssistantErrorMessage(error, ar ? 'ar' : 'en')}
        </p>
      )}
      {!compact && (
        <p className="mt-3 text-sm opacity-75">
          {status?.provider === 'ollama'
            ? ar
              ? 'أبقِ جهاز النموذج المحلي مشغّلاً ومتصلاً. يفحص هذا المؤشر اتصال الخدمة فقط؛ لا يتأكد تشغيل النموذج إلا بعد وصول إجابة ناجحة.'
              : 'Keep the local model device powered on and connected. This check confirms the service connection; model generation is confirmed only by a successful answer.'
            : ar
              ? 'تظهر الإجابة فقط بعد اتصال المساعد بالنموذج الفعلي.'
              : 'An answer is shown only after the assistant connects to the actual model.'}
        </p>
      )}
    </div>
  );
}
