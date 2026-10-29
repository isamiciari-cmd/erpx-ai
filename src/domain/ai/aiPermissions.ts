import type {
  AIContext,
  AIToolDefinition,
} from './aiTypes';

const READ_ROLES = new Set([
  'owner',
  'super_admin',
  'admin',
  'manager',
  'developer',
  'accountant',
  'sales',
  'inventory',
  'hr',
  'cashier',
]);

const ANALYSIS_ROLES = new Set([
  'owner',
  'super_admin',
  'admin',
  'manager',
  'developer',
  'accountant',
]);

const ACTION_ROLES = new Set([
  'owner',
  'super_admin',
  'admin',
  'manager',
]);

const CRITICAL_ROLES = new Set([
  'owner',
  'super_admin',
]);

export interface AIPermissionResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
}

export function canUseAITool(
  context: AIContext,
  tool: AIToolDefinition,
): AIPermissionResult {
  const role = context.role?.toLowerCase().trim();

  if (!context.userId) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: 'Authenticated user is required.',
    };
  }

  if (!context.companyId && !context.tenantId) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: 'Company or tenant scope is required.',
    };
  }

  if (!role) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: 'User role is required.',
    };
  }

  let allowed = false;

  switch (tool.riskLevel) {
    case 'read':
      allowed = READ_ROLES.has(role);
      break;

    case 'analysis':
      allowed = ANALYSIS_ROLES.has(role);
      break;

    case 'action':
      allowed = ACTION_ROLES.has(role);
      break;

    case 'critical':
      allowed = CRITICAL_ROLES.has(role);
      break;
  }

  if (!allowed) {
    return {
      allowed: false,
      requiresApproval: tool.requiresApproval,
      reason: `Role '${role}' is not authorized for '${tool.name}'.`,
    };
  }

  return {
    allowed: true,
    requiresApproval: tool.requiresApproval,
  };
}
