import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../lib/supabase', () => ({ isDemoMode: false, supabase: mocks }));
import { listDirectoryRoles } from './adminDirectoryService';

function directory(roles: Record<string, unknown>[], mappings: Record<string, unknown>[] = []) {
  const roleQuery = { select: vi.fn(), order: vi.fn() };
  roleQuery.select.mockReturnValue(roleQuery);
  roleQuery.order.mockResolvedValue({ data: roles, error: null });
  const mappingQuery = { select: vi.fn(), eq: vi.fn() };
  mappingQuery.select.mockReturnValue(mappingQuery);
  mappingQuery.eq.mockResolvedValue({ data: mappings, error: null });
  mocks.from.mockImplementation((table: string) => (table === 'roles' ? roleQuery : mappingQuery));
  return { roleQuery, mappingQuery };
}
beforeEach(() => vi.clearAllMocks());
describe('Permission directory schema compatibility', () => {
  it('loads live permission_key/permission_name for role and matrix views without selecting absent key/name columns', async () => {
    const { mappingQuery } = directory(
      [{ id: 'role-1', name: 'manager', company_id: 'company-1' }],
      [
        {
          permission: {
            permission_key: 'inventory.view',
            permission_name: 'View inventory',
            category: 'inventory',
          },
        },
      ],
    );
    const roles = await listDirectoryRoles('company-1');
    expect(roles[0].permissions).toEqual([
      {
        permission_key: 'inventory.view',
        permission_name: 'View inventory',
        category: 'inventory',
      },
    ]);
    expect(mappingQuery.select).toHaveBeenCalledWith('permission:permissions(*)');
    expect(mappingQuery.eq).toHaveBeenCalledWith('role_id', 'role-1');
  });
  it('supports older key/name catalogs and embedded array responses without changing permission keys', async () => {
    directory(
      [{ id: 'role-1', name: 'manager', company_id: null }],
      [
        { permission: [{ key: 'finance.view', name: 'View finance', category: 'finance' }] },
        { permission: null },
      ],
    );
    expect((await listDirectoryRoles('company-1'))[0].permissions).toEqual([
      { permission_key: 'finance.view', permission_name: 'View finance', category: 'finance' },
    ]);
  });
  it('preserves role JSON grants and excludes another company while checking local mappings', async () => {
    const { mappingQuery } = directory([
      {
        id: 'local',
        name: 'manager',
        company_id: 'company-1',
        permissions: { 'inventory.view': true },
      },
      { id: 'foreign', name: 'admin', company_id: 'other-company', permissions: { all: true } },
    ]);
    const roles = await listDirectoryRoles('company-1');
    expect(roles.map((role) => role.id)).toEqual(['local']);
    expect(roles[0].permissions.map((permission) => permission.permission_key)).toEqual([
      'inventory.view',
    ]);
    expect(mappingQuery.eq.mock.calls).toEqual([['role_id', 'local']]);
  });
  it('shows relational grants for an empty JSON object and deduplicates overlapping JSON keys', async () => {
    directory(
      [
        { id: 'empty', name: 'manager', permissions: {} },
        {
          id: 'json',
          name: 'manager',
          permissions: { 'inventory.view': true, 'sales.view': true },
        },
      ],
      [
        {
          permission: {
            permission_key: 'inventory.view',
            permission_name: 'Inventory catalog label',
            category: 'inventory',
          },
        },
      ],
    );
    const roles = await listDirectoryRoles('company-1');
    expect(roles[0].permissions.map((permission) => permission.permission_key)).toEqual([
      'inventory.view',
    ]);
    expect(roles[1].permissions.map((permission) => permission.permission_key)).toEqual([
      'inventory.view',
      'sales.view',
    ]);
    expect(roles[1].permissions[0].permission_name).toBe('Inventory catalog label');
  });
  it.each(['42P01', 'PGRST205', 'PGRST200'])(
    'allows JSON-only display for explicitly missing mappings (%s)',
    async (code) => {
      const { mappingQuery } = directory([
        { id: 'json', name: 'manager', permissions: { 'sales.view': true } },
      ]);
      mappingQuery.eq.mockResolvedValue({
        data: null,
        error: { code, message: 'Mapping relation is missing' },
      });
      expect(
        (await listDirectoryRoles('company-1'))[0].permissions.map(
          (permission) => permission.permission_key,
        ),
      ).toEqual(['sales.view']);
    },
  );
  it('propagates mapping permission/network failures even when JSON grants exist', async () => {
    const { mappingQuery } = directory([
      { id: 'json', name: 'manager', permissions: { 'sales.view': true } },
    ]);
    mappingQuery.eq.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Permission denied' },
    });
    await expect(listDirectoryRoles('company-1')).rejects.toMatchObject({ code: '42501' });
    mappingQuery.eq.mockResolvedValue({ data: null, error: { message: 'Network unavailable' } });
    await expect(listDirectoryRoles('company-1')).rejects.toMatchObject({
      message: 'Network unavailable',
    });
  });
  it('does not hide missing mappings when no trusted JSON object is available', async () => {
    const { mappingQuery } = directory([{ id: 'no-json', name: 'manager' }]);
    mappingQuery.eq.mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'Missing relation' },
    });
    await expect(listDirectoryRoles('company-1')).rejects.toMatchObject({ code: '42P01' });
  });
  it('rejects a malformed canonical key instead of displaying undefined or substituting a conflicting alias', async () => {
    directory(
      [{ id: 'role-1', name: 'manager' }],
      [
        {
          permission: {
            permission_key: null,
            permission_name: 'Invalid',
            key: 'users.delete',
            name: 'Legacy',
          },
        },
      ],
    );
    await expect(listDirectoryRoles('company-1')).rejects.toThrow('missing its key');
  });
});
