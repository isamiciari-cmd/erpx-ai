import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readAccessSnapshot } from './authSession';
import { ProfileSetupRequiredError } from './authAccess';

const missing = { code: 'PGRST202', message: 'Missing function' };
const profile = { id: 'user-1', company_id: 'company-1', branch_id: null, role_id: 'role-1', status: 'active' };
const role = { id: 'role-1', company_id: null, name: 'employee', display_name: 'Employee', permissions: { read: true } };
const company = { id: 'company-1', name: 'Company one', currency: 'SAR' };
const branch = { id: 'branch-1', company_id: 'company-1', name: 'Main branch' };

function fixture(options: {
  profile?: unknown;
  role?: unknown;
  rpcError?: { code: string; message: string } | null;
  roles?: unknown[];
  permissions?: unknown[];
  company?: unknown;
  branch?: unknown;
  metadataError?: 'denied' | 'throws';
} = {}) {
  const queries: { table: string; select: string; filters: [string, unknown][] }[] = [];
  const from = vi.fn((table: string) => ({
    select: (fields: string) => {
      const request = { table, select: fields, filters: [] as [string, unknown][] };
      queries.push(request);
      interface Query {
        eq: (key: string, value: unknown) => Query;
        maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
      }
      const query: Query = {
        eq: (key, value) => { request.filters.push([key, value]); return query; },
        maybeSingle: async () => {
          if (['companies', 'branches'].includes(table) && options.metadataError) {
            if (options.metadataError === 'throws') throw new Error('Metadata transport failed');
            return { data: null, error: { message: 'permission denied' } };
          }
          const rows = {
            users: 'profile' in options ? options.profile : profile,
            roles: 'role' in options ? options.role : role,
            companies: 'company' in options ? options.company : company,
            branches: 'branch' in options ? options.branch : branch,
          };
          return { data: rows[table as keyof typeof rows], error: null };
        },
      };
      return query;
    },
  }));
  const rpc = vi.fn(async (name: string) => ({
    data: name === 'get_user_roles' ? options.roles ?? [] : options.permissions ?? [],
    error: 'rpcError' in options ? options.rpcError : missing,
  }));
  return { from, rpc, queries, client: { from, rpc } as unknown as Pick<SupabaseClient, 'from' | 'rpc'> };
}

describe('server-owned access snapshots', () => {
  it('offers company registration only for an absent profile, never a suspended account', async () => {
    await expect(readAccessSnapshot(fixture({ profile: null }).client, 'user-1')).rejects.toBeInstanceOf(ProfileSetupRequiredError);
    await expect(readAccessSnapshot(fixture({ profile: { ...profile, status: 'suspended' } }).client, 'user-1'))
      .rejects.not.toBeInstanceOf(ProfileSetupRequiredError);
  });
  it('supports the canonical schema and a valid user with no branch assignment', async () => {
    const { client, rpc } = fixture();
    const result = await readAccessSnapshot(client, 'user-1');
    expect(result.roles[0].role_name).toBe('employee');
    expect(result.permissions.some((p) => p.permission_key === 'finance.delete')).toBe(false);
    expect(rpc).toHaveBeenCalledWith('get_user_roles', { p_user_id: 'user-1' });
    expect(rpc).toHaveBeenCalledWith('get_user_permissions', { p_user_id: 'user-1' });
  });
  it('uses enterprise RPC assignments when present instead of a legacy primary admin role', async () => {
    const { client } = fixture({
      role: { ...role, name: 'admin', permissions: { all: true } }, rpcError: null,
      roles: [{ role_name: 'viewer', display_name: 'Viewer', level: 100 }],
      permissions: [{ permission_key: 'reports.view', permission_name: 'Reports', category: 'reports' }],
    });
    const result = await readAccessSnapshot(client, 'user-1');
    expect(result.roles.map((r) => r.role_name)).toEqual(['viewer']);
    expect(result.permissions.map((p) => p.permission_key)).toEqual(['reports.view']);
  });
  it('never falls back to an admin legacy grant after an authorization error', async () => {
    const { client } = fixture({
      role: { ...role, name: 'admin', permissions: { all: true } },
      rpcError: { code: '42501', message: 'permission denied' },
    });
    await expect(readAccessSnapshot(client, 'user-1')).rejects.toThrow('permission denied');
  });
  it('rejects an account with revoked RBAC assignments', async () => {
    await expect(readAccessSnapshot(fixture({ rpcError: null }).client, 'user-1')).rejects.toThrow('No active role');
  });
  it.each([
    null,
    { ...profile, status: 'suspended' },
    { ...profile, company_id: null },
    { ...profile, role_id: null },
    { ...profile, id: 'somebody-else' },
  ])('rejects missing, inactive or mismatched profiles before querying access', async (invalidProfile) => {
    const { client, rpc } = fixture({ profile: invalidProfile });
    await expect(readAccessSnapshot(client, 'user-1')).rejects.toThrow('ERP profile');
    expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects a role belonging to another company', async () => {
    await expect(readAccessSnapshot(fixture({ role: { ...role, company_id: 'company-2' } }).client, 'user-1'))
      .rejects.toThrow('another company');
  });
  it('rejects an inactive primary role', async () => {
    await expect(readAccessSnapshot(fixture({ role: { ...role, status: 'inactive' } }).client, 'user-1'))
      .rejects.toThrow('assigned role');
  });
  it('hydrates display company and branch only through the verified company membership', async () => {
    const { client, queries } = fixture({ profile: { ...profile, branch_id: branch.id } });
    const result = await readAccessSnapshot(client, profile.id);
    expect(result.user.company).toEqual(company);
    expect(result.user.branch).toEqual({ id: branch.id, name: branch.name });
    expect(queries.find(query => query.table === 'branches')).toEqual({
      table: 'branches', select: 'id,company_id,name',
      filters: [['id', branch.id], ['company_id', profile.company_id]],
    });
  });
  it('does not query or invent a branch for an unassigned user', async () => {
    const { client, queries } = fixture();
    const result = await readAccessSnapshot(client, profile.id);
    expect(result.user.branch).toBeUndefined();
    expect(queries.some(query => query.table === 'branches')).toBe(false);
  });
  it('discards mismatched metadata and nested profile display values', async () => {
    const { client } = fixture({
      profile: { ...profile, branch_id: branch.id, branch: { id: 'other', name: 'Forged branch' }, company: { name: 'Forged company' } },
      company: { ...company, id: 'company-2' },
      branch: { ...branch, company_id: 'company-2' },
    });
    const result = await readAccessSnapshot(client, profile.id);
    expect(result.user.company).toBeUndefined();
    expect(result.user.branch).toBeUndefined();
    expect(result.user.company_id).toBe(profile.company_id);
    expect(result.roles[0].role_name).toBe('employee');
  });
  it.each(['denied', 'throws'] as const)('does not change authorization when optional display reads are %s', async metadataError => {
    const { client } = fixture({ profile: { ...profile, branch_id: branch.id }, metadataError });
    const result = await readAccessSnapshot(client, profile.id);
    expect(result.user.id).toBe(profile.id);
    expect(result.user.company).toBeUndefined();
    expect(result.user.branch).toBeUndefined();
    expect(result.roles[0].role_name).toBe('employee');
    expect(result.permissions.some(permission => permission.permission_key === 'finance.delete')).toBe(false);
  });
});
