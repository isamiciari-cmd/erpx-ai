import { createClient } from '@supabase/supabase-js';

console.log('[Supabase] Initializing Supabase client...');

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('[Supabase] Environment variables:');
console.log('[Supabase] VITE_SUPABASE_URL:', supabaseUrl ? `✓ ${supabaseUrl.substring(0, 30)}...` : '✗ Missing');
console.log('[Supabase] VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `✓ ${supabaseAnonKey.substring(0, 20)}...` : '✗ Missing');

// Check if Supabase is configured
const hasSupabaseConfig = supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here';

// Flag to indicate if running in demo mode (no Supabase credentials)
export const isDemoMode = !hasSupabaseConfig;

if (isDemoMode) {
  console.warn('[Supabase] ⚠️ Running in DEMO MODE - Supabase credentials not configured');
} else {
  console.log('[Supabase] ✓ Supabase credentials validated');
}

// Create Supabase client
export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://demo.supabase.co', 'demo-anon-key'); // Dummy client for demo mode

console.log('[Supabase] ✓ Supabase client created');

// Database type definitions
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
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
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      companies: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          address: string | null;
          city: string | null;
          country: string;
          tax_id: string | null;
          vat_number: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          currency: string;
          logo_url: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      roles: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          permissions: any;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['roles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['roles']['Insert']>;
      };
      customers: {
        Row: {
          id: string;
          company_id: string;
          customer_code: string | null;
          company_name: string;
          contact_person: string | null;
          email: string;
          phone_number: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          credit_limit: number;
          payment_terms: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          company_id: string;
          category_id: string;
          sku: string;
          product_name: string;
          description: string | null;
          unit_price: number;
          cost_price: number;
          vat_rate: number;
          min_stock_level: number;
          reorder_point: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      inventory: {
        Row: {
          id: string;
          product_id: string;
          warehouse_id: string;
          quantity_available: number;
          quantity_reserved: number;
          last_counted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inventory']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>;
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          customer_id: string;
          invoice_number: string;
          issue_date: string;
          due_date: string;
          subtotal: number;
          vat_amount: number;
          total_amount: number;
          amount_paid: number;
          amount_due: number;
          status: string;
          qr_code: string | null;
          is_zatca_compliant: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      sales_orders: {
        Row: {
          id: string;
          company_id: string;
          customer_id: string;
          order_number: string;
          order_date: string;
          delivery_date: string | null;
          total_amount: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sales_orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sales_orders']['Insert']>;
      };
    };
  };
}

export default supabase;
