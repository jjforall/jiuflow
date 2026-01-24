import { Subtitles, Mic, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "ja", label: "JA", fullLabel: "日本語" },
  { code: "en", label: "EN", fullLabel: "English" },
  { code: "pt", label: "PT", fullLabel: "Português" },
];

interface LocalizationStatusProps {
  hasTranscription: boolean;
  subtitleLanguages: string[];
  dubbedLanguages: string[];
  processingLanguages?: string[];
  onGenerateSubtitle?: () => void;
  onAddDubbing?: () => void;
  onPlayVideo?: (langCode: string) => void;
  compact?: boolean;
}

export function LocalizationStatus({
  hasTranscription,
  subtitleLanguages,
  dubbedLanguages,
  processingLanguages = [],
  onGenerateSubtitle,
  onAddDubbing,
  onPlayVideo,
  compact = false,
}: LocalizationStatusProps) {
  // Normalize language codes (e.g., "ja-JP" -> "ja")
  const normalizeCode = (code: string) => code.split("-")[0].toLowerCase();
  const normalizedSubtitles = subtitleLanguages.map(normalizeCode);
  const normalizedDubbing = dubbedLanguages.map(normalizeCode);
  const normalizedProcessing = processingLanguages.map(normalizeCode);

  // Filter to only show languages that have subtitles or are processing
  const visibleSubtitleLangs = LANGUAGES.filter(
    (lang) => normalizedSubtitles.includes(lang.code)
  );

  // Filter to only show languages that have dubbing, are processing, or are original (ja)
  const visibleDubbingLangs = LANGUAGES.filter(
    (lang) =>
      lang.code === "ja" ||
      normalizedDubbing.includes(lang.code) ||
      normalizedProcessing.includes(lang.code)
  );

  const hasVisibleSubtitles = visibleSubtitleLangs.length > 0;
  const hasVisibleDubbing = visibleDubbingLangs.length > 0;

  return (
    <div className={cn("space-y-1.5", compact ? "text-xs" : "text-sm")}>
      {/* Subtitle Status - only show if there are subtitles */}
      {hasVisibleSubtitles && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground flex items-center gap-1 shrink-0">
            <Subtitles className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
            <span className="sr-only md:not-sr-only">字幕:</span>
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {visibleSubtitleLangs.map((lang) => (
              <span
                key={lang.code}
                className={cn(
                  "px-1.5 py-0.5 rounded font-medium cursor-pointer hover:opacity-80 transition-opacity",
                  compact ? "text-[10px]" : "text-xs",
                  "bg-green-500/15 text-green-600 dark:text-green-400"
                )}
                title={`${lang.fullLabel}: クリックで再生`}
                onClick={() => onPlayVideo?.(lang.code)}
              >
                {lang.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Show generate subtitle button if no transcription */}
      {!hasTranscription && onGenerateSubtitle && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground flex items-center gap-1 shrink-0">
            <Subtitles className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
          </span>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-5 px-1.5 text-primary hover:text-primary",
              compact ? "text-[10px]" : "text-xs"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onGenerateSubtitle();
            }}
          >
            <Plus className="w-3 h-3 mr-0.5" />
            生成
          </Button>
        </div>
      )}

      {/* Dubbing Status - only show if there are dubbed versions or processing */}
      {hasVisibleDubbing && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground flex items-center gap-1 shrink-0">
            <Mic className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
            <span className="sr-only md:not-sr-only">吹替:</span>
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {visibleDubbingLangs.map((lang) => {
              const isOriginal = lang.code === "ja";
              const isProcessing = normalizedProcessing.includes(lang.code);
              const hasDubbing = normalizedDubbing.includes(lang.code);

              return (
                <span
                  key={lang.code}
                  className={cn(
                    "px-1.5 py-0.5 rounded font-medium transition-all",
                    compact ? "text-[10px]" : "text-xs",
                    isProcessing
                      ? "animate-pulse bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                      : isOriginal || hasDubbing
                        ? "bg-primary/15 text-primary cursor-pointer hover:opacity-80"
                        : "bg-muted text-muted-foreground"
                  )}
                  title={
                    isProcessing
                      ? `${lang.fullLabel}: 変換中...`
                      : isOriginal
                        ? `${lang.fullLabel}: オリジナル - クリックで再生`
                        : hasDubbing
                          ? `${lang.fullLabel}: クリックで再生`
                          : lang.fullLabel
                  }
                  onClick={() => {
                    if ((isOriginal || hasDubbing) && !isProcessing) {
                      onPlayVideo?.(lang.code);
                    }
                  }}
                >
                  {lang.label}
                  {isProcessing && (
                    <Loader2 className="inline w-2.5 h-2.5 ml-0.5 animate-spin" />
                  )}
                </span>
              );
            })}
          </div>
          {onAddDubbing && (
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-5 px-1.5 text-primary hover:text-primary",
                compact ? "text-[10px]" : "text-xs"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onAddDubbing();
              }}
            >
              <Plus className="w-3 h-3 mr-0.5" />
              追加
            </Button>
          )}
        </div>
      )}

      {/* Show add dubbing button if no dubbing section visible */}
      {!hasVisibleDubbing && onAddDubbing && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground flex items-center gap-1 shrink-0">
            <Mic className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
          </span>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-5 px-1.5 text-primary hover:text-primary",
              compact ? "text-[10px]" : "text-xs"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onAddDubbing();
            }}
          >
            <Plus className="w-3 h-3 mr-0.5" />
            追加
          </Button>
        </div>
      )}
    </div>
  );
}
