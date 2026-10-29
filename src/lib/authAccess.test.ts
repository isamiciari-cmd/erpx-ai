import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoRole, isMissingRpc, legacyPermissions, roleFromName, routeAccess, withAuthTimeout } from './authAccess';
import { allowsLocalDemo } from './devMode';

afterEach(() => vi.useRealTimers());

function input(names: string[] = ['employee']) {
  return {
    authenticated: true, loading: false, error: false, profileReady: true,
    roles: names.map((name) => roleFromName(name)), permissions: legacyPermissions({ read: true }),
    pathname: '/dashboard',
  };
}

describe('route authorization', () => {
  it('denies a regular user from an administrative role array', () => {
    expect(routeAccess({ ...input(), requiredRoles: ['owner', 'developer', 'super_admin', 'admin'] })).toBe('denied');
  });
  it.each(['owner', 'developer', 'super_admin', 'admin'])('accepts an explicitly allowed %s role', (name) => {
    expect(routeAccess({ ...input([name]), requiredRoles: ['owner', 'developer', 'super_admin', 'admin'] })).toBe('allow');
  });
  it('does not implicitly elevate an admin into owner-only access', () => {
    expect(routeAccess({ ...input(['admin']), requiredRoles: ['owner'] })).toBe('denied');
  });
  it('requires both a role and a permission when both are configured', () => {
    expect(routeAccess({ ...input(['admin']), requiredRoles: ['admin'], requiredPermission: 'users.delete' })).toBe('denied');
  });
  it('blocks content until all authentication and access checks finish', () => {
    expect(routeAccess({ ...input(['admin']), loading: true })).toBe('loading');
    expect(routeAccess({ ...input(['admin']), error: true })).toBe('unavailable');
    expect(routeAccess({ ...input(['admin']), profileReady: false })).toBe('unavailable');
    expect(routeAccess({ ...input(['admin']), authenticated: false })).toBe('login');
  });
  it('isolates cashiers and never treats a pathname prefix as an authorization grant', () => {
    expect(routeAccess(input(['cashier']))).toBe('cashier');
    expect(routeAccess({ ...input(['cashier']), pathname: '/cashier/pos', requiredRoles: ['cashier'] })).toBe('allow');
    expect(routeAccess({ ...input(), pathname: '/cashier/pos', requiredRoles: ['cashier'] })).toBe('denied');
    expect(routeAccess({ ...input(['cashier']), pathname: '/cashier-admin' })).toBe('cashier');
  });
});

describe('safe legacy and development behavior', () => {
  it('expands actual boolean module grants without treating false or strings as grants', () => {
    const keys = legacyPermissions({ finance: true, hr: false, sales: 'true' }).map((p) => p.permission_key);
    expect(keys).toContain('finance.create');
    expect(keys).not.toContain('hr.view');
    expect(keys).not.toContain('sales.view');
  });
  it('keeps read-only users read-only and excludes platform overrides from business all', () => {
    const read = legacyPermissions({ read: true }).map((p) => p.permission_key);
    expect(read).toContain('finance.view');
    expect(read).not.toContain('finance.delete');
    const all = legacyPermissions({ all: true }).map((p) => p.permission_key);
    expect(all).toContain('finance.delete');
    expect(all).not.toContain('owner.override');
    expect(all).not.toContain('developer.mode');
  });
  it('permits demo authentication only with explicit enablement in local dev', () => {
    expect(allowsLocalDemo(true, 'true', 'localhost')).toBe(true);
    expect(allowsLocalDemo(true, undefined, 'localhost')).toBe(false);
    expect(allowsLocalDemo(false, 'true', 'localhost')).toBe(false);
    expect(allowsLocalDemo(true, 'true', 'staging.example.com')).toBe(false);
    expect(allowsLocalDemo(true, 'true', 'dev.attacker.com')).toBe(false);
    expect(allowsLocalDemo(true, 'true', 'localhost.attacker.com')).toBe(false);
  });
  it('does not turn an arbitrary demo email into an admin', () => {
    expect(demoRole('not-an-admin@example.com')).toBe('employee');
    expect(demoRole('cashier@example.com')).toBe('cashier');
    expect(demoRole('employee@example.com')).toBe('employee');
  });
  it('only uses legacy grants for missing RPCs, never permission or network failures', () => {
    expect(isMissingRpc({ code: 'PGRST202' })).toBe(true);
    expect(isMissingRpc({ code: '42883' })).toBe(true);
    expect(isMissingRpc({ code: '42501' })).toBe(false);
    expect(isMissingRpc({ code: 'PGRST301' })).toBe(false);
  });
  it('rejects a hanging access request and clears its timer after completion', async () => {
    vi.useFakeTimers();
    const hanging = withAuthTimeout(new Promise(() => {}), 100);
    const assertion = expect(hanging).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    await expect(withAuthTimeout(Promise.resolve('verified'), 100)).resolves.toBe('verified');
    expect(vi.getTimerCount()).toBe(0);
  });
});
