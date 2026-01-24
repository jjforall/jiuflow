import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Cookie, X, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { updateGAConsent } from '@/hooks/useGoogleAnalytics';

export const COOKIE_CONSENT_KEY = 'cookie_consent';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const getCookieConsent = (): { accepted: boolean; preferences: CookiePreferences } | null => {
  try {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent) {
      return JSON.parse(consent);
    }
  } catch {
    // ignore
  }
  return null;
};

export const hasAnalyticsConsent = (): boolean => {
  const consent = getCookieConsent();
  return consent?.accepted === true && consent?.preferences?.analytics === true;
};

export const CookieConsentBanner = () => {
  const { language } = useLanguage();
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Delay showing the banner for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (accepted: boolean, prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted,
      timestamp: new Date().toISOString(),
      preferences: prefs,
    }));
    setShowBanner(false);
    setShowSettings(false);
    
    // Update GA consent without page reload
    updateGAConsent(prefs.analytics, prefs.marketing);
  };

  const handleAcceptAll = () => {
    const prefs = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    saveConsent(true, prefs);
  };

  const handleDecline = () => {
    const prefs = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    saveConsent(false, prefs);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences.analytics || preferences.marketing, preferences);
  };

  if (!showBanner) return null;

  const texts = {
    ja: {
      title: 'Cookieの使用について',
      description: '当サイトでは、サービス向上のためにCookieを使用しています。「すべて同意」をクリックすると、分析Cookieの使用に同意いただけます。「必要最小限のみ」を選択すると、サービス運営に必要な最小限のCookieのみを使用します。',
      acceptAll: 'すべて同意',
      decline: '必要最小限のみ',
      settings: '設定',
      privacy: 'プライバシーポリシー',
      settingsTitle: 'Cookie設定',
      necessary: '必要なCookie',
      necessaryDesc: 'サイトの基本機能に必要です。無効にすることはできません。',
      analytics: '分析Cookie',
      analyticsDesc: 'Google Analyticsを使用してサイトの利用状況を分析し、サービス改善に役立てます。',
      marketing: 'マーケティングCookie',
      marketingDesc: '関連性の高い広告を表示するために使用されます。',
      save: '設定を保存',
    },
    en: {
      title: 'Cookie Notice',
      description: 'We use cookies to improve our services. Click "Accept All" to consent to analytics cookies. Select "Essential Only" to use only the minimum cookies necessary for site operation.',
      acceptAll: 'Accept All',
      decline: 'Essential Only',
      settings: 'Settings',
      privacy: 'Privacy Policy',
      settingsTitle: 'Cookie Settings',
      necessary: 'Necessary Cookies',
      necessaryDesc: 'Required for basic site functionality. Cannot be disabled.',
      analytics: 'Analytics Cookies',
      analyticsDesc: 'Uses Google Analytics to analyze site usage and improve our service.',
      marketing: 'Marketing Cookies',
      marketingDesc: 'Used to display relevant advertisements.',
      save: 'Save Preferences',
    },
    pt: {
      title: 'Aviso de Cookies',
      description: 'Usamos cookies para melhorar nossos serviços. Clique em "Aceitar Todos" para consentir com cookies de análise. Selecione "Apenas Essenciais" para usar apenas os cookies mínimos necessários para a operação do site.',
      acceptAll: 'Aceitar Todos',
      decline: 'Apenas Essenciais',
      settings: 'Configurações',
      privacy: 'Política de Privacidade',
      settingsTitle: 'Configurações de Cookies',
      necessary: 'Cookies Necessários',
      necessaryDesc: 'Necessários para funcionalidade básica do site. Não podem ser desabilitados.',
      analytics: 'Cookies de Análise',
      analyticsDesc: 'Usa Google Analytics para analisar o uso do site e melhorar nosso serviço.',
      marketing: 'Cookies de Marketing',
      marketingDesc: 'Usados para exibir anúncios relevantes.',
      save: 'Salvar Preferências',
    },
  };

  const t = texts[language as keyof typeof texts] || texts.en;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-2 md:p-3 animate-in slide-in-from-bottom duration-300">
        <Card className="max-w-2xl mx-auto p-3 shadow-lg bg-background/95 backdrop-blur-sm border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Cookie className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-xs text-muted-foreground line-clamp-2">
                {t.description}{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  {t.privacy}
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 w-full sm:w-auto justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="h-7 px-2 text-xs"
              >
                <Settings className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecline}
                className="h-7 px-2 text-xs"
              >
                {t.decline}
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="h-7 px-3 text-xs"
              >
                {t.acceptAll}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              {t.settingsTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Necessary Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="font-medium">{t.necessary}</Label>
                <p className="text-sm text-muted-foreground">{t.necessaryDesc}</p>
              </div>
              <Switch checked={true} disabled />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="font-medium">{t.analytics}</Label>
                <p className="text-sm text-muted-foreground">{t.analyticsDesc}</p>
              </div>
              <Switch 
                checked={preferences.analytics} 
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, analytics: checked }))}
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label className="font-medium">{t.marketing}</Label>
                <p className="text-sm text-muted-foreground">{t.marketingDesc}</p>
              </div>
              <Switch 
                checked={preferences.marketing} 
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, marketing: checked }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              {language === 'ja' ? 'キャンセル' : 'Cancel'}
            </Button>
            <Button onClick={handleSavePreferences}>
              {t.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsentBanner;
