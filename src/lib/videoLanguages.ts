/**
 * Utility for detecting and managing available audio/video languages for techniques
 */

export interface AvailableVideoLanguage {
  code: string;
  label: string;
  videoUrl: string;
  isOriginal?: boolean;
}

export interface TechniqueVideoData {
  video_url: string | null;
  video_url_ja?: string | null;
  video_url_pt?: string | null;
  video_metadata?: Record<string, { video_url?: string; created_at?: string }> | null;
}

const LANGUAGE_LABELS: Record<string, string> = {
  ja: "日本語",
  en: "English",
  pt: "Português",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ko: "한국어",
  it: "Italiano",
  ru: "Русский",
  ar: "العربية",
  hi: "हिन्दी",
};

/**
 * Get all available audio/video languages for a technique
 * Returns an array of language options with their video URLs
 */
export function getAvailableVideoLanguages(technique: TechniqueVideoData): AvailableVideoLanguage[] {
  const languages: AvailableVideoLanguage[] = [];

  // Japanese (Original) - video_url_ja or video_url
  const jaUrl = technique.video_url_ja || technique.video_url;
  if (jaUrl) {
    languages.push({
      code: "ja",
      label: LANGUAGE_LABELS.ja,
      videoUrl: jaUrl,
      isOriginal: true,
    });
  }

  // Check video_metadata for translations (日本語は除外 - オリジナル音声と二重になるため)
  // 翻訳可能な言語のみを対象とする（jaは常にオリジナルなので除外）
  const translatableLangs = ["en", "pt", "es", "fr", "de", "zh", "ko", "it", "ru", "ar", "hi"];
  
  if (technique.video_metadata && typeof technique.video_metadata === "object") {
    for (const lang of translatableLangs) {
      const metadata = technique.video_metadata[lang];
      if (metadata?.video_url) {
        // PTはレガシーフィールドとの重複をチェック
        if (lang === "pt" && languages.some(l => l.code === "pt")) continue;
        
        languages.push({
          code: lang,
          label: LANGUAGE_LABELS[lang] || lang.toUpperCase(),
          videoUrl: metadata.video_url,
        });
      }
    }
  }
  
  // Legacy field fallback for Portuguese
  if (technique.video_url_pt && !languages.some(l => l.code === "pt")) {
    languages.push({
      code: "pt",
      label: LANGUAGE_LABELS.pt,
      videoUrl: technique.video_url_pt,
    });
  }

  return languages;
}

/**
 * Check if a technique has a translated video for a specific language
 */
export function hasTranslatedVideo(technique: TechniqueVideoData, lang: string): boolean {
  // Japanese is original, always available if video_url exists
  if (lang === "ja") {
    return !!(technique.video_url_ja || technique.video_url);
  }

  // Check video_metadata first
  if (technique.video_metadata?.[lang]?.video_url) {
    return true;
  }

  // Check legacy fields
  if (lang === "pt" && technique.video_url_pt) return true;

  return false;
}

/**
 * Get the video URL for a specific language, falling back to original
 */
export function getVideoUrlForLanguage(technique: TechniqueVideoData, lang: string): string | null {
  // Check metadata first
  if (technique.video_metadata?.[lang]?.video_url) {
    return technique.video_metadata[lang].video_url ?? null;
  }

  // Check legacy fields
  if (lang === "ja") {
    return technique.video_url_ja || technique.video_url;
  }
  if (lang === "pt" && technique.video_url_pt) {
    return technique.video_url_pt;
  }

  // Fallback to original
  return technique.video_url_ja || technique.video_url;
}

/**
 * Get translated language label
 */
export function getLanguageLabel(code: string): string {
  return LANGUAGE_LABELS[code] || code.toUpperCase();
}
