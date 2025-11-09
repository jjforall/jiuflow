import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";

type TranslationCache = Record<string, string>;

export const useTranslation = () => {
  const { language } = useLanguage();
  const [cache, setCache] = useState<TranslationCache>({});

  const t = (key: string, defaultText?: string): string => {
    // まず既存の翻訳を確認
    const keys = key.split(".");
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }

    if (value && typeof value === "string") {
      return value;
    }

    // デフォルトテキストがあればそれを使用
    if (defaultText) {
      return defaultText;
    }

    // キャッシュをチェック
    const cacheKey = `${language}:${key}`;
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    return key;
  };

  const translateText = async (text: string, sourceLang: string = "ja"): Promise<string> => {
    if (language === sourceLang) return text;

    const cacheKey = `${language}:${text}`;
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    try {
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { text, sourceLang, targetLang: language },
      });

      if (error) throw error;
      
      const translated = data.translatedText;
      setCache((prev) => ({ ...prev, [cacheKey]: translated }));
      return translated;
    } catch (error) {
      console.error("Translation error:", error);
      return text;
    }
  };

  return { t, translateText, language };
};
