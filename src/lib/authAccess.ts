export interface Permission {
  permission_key: string;
  permission_name: string;
  category: string;
}

export interface UserRole {
  role_name: string;
  display_name: string;
  level: number;
}

export class ProfileSetupRequiredError extends Error {
  constructor() {
    super('Your ERP profile has not been created. Complete company registration or contact your administrator.');
    this.name = 'ProfileSetupRequiredError';
  }
}

const roleLevels: Record<string, number> = {
  owner: 1000, developer: 900, super_admin: 800, admin: 700, manager: 600,
  finance_manager: 500, hr_manager: 500, inventory_manager: 500, sales_manager: 500,
  cashier: 300, employee: 200, viewer: 100,
};

const businessCategories = [
  'dashboard', 'users', 'finance', 'hr', 'inventory', 'sales', 'purchases', 'pos', 'reports', 'settings',
];
const businessActions = ['view', 'create', 'update', 'delete', 'export'];

export function roleFromName(name: string, displayName?: string, level?: number): UserRole {
  return { role_name: name, display_name: displayName || name, level: level ?? roleLevels[name] ?? 0 };
}

/** Demo identities never infer admin privileges from an arbitrary email substring. */
export function demoRole(email: string): string {
  const name = email.trim().toLowerCase().split('@')[0];
  return Object.hasOwn(roleLevels, name) ? name : 'employee';
}

export function legacyPermissions(raw: unknown): Permission[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const grants = raw as Record<string, unknown>;
  const keys = new Set(Object.entries(grants).filter(([, value]) => value === true).map(([key]) => key));
  for (const category of businessCategories) {
    if (grants.all === true || grants[category] === true) {
      for (const action of businessActions) keys.add(`${category}.${action}`);
    } else if (grants.read === true) {
      keys.add(`${category}.view`);
    }
  }
  // Legacy "all" means business access. Platform overrides require explicit grants.
  keys.delete('all');
  keys.delete('read');
  if (grants.all === true) keys.add('audit.view');
  return [...keys].map((key) => ({
    permission_key: key, permission_name: key, category: key.split('.')[0],
  }));
}

export function isMissingRpc(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST202' || error?.code === '42883';
}

export type RouteAccess = 'loading' | 'login' | 'unavailable' | 'denied' | 'cashier' | 'allow';

export function routeAccess(input: {
  authenticated: boolean;
  loading: boolean;
  error: boolean;
  profileReady: boolean;
  roles: UserRole[];
  permissions: Permission[];
  pathname: string;
  requiredRoles?: string[];
  requiredPermission?: string;
}): RouteAccess {
  if (input.loading) return 'loading';
  if (!input.authenticated) return 'login';
  if (input.error || !input.profileReady) return 'unavailable';
  const names = input.roles.map((role) => role.role_name);
  if (input.requiredRoles?.length && !input.requiredRoles.some((role) => names.includes(role))) {
    return names.includes('cashier') ? 'cashier' : 'denied';
  }
  if (input.requiredPermission && !input.permissions.some((p) => p.permission_key === input.requiredPermission)) {
    return 'denied';
  }
  if (names.includes('cashier') && !input.pathname.startsWith('/cashier/') && input.pathname !== '/cashier') {
    return 'cashier';
  }
  return 'allow';
}

export async function withAuthTimeout<T>(operation: PromiseLike<T>, timeoutMs = 10000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Authentication check timed out. Please retry.')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
