/**
 * Automation Engine - Handles automated actions based on AI insights and system events
 */

interface AutomationRule {
  id: string;
  name: string;
  condition: (data: any) => boolean;
  action: (data: any) => Promise<void>;
  enabled: boolean;
}

interface TenantData {
  id: number;
  name: string;
  status: string;
  plan: string;
  paymentFailed: number;
  usage: number;
  revenue: number;
}

class AutomationEngine {
  private rules: AutomationRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    this.rules = [
      // Rule 1: Auto-suspend tenant after 3 failed payments
      {
        id: 'suspend-unpaid-tenant',
        name: 'Auto-suspend unpaid tenant',
        condition: (tenant: TenantData) => {
          return tenant.paymentFailed >= 3 && tenant.status === 'active';
        },
        action: async (tenant: TenantData) => {
          console.log(`[AUTOMATION] Suspending tenant ${tenant.name} (ID: ${tenant.id})`);
          await this.suspendTenant(tenant.id);
          await this.notifyAdmin(`Tenant ${tenant.name} auto-suspended due to payment failure`);
        },
        enabled: true,
      },

      // Rule 2: Suggest upgrade if usage is high
      {
        id: 'suggest-upgrade',
        name: 'Suggest plan upgrade',
        condition: (tenant: TenantData) => {
          return tenant.usage > 0.8 && tenant.plan === 'Basic';
        },
        action: async (tenant: TenantData) => {
          console.log(`[AUTOMATION] Sending upgrade email to ${tenant.name}`);
          await this.sendUpgradeEmail(tenant.id, 'Pro');
        },
        enabled: true,
      },

      // Rule 3: Churn risk detection - low usage
      {
        id: 'churn-risk-alert',
        name: 'Detect churn risk',
        condition: (tenant: TenantData) => {
          return tenant.usage < 0.2 && tenant.status === 'active';
        },
        action: async (tenant: TenantData) => {
          console.log(`[AUTOMATION] Churn risk detected for ${tenant.name}`);
          await this.sendEngagementEmail(tenant.id);
          await this.notifyAdmin(`Churn risk: ${tenant.name} has low usage`);
        },
        enabled: true,
      },

      // Rule 4: Revenue drop alert
      {
        id: 'revenue-drop-alert',
        name: 'Alert on revenue drop',
        condition: (tenant: TenantData) => {
          return tenant.revenue < -0.2; // 20% drop
        },
        action: async (tenant: TenantData) => {
          console.log(`[AUTOMATION] Revenue drop alert for ${tenant.name}`);
          await this.notifyAdmin(
            `Revenue dropped 20% for ${tenant.name}. Investigate immediately.`,
          );
        },
        enabled: true,
      },
    ];
  }

  async executeRules(tenantData: TenantData[]): Promise<void> {
    for (const tenant of tenantData) {
      for (const rule of this.rules) {
        if (rule.enabled && rule.condition(tenant)) {
          try {
            await rule.action(tenant);
          } catch (error) {
            console.error(`[AUTOMATION] Error executing rule ${rule.id}:`, error);
          }
        }
      }
    }
  }

  // Simulated API calls
  private async suspendTenant(tenantId: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`API Call: PATCH /api/tenants/${tenantId} { status: "suspended" }`);
        resolve();
      }, 300);
    });
  }

  private async sendUpgradeEmail(tenantId: number, suggestedPlan: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(
          `API Call: POST /api/emails/upgrade { tenantId: ${tenantId}, plan: "${suggestedPlan}" }`,
        );
        resolve();
      }, 300);
    });
  }

  private async sendEngagementEmail(tenantId: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`API Call: POST /api/emails/engagement { tenantId: ${tenantId} }`);
        resolve();
      }, 300);
    });
  }

  private async notifyAdmin(message: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`API Call: POST /api/notifications/admin { message: "${message}" }`);
        resolve();
      }, 300);
    });
  }

  getRules(): AutomationRule[] {
    return this.rules;
  }

  toggleRule(ruleId: string): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = !rule.enabled;
      console.log(`[AUTOMATION] Rule ${ruleId} is now ${rule.enabled ? 'enabled' : 'disabled'}`);
    }
  }
}

export const automationEngine = new AutomationEngine();

// Example usage function
export async function checkTenantHealth(tenantData: TenantData[]): Promise<void> {
  console.log('[AUTOMATION] Running automated health checks...');
  await automationEngine.executeRules(tenantData);
  console.log('[AUTOMATION] Health checks completed');
}

// Calculate MRR from revenue data
export function calculateMRR(revenues: Array<{ amount: number; date: Date }>): number {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return revenues
    .filter((r) => {
      const date = new Date(r.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, r) => sum + r.amount, 0);
}

// Calculate module usage statistics
export function topModules(logs: Array<{ module: string; action: string }>): {
  [key: string]: number;
} {
  const map: { [key: string]: number } = {};

  logs.forEach((log) => {
    map[log.module] = (map[log.module] || 0) + 1;
  });

  return map;
}

// Check if tenant has access to a feature based on usage limits
export function hasAccess(
  tenantId: number,
  feature: string,
  currentUsage: number,
  plan: 'Basic' | 'Pro' | 'Enterprise',
): boolean {
  const limits = {
    Basic: { Finance: 500, Inventory: 200, HR: 10, Sales: 100 },
    Pro: { Finance: 5000, Inventory: 2000, HR: 50, Sales: 1000 },
    Enterprise: { Finance: -1, Inventory: -1, HR: -1, Sales: -1 }, // unlimited
  };

  const limit = limits[plan][feature as keyof typeof limits.Basic];

  if (limit === undefined) return false;
  if (limit === -1) return true; // unlimited

  return currentUsage < limit;
}

export default automationEngine;
