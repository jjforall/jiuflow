import { useState, useEffect } from "react";

type DubbedManifest = Record<string, Record<string, string>>;

let cachedManifest: DubbedManifest | null = null;
let fetchPromise: Promise<DubbedManifest> | null = null;

const LANG_LABELS: Record<string, string> = {
  ja: "日本語",
  en: "English",
  pt: "Português",
  es: "Español",
  ko: "한국어",
  zh: "中文",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  ru: "Русский",
  ar: "العربية",
  hi: "हिन्दी",
  th: "ไทย",
  id: "Bahasa Indonesia",
};

function loadManifest(): Promise<DubbedManifest> {
  if (cachedManifest) return Promise.resolve(cachedManifest);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/dubbed-videos.json")
    .then((r) => r.json())
    .then((data: DubbedManifest) => {
      cachedManifest = data;
      return data;
    })
    .catch(() => {
      fetchPromise = null;
      return {} as DubbedManifest;
    });
  return fetchPromise;
}

export function useDubbedVideos(techniqueId?: string) {
  const [langs, setLangs] = useState<
    { code: string; label: string; videoUrl: string }[]
  >([]);

  useEffect(() => {
    if (!techniqueId) return;
    loadManifest().then((manifest) => {
      const entry = manifest[techniqueId];
      if (!entry) {
        setLangs([]);
        return;
      }
      const result = Object.entries(entry).map(([code, url]) => ({
        code,
        label: LANG_LABELS[code] || code,
        videoUrl: url,
      }));
      // Sort: en first, then alphabetical
      result.sort((a, b) => {
        if (a.code === "en") return -1;
        if (b.code === "en") return 1;
        return a.label.localeCompare(b.label);
      });
      setLangs(result);
    });
  }, [techniqueId]);

  return langs;
}

export { LANG_LABELS };
