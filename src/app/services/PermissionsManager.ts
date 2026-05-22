/**
 * Permissions Manager - RBAC system for SaaS platform
 */

export type Permission =
  | "tenants.manage"
  | "tenants.view"
  | "billing.manage"
  | "billing.view"
  | "modules.manage"
  | "modules.view"
  | "system.shutdown"
  | "system.monitor"
  | "users.manage"
  | "users.view"
  | "analytics.view"
  | "webhooks.manage";

export type Role = "super_admin" | "admin" | "tenant_admin" | "user" | "viewer";

interface RoleDefinition {
  name: Role;
  permissions: Permission[];
  description: string;
}

class PermissionsManager {
  private roles: Map<Role, RoleDefinition>;

  constructor() {
    this.roles = new Map();
    this.initializeRoles();
  }

  private initializeRoles() {
    // Super Admin - Full platform control
    this.roles.set("super_admin", {
      name: "super_admin",
      permissions: [
        "tenants.manage",
        "tenants.view",
        "billing.manage",
        "billing.view",
        "modules.manage",
        "modules.view",
        "system.shutdown",
        "system.monitor",
        "users.manage",
        "users.view",
        "analytics.view",
        "webhooks.manage",
      ],
      description: "Full platform access - can manage all aspects of the SaaS platform",
    });

    // Admin - Platform management without shutdown
    this.roles.set("admin", {
      name: "admin",
      permissions: [
        "tenants.manage",
        "tenants.view",
        "billing.view",
        "modules.view",
        "system.monitor",
        "users.manage",
        "users.view",
        "analytics.view",
      ],
      description: "Platform administrator - can manage tenants and users",
    });

    // Tenant Admin - Manages their own tenant
    this.roles.set("tenant_admin", {
      name: "tenant_admin",
      permissions: ["users.manage", "users.view", "analytics.view", "billing.view"],
      description: "Tenant administrator - manages users within their organization",
    });

    // Regular User
    this.roles.set("user", {
      name: "user",
      permissions: ["users.view"],
      description: "Regular user - basic access to their workspace",
    });

    // Viewer - Read-only access
    this.roles.set("viewer", {
      name: "viewer",
      permissions: ["tenants.view", "billing.view", "modules.view", "analytics.view"],
      description: "View-only access for monitoring and reporting",
    });
  }

  hasPermission(role: Role, permission: Permission): boolean {
    const roleDefinition = this.roles.get(role);
    if (!roleDefinition) return false;

    return roleDefinition.permissions.includes(permission);
  }

  getRolePermissions(role: Role): Permission[] {
    const roleDefinition = this.roles.get(role);
    return roleDefinition ? roleDefinition.permissions : [];
  }

  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  canAccessModule(role: Role, module: string): boolean {
    const adminModules = [
      "control-tower",
      "tenants",
      "studio",
      "metrics",
      "usage",
      "webhooks",
    ];

    if (adminModules.includes(module)) {
      return this.hasPermission(role, "tenants.manage") || role === "viewer";
    }

    return true; // Regular modules accessible to all roles
  }

  // Check multiple permissions
  hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every((permission) => this.hasPermission(role, permission));
  }

  hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some((permission) => this.hasPermission(role, permission));
  }
}

export const permissionsManager = new PermissionsManager();

// Helper functions
export function checkPermission(role: Role, permission: Permission): boolean {
  return permissionsManager.hasPermission(role, permission);
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!permissionsManager.hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${role} does not have ${permission}`);
  }
}

export function isSuperAdmin(role: Role): boolean {
  return role === "super_admin";
}

export default permissionsManager;
