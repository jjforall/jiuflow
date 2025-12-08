import { useEffect } from "react";
import { useParams, Outlet } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

type Language = "ja" | "en" | "pt" | "es" | "fr" | "de" | "zh" | "ko" | "it" | "ru" | "ar" | "hi";

const SUPPORTED_LANGUAGES: Language[] = ["ja", "en", "pt", "es", "fr", "de", "zh", "ko", "it", "ru", "ar", "hi"];

export const LanguageRoute = () => {
  const { lang } = useParams<{ lang: string }>();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    if (lang && SUPPORTED_LANGUAGES.includes(lang as Language)) {
      setLanguage(lang as Language);
    }
  }, [lang, setLanguage]);

  return <Outlet />;
};

export const isValidLanguage = (lang: string): lang is Language => {
  return SUPPORTED_LANGUAGES.includes(lang as Language);
};
