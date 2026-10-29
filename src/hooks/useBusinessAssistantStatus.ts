import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getBusinessAssistantStatus,
  type BusinessAssistantStatus,
} from '../services/aiGatewayService';

export function useBusinessAssistantStatus(enabled = true) {
  const { user } = useAuth();
  const [status, setStatus] = useState<BusinessAssistantStatus | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(enabled);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getBusinessAssistantStatus();
      if (request === generation.current) setStatus(result);
    } catch (cause) {
      if (request === generation.current) {
        setStatus(null);
        setError(cause);
      }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [enabled, user?.id, user?.company_id]);
  useEffect(() => {
    setStatus(null);
    setError(null);
    if (enabled) void refresh();
    else setLoading(false);
    return () => {
      generation.current++;
    };
  }, [refresh, enabled]);
  return { status, error, loading, refresh };
}
