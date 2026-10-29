import type {
  AIContext,
  AIToolCall,
} from './aiTypes';

import {
  getAITool,
} from './aiTools';

import {
  canUseAITool,
} from './aiPermissions';

import {
  supabase,
  isDemoMode,
} from '../../lib/supabase';

export interface AIToolExecutionResult {
  ok: boolean;
  tool: string;
  result?: unknown;
  error?: string;
  requiresApproval?: boolean;
}

export async function executeAITool(
  context: AIContext,
  toolCall: AIToolCall,
): Promise<AIToolExecutionResult> {
  const tool = getAITool(toolCall.tool);

  if (!tool) {
    return {
      ok: false,
      tool: toolCall.tool,
      error: `AI tool '${toolCall.tool}' is not registered.`,
    };
  }

  const permission = canUseAITool(
    context,
    tool,
  );

  if (!permission.allowed) {
    return {
      ok: false,
      tool: tool.name,
      error:
        permission.reason ??
        'You are not authorized to execute this AI tool.',
    };
  }

  if (permission.requiresApproval) {
    return {
      ok: false,
      tool: tool.name,
      requiresApproval: true,
      error:
        'This AI action requires explicit approval before execution.',
    };
  }

  switch (tool.name) {
    case 'get_sales_summary':
      return executeSalesSummary(context, toolCall.arguments);

    case 'get_inventory_status':
      return executeInventoryStatus(context, toolCall.arguments);

    case 'get_low_stock_products':
      return executeLowStockProducts(context, toolCall.arguments);

    case 'get_financial_summary':
      return executeFinancialSummary(context, toolCall.arguments);

    case 'get_customer_summary':
      return executeCustomerSummary(context, toolCall.arguments);

    case 'create_business_report':
      return executeBusinessReport(context, toolCall.arguments);

    case 'create_purchase_recommendation':
    case 'execute_business_action':
      return {
        ok: false,
        tool: tool.name,
        requiresApproval: true,
        error:
          'This action is registered but its execution workflow has not been enabled yet.',
      };

    default:
      return {
        ok: false,
        tool: tool.name,
        error: `No executor is implemented for '${tool.name}'.`,
      };
  }
}

async function executeSalesSummary(
  context: AIContext,
  args: Record<string, unknown>,
): Promise<AIToolExecutionResult> {
  if (isDemoMode) {
    return {
      ok: false,
      tool: 'get_sales_summary',
      error:
        'Supabase is not configured. Real sales data is unavailable in demo mode.',
    };
  }

  if (!context.companyId) {
    return {
      ok: false,
      tool: 'get_sales_summary',
      error:
        'Company scope is required to retrieve sales data.',
    };
  }

  let query = supabase
    .from('sales')
    .select('id, total_amount, status, sale_date, branch_id')
    .eq('company_id', context.companyId);

  if (context.branchId) {
    query = query.eq('branch_id', context.branchId);
  }

  const from =
    typeof args.from === 'string' && args.from.trim()
      ? args.from.trim()
      : undefined;

  const to =
    typeof args.to === 'string' && args.to.trim()
      ? args.to.trim()
      : undefined;

  if (from) {
    query = query.gte('sale_date', from);
  }

  if (to) {
    query = query.lte('sale_date', to);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      '[AI] get_sales_summary error:',
      error,
    );

    return {
      ok: false,
      tool: 'get_sales_summary',
      error: error.message,
    };
  }

  const sales = data ?? [];

  const completedSales = sales.filter(
    (sale) => sale.status === 'completed',
  );

  const refundedSales = sales.filter(
    (sale) => sale.status === 'refunded',
  );

  const totalSales = completedSales.reduce(
    (sum, sale) =>
      sum + Number(sale.total_amount ?? 0),
    0,
  );

  const totalRefunds = refundedSales.reduce(
    (sum, sale) =>
      sum + Number(sale.total_amount ?? 0),
    0,
  );

  return {
    ok: true,
    tool: 'get_sales_summary',
    result: {
      companyId: context.companyId,
      branchId: context.branchId ?? null,
      period: {
        from: from ?? null,
        to: to ?? null,
      },
      transactionCount: completedSales.length,
      totalSales,
      totalRefunds,
      netSales: totalSales - totalRefunds,
      currency: 'SAR',
    },
  };
}

async function executeInventoryStatus(
  _context: AIContext,
  _arguments: Record<string, unknown>,
): Promise<AIToolExecutionResult> {
  return {
    ok: true,
    tool: 'get_inventory_status',
    result: {
      status: 'executor_ready',
      message:
        'Inventory status executor is ready for Supabase integration.',
    },
  };
}

async function executeLowStockProducts(
  _context: AIContext,
  _arguments: Record<string, unknown>,
): Promise<AIToolExecutionResult> {
  return {
    ok: true,
    tool: 'get_low_stock_products',
    result: {
      status: 'executor_ready',
      message:
        'Low-stock executor is ready for Supabase integration.',
    },
  };
}

async function executeFinancialSummary(
  _context: AIContext,
  _arguments: Record<string, unknown>,
): Promise<AIToolExecutionResult> {
  return {
    ok: true,
    tool: 'get_financial_summary',
    result: {
      status: 'executor_ready',
      message:
        'Financial summary executor is ready for Supabase integration.',
    },
  };
}

async function executeCustomerSummary(
  _context: AIContext,
  _arguments: Record<string, unknown>,
): Promise<AIToolExecutionResult> {
  return {
    ok: true,
    tool: 'get_customer_summary',
    result: {
      status: 'executor_ready',
      message:
        'Customer summary executor is ready for Supabase integration.',
    },
  };
}

async function executeBusinessReport(
  _context: AIContext,
  _arguments: Record<string, unknown>,
): Promise<AIToolExecutionResult> {
  return {
    ok: true,
    tool: 'create_business_report',
    result: {
      status: 'executor_ready',
      message:
        'Business report executor is ready for Supabase integration.',
    },
  };
}
