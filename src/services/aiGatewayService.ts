import { supabase, isDemoMode } from '../lib/supabase';

export type BusinessAssistantProvider = 'ollama' | 'openai' | 'unconfigured';
export interface BusinessAssistantLimits {
  invoiceLimit: number;
  messageCharacters: number;
  responseTokens: number;
}
interface AssistantModel {
  provider: BusinessAssistantProvider;
  model: string | null;
  readOnly: true;
  mode: 'generative';
  dataScope: string;
  limits: BusinessAssistantLimits;
}
export interface BusinessAssistantStatus extends AssistantModel {
  available: boolean;
  configured: boolean;
  deploymentMode: 'local_gateway' | 'hosted_api' | 'unconfigured';
  healthChecked: boolean;
  healthScope: 'gateway' | 'configuration' | 'none';
  inferenceVerified: boolean;
}
export interface BusinessAssistantReply extends AssistantModel {
  message: string;
  generatedAt: string;
}
export type BusinessAssistantErrorCode =
  | 'invalid_request'
  | 'configuration_required'
  | 'provider_unavailable'
  | 'rate_limited'
  | 'auth_error'
  | 'forbidden'
  | 'data_unavailable'
  | 'invalid_response'
  | 'network_error'
  | 'demo_unavailable';

const englishErrors: Record<BusinessAssistantErrorCode, string> = {
  invalid_request: 'Enter a question between 1 and 4000 characters.',
  configuration_required:
    'The model connection is not ready. Ask your administrator to connect the assistant.',
  provider_unavailable: 'The model is offline or busy. Try again after the connection is restored.',
  rate_limited: 'The assistant is handling too many requests. Try again shortly.',
  auth_error: 'Sign in again to use the business assistant.',
  forbidden: 'Your current account cannot use this assistant.',
  data_unavailable: 'Company records could not be read. No analysis was generated.',
  invalid_response: 'The model returned an incomplete response. Try again shortly.',
  network_error: 'The assistant could not be reached. Check the connection and try again.',
  demo_unavailable: 'Connect a company account to use the assistant.',
};
const arabicErrors: Record<BusinessAssistantErrorCode, string> = {
  invalid_request: 'اكتب سؤالاً من حرف واحد إلى 4000 حرف.',
  configuration_required: 'اتصال النموذج غير جاهز. اطلب من المسؤول توصيل المساعد.',
  provider_unavailable: 'النموذج غير متصل أو مشغول. حاول مجدداً بعد عودة الاتصال.',
  rate_limited: 'المساعد يعالج طلبات كثيرة الآن. حاول بعد قليل.',
  auth_error: 'سجّل الدخول مجدداً لاستخدام مساعد الأعمال.',
  forbidden: 'حسابك الحالي غير مخوّل باستخدام هذا المساعد.',
  data_unavailable: 'تعذرت قراءة سجلات الشركة. لم يُنشأ أي تحليل.',
  invalid_response: 'أعاد النموذج استجابة غير مكتملة. حاول بعد قليل.',
  network_error: 'تعذر الوصول إلى المساعد. تحقق من الاتصال وحاول مجدداً.',
  demo_unavailable: 'اربط حساب شركة لاستخدام المساعد.',
};

export class BusinessAssistantError extends Error {
  constructor(public readonly code: BusinessAssistantErrorCode) {
    super(englishErrors[code]);
    this.name = 'BusinessAssistantError';
  }
}
export function businessAssistantErrorMessage(error: unknown, locale = 'en'): string {
  const code = error instanceof BusinessAssistantError ? error.code : 'network_error';
  return (locale.startsWith('ar') ? arabicErrors : englishErrors)[code];
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function invalid(): never {
  throw new BusinessAssistantError('invalid_response');
}
function modelContract(data: Record<string, unknown>): AssistantModel {
  if (
    !['ollama', 'openai', 'unconfigured'].includes(String(data.provider)) ||
    data.readOnly !== true ||
    data.mode !== 'generative'
  )
    invalid();
  if (
    data.model !== null &&
    (typeof data.model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,199}$/.test(data.model))
  )
    invalid();
  if (
    typeof data.dataScope !== 'string' ||
    !data.dataScope.trim() ||
    data.dataScope.length > 2000 ||
    !record(data.limits)
  )
    invalid();
  const limits = data.limits;
  if (
    !['invoiceLimit', 'messageCharacters', 'responseTokens'].every(
      (key) => Number.isSafeInteger(limits[key]) && Number(limits[key]) > 0,
    )
  )
    invalid();
  return {
    provider: data.provider as BusinessAssistantProvider,
    model: data.model as string | null,
    readOnly: true,
    mode: 'generative',
    dataScope: data.dataScope,
    limits: {
      invoiceLimit: Number(limits.invoiceLimit),
      messageCharacters: Number(limits.messageCharacters),
      responseTokens: Number(limits.responseTokens),
    },
  };
}
function failureCode(body: unknown, status?: number): BusinessAssistantErrorCode {
  if (status === 401) return 'auth_error';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'rate_limited';
  const known = [
    'invalid_request',
    'configuration_required',
    'provider_unavailable',
    'rate_limited',
    'auth_error',
    'data_unavailable',
  ];
  if (record(body) && typeof body.code === 'string' && known.includes(body.code))
    return body.code as BusinessAssistantErrorCode;
  return status === 400 ? 'invalid_request' : 'provider_unavailable';
}
async function invoke(
  body: { action: 'status' } | { message: string },
): Promise<Record<string, unknown>> {
  if (isDemoMode) throw new BusinessAssistantError('demo_unavailable');
  let result;
  try {
    result = await supabase.functions.invoke('ai/chat', { body });
  } catch {
    throw new BusinessAssistantError('network_error');
  }
  if (result.error) {
    const context = result.error.context;
    let details: unknown = result.data;
    if (context instanceof Response) {
      try {
        details = await context.clone().json();
      } catch {
        /* Never display raw provider/server text. */
      }
      throw new BusinessAssistantError(failureCode(details, context.status));
    }
    if (record(details) && details.ok === false)
      throw new BusinessAssistantError(failureCode(details));
    throw new BusinessAssistantError('network_error');
  }
  if (!record(result.data)) invalid();
  if (result.data.ok !== true) throw new BusinessAssistantError(failureCode(result.data));
  return result.data;
}

export async function getBusinessAssistantStatus(): Promise<BusinessAssistantStatus> {
  const data = await invoke({ action: 'status' });
  const model = modelContract(data);
  if (
    typeof data.available !== 'boolean' ||
    typeof data.configured !== 'boolean' ||
    typeof data.healthChecked !== 'boolean' ||
    typeof data.inferenceVerified !== 'boolean' ||
    !['gateway', 'configuration', 'none'].includes(String(data.healthScope)) ||
    !['local_gateway', 'hosted_api', 'unconfigured'].includes(String(data.deploymentMode))
  )
    invalid();
  if (data.available && (!data.configured || model.provider === 'unconfigured' || !model.model))
    invalid();
  return {
    ...model,
    available: data.available,
    configured: data.configured,
    healthChecked: data.healthChecked,
    inferenceVerified: data.inferenceVerified,
    healthScope: data.healthScope as BusinessAssistantStatus['healthScope'],
    deploymentMode: data.deploymentMode as BusinessAssistantStatus['deploymentMode'],
  };
}

export async function askBusinessAssistantReply(message: string): Promise<BusinessAssistantReply> {
  if (typeof message !== 'string' || !message.trim() || message.trim().length > 4000)
    throw new BusinessAssistantError('invalid_request');
  const data = await invoke({ message: message.trim() });
  const model = modelContract(data);
  if (
    model.provider === 'unconfigured' ||
    !model.model ||
    typeof data.message !== 'string' ||
    !data.message.trim() ||
    data.message.length > 50000 ||
    typeof data.generatedAt !== 'string' ||
    !Number.isFinite(Date.parse(data.generatedAt))
  )
    invalid();
  return { ...model, message: data.message, generatedAt: data.generatedAt };
}

/** Preserved for existing callers; successful answers always come from the model. */
export async function askBusinessAssistant(message: string): Promise<string> {
  return (await askBusinessAssistantReply(message)).message;
}
