/**
 * useRealtimeOrders — Real-time order data hook for delivery portals
 *
 * Strategy (Vercel-compatible, no WebSockets):
 *   • Web (Expo Web / Browser): Uses EventSource (SSE) for push-based updates
 *   • Native (iOS/Android):     Falls back to fast 3-second interval polling without resetting loading spinners
 *
 * Usage:
 *   const { orders, loading, error, refresh, isLive } = useRealtimeOrders('seller');
 *   const { orders, loading, error, refresh, isLive } = useRealtimeOrders('rider');
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { get, getApiBaseUrl, invalidateOrdersCache } from './api';

export type RealtimeRole = 'seller' | 'rider' | 'admin';

export interface UseRealtimeOrdersResult {
  orders: any[];
  loading: boolean;
  error: string | null;
  isLive: boolean;        // true when SSE is actively connected
  refresh: () => void;   // manual refresh trigger
}

const SSE_POLL_INTERVAL_MS = 3000;     // 3s polling on native
const MAX_RECONNECT_DELAY_MS = 30000;  // max backoff cap

function getOrdersEndpoint(role: RealtimeRole): string {
  if (role === 'rider') return '/delivery/active';
  if (role === 'seller' || role === 'admin') return '/store/orders';
  return '/orders';
}

function getSseEndpoint(role: RealtimeRole): string {
  if (role === 'rider') return '/delivery/stream';
  if (role === 'seller' || role === 'admin') return '/orders/stream';
  return '/orders/stream';
}

export function useRealtimeOrders(role: RealtimeRole): UseRealtimeOrdersResult {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const mountedRef = useRef(true);
  const esRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<any>(null);
  const initialFetchDoneRef = useRef(false);

  const isWeb = Platform.OS === 'web' && typeof EventSource !== 'undefined';

  const fetchOrders = useCallback(async (isInitial = false) => {
    try {
      if (isInitial && !initialFetchDoneRef.current) {
        setLoading(true);
      }
      const endpoint = getOrdersEndpoint(role);
      const res = await get(endpoint);
      if (!mountedRef.current) return;

      let fetched: any[] = [];
      if (Array.isArray(res)) {
        fetched = res;
      } else if (res && Array.isArray((res as any).orders)) {
        fetched = (res as any).orders;
      }

      // Filter out terminal orders for rider view
      if (role === 'rider') {
        fetched = fetched.filter((o: any) => {
          const st = String(o.status || '').toLowerCase();
          return st !== 'delivered' && st !== 'cancelled' && st !== 'failed_delivery';
        });
      }

      setOrders(fetched);
      setError(null);
      initialFetchDoneRef.current = true;
    } catch (e: any) {
      if (!mountedRef.current) return;
      setError(e?.message || 'Failed to fetch orders');
    } finally {
      if (mountedRef.current && isInitial) {
        setLoading(false);
      }
    }
  }, [role]);

  const connectSSE = useCallback(() => {
    if (!isWeb) return;
    if (esRef.current) {
      esRef.current.close();
    }

    const baseUrl = getApiBaseUrl();
    const sseUrl = `${baseUrl}${getSseEndpoint(role)}`;

    try {
      const es = new (window as any).EventSource(sseUrl, { withCredentials: false });
      esRef.current = es;

      es.addEventListener('orders_update', (evt: any) => {
        try {
          const data = JSON.parse(evt.data);
          if (Array.isArray(data) && mountedRef.current) {
            let processed = data;
            if (role === 'rider') {
              processed = data.filter((o: any) => {
                const st = String(o.status || '').toLowerCase();
                return st !== 'delivered' && st !== 'cancelled' && st !== 'failed_delivery';
              });
            }
            setOrders(processed);
            setLoading(false);
            setError(null);
            setIsLive(true);
            retryCountRef.current = 0;
          }
        } catch {
          // ignore parse errors
        }
      });

      es.addEventListener('heartbeat', () => {
        if (mountedRef.current) {
          setIsLive(true);
          setLoading(false);
        }
      });

      es.addEventListener('error', () => {
        if (!mountedRef.current) return;
        setIsLive(false);
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }

        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), MAX_RECONNECT_DELAY_MS);
        retryCountRef.current++;
        retryTimerRef.current = setTimeout(connectSSE, delay);
      });

    } catch {
      if (mountedRef.current) {
        setIsLive(false);
        setLoading(false);
      }
    }
  }, [role, isWeb]);

  useEffect(() => {
    mountedRef.current = true;

    if (isWeb) {
      fetchOrders(true);
      connectSSE();
    } else {
      fetchOrders(true);
      const interval = setInterval(() => {
        fetchOrders(false);
      }, SSE_POLL_INTERVAL_MS);

      return () => {
        mountedRef.current = false;
        clearInterval(interval);
      };
    }

    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [isWeb, fetchOrders, connectSSE]);

  const refresh = useCallback(() => {
    invalidateOrdersCache();
    if (isWeb) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      retryCountRef.current = 0;
      connectSSE();
    }
    fetchOrders(false);
  }, [isWeb, connectSSE, fetchOrders]);

  return { orders, loading, error, isLive, refresh };
}
