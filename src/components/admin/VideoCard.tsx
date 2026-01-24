import { Play, Edit, Languages, FileText, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeriesBadge } from "@/components/ui/series-badge";
import { LocalizationStatus } from "./LocalizationStatus";
import { cn } from "@/lib/utils";
import type { Technique } from "@/hooks/usePaginatedTechniques";

// Format duration in seconds to MM:SS or HH:MM:SS
function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Extract duration from video_metadata
function getVideoDuration(videoMetadata: unknown): number | null {
  if (!videoMetadata || typeof videoMetadata !== "object") return null;
  const meta = videoMetadata as Record<string, unknown>;
  if (typeof meta.duration === "number") return meta.duration;
  if (typeof meta.duration === "string") return parseFloat(meta.duration);
  return null;
}

interface VideoCardProps {
  technique: Technique;
  transcription: { id: string; status: string } | null;
  subtitleLanguages: string[];
  dubbedLanguages: string[];
  onEdit: () => void;
  onPreview: () => void;
  onTranscribe: () => void;
  onTranslate: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}

// Get effective thumbnail URL (fallback to Cloudflare auto-generated)
function getEffectiveThumbnail(thumbnailUrl: string | null, videoUrl: string | null): string | null {
  if (thumbnailUrl) return thumbnailUrl;
  if (!videoUrl) return null;
  
  const patterns = [
    /cloudflarestream\.com\/([a-zA-Z0-9]+)/,
    /videodelivery\.net\/([a-zA-Z0-9]+)/,
    /watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = videoUrl.match(pattern);
    if (match) {
      return `https://videodelivery.net/${match[1]}/thumbnails/thumbnail.jpg?time=1s&width=320&height=180`;
    }
  }
  return null;
}

export function VideoCard({
  technique,
  transcription,
  subtitleLanguages,
  dubbedLanguages,
  onEdit,
  onPreview,
  onTranscribe,
  onTranslate,
  onDelete,
  isAdmin,
}: VideoCardProps) {
  const thumbnail = getEffectiveThumbnail(technique.thumbnail_url, technique.video_url);
  const hasTranscription = !!transcription && transcription.status === "completed";
  const duration = getVideoDuration(technique.video_metadata);

  return (
    <div className="border rounded-lg bg-card hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Thumbnail - Left side on desktop, top on mobile */}
        <div className="relative shrink-0 sm:w-40 md:w-48 lg:w-56 aspect-video sm:aspect-auto sm:h-auto group">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={technique.name}
              className="w-full h-full object-cover cursor-pointer"
              loading="lazy"
              onClick={onPreview}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full min-h-[100px] sm:min-h-0 bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-xs">No Video</span>
            </div>
          )}
          
          {/* Play overlay */}
          {technique.video_url && (
            <button
              onClick={onPreview}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="動画を再生"
            >
              <Play className="w-10 h-10 text-white fill-white/80" />
            </button>
          )}
          
          {/* Series badge overlay */}
          {technique.series_prefix && (
            <div className="absolute top-2 left-2">
              <SeriesBadge
                prefix={technique.series_prefix}
                order={technique.series_order || undefined}
                className="shadow-md"
              />
            </div>
          )}
          
          {/* Duration badge */}
          {duration && (
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-medium rounded flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatDuration(duration)}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col min-w-0">
          {/* Title section */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm sm:text-base leading-tight truncate" title={technique.name}>
                {technique.name}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate" title={technique.name_ja}>
                {technique.name_ja}
              </p>
            </div>
            <span className="shrink-0 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary whitespace-nowrap">
              {technique.category}
            </span>
          </div>

          {/* Localization status */}
          <div className="mb-3">
            <LocalizationStatus
              hasTranscription={hasTranscription}
              subtitleLanguages={subtitleLanguages}
              dubbedLanguages={dubbedLanguages}
              onGenerateSubtitle={isAdmin && technique.video_url ? onTranscribe : undefined}
              onAddDubbing={isAdmin && technique.video_url ? onTranslate : undefined}
              compact
            />
          </div>

          {/* Action buttons */}
          <div className="mt-auto flex flex-wrap gap-1.5 sm:gap-2">
            {technique.video_url && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                onClick={onPreview}
              >
                <Play className="w-3 h-3 sm:mr-1" />
                <span className="hidden sm:inline">再生</span>
              </Button>
            )}
            
            {isAdmin && (
              <>
                {technique.video_url && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                      onClick={onTranscribe}
                      title={hasTranscription ? "文字起こし詳細" : "文字起こし生成"}
                    >
                      <FileText className={cn("w-3 h-3 sm:mr-1", hasTranscription && "text-green-600")} />
                      <span className="hidden sm:inline">{hasTranscription ? "字幕" : "文字起こし"}</span>
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                      onClick={onTranslate}
                      title="動画翻訳"
                    >
                      <Languages className="w-3 h-3 sm:mr-1" />
                      <span className="hidden sm:inline">吹替</span>
                    </Button>
                  </>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                  onClick={onEdit}
                >
                  <Edit className="w-3 h-3 sm:mr-1" />
                  <span className="hidden sm:inline">編集</span>
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 sm:h-8 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onDelete}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
