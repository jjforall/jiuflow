import { Subtitles, Mic, FileText } from "lucide-react";

interface LocalizationBadgesProps {
  subtitleLanguages?: string[];
  dubbedLanguages?: string[];
  hasTranscription?: boolean;
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
  hasTranscription = false,
  compact = false 
}: LocalizationBadgesProps) {
  const hasSubtitles = subtitleLanguages.length > 0;
  const hasDubbing = dubbedLanguages.length > 0;

  if (!hasSubtitles && !hasDubbing && !hasTranscription) {
    return null;
  }

  const formatLanguages = (langs: string[]) => {
    return langs.map(l => languageLabels[l] || l.toUpperCase()).join("・");
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {hasTranscription && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            <FileText className="w-2.5 h-2.5" />
            文字起こし
          </span>
        )}
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
      {hasTranscription && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <FileText className="w-3 h-3" />
          文字起こし完了
        </span>
      )}
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
