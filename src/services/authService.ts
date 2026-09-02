import { supabase } from '../lib/supabase';
import { AuthError, User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyId?: string;
}

export interface AuthResponse {
  user: SupabaseUser | null;
  session: Session | null;
  error: AuthError | null;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateRequest {
  newPassword: string;
}

/**
 * Sign in with email and password
 */
export async function signIn(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return { user: null, session: null, error };
    }

    // Store remember me preference
    if (credentials.rememberMe) {
      localStorage.setItem('erpx_remember_me', 'true');
    } else {
      localStorage.removeItem('erpx_remember_me');
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      user: null,
      session: null,
      error: error as AuthError,
    };
  }
}

/**
 * Sign up new user
 */
export async function signUp(userData: SignUpData): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          company_id: userData.companyId,
        },
      },
    });

    if (error) {
      return { user: null, session: null, error };
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      user: null,
      session: null,
      error: error as AuthError,
    };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    // Clear local storage
    localStorage.removeItem('erpx_remember_me');

    return { error };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: error as AuthError };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<{
  session: Session | null;
  error: AuthError | null;
}> {
  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  } catch (error) {
    console.error('Get session error:', error);
    return { session: null, error: error as AuthError };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<{
  user: SupabaseUser | null;
  error: AuthError | null;
}> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  } catch (error) {
    console.error('Get user error:', error);
    return { user: null, error: error as AuthError };
  }
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(
  request: PasswordResetRequest,
): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(request.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  } catch (error) {
    console.error('Password reset request error:', error);
    return { error: error as AuthError };
  }
}

/**
 * Update user password
 */
export async function updatePassword(
  request: PasswordUpdateRequest,
): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: request.newPassword,
    });
    return { error };
  } catch (error) {
    console.error('Password update error:', error);
    return { error: error as AuthError };
  }
}

/**
 * Refresh session
 */
export async function refreshSession(): Promise<{
  session: Session | null;
  error: AuthError | null;
}> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return { session: data.session, error };
  } catch (error) {
    console.error('Refresh session error:', error);
    return { session: null, error: error as AuthError };
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { session } = await getCurrentSession();
  return session !== null;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
