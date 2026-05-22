import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeTableOptions<T> {
  table: string;
  select?: string;
  filter?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  enabled?: boolean;
}

interface UseRealtimeTableReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch data from Supabase table with Realtime subscriptions
 * Automatically updates when data changes in the database
 */
export function useRealtimeTable<T = any>(
  options: UseRealtimeTableOptions<T>
): UseRealtimeTableReturn<T> {
  const { table, select = '*', filter, orderBy, enabled = true } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from(table).select(select);

      // Apply filters
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      const { data: result, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setData((result as T[]) || []);
    } catch (err) {
      setError(err as Error);
      console.error(`Error fetching ${table}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchData();

    // Set up Realtime subscription
    const filterString = filter
      ? Object.entries(filter)
          .map(([key, value]) => `${key}=eq.${value}`)
          .join(',')
      : undefined;

    const subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filterString,
        },
        (payload) => {
          console.log(`Realtime change in ${table}:`, payload);
          fetchData(); // Refetch on any change
        }
      )
      .subscribe();

    setChannel(subscription);

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [table, select, JSON.stringify(filter), JSON.stringify(orderBy), enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
