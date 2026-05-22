import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isDemoMode } from '../lib/supabase';

// Mock data for demo mode
const MOCK_DASHBOARD_DATA = {
  invoices: [
    {
      total_amount: 15000,
      amount_paid: 12000,
      vat_amount: 2250,
      status: 'PAID',
      issue_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      invoice_number: 'INV-2024-001',
      customer: { company_name: 'Acme Corp' },
      qr_code: 'QR123'
    },
    {
      total_amount: 8500,
      amount_paid: 0,
      vat_amount: 1275,
      status: 'UNPAID',
      issue_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      invoice_number: 'INV-2024-002',
      customer: { company_name: 'TechStart Inc' },
      qr_code: 'QR124'
    },
    {
      total_amount: 22000,
      amount_paid: 22000,
      vat_amount: 3300,
      status: 'PAID',
      issue_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      invoice_number: 'INV-2024-003',
      customer: { company_name: 'Global Trade' },
      qr_code: 'QR125'
    }
  ],
  salesOrders: [
    {
      total_amount: 18000,
      status: 'COMPLETED',
      order_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      total_amount: 12500,
      status: 'PENDING',
      order_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  inventory: [
    {
      quantity_available: 150,
      quantity_reserved: 20,
      product: {
        product_name: 'Product A',
        unit_price: 120
      }
    },
    {
      quantity_available: 80,
      quantity_reserved: 10,
      product: {
        product_name: 'Product B',
        unit_price: 250
      }
    },
    {
      quantity_available: 200,
      quantity_reserved: 35,
      product: {
        product_name: 'Product C',
        unit_price: 85
      }
    }
  ]
};

interface UseSupabaseQueryOptions {
  refreshInterval?: number; // in milliseconds, 0 = no auto-refresh
  enabled?: boolean; // whether to fetch on mount
}

interface UseSupabaseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for executing Supabase queries with loading, error, and refresh support
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  options: UseSupabaseQueryOptions = {}
): UseSupabaseQueryResult<T> {
  const { refreshInterval = 0, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // In demo mode, skip database queries
      if (isDemoMode) {
        // Return empty data for now - specific hooks will provide mock data
        setData(null);
        setLoading(false);
        return;
      }

      const result = await queryFn();
      setData(result);
    } catch (err) {
      console.error('Query error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [queryFn, enabled]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    // Set up auto-refresh if interval is specified
    if (refreshInterval > 0 && enabled) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval, enabled]);

  return { data, loading, error, refetch };
}

/**
 * Hook for executing mutations with loading and error states
 */
export function useSupabaseMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>
): {
  mutate: (input: TInput) => Promise<TOutput | null>;
  loading: boolean;
  error: Error | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (input: TInput): Promise<TOutput | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await mutationFn(input);
        setLoading(false);
        return result;
      } catch (err) {
        console.error('Mutation error:', err);
        setError(err as Error);
        setLoading(false);
        return null;
      }
    },
    [mutationFn]
  );

  return { mutate, loading, error };
}

/**
 * Pre-configured hooks for common queries
 */
import * as dashboardService from '../services/dashboardService';
import * as customersService from '../services/customersService';
import * as productsService from '../services/productsService';
import * as inventoryService from '../services/inventoryService';
import * as invoicesService from '../services/invoicesService';

export function useDashboardAnalytics() {
  const { user } = useAuth();
  const companyId = user?.company_id;

  // Return mock data in demo mode
  if (isDemoMode) {
    return {
      data: MOCK_DASHBOARD_DATA,
      loading: false,
      error: null,
      refetch: async () => {}
    };
  }

  return useSupabaseQuery(
    () => dashboardService.getDashboardAnalytics(companyId!),
    { refreshInterval: 5000, enabled: !!companyId }
  );
}

export function useCustomers() {
  const { user } = useAuth();
  const companyId = user?.company_id;

  // Return mock data in demo mode
  if (isDemoMode) {
    return {
      data: [],
      loading: false,
      error: null,
      refetch: async () => {}
    };
  }

  return useSupabaseQuery(
    () => customersService.listCustomers(companyId!),
    { refreshInterval: 30000, enabled: !!companyId }
  );
}

export function useProducts() {
  const { user } = useAuth();
  const companyId = user?.company_id;

  // Return mock data in demo mode
  if (isDemoMode) {
    return {
      data: MOCK_DASHBOARD_DATA.inventory,
      loading: false,
      error: null,
      refetch: async () => {}
    };
  }

  return useSupabaseQuery(
    () => productsService.listProducts(companyId!),
    { refreshInterval: 30000, enabled: !!companyId }
  );
}

export function useInventory(warehouseId?: string) {
  const { user } = useAuth();

  // Return mock data in demo mode
  if (isDemoMode) {
    return {
      data: MOCK_DASHBOARD_DATA.inventory,
      loading: false,
      error: null,
      refetch: async () => {}
    };
  }

  return useSupabaseQuery(
    () => inventoryService.listInventory(warehouseId),
    { refreshInterval: 10000, enabled: !!user }
  );
}

export function useInvoices(status?: string) {
  const { user } = useAuth();
  const companyId = user?.company_id;

  // Return mock data in demo mode
  if (isDemoMode) {
    return {
      data: MOCK_DASHBOARD_DATA.invoices,
      loading: false,
      error: null,
      refetch: async () => {}
    };
  }

  return useSupabaseQuery(
    () => invoicesService.listInvoices(companyId!, status),
    { refreshInterval: 30000, enabled: !!companyId }
  );
}
