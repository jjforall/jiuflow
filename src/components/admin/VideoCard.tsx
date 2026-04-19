import { Edit, FileText, Trash2, Clock, RefreshCw, Loader2, Download, AlertTriangle, Globe, Link2, Lock } from "lucide-react";
// Loader2 and AlertTriangle are also used by the Cloudflare health badge.
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LocalizationStatus } from "./LocalizationStatus";
import { cn } from "@/lib/utils";
import type { Technique } from "@/hooks/usePaginatedTechniques";
import { NOTATION_CATEGORY_LABELS, type NotationCategory } from "@/types/notation";

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

// Notation badge component with name for tooltip
interface NotationBadge {
  code: string;
  category: string;
  name_ja?: string;
  name_en?: string;
}

interface VideoCardProps {
  technique: Technique;
  transcription: { id: string; status: string } | null;
  subtitleLanguages: string[];
  dubbedLanguages: string[];
  processingLanguages?: string[];
  isFetchingDuration?: boolean;
  notations?: NotationBadge[];
  /** Cloudflare Stream health: 'ok' | 'missing' | 'unknown' | 'checking' | undefined */
  cfHealth?: 'ok' | 'missing' | 'unknown' | 'checking';
  onEdit: () => void;
  onPreview: (langCode?: string) => void;
  onTranscribe: () => void;
  onTranslate: () => void;
  onDelete: () => void;
  onDeleteDubbing?: (langCode: string) => void;
  onFetchDuration?: () => void;
  onDownload?: () => void;
  isDownloading?: boolean;
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
  processingLanguages = [],
  isFetchingDuration = false,
  notations = [],
  cfHealth,
  onEdit,
  onPreview,
  onTranscribe,
  onTranslate,
  onDelete,
  onDeleteDubbing,
  onFetchDuration,
  onDownload,
  isDownloading = false,
  isAdmin,
}: VideoCardProps) {
  const thumbnail = getEffectiveThumbnail(technique.thumbnail_url, technique.video_url);
  const hasTranscription = !!transcription && transcription.status === "completed";
  const duration = getVideoDuration(technique.video_metadata);
  const hasMissingDuration = technique.video_url && !duration;
  
  // Helper to get notation badge color
  const getNotationColor = (category: string): string => {
    const categoryKey = category as NotationCategory;
    return NOTATION_CATEGORY_LABELS[categoryKey]?.color || 'bg-gray-500';
  };

  const handlePlayVideo = (langCode: string) => {
    onPreview(langCode);
  };

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
              onClick={() => onPreview()}
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
          
        {/* Visibility badge - top left of thumbnail */}
        <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1">
          {technique.visibility === 'public' && (
            <Badge className="bg-green-600/90 text-white text-[9px] px-1.5 py-0.5 h-auto border-0 flex items-center gap-0.5">
              <Globe className="h-2.5 w-2.5" />
              公開
            </Badge>
          )}
          {technique.visibility === 'unlisted' && (
            <Badge className="bg-yellow-500/90 text-black text-[9px] px-1.5 py-0.5 h-auto border-0 flex items-center gap-0.5">
              <Link2 className="h-2.5 w-2.5" />
              限定
            </Badge>
          )}
          {technique.visibility === 'private' && (
            <Badge className="bg-red-600/90 text-white text-[9px] px-1.5 py-0.5 h-auto border-0 flex items-center gap-0.5">
              <Lock className="h-2.5 w-2.5" />
              非公開
            </Badge>
          )}
          {cfHealth === 'missing' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className="bg-destructive/95 text-destructive-foreground text-[9px] px-1.5 py-0.5 h-auto border-0 flex items-center gap-0.5 cursor-pointer animate-pulse"
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  動画欠損
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">Cloudflare Stream上にこの動画ファイルが存在しません (404)。クリックして編集ダイアログから再アップロードしてください。</p>
              </TooltipContent>
            </Tooltip>
          )}
          {cfHealth === 'checking' && (
            <Badge className="bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 h-auto border-0 flex items-center gap-0.5">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              確認中
            </Badge>
          )}
        </div>
        
        {/* Duration badge - clickable if missing */}
          <div 
            className={cn(
              "absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-medium rounded flex items-center gap-1",
              hasMissingDuration && isAdmin && onFetchDuration && "cursor-pointer hover:bg-primary/80"
            )}
            onClick={(e) => {
              if (hasMissingDuration && isAdmin && onFetchDuration && !isFetchingDuration) {
                e.stopPropagation();
                onFetchDuration();
              }
            }}
            title={hasMissingDuration && isAdmin ? "クリックして時間を取得" : undefined}
          >
            {isFetchingDuration ? (
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
            ) : (
              <Clock className="w-2.5 h-2.5" />
            )}
            {duration ? formatDuration(duration) : (hasMissingDuration && isAdmin ? (
              <span className="flex items-center gap-0.5">
                <RefreshCw className="w-2 h-2" />
                取得
              </span>
            ) : '--:--')}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col min-w-0">
          {/* Title section */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm sm:text-base leading-tight truncate" title={technique.name}>
                {technique.name}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate" title={technique.name_ja}>
                {technique.name_ja}
              </p>
            </div>
          </div>
          
          {/* Notation badges (new system) - show code + Japanese name directly */}
          {notations.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {notations.slice(0, 4).map((n, idx) => (
                <Tooltip key={`${n.code}-${idx}`}>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 h-auto font-normal text-white max-w-[140px] truncate",
                        getNotationColor(n.category)
                      )}
                    >
                      <span className="font-mono font-medium">[{n.code}]</span>
                      {n.name_ja && <span className="ml-1 truncate">{n.name_ja}</span>}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs z-50">
                    <p className="text-sm font-medium">{n.name_ja || n.code}</p>
                    {n.name_en && <p className="text-xs text-muted-foreground">{n.name_en}</p>}
                    <p className="text-xs text-muted-foreground/70 mt-1">カテゴリー: {NOTATION_CATEGORY_LABELS[n.category as NotationCategory]?.ja || n.category}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {notations.length > 4 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto">
                      +{notations.length - 4}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs z-50">
                    {notations.slice(4).map((n, idx) => (
                      <p key={idx} className="text-xs">
                        <span className="font-mono">[{n.code}]</span> {n.name_ja}
                      </p>
                    ))}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
          
          {/* Visibility badges moved to thumbnail - removed from here */}

          <div className="mb-3">
            <LocalizationStatus
              hasTranscription={hasTranscription}
              subtitleLanguages={subtitleLanguages}
              dubbedLanguages={dubbedLanguages}
              processingLanguages={processingLanguages}
              onGenerateSubtitle={isAdmin && technique.video_url ? onTranscribe : undefined}
              onAddDubbing={isAdmin && technique.video_url ? onTranslate : undefined}
              onPlayVideo={handlePlayVideo}
              onDeleteDubbing={isAdmin && onDeleteDubbing ? onDeleteDubbing : undefined}
              compact
            />
          </div>

          {/* Action buttons */}
          <div className="mt-auto flex flex-wrap gap-1.5 sm:gap-2 items-center">
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
                    
                    {onDownload && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                        onClick={onDownload}
                        disabled={isDownloading}
                        title="動画をダウンロード"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3 h-3 animate-spin sm:mr-1" />
                        ) : (
                          <Download className="w-3 h-3 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">DL</span>
                      </Button>
                    )}
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
            
            {/* Legacy series tag - compact display at right end */}
            {technique.series_prefix && (
              <span className="ml-auto text-[9px] text-muted-foreground/50 font-mono whitespace-nowrap">
                {technique.series_prefix}{technique.series_order ? `-${technique.series_order}` : ''} (旧)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
