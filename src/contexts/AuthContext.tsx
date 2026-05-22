import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserWithDetails as User } from '../services/usersService';

interface AuthContextType {
  currentUser: SupabaseUser | null;
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => Promise<boolean>;
  isAdmin: () => Promise<boolean>;
  isManager: () => Promise<boolean>;
  isCashier: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error('[AuthProvider] getSession error:', error);
        setSession(null);
        setCurrentUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(data.session);
      setCurrentUser(data.session?.user ?? null);
      setUser(null);
      setLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSession(session);
      setCurrentUser(session?.user ?? null);
      setUser(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // User record creation should be handled by database trigger or separate API call
    if (data.user) {
      console.log('User created:', data.user.id);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
    setCurrentUser(null);
    setSession(null);
  };

  const hasPermission = async (permission: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { data, error } = await supabase.rpc('has_permission', {
        p_user_id: currentUser.id,
        p_permission_key: permission
      });

      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('Error checking permission:', err);
      return false;
    }
  };

  const isAdmin = async (): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { data, error } = await supabase.rpc('has_role', {
        p_user_id: currentUser.id,
        p_role_name: 'admin'
      });

      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('Error checking admin role:', err);
      return false;
    }
  };

  const isManager = async (): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const [managerResult, adminResult] = await Promise.all([
        supabase.rpc('has_role', { p_user_id: currentUser.id, p_role_name: 'manager' }),
        supabase.rpc('has_role', { p_user_id: currentUser.id, p_role_name: 'admin' })
      ]);

      return managerResult.data === true || adminResult.data === true;
    } catch (err) {
      console.error('Error checking manager role:', err);
      return false;
    }
  };

  const isCashier = async (): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const { data, error } = await supabase.rpc('has_role', {
        p_user_id: currentUser.id,
        p_role_name: 'cashier'
      });

      if (error) {
        console.error('Error checking cashier role:', error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error('Error checking cashier role:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
