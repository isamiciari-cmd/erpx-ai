const invoiceEditorRoles = new Set([
  'owner', 'developer', 'super_admin', 'admin', 'manager', 'accountant', 'finance_manager',
]);

export function mayWriteInvoiceModule(
  roles: readonly { role_name: string }[],
  permissions: readonly { permission_key: string }[],
  module: string,
) {
  return roles.some(role => invoiceEditorRoles.has(role.role_name)) ||
    permissions.some(permission =>
      ['finance', 'finance.write', 'finance.create', module, '*', 'all'].includes(permission.permission_key),
    );
}
