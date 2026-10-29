import type {
  AIToolDefinition,
} from './aiTypes';

export const AI_TOOLS: AIToolDefinition[] = [
  {
    name: 'get_sales_summary',
    description: 'Retrieve aggregated sales performance for the authorized company and branch scope.',
    category: 'sales',
    riskLevel: 'read',
    requiresApproval: false,
  },
  {
    name: 'get_inventory_status',
    description: 'Retrieve inventory levels and stock status for the authorized company and branch scope.',
    category: 'inventory',
    riskLevel: 'read',
    requiresApproval: false,
  },
  {
    name: 'get_low_stock_products',
    description: 'Identify products that are below their configured minimum stock level.',
    category: 'inventory',
    riskLevel: 'analysis',
    requiresApproval: false,
  },
  {
    name: 'get_financial_summary',
    description: 'Retrieve authorized financial summary information for analysis.',
    category: 'finance',
    riskLevel: 'analysis',
    requiresApproval: false,
  },
  {
    name: 'get_customer_summary',
    description: 'Retrieve authorized aggregated customer information for CRM analysis.',
    category: 'crm',
    riskLevel: 'read',
    requiresApproval: false,
  },
  {
    name: 'create_business_report',
    description: 'Generate a business report from authorized ERP data.',
    category: 'reporting',
    riskLevel: 'analysis',
    requiresApproval: false,
  },
  {
    name: 'create_purchase_recommendation',
    description: 'Generate purchase recommendations based on inventory and business data.',
    category: 'inventory',
    riskLevel: 'action',
    requiresApproval: true,
  },
  {
    name: 'execute_business_action',
    description: 'Execute an approved business operation through an authorized ERP workflow.',
    category: 'operations',
    riskLevel: 'critical',
    requiresApproval: true,
  },
];

export function getAITool(
  name: string,
): AIToolDefinition | undefined {
  return AI_TOOLS.find((tool) => tool.name === name);
}

export function getAITools(): AIToolDefinition[] {
  return [...AI_TOOLS];
}
