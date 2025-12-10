import { useEffect } from 'react';
import { useGoogleAnalytics, setUserId } from '@/hooks/useGoogleAnalytics';
import { useAuth } from '@/hooks/useAuth';

export const GoogleAnalytics = () => {
  const { user, isAdmin } = useAuth();
  
  // Initialize GA and track page views
  useGoogleAnalytics();

  // Set user ID when logged in (for cross-device tracking)
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    } else {
      setUserId(null);
    }
  }, [user?.id]);

  return null;
};
