export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'local';

export type AIRequestType =
  | 'chat'
  | 'analysis'
  | 'forecast'
  | 'anomaly'
  | 'automation';

export type AIToolCategory =
  | 'finance'
  | 'sales'
  | 'inventory'
  | 'hr'
  | 'crm'
  | 'operations'
  | 'reporting';

export type AIToolRiskLevel =
  | 'read'
  | 'analysis'
  | 'action'
  | 'critical';

export interface AIContext {
  userId: string;
  companyId?: string;
  tenantId?: string;
  branchId?: string;
  role?: string;
  locale?: string;
}

export interface AIRequest {
  type: AIRequestType;
  message: string;
  context: AIContext;
  provider?: AIProvider;
  model?: string;
}

export interface AIResponse {
  ok: boolean;
  requestType: AIRequestType;
  message: string;
  provider?: AIProvider;
  model?: string;
  toolCalls?: AIToolCall[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  category: AIToolCategory;
  riskLevel: AIToolRiskLevel;
  requiresApproval: boolean;
}

export interface AIToolCall {
  tool: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  approved?: boolean;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  category: AIToolCategory;
  severity: 'info' | 'warning' | 'critical';
  confidence?: number;
  createdAt: string;
  data?: Record<string, unknown>;
}
