import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, User, X, Minimize2, Maximize2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessAssistantStatus } from '../../hooks/useBusinessAssistantStatus';
import {
  askBusinessAssistantReply,
  businessAssistantErrorMessage,
} from '../../services/aiGatewayService';
import BusinessAssistantStatus from './erp/BusinessAssistantStatus';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string | null;
}

export default function AIAssistant() {
  const { i18n } = useTranslation();
  const ar = (i18n.resolvedLanguage || i18n.language).startsWith('ar');
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const status = useBusinessAssistantStatus(isOpen);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const generation = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, error]);

  useEffect(() => {
    const open = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('erpx:open-ai', open);
    return () => window.removeEventListener('erpx:open-ai', open);
  }, []);

  useEffect(() => {
    generation.current++;
    setMessages([]);
    setInput('');
    setError(null);
    setIsLoading(false);
    return () => {
      generation.current++;
    };
  }, [user?.id, user?.company_id]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || isLoading) return;
    const request = ++generation.current;
    setMessages((previous) => [
      ...previous,
      { role: 'user', content: question, timestamp: new Date() },
    ]);
    setInput('');
    setError(null);
    setIsLoading(true);
    try {
      const answer = await askBusinessAssistantReply(question);
      if (request !== generation.current) return;
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: answer.message,
          timestamp: new Date(answer.generatedAt),
          model: answer.model,
        },
      ]);
      void status.refresh();
    } catch (cause) {
      if (request === generation.current) setError(cause);
    } finally {
      if (request === generation.current) setIsLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        aria-label={ar ? 'فتح المساعد الذكي' : 'Open AI assistant'}
        className="fixed bottom-8 left-8 w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-2xl flex items-center justify-center z-50 hover:shadow-purple-500/50 transition-all"
      >
        <Bot className="w-8 h-8 text-white" />
      </motion.button>
    );
  }

  return (
    <motion.div
      dir={ar ? 'rtl' : 'ltr'}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={`fixed ${isMinimized ? 'bottom-8 left-4 w-80 max-w-[calc(100vw-2rem)]' : 'bottom-8 left-4 w-[450px] max-w-[calc(100vw-2rem)]'} bg-gradient-to-br from-gray-900 to-gray-950 border border-purple-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden text-white`}
    >
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Bot className="w-7 h-7 shrink-0" />
          <h3 className="font-bold">{ar ? 'المساعد الذكي' : 'AI assistant'}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            aria-label={
              isMinimized
                ? ar
                  ? 'توسيع المساعد'
                  : 'Expand assistant'
                : ar
                  ? 'تصغير المساعد'
                  : 'Minimize assistant'
            }
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={ar ? 'إغلاق المساعد' : 'Close assistant'}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {!isMinimized && (
        <>
          <div className="border-b border-white/10 p-4">
            <BusinessAssistantStatus {...status} compact />
          </div>
          <div
            className="max-h-[45vh] min-h-48 overflow-y-auto p-4 space-y-4 bg-gray-950/50"
            role="log"
            aria-label={ar ? 'محادثة المساعد' : 'Assistant conversation'}
            aria-live="polite"
          >
            {!messages.length && (
              <p className="text-sm text-gray-300">
                {ar
                  ? 'اسأل عن ملخص فواتير الشركة المصرّح لك بقراءتها. تظهر هنا إجابات النموذج الفعلية بعد إرسال السؤال.'
                  : 'Ask about company invoice summaries you are authorized to read. Actual model answers appear here after you send a question.'}
              </p>
            )}
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <Bot
                      aria-label={ar ? 'إجابة النموذج' : 'Model answer'}
                      className="w-6 h-6 shrink-0 text-purple-300"
                    />
                  )}
                  <div
                    className={`min-w-0 max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-blue-700' : 'bg-white/5 border border-white/10'}`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <p className="text-xs opacity-60 mt-2">
                      {message.model && (
                        <>
                          <span dir="ltr">{message.model}</span> ·{' '}
                        </>
                      )}
                      {message.timestamp.toLocaleTimeString(ar ? 'ar-SA' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <User
                      aria-label={ar ? 'سؤالك' : 'Your question'}
                      className="w-6 h-6 shrink-0 text-blue-300"
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <p className="text-sm text-purple-300" role="status">
                {ar ? 'جارٍ إعداد الإجابة…' : 'Generating answer…'}
              </p>
            )}
            {error != null && (
              <p
                className="rounded-lg border border-amber-400/30 p-3 text-sm text-amber-300"
                role="alert"
              >
                {businessAssistantErrorMessage(error, ar ? 'ar' : 'en')}
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                aria-label={ar ? 'سؤالك للمساعد' : 'Your question for the assistant'}
                maxLength={4000}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={ar ? 'اكتب سؤالك…' : 'Type your question…'}
                className="min-w-0 flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || isLoading}
                aria-label={ar ? 'إرسال السؤال' : 'Send question'}
                className="px-4 py-3 bg-purple-600 rounded-xl disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {ar
                ? 'للقراءة فقط؛ لا يُعدّل السجلات ولا يُنفّذ مدفوعات. راجع الإجابات قبل اتخاذ القرار.'
                : 'Read-only; no record changes or payments. Review answers before making decisions.'}
            </p>
            {status.status?.provider === 'ollama' && (
              <p className="text-xs text-gray-400 mt-1">
                {ar
                  ? 'أبقِ جهاز النموذج المحلي مشغّلاً ومتصلاً.'
                  : 'Keep the local model device powered on and connected.'}
              </p>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
