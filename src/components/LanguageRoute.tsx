import { useEffect } from "react";
import { useParams, Outlet, Navigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

type Language = "ja" | "en" | "pt" | "es" | "fr" | "de" | "zh" | "ko" | "it" | "ru" | "ar" | "hi";

const SUPPORTED_LANGUAGES: Language[] = ["ja", "en", "pt", "es", "fr", "de", "zh", "ko", "it", "ru", "ar", "hi"];

export const LanguageRoute = () => {
  const { lang } = useParams<{ lang: string }>();
  const { setLanguage } = useLanguage();

  // If lang is not a valid language code, redirect to /:slugOrUsername route
  const isValidLang = lang && SUPPORTED_LANGUAGES.includes(lang as Language);

  useEffect(() => {
    if (isValidLang) {
      setLanguage(lang as Language);
    }
  }, [lang, isValidLang, setLanguage]);

  // If not a valid language, let the default routes handle it
  if (!isValidLang) {
    return <Navigate to={`/${lang}`} replace />;
  }

  return <Outlet />;
};

export const isValidLanguage = (lang: string): lang is Language => {
  return SUPPORTED_LANGUAGES.includes(lang as Language);
};
