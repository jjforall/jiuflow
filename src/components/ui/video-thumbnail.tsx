import { useState, useEffect, useRef, useCallback } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCloudflareStreamThumbnail } from '@/lib/cloudflareStream';

const FALLBACK_THUMBNAIL_URL = '/images/venues/default-venue.jpg';

interface VideoThumbnailProps {
  videoUrl: string | null;
  thumbnailUrl?: string | null;
  className?: string;
  onClick?: () => void;
  showPlayButton?: boolean;
  fallbackText?: string;
}

export const VideoThumbnail = ({
  videoUrl,
  thumbnailUrl,
  className = '',
  onClick,
  showPlayButton = false,
  fallbackText = 'No video',
}: VideoThumbnailProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // DEBUG: Force visible to true to bypass lazy loading
  const [isVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriedFallbackRef = useRef(false);

  // Lazy loading with Intersection Observer - TEMPORARILY DISABLED FOR DEBUG
  // useEffect(() => {
  //   const currentRef = containerRef.current;
  //   if (!currentRef) return;
  //
  //   const observer = new IntersectionObserver(
  //     ([entry]) => {
  //       if (entry.isIntersecting) {
  //         setIsVisible(true);
  //         observer.disconnect();
  //       }
  //     },
  //     { rootMargin: '200px', threshold: 0.01 }
  //   );
  //
  //   observer.observe(currentRef);
  //
  //   return () => observer.disconnect();
  // }, []);

  // Determine the best thumbnail URL - prioritize provided thumbnailUrl, then generate from Cloudflare Stream videoUrl.
  // NOTE: If the URL is NOT Cloudflare Stream (e.g. old storage mp4), generation returns null.
  const preferredThumbnailUrl = thumbnailUrl || (videoUrl ? getCloudflareStreamThumbnail(videoUrl) : null);

  // Always render an <img> (even when we can't generate a real thumbnail) by falling back to a default still image.
  const baseSrc = preferredThumbnailUrl ?? FALLBACK_THUMBNAIL_URL;

  const [imgSrc, setImgSrc] = useState<string>(baseSrc);

  // DEBUG: Log URL values to diagnose the issue (DEV only)
  if (import.meta.env.DEV) {
    console.log('[VideoThumbnail DEBUG]', {
      videoUrl,
      thumbnailUrl,
      preferredThumbnailUrl,
      baseSrc,
      imgSrc,
      isVisible,
      isLoading,
      error,
    });
  }

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(false);
  }, []);

  // Handle image error: retry once with fallback image, keep <img> in the DOM.
  const handleError = useCallback(() => {
    if (!hasTriedFallbackRef.current && imgSrc !== FALLBACK_THUMBNAIL_URL) {
      hasTriedFallbackRef.current = true;
      setImgSrc(FALLBACK_THUMBNAIL_URL);
      setIsLoading(true);
      setError(false);
      return;
    }

    setError(true);
    setIsLoading(false);
  }, [imgSrc]);

  // Reset states when URL changes
  useEffect(() => {
    setImgSrc(baseSrc);
    setIsLoading(true);
    setError(false);
    hasTriedFallbackRef.current = false;
  }, [baseSrc]);

  if (!videoUrl && !thumbnailUrl) {
    return (
      <div 
        className={cn(
          'bg-muted rounded flex items-center justify-center text-muted-foreground text-xs',
          className
        )}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn('relative rounded overflow-hidden cursor-pointer group bg-muted', className)}
      onClick={onClick}
    >
      {/* Skeleton while loading */}
      {isLoading && !error && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Image - keep <img> tag even if load fails (fallback will kick in) */}
      {isVisible && (
        <img
          src={imgSrc}
          alt="BJJ video thumbnail"
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      
      {/* Play button overlay */}
      {showPlayButton && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/90 rounded-full p-3">
            <Play className="h-6 w-6 text-black fill-current" />
          </div>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs bg-muted">
          {fallbackText}
        </div>
      )}
    </div>
  );
};

// Optimized component for displaying videos in a list/grid
export const VideoGrid = ({ 
  videos, 
  onVideoClick 
}: { 
  videos: Array<{ id: string; url: string | null; thumbnailUrl?: string | null; title?: string }>;
  onVideoClick?: (video: any) => void;
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {videos.map((video) => (
        <div key={video.id} className="space-y-2">
          <VideoThumbnail
            videoUrl={video.url}
            thumbnailUrl={video.thumbnailUrl}
            className="aspect-video w-full"
            showPlayButton
            onClick={() => onVideoClick?.(video)}
          />
          {video.title && (
            <p className="text-sm truncate">{video.title}</p>
          )}
        </div>
      ))}
    </div>
  );
};
