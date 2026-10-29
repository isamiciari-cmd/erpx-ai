import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, isDemoMode, getDemoUser, hasSupabaseConfig } from '../lib/supabase';
import { demoRole, legacyPermissions, roleFromName, withAuthTimeout, type Permission, type UserRole } from '../lib/authAccess';
import { readAccessSnapshot } from '../lib/authSession';
import type { UserWithDetails as User } from '../services/usersService';

interface AuthState {
  currentUser: SupabaseUser | null;
  session: Session | null;
  user: User | null;
  roles: UserRole[];
  permissions: Permission[];
  loading: boolean;
  accessError: Error | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: unknown) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
  canAccessTenant: (tenantId: string) => Promise<boolean>;
  hasPermission: (permission: string) => Promise<boolean>;
  isAdmin: () => Promise<boolean>;
  isManager: () => Promise<boolean>;
  isCashier: () => Promise<boolean>;
}

const emptyState: AuthState = {
  currentUser: null, session: null, user: null, roles: [], permissions: [], loading: false, accessError: null,
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const configError = () => new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild the application.');

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

function demoState(email: string): AuthState {
  const identity = getDemoUser(email);
  const roleName = demoRole(email);
  const role = roleFromName(roleName);
  const grants = ['admin', 'developer', 'owner', 'super_admin'].includes(roleName)
    ? { all: true }
    : roleName === 'cashier' ? { pos: true } : roleName === 'manager'
      ? { finance: true, inventory: true, sales: true, purchases: true, hr: true, reports: true }
      : { read: true };
  const now = new Date().toISOString();
  const user = {
    id: identity.id, email: identity.email, first_name: 'Demo', last_name: 'User',
    role_id: roleName + '-role', company_id: 'demo-company', branch_id: 'demo-branch',
    department: 'Operations', position: role.display_name, phone_number: null, avatar_url: null,
    status: 'active', created_at: now, updated_at: now,
    role: { id: roleName + '-role', name: roleName, display_name: role.display_name, permissions: grants },
    company: { id: 'demo-company', name: 'Local Demo', currency: 'SAR' },
    branch: { id: 'demo-branch', name: 'Local Demo' },
  } as User;
  return {
    currentUser: identity,
    session: { access_token: 'local-demo', refresh_token: '', expires_in: 3600, token_type: 'bearer', user: identity },
    user, roles: [role], permissions: legacyPermissions(grants), loading: false, accessError: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...emptyState, loading: true });
  const stateRef = useRef(state);
  stateRef.current = state;
  const generationRef = useRef(0);
  const mountedRef = useRef(false);

  const applySession = useCallback(async (nextSession: Session | null) => {
    const generation = ++generationRef.current;
    const pending: AuthState = {
      ...emptyState, session: nextSession, currentUser: nextSession?.user ?? null, loading: !!nextSession,
    };
    // Clear the previous identity's privileges before fetching the next profile.
    stateRef.current = pending;
    if (mountedRef.current) setState(pending);
    if (!nextSession) return;
    try {
      const access = await withAuthTimeout(readAccessSnapshot(supabase, nextSession.user.id));
      if (!mountedRef.current || generation !== generationRef.current) return;
      const resolved = { ...pending, ...access, loading: false };
      stateRef.current = resolved;
      setState(resolved);
    } catch (cause) {
      if (!mountedRef.current || generation !== generationRef.current) return;
      const failed = { ...pending, loading: false, accessError: cause instanceof Error ? cause : new Error('Unable to verify access.') };
      stateRef.current = failed;
      setState(failed);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    mountedRef.current = true;
    // Older login implementations stored plaintext passwords. Always remove them.
    localStorage.removeItem('erpx_demo_password');
    if (isDemoMode) {
      const email = localStorage.getItem('erpx_demo_email');
      const next = email ? demoState(email) : emptyState;
      stateRef.current = next;
      setState(next);
      return () => { disposed = true; mountedRef.current = false; generationRef.current++; };
    }
    localStorage.removeItem('erpx_demo_email');
    if (!hasSupabaseConfig) {
      setState({ ...emptyState, accessError: configError() });
      return () => { disposed = true; mountedRef.current = false; generationRef.current++; };
    }

    let authEventReceived = false;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (disposed || !mountedRef.current) return;
      authEventReceived = true;
      // Immediately revoke old access. Do not await Supabase work inside its auth callback lock.
      const pending = { ...emptyState, session: nextSession, currentUser: nextSession?.user ?? null, loading: !!nextSession };
      stateRef.current = pending;
      generationRef.current++;
      if (mountedRef.current) setState(pending);
      const eventGeneration = generationRef.current;
      setTimeout(() => {
        if (!disposed && mountedRef.current && eventGeneration === generationRef.current) void applySession(nextSession);
      }, 0);
    });
    void withAuthTimeout(supabase.auth.getSession()).then(({ data, error }) => {
      if (disposed || !mountedRef.current || authEventReceived) return;
      if (error) throw error;
      return applySession(data.session);
    }).catch((cause) => {
      if (disposed || !mountedRef.current || authEventReceived) return;
      setState({ ...emptyState, accessError: cause instanceof Error ? cause : new Error('Unable to initialize authentication.') });
    });
    return () => {
      disposed = true;
      mountedRef.current = false;
      generationRef.current++;
      listener.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isDemoMode) {
      const next = demoState(email.trim().toLowerCase());
      generationRef.current++;
      localStorage.setItem('erpx_demo_email', email.trim().toLowerCase());
      stateRef.current = next;
      setState(next);
      return;
    }
    if (!hasSupabaseConfig) throw configError();
    const { data, error } = await withAuthTimeout(supabase.auth.signInWithPassword({ email: email.trim(), password }));
    if (error) throw error;
    if (!data.session) throw new Error('Sign-in did not create an authenticated session.');
    await applySession(data.session);
  }, [applySession]);

  const signUp = useCallback(async (email: string, password: string, _userData: unknown) => {
    if (!hasSupabaseConfig || isDemoMode) throw configError();
    // Authorization and company assignment are provisioned by a trusted server, never user metadata.
    const { error } = await withAuthTimeout(supabase.auth.signUp({ email: email.trim(), password }));
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    generationRef.current++;
    stateRef.current = emptyState;
    setState(emptyState);
    localStorage.removeItem('erpx_demo_email');
    localStorage.removeItem('erpx_demo_password');
    if (isDemoMode || !hasSupabaseConfig) return;
    const { error } = await withAuthTimeout(supabase.auth.signOut());
    if (error) throw error;
  }, []);

  const refreshAccess = useCallback(async () => {
    if (isDemoMode) return;
    if (!hasSupabaseConfig) throw configError();
    await applySession(stateRef.current.session);
  }, [applySession]);

  const canAccessTenant = useCallback(async (tenantId: string): Promise<boolean> => {
    const before = stateRef.current;
    if (!before.currentUser || !before.user || before.loading || before.accessError || !tenantId) return false;
    if (isDemoMode) return tenantId === before.user.company_id;
    const generation = generationRef.current;
    try {
      const { data, error } = await withAuthTimeout(supabase.rpc('can_access_tenant', {
        p_user_id: before.currentUser.id, p_tenant_id: tenantId,
      }));
      // Canonical installations use company IDs; do not substitute after a denial or failure.
      if (isMissingTenantRpc(error)) return generation === generationRef.current && tenantId === before.user.company_id;
      return generation === generationRef.current && !error && data === true;
    } catch { return false; }
  }, []);

  const value = useMemo<AuthContextType>(() => {
    const ready = !state.loading && !state.accessError && !!state.user;
    const hasRole = (names: string[]) => ready && state.roles.some((role) => names.includes(role.role_name));
    return {
      ...state, signIn, signUp, signOut, refreshAccess, canAccessTenant,
      hasPermission: async (key) => ready && state.permissions.some((permission) => permission.permission_key === key),
      isAdmin: async () => hasRole(['owner', 'developer', 'super_admin', 'admin']),
      isManager: async () => hasRole(['owner', 'developer', 'super_admin', 'admin', 'manager']),
      isCashier: async () => hasRole(['cashier']),
    };
  }, [state, signIn, signUp, signOut, refreshAccess, canAccessTenant]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isMissingTenantRpc(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST202' || error?.code === '42883';
}

