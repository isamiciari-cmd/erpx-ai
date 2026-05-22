import { supabase, isDemoMode } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  company_id: string;
  branch_id: string;
  department: string | null;
  position: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithDetails extends User {
  role: {
    id: string;
    name: string;
    display_name: string;
    permissions: any;
  };
  company: {
    id: string;
    name: string;
    currency: string;
  };
  branch: {
    id: string;
    name: string;
  };
}

// Get current user by auth ID
export async function getCurrentUser(authId: string): Promise<UserWithDetails | null> {
  if (isDemoMode) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      role:roles(*),
      company:companies(id, name, currency),
      branch:branches(id, name)
    `)
    .eq('auth_id', authId)
    .single();

  if (error) {
    console.error('[Supabase] getCurrentUser error:', error);
    throw error;
  }

  return data;
}

// List all users in a company
export async function listUsers(companyId: string): Promise<User[]> {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] listUsers error:', error);
    throw error;
  }

  return data || [];
}

// Create new user
export async function createUser(userData: Partial<User>): Promise<User> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot create users');
  }

  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] createUser error:', error);
    throw error;
  }

  return data;
}

// Update user
export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot update users');
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] updateUser error:', error);
    throw error;
  }

  return data;
}

// Delete user
export async function deleteUser(userId: string): Promise<void> {
  if (isDemoMode) {
    throw new Error('Demo mode: Cannot delete users');
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('[Supabase] deleteUser error:', error);
    throw error;
  }
}
