import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const HEALTH_CONSENT_KEY = 'health_data_consent';

export const getHealthDataConsent = (): boolean => {
  try {
    const consent = localStorage.getItem(HEALTH_CONSENT_KEY);
    if (consent) {
      const parsed = JSON.parse(consent);
      return parsed.accepted === true;
    }
  } catch {
    // ignore
  }
  return false;
};

export const setHealthDataConsent = (accepted: boolean) => {
  localStorage.setItem(HEALTH_CONSENT_KEY, JSON.stringify({
    accepted,
    timestamp: new Date().toISOString(),
  }));
};

interface HealthDataConsentProps {
  onConsentChange?: (consented: boolean) => void;
  className?: string;
}

export const HealthDataConsent = ({ onConsentChange, className = '' }: HealthDataConsentProps) => {
  const { language } = useLanguage();
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const savedConsent = getHealthDataConsent();
    setConsented(savedConsent);
    onConsentChange?.(savedConsent);
  }, []);

  const handleConsentChange = (checked: boolean) => {
    setConsented(checked);
    setHealthDataConsent(checked);
    onConsentChange?.(checked);
  };

  const texts = {
    ja: {
      label: '私の健康に関するデータ（体重、怪我のメモなど）が、プライバシーポリシーに従って保存・処理されることに同意します。',
      privacy: 'プライバシーポリシー',
    },
    en: {
      label: 'I consent to my health-related data (weight, injury notes, etc.) being stored and processed in accordance with the Privacy Policy.',
      privacy: 'Privacy Policy',
    },
    pt: {
      label: 'Eu consinto que meus dados relacionados à saúde (peso, notas de lesões, etc.) sejam armazenados e processados de acordo com a Política de Privacidade.',
      privacy: 'Política de Privacidade',
    },
  };

  const t = texts[language as keyof typeof texts] || texts.en;

  return (
    <div className={`bg-muted/50 border rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox 
              id="health-consent" 
              checked={consented}
              onCheckedChange={handleConsentChange}
              className="mt-1"
            />
            <Label 
              htmlFor="health-consent" 
              className="text-sm text-foreground/90 leading-relaxed cursor-pointer"
            >
              {t.label}
            </Label>
          </div>
          <Link 
            to="/privacy" 
            className="text-xs text-primary hover:underline inline-block"
          >
            {t.privacy} →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HealthDataConsent;
