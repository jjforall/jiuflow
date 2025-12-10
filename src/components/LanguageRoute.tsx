import { useEffect } from "react";
import { useParams, Outlet } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import DojoOrProfile from "@/pages/DojoOrProfile";

type Language = "ja" | "en" | "pt" | "es" | "fr" | "de" | "zh" | "ko" | "it" | "ru" | "ar" | "hi";

// Supported languages are exactly 2 characters
const SUPPORTED_LANGUAGES: Language[] = ["ja", "en", "pt", "es", "fr", "de", "zh", "ko", "it", "ru", "ar", "hi"];

export const LanguageRoute = () => {
  const { lang } = useParams<{ lang: string }>();
  const { setLanguage } = useLanguage();

  // Valid language: exactly 2 characters AND in supported list
  const isValidLang = lang && lang.length === 2 && SUPPORTED_LANGUAGES.includes(lang as Language);

  useEffect(() => {
    if (isValidLang) {
      setLanguage(lang as Language);
    }
  }, [lang, isValidLang, setLanguage]);

  // If not a valid language code (must be 2 chars and supported), treat as profile/dojo slug
  // Usernames must be 3+ characters, so any 2-char non-language path goes to 404
  if (!isValidLang) {
    // If it's 2 characters but not a valid language, it's an invalid path
    if (lang && lang.length === 2) {
      return <DojoOrProfile />; // Will show not found or handle appropriately
    }
    // 3+ characters = username/dojo slug
    return <DojoOrProfile />;
  }

  return <Outlet />;
};

export const isValidLanguage = (lang: string): lang is Language => {
  return lang.length === 2 && SUPPORTED_LANGUAGES.includes(lang as Language);
};
