import { useEffect } from "react";
import { useParams, Outlet } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import DojoOrProfile from "@/pages/DojoOrProfile";

type Language = "ja" | "en" | "pt" | "es" | "fr" | "de" | "zh" | "ko" | "it" | "ru" | "ar" | "hi";

const SUPPORTED_LANGUAGES: Language[] = ["ja", "en", "pt", "es", "fr", "de", "zh", "ko", "it", "ru", "ar", "hi"];

export const LanguageRoute = () => {
  const { lang } = useParams<{ lang: string }>();
  const { setLanguage } = useLanguage();

  const isValidLang = lang && SUPPORTED_LANGUAGES.includes(lang as Language);

  useEffect(() => {
    if (isValidLang) {
      setLanguage(lang as Language);
    }
  }, [lang, isValidLang, setLanguage]);

  // If not a valid language code, treat this as a profile/dojo slug
  if (!isValidLang) {
    return <DojoOrProfile />;
  }

  return <Outlet />;
};

export const isValidLanguage = (lang: string): lang is Language => {
  return SUPPORTED_LANGUAGES.includes(lang as Language);
};
