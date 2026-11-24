import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Bot, RefreshCw, Send, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessAssistantStatus } from '../../hooks/useBusinessAssistantStatus';
import {
  askBusinessAssistantReply,
  businessAssistantErrorMessage,
  type BusinessAssistantReply,
} from '../../services/aiGatewayService';
import BusinessAssistantStatus from './erp/BusinessAssistantStatus';
import {
  Button,
  DetailDrawer,
  EmptyState,
  FormField,
  Panel,
  StatusBadge,
  useWorkspaceFormat,
} from './erp/WorkspaceUI';

type Exchange = { question: string; reply: BusinessAssistantReply };
export default function AIAssistant() {
  const { t } = useTranslation('workspace');
  const { user } = useAuth();
  const { date, number, locale } = useWorkspaceFormat();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const status = useBusinessAssistantStatus(isOpen);
  const endRef = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const requestLock = useRef(false);
  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [exchanges, busy, isOpen]);
  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener('erpx:open-ai', open);
    return () => window.removeEventListener('erpx:open-ai', open);
  }, []);
  useEffect(() => {
    generation.current++;
    requestLock.current = false;
    setExchanges([]);
    setInput('');
    setError(null);
    setBusy(false);
    setIsOpen(false);
    return () => {
      generation.current++;
    };
  }, [user?.id, user?.company_id]);
  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = input.trim();
    if (!question || requestLock.current) return;
    const request = ++generation.current;
    requestLock.current = true;
    setBusy(true);
    setError(null);
    try {
      const reply = await askBusinessAssistantReply(question);
      if (request !== generation.current) return;
      setExchanges((previous) => [...previous, { question, reply }]);
      setInput('');
      void status.refresh();
    } catch (cause) {
      if (request === generation.current) setError(cause);
    } finally {
      if (request === generation.current) {
        requestLock.current = false;
        setBusy(false);
      }
    }
  };
  if (!user) return null;
  return (
    <>
      <button
        type="button"
        className={`ws-assistant-fab ${isOpen ? 'invisible' : ''}`}
        tabIndex={isOpen ? -1 : 0}
        aria-hidden={isOpen}
        aria-label={t('shell.openAssistant')}
        title={t('assistant.title')}
        onClick={() => setIsOpen(true)}
      >
        <Bot size={23} />
      </button>
      <DetailDrawer
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('assistant.title')}
        description={t('assistant.description')}
        footer={
          <div className="w-full space-y-3">
            {error != null && (
              <div role="alert" className="ws-inline-message ws-warning">
                <p>{businessAssistantErrorMessage(error, locale)}</p>
                <p className="mt-1 text-xs">{t('assistant.questionRetained')}</p>
              </div>
            )}
            <form className="space-y-3" onSubmit={(event) => void send(event)}>
              <FormField label={t('assistant.question')} htmlFor="assistant-drawer-message">
                <textarea
                  id="assistant-drawer-message"
                  className="ws-input min-h-24 resize-y"
                  rows={3}
                  maxLength={4000}
                  required
                  disabled={busy}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      (event.ctrlKey || event.metaKey) &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={t('assistant.placeholder')}
                />
              </FormField>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="ws-muted text-xs" dir="ltr">
                  {number(input.length)} / {number(4000)}
                </span>
                <Button
                  type="submit"
                  variant="primary"
                  loading={busy}
                  disabled={!input.trim()}
                  icon={error ? <RefreshCw size={16} /> : <Send size={16} />}
                >
                  {t(busy ? 'assistant.sending' : error ? 'assistant.retry' : 'assistant.ask')}
                </Button>
              </div>
            </form>
            <p className="ws-muted text-xs">{t('assistant.readOnly')}</p>
          </div>
        }
      >
        <Panel title={t('assistant.providerStatus')}>
          <BusinessAssistantStatus {...status} compact />
          <Link
            className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium hover:underline"
            to="/ai/assistant"
            onClick={() => setIsOpen(false)}
          >
            {t('assistant.expand')}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </Panel>
        <div
          className="space-y-5"
          role="log"
          aria-live="polite"
          aria-label={t('assistant.conversation')}
          aria-busy={busy}
        >
          {!exchanges.length && !busy && (
            <EmptyState
              title={t('assistant.emptyTitle')}
              description={t('assistant.emptyHint')}
              icon={<Bot size={26} />}
            />
          )}
          {exchanges.map((exchange, index) => (
            <div key={index} className="space-y-3">
              <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4">
                <p className="ws-muted mb-2 flex items-center gap-2 text-xs">
                  <User size={14} aria-hidden="true" />
                  {t('assistant.you')}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm" dir="auto">
                  {exchange.question}
                </p>
              </div>
              <article className="ws-assistant-reply">
                <p className="ws-assistant-reply-meta">
                  <Bot size={14} aria-hidden="true" />
                  <span>{t('assistant.generated', { model: exchange.reply.model })}</span>
                  <time dateTime={exchange.reply.generatedAt}>
                    {date(exchange.reply.generatedAt, { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </p>
                <div className="ws-assistant-reply-text" dir="auto">
                  {exchange.reply.message}
                </div>
                <p className="ws-muted mt-4 border-t border-[var(--app-border)] pt-3 text-xs">
                  {t('assistant.scopeHint', { limit: number(exchange.reply.limits.invoiceLimit) })}
                </p>
              </article>
            </div>
          ))}
          {busy && (
            <div className="ws-inline-message" role="status">
              <p className="mb-2 whitespace-pre-wrap break-words text-sm" dir="auto">
                {input.trim()}
              </p>
              <StatusBadge>{t('assistant.generating')}</StatusBadge>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <p className="ws-muted flex items-start gap-2 text-xs">
          <ShieldCheck size={16} className="shrink-0" />
          {t(status.status?.provider === 'ollama' ? 'assistant.localHint' : 'assistant.hostedHint')}
        </p>
      </DetailDrawer>
    </>
  );
}
