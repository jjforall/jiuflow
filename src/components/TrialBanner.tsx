import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Clock, Sparkles, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/contexts/LanguageContext";

const DISMISS_KEY = "trial_banner_dismissed";
const WINBACK_DISMISS_KEY = "winback_banner_dismissed";

/** Fire a GA4 event via window.gtag (safe no-op if GA not loaded) */
const fireGtagEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};

/**
 * TrialBanner — Shows trial ending countdown (last 5 days) or win-back offer (expired trial).
 * Dismissible but reappears daily.
 */
const TrialBanner = () => {
  const { user } = useAuth();
  const { is_trialing, trial_days_left, trial_expired, subscribed, loading } = useSubscription();
  const { language } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  // Check if banner was dismissed today
  useEffect(() => {
    const key = trial_expired ? WINBACK_DISMISS_KEY : DISMISS_KEY;
    const dismissedDate = localStorage.getItem(key);
    if (dismissedDate) {
      const today = new Date().toDateString();
      if (dismissedDate === today) {
        setDismissed(true);
      } else {
        // Different day — show again
        localStorage.removeItem(key);
      }
    }
  }, [trial_expired]);

  // Track banner impression when it becomes visible
  useEffect(() => {
    if (loading || !user || dismissed || (subscribed && !is_trialing)) return;

    if (trial_expired) {
      fireGtagEvent('trial_banner_impression', { banner_type: 'winback' });
    } else if (is_trialing && trial_days_left !== null && trial_days_left <= 5) {
      fireGtagEvent('trial_banner_impression', { banner_type: 'trial_ending', days_left: trial_days_left });
    }
  }, [loading, user, dismissed, subscribed, is_trialing, trial_expired, trial_days_left]);

  const handleDismiss = () => {
    const key = trial_expired ? WINBACK_DISMISS_KEY : DISMISS_KEY;
    localStorage.setItem(key, new Date().toDateString());
    setDismissed(true);
    fireGtagEvent('trial_banner_dismiss', {
      banner_type: trial_expired ? 'winback' : 'trial_ending',
      days_left: trial_days_left,
    });
  };

  // Don't render while loading or if no user
  if (loading || !user || dismissed) return null;

  // Already a paid subscriber (not trialing) — no banner needed
  if (subscribed && !is_trialing) return null;

  // Win-back banner for expired trials
  if (trial_expired) {
    return (
      <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Gift className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium truncate">
                {language === "ja"
                  ? "おかえりなさい！初月50%OFF特別オファー"
                  : language === "pt"
                  ? "Bem-vindo de volta! 50% OFF no primeiro mes"
                  : "Welcome back! 50% OFF your first month"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link to="/join?winback=true&discount=50" onClick={() => fireGtagEvent('trial_banner_click', { banner_type: 'winback', action: 'reactivate_50off' })}>
                <Button
                  size="sm"
                  className="bg-white text-purple-700 hover:bg-purple-50 font-bold text-xs sm:text-sm"
                >
                  {language === "ja"
                    ? "50%OFFで再開"
                    : language === "pt"
                    ? "Reativar com 50% OFF"
                    : "Reactivate at 50% OFF"}
                </Button>
              </Link>
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white p-1"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trial ending banner — show when 5 or fewer days left
  if (is_trialing && trial_days_left !== null && trial_days_left <= 5) {
    const isUrgent = trial_days_left <= 1;
    const bgClass = isUrgent
      ? "bg-gradient-to-r from-red-600 to-orange-500"
      : "bg-gradient-to-r from-amber-500 to-orange-500";

    return (
      <div className={`relative ${bgClass} text-white`}>
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {isUrgent ? (
                <Sparkles className="h-5 w-5 flex-shrink-0 animate-pulse" />
              ) : (
                <Clock className="h-5 w-5 flex-shrink-0" />
              )}
              <p className="text-sm font-medium truncate">
                {language === "ja"
                  ? trial_days_left === 0
                    ? "無料トライアルは本日終了します！"
                    : trial_days_left === 1
                    ? "無料トライアル残り1日！"
                    : `無料トライアル残り${trial_days_left}日`
                  : language === "pt"
                  ? trial_days_left === 0
                    ? "Seu teste gratuito termina hoje!"
                    : trial_days_left === 1
                    ? "1 dia restante no teste gratuito!"
                    : `${trial_days_left} dias restantes no teste gratuito`
                  : trial_days_left === 0
                  ? "Your free trial ends today!"
                  : trial_days_left === 1
                  ? "1 day left in your free trial!"
                  : `${trial_days_left} days left in your free trial`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link to="/join?upgrade=annual" onClick={() => fireGtagEvent('trial_banner_click', { banner_type: 'trial_ending', action: 'upgrade', days_left: trial_days_left })}>
                <Button
                  size="sm"
                  className="bg-white text-orange-700 hover:bg-orange-50 font-bold text-xs sm:text-sm"
                >
                  {language === "ja"
                    ? "今すぐプランを選ぶ"
                    : language === "pt"
                    ? "Escolher plano"
                    : "Choose a plan"}
                </Button>
              </Link>
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white p-1"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TrialBanner;
