import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Realtime Subscriptions Manager
 * Handles live data updates from Supabase
 */

type SubscriptionCallback<T> = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
}) => void;

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to changes on a specific table
   */
  subscribeToTable<T = any>(
    table: string,
    callback: SubscriptionCallback<T>,
    filter?: { column: string; value: any },
  ): () => void {
    const channelName = filter ? `${table}:${filter.column}=eq.${filter.value}` : table;

    // Remove existing channel if it exists
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    // Create new channel
    let channel = supabase.channel(channelName);

    // Apply filter if provided
    if (filter) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `${filter.column}=eq.${filter.value}`,
        },
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new as T,
            old: payload.old as T,
          });
        },
      );
    } else {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new as T,
            old: payload.old as T,
          });
        },
      );
    }

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Error subscribing to ${channelName}`);
      } else if (status === 'TIMED_OUT') {
        console.error(`[Realtime] Timeout subscribing to ${channelName}`);
      }
    });

    this.channels.set(channelName, channel);

    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }

  /**
   * Subscribe to inventory changes for a specific company
   */
  subscribeToInventory(companyId: string, callback: SubscriptionCallback<any>): () => void {
    return this.subscribeToTable('inventory', callback, {
      column: 'company_id',
      value: companyId,
    });
  }

  /**
   * Subscribe to customer changes
   */
  subscribeToCustomers(companyId: string, callback: SubscriptionCallback<any>): () => void {
    return this.subscribeToTable('customers', callback, {
      column: 'company_id',
      value: companyId,
    });
  }

  /**
   * Subscribe to invoice changes
   */
  subscribeToInvoices(companyId: string, callback: SubscriptionCallback<any>): () => void {
    return this.subscribeToTable('invoices', callback, {
      column: 'company_id',
      value: companyId,
    });
  }

  /**
   * Subscribe to sales order changes
   */
  subscribeToSalesOrders(companyId: string, callback: SubscriptionCallback<any>): () => void {
    return this.subscribeToTable('sales_orders', callback, {
      column: 'company_id',
      value: companyId,
    });
  }

  /**
   * Subscribe to notifications for a specific user
   */
  subscribeToNotifications(userId: string, callback: SubscriptionCallback<any>): () => void {
    return this.subscribeToTable('notifications', callback, {
      column: 'user_id',
      value: userId,
    });
  }

  /**
   * Subscribe to user presence (who's online)
   */
  subscribeToPresence(
    roomId: string,
    onJoin: (user: any) => void,
    onLeave: (user: any) => void,
  ): () => void {
    const channelName = `presence:${roomId}`;

    // Remove existing channel if it exists
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: '',
        },
      },
    });

    channel
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence) => onJoin(presence));
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence) => onLeave(presence));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Joined presence room: ${roomId}`);
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * Track user presence
   */
  async trackPresence(
    roomId: string,
    userData: { userId: string; userName: string },
  ): Promise<void> {
    const channelName = `presence:${roomId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      await channel.track({
        user_id: userData.userId,
        user_name: userData.userName,
        online_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Unsubscribe from a specific channel
   */
  private unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      console.log(`[Realtime] Unsubscribed from ${channelName}`);
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    this.channels.forEach((_, channelName) => {
      this.unsubscribe(channelName);
    });
    console.log('[Realtime] Unsubscribed from all channels');
  }

  /**
   * Get active channel count
   */
  getActiveChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Check if a channel is active
   */
  isChannelActive(channelName: string): boolean {
    return this.channels.has(channelName);
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();

/**
 * React Hook for realtime subscriptions
 * Usage:
 *
 * import { useRealtimeSubscription } from '@/lib/realtime';
 *
 * useRealtimeSubscription('inventory', (payload) => {
 *   console.log('Inventory updated:', payload);
 *   refetchData();
 * }, { column: 'company_id', value: companyId });
 */
import { useEffect } from 'react';

export function useRealtimeSubscription<T = any>(
  table: string,
  callback: SubscriptionCallback<T>,
  filter?: { column: string; value: any },
) {
  useEffect(() => {
    const unsubscribe = realtimeManager.subscribeToTable(table, callback, filter);

    return () => {
      unsubscribe();
    };
  }, [table, callback, filter]);
}

/**
 * Hook for inventory realtime updates
 */
export function useInventoryRealtime(companyId: string, onUpdate: () => void) {
  useEffect(() => {
    if (!companyId) return;

    const unsubscribe = realtimeManager.subscribeToInventory(companyId, (payload) => {
      console.log('[Inventory] Realtime update:', payload.eventType);
      onUpdate();
    });

    return unsubscribe;
  }, [companyId, onUpdate]);
}

/**
 * Hook for notifications realtime updates
 */
export function useNotificationsRealtime(
  userId: string,
  onNewNotification: (notification: any) => void,
) {
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = realtimeManager.subscribeToNotifications(userId, (payload) => {
      if (payload.eventType === 'INSERT') {
        console.log('[Notifications] New notification received');
        onNewNotification(payload.new);
      }
    });

    return unsubscribe;
  }, [userId, onNewNotification]);
}
