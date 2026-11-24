import {
  Activity,
  Bell,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  FileText,
  Gauge,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  UserRoundCog,
  type LucideIcon,
} from 'lucide-react';

export const workspaceAdminRoles = ['owner', 'developer', 'super_admin', 'admin'];
export interface WorkspaceLink {
  key: string;
  path: string;
  icon: LucideIcon;
  admin?: boolean;
  children?: WorkspaceLink[];
}
export const navigationSections: { key: string; items: WorkspaceLink[] }[] = [
  {
    key: 'workspace',
    items: [
      { key: 'overview', path: '/dashboard', icon: LayoutDashboard },
      { key: 'reports', path: '/reports', icon: ChartNoAxesCombined },
    ],
  },
  {
    key: 'business',
    items: [
      { key: 'sales', path: '/finance/invoicing', icon: FileText },
      { key: 'purchases', path: '/purchase', icon: ShoppingBag },
      { key: 'inventory', path: '/inventory', icon: Package },
      {
        key: 'finance',
        path: '/finance/dashboard',
        icon: BookOpen,
        children: [
          { key: 'accounts', path: '/finance/accounting', icon: BookOpen },
          { key: 'journal', path: '/finance/journal-entries', icon: ClipboardList },
          { key: 'ledger', path: '/finance/general-ledger', icon: BookOpen },
          { key: 'trial', path: '/finance/trial-balance', icon: ChartNoAxesCombined },
          { key: 'receivables', path: '/finance/accounts-receivable', icon: FileText },
          { key: 'payables', path: '/finance/accounts-payable', icon: FileText },
          { key: 'cash', path: '/finance/cash-bank', icon: CreditCard },
          { key: 'budgets', path: '/finance/budgets', icon: ChartNoAxesCombined },
          { key: 'expenses', path: '/finance/expenses', icon: CreditCard },
          { key: 'assets', path: '/finance/fixed-assets', icon: Boxes },
          { key: 'tax', path: '/finance/vat-tax', icon: FileText },
          { key: 'currency', path: '/finance/currency', icon: CreditCard },
          { key: 'zatca', path: '/finance/zatca', icon: FileText },
        ],
      },
      {
        key: 'employees',
        path: '/hr/employees',
        icon: Users,
        children: [
          { key: 'attendance', path: '/hr/attendance', icon: ClipboardList },
          { key: 'leave', path: '/hr/leaves', icon: ClipboardList },
          { key: 'payroll', path: '/hr/payroll', icon: CreditCard },
          { key: 'recruitment', path: '/hr/recruitment', icon: UserRoundCog },
          { key: 'hrReports', path: '/hr/reports', icon: ChartNoAxesCombined },
        ],
      },
      { key: 'pos', path: '/pos', icon: CreditCard },
    ],
  },
  {
    key: 'intelligence',
    items: [
      { key: 'scenarios', path: '/ai/predictions', icon: Sparkles },
      { key: 'recommendations', path: '/ai/recommendations', icon: ChartNoAxesCombined },
      { key: 'alerts', path: '/ai/alerts', icon: Bell },
    ],
  },
  {
    key: 'administration',
    items: [
      { key: 'users', path: '/system/users', icon: UserRoundCog, admin: true },
      { key: 'roles', path: '/system/permissions', icon: ShieldCheck, admin: true },
      { key: 'health', path: '/admin/supabase-diagnostic', icon: Activity, admin: true },
      { key: 'settings', path: '/settings', icon: Settings, admin: true },
    ],
  },
  {
    key: 'more',
    items: [
      { key: 'crm', path: '/crm', icon: Users },
      { key: 'projects', path: '/projects', icon: BriefcaseBusiness },
      { key: 'helpdesk', path: '/helpdesk', icon: ClipboardList },
      { key: 'timesheets', path: '/timesheets', icon: ClipboardList },
      { key: 'fieldService', path: '/field-service', icon: BriefcaseBusiness },
      { key: 'mrp', path: '/mrp', icon: Boxes },
      { key: 'plm', path: '/plm', icon: Package },
      { key: 'subscriptions', path: '/subscriptions', icon: CreditCard },
      { key: 'energy', path: '/bms/energy', icon: Gauge },
      { key: 'cctv', path: '/bms/cctv', icon: Activity },
      { key: 'automation', path: '/admin/automation', icon: Settings, admin: true },
      { key: 'audit', path: '/admin/audit-logs', icon: ShieldCheck, admin: true },
    ],
  },
];
export function allWorkspaceLinks(): (WorkspaceLink & { section: string })[] {
  return navigationSections.flatMap((section) =>
    section.items.flatMap((item) => [
      { ...item, section: section.key },
      ...(item.children || []).map((child) => ({ ...child, section: section.key })),
    ]),
  );
}
export function workspaceRoute(path: string) {
  const aliases: Record<string, string> = {
    '/sales': '/finance/invoicing',
    '/inventory/manage': '/inventory',
    '/admin/users': '/system/users',
    '/admin/roles': '/system/permissions',
    '/admin/permissions-matrix': '/system/permissions',
    '/finance/reports': '/reports',
    '/executive': '/dashboard',
  };
  return allWorkspaceLinks().find((link) => link.path === (aliases[path] || path));
}
