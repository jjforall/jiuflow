import { Subtitles, Mic } from "lucide-react";

interface LocalizationBadgesProps {
  subtitleLanguages?: string[];
  dubbedLanguages?: string[];
  compact?: boolean;
}

const languageLabels: Record<string, string> = {
  ja: "日本語",
  en: "EN",
  pt: "PT",
  "ja-JP": "日本語",
  "en-US": "EN",
  "pt-BR": "PT",
};

export function LocalizationBadges({ 
  subtitleLanguages = [], 
  dubbedLanguages = [],
  compact = false 
}: LocalizationBadgesProps) {
  const hasSubtitles = subtitleLanguages.length > 0;
  const hasDubbing = dubbedLanguages.length > 0;

  if (!hasSubtitles && !hasDubbing) {
    return null;
  }

  const formatLanguages = (langs: string[]) => {
    return langs.map(l => languageLabels[l] || l.toUpperCase()).join("・");
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {hasSubtitles && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            <Subtitles className="w-2.5 h-2.5" />
            {formatLanguages(subtitleLanguages)}
          </span>
        )}
        {hasDubbing && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
            <Mic className="w-2.5 h-2.5" />
            {formatLanguages(dubbedLanguages)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {hasSubtitles && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Subtitles className="w-3 h-3" />
          字幕: {formatLanguages(subtitleLanguages)}
        </span>
      )}
      {hasDubbing && (
        <span className="inline-flex items-center gap-1 text-xs text-primary/80">
          <Mic className="w-3 h-3" />
          吹替: {formatLanguages(dubbedLanguages)}
        </span>
      )}
    </div>
  );
}
