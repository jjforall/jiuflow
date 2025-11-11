import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";

type TranslationCache = Record<string, string>;

export const useTranslation = () => {
  const { language } = useLanguage();
  const [cache, setCache] = useState<TranslationCache>({});

  const t = (key: string, defaultText?: string): string => {
    // まず既存の翻訳を確認（存在しない言語は英語にフォールバック）
    const keys = key.split(".");
    const pack: any = translations[language] || translations.en;
    let value: any = pack;
    
    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k];
      } else {
        value = null;
        break;
      }
    }

    if (typeof value === "string") {
      return value;
    }

    // キーが欠落している場合も英語にフォールバック
    if (language !== "en") {
      let fallback: any = translations.en;
      for (const k of keys) {
        if (fallback && typeof fallback === "object") {
          fallback = fallback[k];
        } else {
          fallback = undefined;
          break;
        }
      }
      if (typeof fallback === "string") {
        return fallback;
      }
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
