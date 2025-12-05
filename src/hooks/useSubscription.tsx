import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  price_id: string | null;
  subscription_end: string | null;
  is_trialing: boolean;
  loading: boolean;
}

// Global cache to prevent duplicate API calls across components
let globalCache: {
  data: Omit<SubscriptionStatus, 'loading'> | null;
  timestamp: number;
  promise: Promise<Omit<SubscriptionStatus, 'loading'>> | null;
} = {
  data: null,
  timestamp: 0,
  promise: null,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Restore from sessionStorage on initial load
const restoreCache = () => {
  try {
    const cached = sessionStorage.getItem('subscription_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        globalCache.data = parsed.data;
        globalCache.timestamp = parsed.timestamp;
      }
    }
  } catch (e) {
    // Ignore cache errors
  }
};

// Initialize cache from sessionStorage
restoreCache();

const fetchSubscription = async (): Promise<Omit<SubscriptionStatus, 'loading'>> => {
  const defaultStatus = {
    subscribed: false,
    product_id: null,
    price_id: null,
    subscription_end: null,
    is_trialing: false,
  };

  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Subscription check timeout')), 10000)
    );
    
    const sessionPromise = supabase.auth.getSession();
    const sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as any;
    const session = sessionResult?.data?.session;
    
    if (!session) {
      return defaultStatus;
    }

    const functionPromise = supabase.functions.invoke("check-subscription", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    
    const { data, error } = await Promise.race([functionPromise, timeoutPromise]) as any;

    if (error) {
      console.error("Error checking subscription:", error);
      return defaultStatus;
    }

    return {
      subscribed: data.subscribed || false,
      product_id: data.product_id || null,
      price_id: data.price_id || null,
      subscription_end: data.subscription_end || null,
      is_trialing: data.is_trialing || false,
    };
  } catch (error) {
    console.error("Error checking subscription:", error);
    return defaultStatus;
  }
};

export const useSubscription = () => {
  const [status, setStatus] = useState<SubscriptionStatus>(() => {
    // Initialize from cache if available
    if (globalCache.data && Date.now() - globalCache.timestamp < CACHE_TTL) {
      return { ...globalCache.data, loading: false };
    }
    return {
      subscribed: false,
      product_id: null,
      price_id: null,
      subscription_end: null,
      is_trialing: false,
      loading: true,
    };
  });

  const checkSubscription = useCallback(async (forceRefresh = false) => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && globalCache.data && Date.now() - globalCache.timestamp < CACHE_TTL) {
      setStatus({ ...globalCache.data, loading: false });
      return;
    }

    // If there's already a pending request, wait for it
    if (globalCache.promise) {
      try {
        const result = await globalCache.promise;
        setStatus({ ...result, loading: false });
        return;
      } catch (e) {
        // Fall through to make a new request
      }
    }

    // Make new request
    setStatus(prev => ({ ...prev, loading: true }));
    
    globalCache.promise = fetchSubscription();
    
    try {
      const result = await globalCache.promise;
      
      // Update cache
      globalCache.data = result;
      globalCache.timestamp = Date.now();
      globalCache.promise = null;
      
      // Persist to sessionStorage
      try {
        sessionStorage.setItem('subscription_cache', JSON.stringify({
          data: result,
          timestamp: globalCache.timestamp,
        }));
      } catch (e) {
        // Ignore storage errors
      }
      
      setStatus({ ...result, loading: false });
    } catch (error) {
      globalCache.promise = null;
      setStatus({
        subscribed: false,
        product_id: null,
        price_id: null,
        subscription_end: null,
        is_trialing: false,
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    // Only fetch if not already cached
    if (!globalCache.data || Date.now() - globalCache.timestamp >= CACHE_TTL) {
      checkSubscription();
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Force refresh on sign in/out
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        globalCache.data = null;
        globalCache.timestamp = 0;
        sessionStorage.removeItem('subscription_cache');
        setTimeout(() => {
          checkSubscription(true);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  return { ...status, refetch: () => checkSubscription(true) };
};
