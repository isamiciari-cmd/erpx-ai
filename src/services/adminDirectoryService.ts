import { isDemoMode, supabase } from '../lib/supabase';
import { legacyPermissions, roleFromName, type Permission } from '../lib/authAccess';

export interface DirectoryRole {
  id: string;
  name: string;
  display_name: string;
  company_id?: string | null;
  level: number;
  permissions: Permission[];
  is_system_role: boolean;
  status?: string;
}
export interface DirectoryUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  branch_id: string | null;
  status: string;
  created_at: string;
}
export interface DirectoryBranch {
  id: string;
  name: string;
}

function requireCompany(companyId: string) {
  if (!companyId || isDemoMode)
    throw new Error(
      'إدارة الحسابات تحتاج اتصالاً بقاعدة البيانات وشركة فعلية. لا تُرسل دعوات في الوضع التجريبي.',
    );
}

function directoryPermission(value: unknown): Permission {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid permission mapping returned by the directory.');
  }
  const row = value as Record<string, unknown>;
  const key = Object.hasOwn(row, 'permission_key') ? row.permission_key : row.key;
  const name = Object.hasOwn(row, 'permission_name') ? row.permission_name : row.name;
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('A directory permission mapping is missing its key.');
  }
  return {
    permission_key: key,
    permission_name: typeof name === 'string' && name ? name : key,
    category: typeof row.category === 'string' && row.category ? row.category : key.split('.')[0],
  };
}

export async function listDirectoryRoles(companyId: string): Promise<DirectoryRole[]> {
  requireCompany(companyId);
  const { data, error } = await supabase.from('roles').select('*').order('name');
  if (error) throw error;
  return Promise.all(
    (data || [])
      .filter((row) => row.company_id == null || row.company_id === companyId)
      .map(async (row) => {
        const hasJsonGrants =
          row.permissions !== null &&
          typeof row.permissions === 'object' &&
          !Array.isArray(row.permissions);
        const jsonPermissions = legacyPermissions(row.permissions);
        // Live effective permissions union JSON and relational grants, including
        // roles whose JSON object is empty. Never let that empty object hide mappings.
        const { data: mappings, error: mappingError } = await supabase
          .from('role_permissions')
          .select('permission:permissions(*)')
          .eq('role_id', row.id);
        if (
          mappingError &&
          !(hasJsonGrants && ['42P01', 'PGRST205', 'PGRST200'].includes(mappingError.code))
        )
          throw mappingError;
        const relationalPermissions = mappingError
          ? []
          : (mappings || []).flatMap((mapping) => {
              const value = Array.isArray(mapping.permission)
                ? mapping.permission
                : [mapping.permission];
              return value.filter(Boolean).map(directoryPermission);
            });
        // Keep the catalog's descriptive label when a JSON key and mapping overlap.
        const permissions = [
          ...new Map(
            [...jsonPermissions, ...relationalPermissions].map((permission) => [
              permission.permission_key,
              permission,
            ]),
          ).values(),
        ];
        return {
          ...row,
          display_name: row.display_name || row.name,
          level: roleFromName(row.name, row.display_name, row.level).level,
          permissions,
        } as DirectoryRole;
      }),
  );
}

export async function listCompanyDirectory(companyId: string) {
  requireCompany(companyId);
  const users: DirectoryUser[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('users')
      .select('id,email,first_name,last_name,role_id,branch_id,status,created_at')
      .eq('company_id', companyId)
      .order('id')
      .range(offset, offset + 499);
    if (error) throw error;
    users.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) break;
  }
  const [roles, branchesResult] = await Promise.all([
    listDirectoryRoles(companyId),
    supabase
      .from('branches')
      .select('id,name')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('name'),
  ]);
  if (branchesResult.error) throw branchesResult.error;
  return { users, roles, branches: (branchesResult.data ?? []) as DirectoryBranch[] };
}

export async function manageCompanyUser(body: Record<string, unknown>) {
  if (isDemoMode) throw new Error('إدارة المستخدمين غير متاحة في الوضع التجريبي.');
  const { data, error } = await supabase.functions.invoke('manage-users', { body });
  if (error) {
    if (error.context instanceof Response) {
      const details = await error.context.json().catch(() => null);
      if (details?.error) throw new Error(details.error);
    }
    throw new Error(
      'تعذر تنفيذ الإجراء. تحقق من نشر دالة manage-users وإعدادات دعوات البريد، ثم أعد المحاولة.',
    );
  }
  if (!data?.ok) throw new Error(data?.error || 'لم تؤكد خدمة الحسابات نجاح العملية.');
  return data as { ok: true; message?: string; audit_warning?: string };
}
