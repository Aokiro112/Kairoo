import { useState, useEffect, useCallback } from 'react';

export interface DeepSeekQuotaData {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string | null;
  allowed?: boolean;
}

type QuotaListener = (quota: DeepSeekQuotaData) => void;

let cachedQuota: DeepSeekQuotaData | null = null;
const listeners = new Set<QuotaListener>();
let inFlightFetch: Promise<DeepSeekQuotaData | null> | null = null;

const CACHE_KEY = 'kairo_deepseek_quota_cache';

// Initialize from sessionStorage if available in browser
if (typeof window !== 'undefined') {
  try {
    const saved = sessionStorage.getItem(CACHE_KEY);
    if (saved) {
      cachedQuota = JSON.parse(saved);
    }
  } catch {}
}

export function getCachedDeepSeekQuota(): DeepSeekQuotaData | null {
  return cachedQuota;
}

export function setGlobalDeepSeekQuota(quota: DeepSeekQuotaData): void {
  cachedQuota = quota;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(quota));
      window.dispatchEvent(new CustomEvent('kairo_quota_updated', { detail: quota }));
    } catch {}
  }
  listeners.forEach((listener) => {
    try {
      listener(quota);
    } catch {}
  });
}

export async function fetchGlobalDeepSeekQuota(): Promise<DeepSeekQuotaData | null> {
  if (inFlightFetch) return inFlightFetch;

  inFlightFetch = (async () => {
    try {
      const res = await fetch('/api/chat/quota');
      if (res.ok) {
        const data = await res.json();
        const formatted: DeepSeekQuotaData = {
          limit: typeof data.limit === 'number' ? data.limit : 2,
          used: typeof data.used === 'number' ? data.used : 0,
          remaining: typeof data.remaining === 'number' ? data.remaining : 2,
          resetAt: data.resetAt || null,
          allowed: typeof data.allowed === 'boolean' ? data.allowed : true,
        };
        setGlobalDeepSeekQuota(formatted);
        return formatted;
      }
    } catch (err) {
      console.error('Failed to fetch DeepSeek quota:', err);
    } finally {
      inFlightFetch = null;
    }
    return cachedQuota;
  })();

  return inFlightFetch;
}

export function subscribeToDeepSeekQuota(listener: QuotaListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useGlobalDeepSeekQuota() {
  const [quota, setQuota] = useState<DeepSeekQuotaData | null>(() => getCachedDeepSeekQuota());

  useEffect(() => {
    // Sync with global store on mount
    const current = getCachedDeepSeekQuota();
    if (current) {
      setQuota(current);
    }

    // Subscribe to updates from other components / requests
    const unsubscribe = subscribeToDeepSeekQuota((updated) => {
      setQuota(updated);
    });

    const handleCustomEvent = (e: any) => {
      if (e.detail) {
        setQuota(e.detail);
      }
    };

    window.addEventListener('kairo_quota_updated', handleCustomEvent);

    // Background fetch to ensure latest status from server
    fetchGlobalDeepSeekQuota();

    return () => {
      unsubscribe();
      window.removeEventListener('kairo_quota_updated', handleCustomEvent);
    };
  }, []);

  const refreshQuota = useCallback(() => {
    return fetchGlobalDeepSeekQuota();
  }, []);

  return { quota, refreshQuota };
}
