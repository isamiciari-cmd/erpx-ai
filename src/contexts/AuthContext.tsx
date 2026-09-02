import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { ReactNode } from 'react';

import {
  User as SupabaseUser,
  Session,
} from '@supabase/supabase-js';

import { supabase, isDemoMode, getDemoUser } from '../lib/supabase';
import { UserWithDetails as User } from '../services/usersService';

interface AuthContextType {
  currentUser: SupabaseUser | null;
  session: Session | null;
  user: User | null;
  loading: boolean;

  signIn: (
    email: string,
    password: string
  ) => Promise<void>;

  signUp: (
    email: string,
    password: string,
    userData: any
  ) => Promise<void>;

  signOut: () => Promise<void>;

  hasPermission: (
    permission: string
  ) => Promise<boolean>;

  isAdmin: () => Promise<boolean>;
  isManager: () => Promise<boolean>;
  isCashier: () => Promise<boolean>;
}

const DEV_ERPX_DASHBOARD_OVERRIDE_USER_ID = 'b54274f7-7550-4200-84c5-33e143f2ee62';
const DEV_ERPX_DASHBOARD_OVERRIDE_USER_EMAIL = 'i.sami.ciari@erpx-ai.net';

const isDevErpxDashboardOverrideUser = (authUser: SupabaseUser | null | undefined) => {
  const viteEnv = typeof import.meta !== 'undefined' && 'env' in import.meta ? (import.meta as any).env : undefined;

  if (!viteEnv?.DEV || !authUser?.id || !authUser?.email) {
    return false;
  }

  return (
    authUser.id === DEV_ERPX_DASHBOARD_OVERRIDE_USER_ID &&
    authUser.email.toLowerCase() === DEV_ERPX_DASHBOARD_OVERRIDE_USER_EMAIL.toLowerCase()
  );
};

const createDevErpxDashboardOverrideUser = (authUser: SupabaseUser): User => {
  console.log('[DEV ONLY] ERPX dashboard override enabled for i.sami.ciari@erpx-ai.net');

  return {
    id: authUser.id,
    email: authUser.email ?? DEV_ERPX_DASHBOARD_OVERRIDE_USER_EMAIL,
    first_name: 'Sami',
    last_name: 'Ciari',
    role_id: 'dev-override-admin-role',
    company_id: 'dev-override-company',
    branch_id: 'dev-override-branch',
    department: 'Operations',
    position: 'Administrator',
    phone_number: null,
    avatar_url: null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as User;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [currentUser, setCurrentUser] =
    useState<SupabaseUser | null>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  const setDemoSession = (email: string) => {
    const demoUser = getDemoUser(email);
    const demoProfile = {
      id: demoUser.id,
      email: demoUser.email,
      first_name: 'Demo',
      last_name: 'User',
      role_id: email.includes('cashier') ? 'cashier-role' : 'admin-role',
      company_id: 'demo-company',
      branch_id: 'demo-branch',
      department: 'Operations',
      position: email.includes('cashier') ? 'Cashier' : 'Admin',
      phone_number: null,
      avatar_url: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User;

    localStorage.setItem('erpx_demo_email', email);
    setSession({
      access_token: 'demo-access-token',
      refresh_token: 'demo-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: demoUser,
      provider_token: null,
      provider_refresh_token: null,
    } as Session);
    setCurrentUser(demoUser as SupabaseUser);
    setUser(demoProfile);
  };

  /**
   * Load ERPX user profile.
   *
   * IMPORTANT:
   * users.id = auth.users.id
   */
  const loadUserProfile = async (
    authUser: SupabaseUser | null
  ) => {
    if (!authUser) {
      setUser(null);
      return;
    }

    try {
      console.log(
        '[AuthProvider] Loading ERPX user:',
        authUser.id
      );

      /*
       * First load the user record only.
       *
       * We intentionally do NOT load roles,
       * companies or branches here.
       *
       * This avoids PostgREST relationship errors
       * while authentication is initialized.
       */
      const {
        data,
        error,
      } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error(
          '[AuthProvider] Failed to load ERPX user:',
          error
        );

        if (isDevErpxDashboardOverrideUser(authUser)) {
          console.warn(
            '[AuthProvider] DEV ERPX dashboard override used because profile query failed for',
            authUser.email
          );

          const fallbackUser = createDevErpxDashboardOverrideUser(authUser);
          setUser(fallbackUser);
          return;
        }

        setUser(null);
        return;
      }

      if (!data) {
        console.warn(
          '[AuthProvider] No ERPX user profile found:',
          authUser.id
        );

        if (isDevErpxDashboardOverrideUser(authUser)) {
          console.warn(
            '[AuthProvider] DEV ERPX dashboard override used because the ERPX profile was missing for',
            authUser.email
          );

          const fallbackUser = createDevErpxDashboardOverrideUser(authUser);
          setUser(fallbackUser);
          return;
        }

        setUser(null);
        return;
      }

      const profileIsMissingRole = !data.role_id;
      const profileIsMissingTenant = !data.company_id || !data.branch_id;
      const profileIsInactive = data.status && String(data.status).toLowerCase() !== 'active';

      if (
        profileIsMissingRole ||
        profileIsMissingTenant ||
        profileIsInactive
      ) {
        if (isDevErpxDashboardOverrideUser(authUser)) {
          const fallbackUser = createDevErpxDashboardOverrideUser(authUser);
          setUser(fallbackUser);
          return;
        }

        setUser(null);
        return;
      }

      console.log(
        '[AuthProvider] ERPX user loaded:',
        {
          id: data.id,
          email: data.email,
          company_id: data.company_id,
          branch_id: data.branch_id,
          role_id: data.role_id,
          status: data.status,
        }
      );

      setUser(data as User);
    } catch (error) {
      console.error(
        '[AuthProvider] Unexpected profile error:',
        error
      );

      setUser(null);
    }
  };

  /**
   * Initialize authentication.
   */
  useEffect(() => {
    let mounted = true;
    let initTimeout: ReturnType<typeof setTimeout> | null = null;

    const initializeAuth = async () => {
      // Fail-safe: ensure we don't stay in loading state forever
      initTimeout = setTimeout(() => {
        if (mounted) {
          console.warn('[AuthProvider] ⚠️ Initialization timeout - forcing loading=false');
          setLoading(false);
        }
      }, 6000);
      try {
        console.log(
          '[AuthProvider] Initializing authentication...'
        );

        if (isDemoMode) {
          const storedEmail = localStorage.getItem('erpx_demo_email');

          if (storedEmail) {
            setDemoSession(storedEmail);
          }

          if (mounted) {
            setLoading(false);
          }

          return;
        }

        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            '[AuthProvider] getSession error:',
            error
          );

          setSession(null);
          setCurrentUser(null);
          setUser(null);
          setLoading(false);

          return;
        }

        const currentSession = data.session;

        setSession(currentSession);
        setCurrentUser(
          currentSession?.user ?? null
        );

        if (currentSession?.user) {
          await loadUserProfile(
            currentSession.user
          );
        } else {
          setUser(null);
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error(
          '[AuthProvider] Authentication initialization failed:',
          error
        );

        if (mounted) {
          setSession(null);
          setCurrentUser(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    /**
     * Listen for Supabase authentication changes.
     */
    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          if (!mounted) {
            return;
          }

          console.log(
            '[AuthProvider] Auth state changed:',
            _event
          );

          setSession(newSession);

          setCurrentUser(
            newSession?.user ?? null
          );

          if (newSession?.user) {
            await loadUserProfile(
              newSession.user
            );
          } else {
            setUser(null);
          }

          if (mounted) {
            setLoading(false);
          }
        }
      );

    return () => {
      mounted = false;
      if (initTimeout) clearTimeout(initTimeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in.
   */
  const signIn = async (
    email: string,
    password: string
  ) => {
    if (isDemoMode) {
      setDemoSession(email.trim() || 'admin@erpx-ai.com');
      return;
    }

    const {
      error,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  /**
   * Sign up.
   */
  const signUp = async (
    email: string,
    password: string,
    userData: any
  ) => {
    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      console.log(
        '[AuthProvider] Supabase user created:',
        data.user.id
      );

      console.log(
        '[AuthProvider] Registration data:',
        userData
      );
    }
  };

  /**
   * Sign out.
   */
  const signOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem('erpx_demo_email');
      setUser(null);
      setCurrentUser(null);
      setSession(null);
      return;
    }

    const {
      error,
    } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setUser(null);
    setCurrentUser(null);
    setSession(null);
  };

  /**
   * Permission check.
   */
  const hasPermission = async (
    permission: string
  ): Promise<boolean> => {
    if (!currentUser) {
      return false;
    }

    if (isDevErpxDashboardOverrideUser(currentUser)) {
      return true;
    }

    if (isDemoMode) {
      const email = currentUser.email || '';
      return email.includes('admin') || email.includes('developer') || email.includes('manager') || permission === 'view_dashboard';
    }

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        'has_permission',
        {
          p_user_id: currentUser.id,
          p_permission_key: permission,
        }
      );

      if (error) {
        console.error(
          '[AuthProvider] Permission error:',
          error
        );

        return false;
      }

      return data === true;
    } catch (error) {
      console.error(
        '[AuthProvider] Permission check failed:',
        error
      );

      return false;
    }
  };

  /**
   * Check Admin.
   */
  const isAdmin = async (): Promise<boolean> => {
    if (!currentUser) {
      return false;
    }

    if (isDevErpxDashboardOverrideUser(currentUser)) {
      return true;
    }

    if (isDemoMode) {
      const email = currentUser.email || '';
      return email.includes('admin') || email.includes('developer');
    }

    try {
      const [
        adminResult,
        superAdminResult,
      ] = await Promise.all([
        supabase.rpc('has_role', {
          p_user_id: currentUser.id,
          p_role_name: 'admin',
        }),

        supabase.rpc('has_role', {
          p_user_id: currentUser.id,
          p_role_name: 'super_admin',
        }),
      ]);

      if (adminResult.error) {
        console.error(
          '[AuthProvider] Admin role error:',
          adminResult.error
        );
      }

      if (superAdminResult.error) {
        console.error(
          '[AuthProvider] Super admin role error:',
          superAdminResult.error
        );
      }

      return (
        adminResult.data === true ||
        superAdminResult.data === true
      );
    } catch (error) {
      console.error(
        '[AuthProvider] Admin check failed:',
        error
      );

      return false;
    }
  };

  /**
   * Check Manager.
   */
  const isManager = async (): Promise<boolean> => {
    if (!currentUser) {
      return false;
    }

    if (isDevErpxDashboardOverrideUser(currentUser)) {
      return true;
    }

    if (isDemoMode) {
      const email = currentUser.email || '';
      return email.includes('manager') || email.includes('admin') || email.includes('developer');
    }

    try {
      const [
        managerResult,
        adminResult,
        superAdminResult,
      ] = await Promise.all([
        supabase.rpc('has_role', {
          p_user_id: currentUser.id,
          p_role_name: 'manager',
        }),

        supabase.rpc('has_role', {
          p_user_id: currentUser.id,
          p_role_name: 'admin',
        }),

        supabase.rpc('has_role', {
          p_user_id: currentUser.id,
          p_role_name: 'super_admin',
        }),
      ]);

      return (
        managerResult.data === true ||
        adminResult.data === true ||
        superAdminResult.data === true
      );
    } catch (error) {
      console.error(
        '[AuthProvider] Manager check failed:',
        error
      );

      return false;
    }
  };

  /**
   * Check Cashier.
   */
  const isCashier = async (): Promise<boolean> => {
    if (!currentUser) {
      return false;
    }

    if (isDevErpxDashboardOverrideUser(currentUser)) {
      return false;
    }

    if (isDemoMode) {
      const email = currentUser.email || '';
      return email.includes('cashier');
    }

    try {
      const {
        data,
        error,
      } = await supabase.rpc('has_role', {
        p_user_id: currentUser.id,
        p_role_name: 'cashier',
      });

      if (error) {
        console.error(
          '[AuthProvider] Cashier role error:',
          error
        );

        return false;
      }

      return data === true;
    } catch (error) {
      console.error(
        '[AuthProvider] Cashier check failed:',
        error
      );

      return false;
    }
  };

  const value: AuthContextType = {
    currentUser,
    session,
    user,
    loading,

    signIn,
    signUp,
    signOut,

    hasPermission,
    isAdmin,
    isManager,
    isCashier,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

