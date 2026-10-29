import { describe, expect, it } from 'vitest';
import { assertAssignableRole, parseUserMutation } from '../../supabase/functions/manage-users/rules';
const actor = '11111111-1111-4111-8111-111111111111';
const target = '22222222-2222-4222-8222-222222222222';
const role = '33333333-3333-4333-8333-333333333333';
const valid = { action: 'invite', email: 'employee@example.com', first_name: 'Test', last_name: 'User', role_id: role };

describe('company user administration boundaries', () => {
  it('validates and normalizes invitation inputs without accepting company from the browser', () => {
    const result = parseUserMutation({ ...valid, email: ' EMPLOYEE@example.com ', company_id: 'attacker-company' }, actor);
    expect(result.email).toBe('employee@example.com');
    expect(result).not.toHaveProperty('company_id');
  });
  it('rejects self changes and invalid account states', () => {
    expect(() => parseUserMutation({ ...valid, action: 'update', user_id: actor }, actor)).toThrow('Self-editing');
    expect(() => parseUserMutation({ ...valid, action: 'update', user_id: target, status: 'admin' }, actor)).toThrow('status');
  });
  it.each(['owner', 'developer', 'super_admin'])('rejects granting protected role %s', name => {
    expect(() => assertAssignableRole({ name, company_id: null }, 'company-1')).toThrow('cannot be assigned');
  });
  it('rejects cross-company and inactive roles, while allowing same-company and global business roles', () => {
    expect(() => assertAssignableRole({ name: 'admin', company_id: 'company-2' }, 'company-1')).toThrow('another company');
    expect(() => assertAssignableRole({ name: 'employee', status: 'inactive' }, 'company-1')).toThrow('inactive');
    expect(() => assertAssignableRole({ name: 'employee', company_id: null }, 'company-1')).not.toThrow();
  });
  it('rejects malformed identifiers and invitation addresses', () => {
    expect(() => parseUserMutation({ ...valid, email: 'no-email' }, actor)).toThrow('email');
    expect(() => parseUserMutation({ ...valid, role_id: 'admin' }, actor)).toThrow('valid role');
  });
});
