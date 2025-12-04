import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie_consent';

export const CookieConsentBanner = () => {
  const { language } = useLanguage();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Delay showing the banner for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      preferences: {
        necessary: true,
        analytics: true,
        marketing: false,
      }
    }));
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: false,
      timestamp: new Date().toISOString(),
      preferences: {
        necessary: true,
        analytics: false,
        marketing: false,
      }
    }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  const texts = {
    ja: {
      title: 'Cookieの使用について',
      description: '当サイトでは、サービス向上のためにCookieを使用しています。Cookieの使用に同意いただける場合は「同意する」をクリックしてください。',
      accept: '同意する',
      decline: '必要最小限のみ',
      privacy: 'プライバシーポリシー',
    },
    en: {
      title: 'Cookie Notice',
      description: 'We use cookies to improve our services. Click "Accept" if you consent to our use of cookies.',
      accept: 'Accept',
      decline: 'Essential Only',
      privacy: 'Privacy Policy',
    },
    pt: {
      title: 'Aviso de Cookies',
      description: 'Usamos cookies para melhorar nossos serviços. Clique em "Aceitar" se você concorda com o uso de cookies.',
      accept: 'Aceitar',
      decline: 'Apenas Essenciais',
      privacy: 'Política de Privacidade',
    },
  };

  const t = texts[language as keyof typeof texts] || texts.en;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
      <Card className="max-w-4xl mx-auto p-4 md:p-6 shadow-lg bg-background/95 backdrop-blur-sm border-2">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Cookie className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">{t.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.description}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="flex-1 md:flex-none"
            >
              {t.decline}
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 md:flex-none"
            >
              {t.accept}
            </Button>
          </div>
          <button
            onClick={handleDecline}
            className="absolute top-2 right-2 md:hidden p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  );
};

export default CookieConsentBanner;
