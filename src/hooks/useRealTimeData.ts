import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';

interface UseRealTimeDataOptions {
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

/**
 * Hook for fetching data with real-time updates
 */
export function useRealTimeData<T>(
  fetchFn: () => Promise<T>,
  options: UseRealTimeDataOptions = {}
) {
  const { refreshInterval = 5000, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, enabled]);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0 && enabled) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval, enabled]);

  const refetch = useCallback(() => {
    setLoading(true);
    return fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Hook for fetching dashboard analytics
 */
export function useDashboardAnalytics() {
  const { user } = useAuth();
  const companyId = user?.company?.id;

  return useRealTimeData(
    async () => {
      if (!companyId) throw new Error('No company ID');
      return db.analytics.getDashboard(companyId);
    },
    { refreshInterval: 5000, enabled: !!companyId }
  );
}

/**
 * Hook for fetching financial summary
 */
export function useFinancialSummary() {
  const { user } = useAuth();
  const companyId = user?.company?.id;

  return useRealTimeData(
    async () => {
      if (!companyId) throw new Error('No company ID');
      return db.analytics.getFinancialSummary(companyId);
    },
    { refreshInterval: 10000, enabled: !!companyId }
  );
}

/**
 * Hook for fetching inventory data
 */
export function useInventory(warehouseId?: string) {
  const { user } = useAuth();
  const companyId = user?.company?.id;

  return useRealTimeData(
    async () => {
      if (!companyId) throw new Error('No company ID');
      return db.inventory.getAll(companyId, warehouseId);
    },
    { refreshInterval: 5000, enabled: !!companyId }
  );
}

/**
 * Hook for fetching low stock items
 */
export function useLowStockItems() {
  const { user } = useAuth();
  const companyId = user?.company?.id;

  return useRealTimeData(
    async () => {
      if (!companyId) throw new Error('No company ID');
      return db.inventory.getLowStock(companyId);
    },
    { refreshInterval: 10000, enabled: !!companyId }
  );
}

/**
 * Hook for fetching invoices
 */
export function useInvoices(filters?: any) {
  const { user } = useAuth();
  const companyId = user?.company?.id;

  return useRealTimeData(
    async () => {
      if (!companyId) throw new Error('No company ID');
      return db.invoices.getAll(companyId, filters);
    },
    { refreshInterval: 10000, enabled: !!companyId }
  );
}

/**
 * Hook for fetching sales orders
 */
export function useSalesOrders(filters?: any) {
  const { user } = useAuth();
  const companyId = user?.company?.id;

  return useRealTimeData(
    async () => {
      if (!companyId) throw new Error('No company ID');
      return db.salesOrders.getAll(companyId, filters);
    },
    { refreshInterval: 10000, enabled: !!companyId }
  );
}

/**
 * Hook for fetching customers
 */
export function useCustomers() {
  const { user } = useAuth();
  const companyId = user?.company?.id;

  return useRealTimeData(
    async () => {
      if (!companyId) throw new Error('No company ID');
      return db.customers.getAll(companyId);
    },
    { refreshInterval: 30000, enabled: !!companyId }
  );
}

/**
 * Hook for fetching products
 */
export function useProducts() {
  const { user } = useAuth();
  const companyId = user?.company?.id;

  return useRealTimeData(
    async () => {
      if (!companyId) throw new Error('No company ID');
      return db.products.getAll(companyId);
    },
    { refreshInterval: 30000, enabled: !!companyId }
  );
}
