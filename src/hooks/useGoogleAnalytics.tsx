import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export const useGoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    // Update the script src dynamically
    const existingScript = document.querySelector('script[src*="googletagmanager.com/gtag"]');
    if (existingScript) {
      existingScript.setAttribute('src', `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
    }

    // Initialize gtag with the actual ID
    if (typeof window.gtag === 'function') {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) {
      console.warn('Google Analytics Measurement ID not configured');
      return;
    }

    // Initial config
    if (typeof window.gtag === 'function') {
      window.gtag('config', GA_MEASUREMENT_ID);
    }
  }, []);
};

// Track custom events
export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window.gtag === 'function' && GA_MEASUREMENT_ID) {
    window.gtag('event', eventName, params);
  }
};
