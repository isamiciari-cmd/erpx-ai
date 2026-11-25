import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Bot, FileText, Lightbulb, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useBusinessAssistantStatus } from '../../../hooks/useBusinessAssistantStatus';
import {
  askBusinessAssistantReply,
  businessAssistantErrorMessage,
  type BusinessAssistantReply,
} from '../../../services/aiGatewayService';
import BusinessAssistantStatus from './BusinessAssistantStatus';
import AssistantSuggestions from './AssistantSuggestions';
import AssistantReceiptCard from './AssistantReceiptCard';
import AssistantPurchaseCard from './AssistantPurchaseCard';
import {
  Button,
  EmptyState,
  FormField,
  PageHeader,
  Panel,
  StatusBadge,
  useWorkspaceFormat,
} from './WorkspaceUI';

type AssistantMode = 'default' | 'scenario' | 'recommendations';
export default function BusinessAssistantPage({
  area = 'Business',
  title,
  mode = 'default',
}: {
  area?: 'Finance' | 'HR' | 'Business';
  title?: string;
  mode?: AssistantMode;
}) {
  const { t } = useTranslation('workspace');
  const { isRtl, number, date, locale } = useWorkspaceFormat();
  const { user } = useAuth();
  const status = useBusinessAssistantStatus();
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState<{ question: string; reply: BusinessAssistantReply } | null>(
    null,
  );
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const requestLock = useRef(false);
  const scope = JSON.stringify([user?.id, user?.company_id, user?.branch_id, user?.role_id, area, mode]);
  const reviewScope = useRef<string>(null);
  const needsReview = reviewScope.current !== null && reviewScope.current !== scope;
  useEffect(() => {
    generation.current++;
    requestLock.current = false;
    setMessage('');
    setAnswer(null);
    setError(null);
    setBusy(false);
    return () => {
      generation.current++;
    };
  }, [scope]);
  async function ask(event: FormEvent) {
    event.preventDefault();
    const question = message.trim();
    if (requestLock.current || !question) return;
    const request = ++generation.current;
    requestLock.current = true;
    setBusy(true);
    setError(null);
    try {
      const reply = await askBusinessAssistantReply(
        area === 'Business' ? question : `[${area}] ${question}`,
      );
      if (request !== generation.current) return;
      if (reply.receiptProposal || reply.purchaseProposal) reviewScope.current = scope;
      setAnswer({ question, reply });
      void status.refresh();
    } catch (cause) {
      if (request === generation.current) setError(cause);
    } finally {
      if (request === generation.current) {
        requestLock.current = false;
        setBusy(false);
      }
    }
  }
  const heading =
    title ||
    t(
      area === 'Finance' ? 'assistant.finance' : area === 'HR' ? 'assistant.hr' : 'assistant.title',
    );
  const description = t(
    mode === 'scenario'
      ? 'intelligence.scenariosDescription'
      : mode === 'recommendations'
        ? 'intelligence.recommendationsDescription'
        : 'assistant.description',
  );
  const reply = answer?.reply;

  return (
    <section className="ws-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <PageHeader
        eyebrow={t('nav.intelligence')}
        title={heading}
        description={description}
        actions={<StatusBadge>{t('common.readOnly')}</StatusBadge>}
      />
      {mode === 'scenario' && (
        <p className="ws-inline-message ws-warning">
          <strong className="block">{t('intelligence.unavailableForecast')}</strong>
          <span className="mt-1 block text-sm">{t('intelligence.forecastHint')}</span>
        </p>
      )}
      {mode === 'recommendations' && (
        <p className="ws-inline-message">
          <strong className="block">{t('intelligence.noSaved')}</strong>
          <span className="mt-1 block text-sm">{t('intelligence.noSavedHint')}</span>
        </p>
      )}
      {area === 'HR' && <p className="ws-inline-message ws-warning">{t('assistant.hrHint')}</p>}
      <div className="ws-assistant-layout">
        <div className="min-w-0 space-y-5">
          <Panel
            title={t(mode === 'scenario' ? 'intelligence.assumptions' : 'assistant.question')}
            description={t('assistant.description')}
            actions={<Bot size={21} className="ws-muted" />}
          >
            <form className="space-y-4" onSubmit={ask}>
              <AssistantSuggestions tools={status.status?.tools} disabled={busy} onPick={setMessage} />
              {needsReview && <p role="status">{isRtl ? 'تغيّر سياق العمل. افتح مراجعة جديدة قبل التأكيد.' : 'Your workspace changed. Open a new review before confirming.'}</p>}
              <FormField
                label={t(mode === 'scenario' ? 'intelligence.assumptions' : 'assistant.question')}
                htmlFor="assistant-message"
                hint={mode === 'scenario' ? t('intelligence.estimatedHint') : undefined}
              >
                <textarea
                  id="assistant-message"
                  className="ws-input min-h-36 resize-y"
                  rows={5}
                  maxLength={3800}
                  required
                  disabled={busy}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t('assistant.placeholder')}
                />
              </FormField>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="ws-muted text-xs" dir="ltr">
                  {number(message.length)} / {number(3800)}
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  loading={busy}
                  disabled={!message.trim()}
                  icon={error ? <RefreshCw size={16} /> : <Send size={16} />}
                >
                  {t(error ? 'assistant.retry' : 'assistant.ask')}
                </Button>
              </div>
              {busy && (
                <p role="status" className="ws-inline-message text-sm">
                  {t('assistant.sending')} {t('assistant.generating')}
                </p>
              )}
              {error != null && (
                <div role="alert" className="ws-inline-message ws-warning">
                  <p>{businessAssistantErrorMessage(error, locale)}</p>
                  <p className="mt-2 text-sm">{t('assistant.questionRetained')}</p>
                </div>
              )}
            </form>
            {!message && !busy && (
              <div className="mt-6">
                <h3 className="ws-muted text-xs font-semibold">{t('assistant.examples')}</h3>
                <div className="ws-assistant-suggestions">
                  {[
                    'assistant.exampleTotals',
                    'assistant.exampleOverdue',
                    'assistant.exampleScope',
                  ].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setMessage(t(key));
                        setError(null);
                        document.getElementById('assistant-message')?.focus();
                      }}
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Panel>
          <Panel
            title={t(mode === 'default' ? 'assistant.answer' : 'intelligence.results')}
            actions={
              reply ? (
                <StatusBadge>{t(reply.provider === 'openai' ? 'assistant.verifiedRead' : 'assistant.generated', { model: reply.model })}</StatusBadge>
              ) : undefined
            }
          >
            {!answer ? (
              <EmptyState
                title={t('assistant.emptyTitle')}
                description={t(
                  mode === 'scenario' ? 'intelligence.noPredictions' : 'assistant.emptyHint',
                )}
                icon={<Lightbulb size={26} />}
              />
            ) : (
              <article className="ws-assistant-reply" aria-live="polite">
                <div className="mb-4 rounded-lg bg-[var(--app-surface-2)] p-3">
                  <p className="ws-muted mb-1 text-xs">{t('assistant.question')}</p>
                  <p className="break-words text-sm" dir="auto">
                    {answer.question}
                  </p>
                </div>
                <div className="ws-assistant-reply-meta">
                  <span>{t(answer.reply.preview ? 'assistant.previewSource' : answer.reply.provider === 'openai' ? 'assistant.verifiedRead' : 'assistant.generated', { model: answer.reply.model })}</span>
                  <time dateTime={answer.reply.generatedAt}>
                    {date(answer.reply.generatedAt, { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
                <div className="whitespace-pre-wrap ws-assistant-reply-text" dir="auto">
                  {answer.reply.message}
                  {answer.reply.recordPath && <Link className="ws-btn mt-2" to={answer.reply.recordPath}>{t('assistant.openResult', { ns: 'workspace' })}</Link>}
                  {!needsReview && answer.reply.receiptProposal && <AssistantReceiptCard initial={answer.reply.receiptProposal} />}
                  {!needsReview && answer.reply.purchaseProposal && <AssistantPurchaseCard key={answer.reply.purchaseProposal.operationId} proposal={answer.reply.purchaseProposal} />}
                </div>
                <div className="mt-5 border-t border-[var(--app-border)] pt-4 text-xs ws-muted">
                  <p>
                    {answer.reply.provider === 'openai' ? answer.reply.dataScope : t('assistant.scopeHint', { limit: number(answer.reply.limits.invoiceLimit) })}
                  </p>
                  <p className="mt-2">{t('assistant.readOnly')}</p>
                </div>
              </article>
            )}
          </Panel>
        </div>
        <aside className="min-w-0 space-y-5" aria-label={t('assistant.sources')}>
          <Panel title={t('assistant.providerStatus')}>
            <BusinessAssistantStatus {...status} compact />
            <p className="ws-muted mt-4 text-xs">
              {t(
                status.status?.provider === 'ollama'
                  ? 'assistant.localHint'
                  : 'assistant.hostedHint',
              )}
            </p>
          </Panel>
          <Panel
            title={t('assistant.sources')}
            actions={<ShieldCheck size={19} className="ws-muted" />}
          >
            <h3 className="text-sm font-semibold">
              {t(mode === 'scenario' ? 'intelligence.actual' : 'assistant.scope')}
            </h3>
            <p className="ws-muted mt-2 text-sm">{t('intelligence.actualHint')}</p>
            {status.status && (
              <p className="ws-muted mt-3 text-xs">
                {status.status.provider === 'openai' ? t('assistant.scopedReads') : t('assistant.scopeHint', { limit: number(status.status.limits.invoiceLimit) })}
              </p>
            )}
            {mode === 'scenario' && (
              <div className="mt-4 border-t border-[var(--app-border)] pt-4">
                <h3 className="text-sm font-semibold">{t('intelligence.estimated')}</h3>
                <p className="ws-muted mt-2 text-sm">{t('intelligence.estimatedHint')}</p>
              </div>
            )}
            <div className="mt-4 border-t border-[var(--app-border)] pt-4">
              <h3 className="text-sm font-semibold">{t('intelligence.review')}</h3>
              <p className="ws-muted mt-2 text-sm">{t('intelligence.reviewHint')}</p>
            </div>
          </Panel>
          {reply && (
            <Panel
              title={t('assistant.generatedAt')}
              actions={<FileText size={18} className="ws-muted" />}
            >
              <p className="text-sm">
                {date(reply.generatedAt, { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="ws-muted mt-3 text-xs">{t('assistant.noFiles')}</p>
            </Panel>
          )}
        </aside>
      </div>
    </section>
  );
}
