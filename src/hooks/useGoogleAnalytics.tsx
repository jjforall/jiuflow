import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { hasAnalyticsConsent, getCookieConsent } from '@/components/CookieConsentBanner';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Initialize dataLayer
if (typeof window !== 'undefined') {
  window.dataLayer = window.dataLayer || [];
}

// gtag function that queues commands
function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(args);
  }
}

// Make gtag available globally
if (typeof window !== 'undefined') {
  window.gtag = gtag;
}

// Initialize consent mode (must be called before loading GA)
const initializeConsentMode = () => {
  const consent = getCookieConsent();
  
  // Set default consent state (denied by default for GDPR compliance)
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'functionality_storage': 'granted',
    'security_storage': 'granted',
    'wait_for_update': 500,
  });

  // Update consent if user has already made a choice
  if (consent?.accepted && consent?.preferences) {
    gtag('consent', 'update', {
      'analytics_storage': consent.preferences.analytics ? 'granted' : 'denied',
      'ad_storage': consent.preferences.marketing ? 'granted' : 'denied',
      'ad_user_data': consent.preferences.marketing ? 'granted' : 'denied',
      'ad_personalization': consent.preferences.marketing ? 'granted' : 'denied',
    });
  }
};

// Load GA script dynamically
const loadGAScript = () => {
  if (!GA_MEASUREMENT_ID) return;
  
  // Check if script already loaded
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // We'll send page views manually
    anonymize_ip: true, // GDPR compliance
  });
};

export const useGoogleAnalytics = () => {
  const location = useLocation();

  // Initialize on mount
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) {
      console.warn('Google Analytics Measurement ID not configured');
      return;
    }

    // Initialize consent mode first
    initializeConsentMode();
    
    // Load GA script
    loadGAScript();
  }, []);

  // Track page views
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || !hasAnalyticsConsent()) return;

    gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [location]);
};

// Update consent when user changes preferences
export const updateGAConsent = (analytics: boolean, marketing: boolean) => {
  gtag('consent', 'update', {
    'analytics_storage': analytics ? 'granted' : 'denied',
    'ad_storage': marketing ? 'granted' : 'denied',
    'ad_user_data': marketing ? 'granted' : 'denied',
    'ad_personalization': marketing ? 'granted' : 'denied',
  });
};

// Track custom events
export const trackEvent = (
  eventName: string, 
  params?: Record<string, unknown>
) => {
  if (!hasAnalyticsConsent()) return;
  gtag('event', eventName, params);
};

// Track conversions
export const trackConversion = (
  conversionType: 'sign_up' | 'purchase' | 'subscription' | 'trial_start' | 'video_watch' | 'custom',
  params?: Record<string, unknown>
) => {
  if (!hasAnalyticsConsent()) return;
  
  const eventMap = {
    sign_up: 'sign_up',
    purchase: 'purchase',
    subscription: 'purchase', // Use purchase for subscription
    trial_start: 'generate_lead',
    video_watch: 'video_progress',
    custom: params?.event_name || 'conversion',
  };

  gtag('event', eventMap[conversionType], {
    ...params,
    send_to: GA_MEASUREMENT_ID,
  });
};

// E-commerce tracking
export const trackPurchase = (transactionData: {
  transaction_id: string;
  value: number;
  currency?: string;
  items?: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity?: number;
    item_category?: string;
  }>;
}) => {
  if (!hasAnalyticsConsent()) return;
  
  gtag('event', 'purchase', {
    transaction_id: transactionData.transaction_id,
    value: transactionData.value,
    currency: transactionData.currency || 'JPY',
    items: transactionData.items || [],
  });
};

// Track subscription events
export const trackSubscription = (action: 'start_trial' | 'subscribe' | 'cancel' | 'renew', params?: {
  plan_type?: string;
  value?: number;
  currency?: string;
}) => {
  if (!hasAnalyticsConsent()) return;

  const eventNames = {
    start_trial: 'generate_lead',
    subscribe: 'purchase',
    cancel: 'refund',
    renew: 'purchase',
  };

  gtag('event', eventNames[action], {
    event_category: 'subscription',
    event_label: action,
    ...params,
  });
};

// Track video engagement
export const trackVideoEngagement = (videoData: {
  video_id: string;
  video_title: string;
  video_provider?: string;
  video_percent?: number;
  video_duration?: number;
  video_current_time?: number;
}) => {
  if (!hasAnalyticsConsent()) return;

  gtag('event', 'video_progress', {
    video_provider: videoData.video_provider || 'cloudflare',
    video_title: videoData.video_title,
    video_url: videoData.video_id,
    video_percent: videoData.video_percent,
    video_duration: videoData.video_duration,
    video_current_time: videoData.video_current_time,
  });
};

// Track user engagement
export const trackEngagement = (action: string, params?: Record<string, unknown>) => {
  if (!hasAnalyticsConsent()) return;
  
  gtag('event', action, {
    event_category: 'engagement',
    ...params,
  });
};

// Track search
export const trackSearch = (searchTerm: string, params?: Record<string, unknown>) => {
  if (!hasAnalyticsConsent()) return;
  
  gtag('event', 'search', {
    search_term: searchTerm,
    ...params,
  });
};

// Set user properties
export const setUserProperties = (properties: Record<string, unknown>) => {
  if (!hasAnalyticsConsent()) return;
  
  gtag('set', 'user_properties', properties);
};

// Set user ID for cross-device tracking
export const setUserId = (userId: string | null) => {
  if (!hasAnalyticsConsent()) return;
  
  if (userId) {
    gtag('set', { user_id: userId });
  }
};
