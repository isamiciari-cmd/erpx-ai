import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../lib/supabase', () => ({ isDemoMode: false, supabase: mocks }));
import { getCurrentUser } from './usersService';

beforeEach(() => vi.clearAllMocks());
describe('Canonical ERP user identity', () => {
  it('loads the Auth UUID primary-key profile even when legacy auth_id is null', async () => {
    const profile = { id: 'auth-uuid', auth_id: null, company_id: 'company-1' };
    const query = { select: vi.fn(), eq: vi.fn(), single: vi.fn() };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.single.mockResolvedValue({ data: profile, error: null });
    mocks.from.mockReturnValue(query);
    expect(await getCurrentUser('auth-uuid')).toBe(profile);
    expect(mocks.from).toHaveBeenCalledWith('users');
    expect(query.eq.mock.calls).toEqual([['id', 'auth-uuid']]);
  });
});
