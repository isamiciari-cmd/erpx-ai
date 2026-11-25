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
  preview?: boolean;
  limits: BusinessAssistantLimits;
}
export interface BusinessAssistantStatus extends AssistantModel {
  available: boolean;
  configured: boolean;
  deploymentMode: 'local_gateway' | 'hosted_api' | 'unconfigured';
  healthChecked: boolean;
  healthScope: 'gateway' | 'configuration' | 'none';
  inferenceVerified: boolean;
  tools?: string[];
}
export interface BusinessAssistantReply extends AssistantModel {
  message: string;
  generatedAt: string;
  recordPath?: string;
  receiptProposal?: AssistantReceiptProposal;
  purchaseProposal?: AssistantPurchaseProposal;
}
export type AssistantPurchaseProposal = {
  operationId: string;
  branch: string;
  stock: { warehouse_id: string; warehouse: string; product_id: string; sku: string; available: number; minimum: number }[];
};
function purchaseProposal(value: unknown): AssistantPurchaseProposal | undefined {
  if (!record(value) || typeof value.operationId !== 'string' || typeof value.branch !== 'string' ||
      !Array.isArray(value.stock) || !value.stock.length || value.stock.length > 100 ||
      !value.stock.every(row => record(row) && typeof row.warehouse_id === 'string' &&
        typeof row.product_id === 'string' && typeof row.warehouse === 'string' &&
        typeof row.sku === 'string' && Number.isInteger(row.available) && Number.isInteger(row.minimum))) return;
  return { operationId: value.operationId, branch: value.branch, stock: value.stock };
}
export type AssistantReceiptProposal = { operationId: string; invoiceNumber: string; branch: string; amount: string; currency: string; preferredMethod?: string };
function receiptProposal(value: unknown): AssistantReceiptProposal | undefined {
  if (!record(value) || typeof value.operationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.operationId) ||
    typeof value.invoiceNumber !== 'string' || typeof value.branch !== 'string' ||
    typeof value.amount !== 'string' || !/^\d{1,13}\.\d{2}$/.test(value.amount) || Number(value.amount) <= 0 ||
    typeof value.currency !== 'string' || !/^[A-Z]{3}$/.test(value.currency)) return undefined;
  const preferredMethod = typeof value.preferredMethod === 'string' &&
    ['cash','card','mada','apple_pay','bank_transfer'].includes(value.preferredMethod) ? value.preferredMethod : undefined;
  return { operationId: value.operationId, invoiceNumber: value.invoiceNumber, branch: value.branch,
    amount: value.amount, currency: value.currency, preferredMethod };
}
export type BusinessAssistantErrorCode =
  | 'invalid_request'
  | 'configuration_required'
  | 'provider_unavailable'
  | 'timeout'
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
  timeout: 'The assistant request timed out. Try again.',
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
  timeout: 'انتهت مهلة طلب المساعد. أعد المحاولة.',
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
    ...(data.preview === true ? { preview: true } : {}),
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
  if (status === 504) return 'timeout';
  const known = [
    'invalid_request',
    'configuration_required',
    'provider_unavailable',
    'timeout',
    'rate_limited',
    'auth_error',
    'data_unavailable',
  ];
  if (record(body) && typeof body.code === 'string' && known.includes(body.code))
    return body.code as BusinessAssistantErrorCode;
  return status === 400 ? 'invalid_request' : 'provider_unavailable';
}
async function invoke(
  body: Record<string, unknown>,
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
    ...(Array.isArray(data.tools) ? { tools: data.tools.filter((tool): tool is string => typeof tool === 'string') } : {}),
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
  const recordPath = typeof data.recordPath === 'string' &&
    (['/dashboard', '/finance/invoicing', '/inventory/manage', '/cashier/pos', '/pos', '/reports'].includes(data.recordPath) ||
      /^\/finance\/invoicing\?invoice=[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(data.recordPath))
    ? data.recordPath : undefined;
  const proposal = model.preview ? receiptProposal(data.receiptProposal) : undefined;
  const purchase = model.preview ? purchaseProposal(data.purchaseProposal) : undefined;
  return { ...model, message: data.message, generatedAt: data.generatedAt, ...(recordPath ? { recordPath } : {}),
    ...(proposal ? { receiptProposal: proposal } : {}), ...(purchase ? { purchaseProposal: purchase } : {}) };
}

export async function actOnAssistantPurchase(operationId: string, details?: {
  warehouse: string; supplier: string; requester: string; lines: Record<string, number>;
}) {
  const data = await invoke({ action: details ? 'confirm_purchase' : 'cancel_purchase', operationId, ...details });
  if (!details && data.status === 'cancelled') return;
  if (data.status !== 'confirmed' || typeof data.id !== 'string' ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(data.id)) return invalid();
  return '/purchase?draft=' + data.id;
}

export async function actOnAssistantReceipt(operationId: string, action: 'cancel_receipt' | 'confirm_receipt', method?: string, reference?: string) {
  const data = await invoke({ action, operationId, ...(method ? { method, reference } : {}) });
  if (!['cancelled','confirmed','changed','settled'].includes(String(data.status))) invalid();
  return { status: String(data.status), currentDue: typeof data.currentDue === 'string' ? data.currentDue : undefined, proposal: receiptProposal(data.proposal) };
}

/** Preserved for existing callers; successful answers always come from the model. */
export async function askBusinessAssistant(message: string): Promise<string> {
  return (await askBusinessAssistantReply(message)).message;
}
