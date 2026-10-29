import type {
  AIRequest,
  AIResponse,
} from './aiTypes';

import {
  getAITool,
} from './aiTools';

import {
  canUseAITool,
} from './aiPermissions';

export async function processAIRequest(
  request: AIRequest,
): Promise<AIResponse> {
  const message = request.message.trim();

  if (!message) {
    return {
      ok: false,
      requestType: request.type,
      message: 'AI message cannot be empty.',
    };
  }

  const toolName = detectToolIntent(message);

  if (!toolName) {
    return {
      ok: true,
      requestType: request.type,
      message:
        'AI request received. No business tool has been selected yet.',
    };
  }

  const tool = getAITool(toolName);

  if (!tool) {
    return {
      ok: false,
      requestType: request.type,
      message: `AI tool '${toolName}' is not available.`,
    };
  }

  const permission = canUseAITool(
    request.context,
    tool,
  );

  if (!permission.allowed) {
    return {
      ok: false,
      requestType: request.type,
      message:
        permission.reason ??
        'You are not authorized to use this AI capability.',
      warnings: [
        'AI access is restricted by ERPX-AI permissions.',
      ],
    };
  }

  return {
    ok: true,
    requestType: request.type,
    message: `AI tool '${tool.name}' is authorized and ready for execution.`,
    toolCalls: [
      {
        tool: tool.name,
        arguments: {},
        approved: !permission.requiresApproval,
      },
    ],
  };
}

function detectToolIntent(
  message: string,
): string | undefined {
  const normalized = message.toLowerCase();
  if (
    normalized.includes('execute business action') ||
    normalized.includes('business action') ||
    normalized.includes('تنفيذ إجراء') ||
    normalized.includes('تنفيذ عملية')
  ) {
    return 'execute_business_action';
  }

  if (
    normalized.includes('sales') ||
    normalized.includes('revenue') ||
    normalized.includes('مبيعات') ||
    normalized.includes('المبيعات') ||
    normalized.includes('إيرادات') ||
    normalized.includes('الايرادات')
  ) {
    return 'get_sales_summary';
  }

  if (
    normalized.includes('low stock') ||
    normalized.includes('نفاد') ||
    normalized.includes('منخفض المخزون')
  ) {
    return 'get_low_stock_products';
  }

  if (
    normalized.includes('inventory') ||
    normalized.includes('stock') ||
    normalized.includes('مخزون') ||
    normalized.includes('المخزون')
  ) {
    return 'get_inventory_status';
  }

  if (
    normalized.includes('finance') ||
    normalized.includes('financial') ||
    normalized.includes('مالية') ||
    normalized.includes('المالية')
  ) {
    return 'get_financial_summary';
  }

  return undefined;
}
