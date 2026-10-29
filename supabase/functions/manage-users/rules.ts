export const protectedRoles = ['owner', 'developer', 'super_admin'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseUserMutation(body: Record<string, unknown>, callerId: string) {
  if (body.action !== 'invite' && body.action !== 'update') throw new Error('Choose invite or update.');
  const action = body.action;
  const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : '';
  const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : '';
  if (!firstName || firstName.length > 100 || lastName.length > 100) throw new Error('Enter a first name and use at most 100 characters per name.');
  const roleId = String(body.role_id ?? '');
  const branchId = body.branch_id ? String(body.branch_id) : null;
  if (!uuid.test(roleId) || (branchId !== null && !uuid.test(branchId))) throw new Error('Select a valid role and branch.');
  const status = body.status ?? 'active';
  if (!['active', 'inactive', 'suspended'].includes(String(status))) throw new Error('Invalid account status.');
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const targetId = String(body.user_id ?? '');
  if (action === 'invite' && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Enter a valid invitation email.');
  if (action === 'update' && (!uuid.test(targetId) || targetId === callerId)) throw new Error('Select another company user. Self-editing access is not allowed.');
  return { action, firstName, lastName, roleId, branchId, status: String(status), email, targetId };
}

export function assertAssignableRole(role: { name: string; company_id?: string | null; status?: string }, companyId: string) {
  if (protectedRoles.includes(role.name.toLowerCase())) throw new Error('Platform owner, developer and super-admin access cannot be assigned here.');
  if (role.company_id != null && role.company_id !== companyId) throw new Error('This role belongs to another company.');
  if (role.status != null && role.status !== 'active') throw new Error('This role is inactive.');
}
