import { useEffect } from 'react';
import { prefetchCriticalRoutes } from '@/utils/routePrefetch';

export const RoutePrefetcher = () => {
  useEffect(() => {
    // Prefetch critical routes after initial render to avoid blocking
    const timer = setTimeout(() => {
      prefetchCriticalRoutes();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return null;
};