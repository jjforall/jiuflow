import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { prefetchCriticalRoutes } from '@/utils/routePrefetch';

export const RoutePrefetcher = () => {
  const location = useLocation();

  useEffect(() => {
    // Prefetch critical routes after initial render to avoid blocking
    const timer = setTimeout(() => {
      prefetchCriticalRoutes();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return null;
};
