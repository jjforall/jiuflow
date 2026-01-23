import { Subtitles, Mic, Plus } from "lucide-react";
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
  onGenerateSubtitle?: () => void;
  onAddDubbing?: () => void;
  compact?: boolean;
}

export function LocalizationStatus({
  hasTranscription,
  subtitleLanguages,
  dubbedLanguages,
  onGenerateSubtitle,
  onAddDubbing,
  compact = false,
}: LocalizationStatusProps) {
  // Normalize language codes (e.g., "ja-JP" -> "ja")
  const normalizeCode = (code: string) => code.split("-")[0].toLowerCase();
  const normalizedSubtitles = subtitleLanguages.map(normalizeCode);
  const normalizedDubbing = dubbedLanguages.map(normalizeCode);

  return (
    <div className={cn("space-y-1.5", compact ? "text-xs" : "text-sm")}>
      {/* Subtitle Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-muted-foreground flex items-center gap-1 shrink-0">
          <Subtitles className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
          <span className="sr-only md:not-sr-only">字幕:</span>
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {LANGUAGES.map((lang) => {
            const hasSubtitle = normalizedSubtitles.includes(lang.code);
            return (
              <span
                key={lang.code}
                className={cn(
                  "px-1.5 py-0.5 rounded font-medium",
                  compact ? "text-[10px]" : "text-xs",
                  hasSubtitle
                    ? "bg-green-500/15 text-green-600 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                )}
                title={`${lang.fullLabel}: ${hasSubtitle ? "あり" : "なし"}`}
              >
                {lang.label}
                {hasSubtitle ? "✓" : "✗"}
              </span>
            );
          })}
        </div>
        {!hasTranscription && onGenerateSubtitle && (
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
        )}
      </div>

      {/* Dubbing Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-muted-foreground flex items-center gap-1 shrink-0">
          <Mic className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
          <span className="sr-only md:not-sr-only">吹替:</span>
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {LANGUAGES.map((lang) => {
            const isOriginal = lang.code === "ja";
            const hasDubbing = isOriginal || normalizedDubbing.includes(lang.code);
            return (
              <span
                key={lang.code}
                className={cn(
                  "px-1.5 py-0.5 rounded font-medium",
                  compact ? "text-[10px]" : "text-xs",
                  hasDubbing
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
                title={`${lang.fullLabel}: ${isOriginal ? "オリジナル" : hasDubbing ? "あり" : "なし"}`}
              >
                {lang.label}
                {isOriginal ? "○" : hasDubbing ? "✓" : "✗"}
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
    </div>
  );
}
