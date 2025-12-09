import { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoThumbnailProps {
  videoUrl: string | null;
  thumbnailUrl?: string | null;
  className?: string;
  onClick?: () => void;
  showPlayButton?: boolean;
  fallbackText?: string;
}

// Extract Cloudflare Stream video ID from various URL formats
const getCloudflareVideoId = (url: string): string | null => {
  // Format: https://customer-xxx.cloudflarestream.com/VIDEO_ID/...
  // Or: https://videodelivery.net/VIDEO_ID/...
  const patterns = [
    /cloudflarestream\.com\/([a-zA-Z0-9]+)/,
    /videodelivery\.net\/([a-zA-Z0-9]+)/,
    /watch\.cloudflarestream\.com\/([a-zA-Z0-9]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Get Cloudflare Stream thumbnail URL
const getCloudflareStreamThumbnail = (videoUrl: string, time = 1): string | null => {
  const videoId = getCloudflareVideoId(videoUrl);
  if (!videoId) return null;
  
  // Cloudflare Stream thumbnail API - use small size for fast loading
  return `https://videodelivery.net/${videoId}/thumbnails/thumbnail.jpg?time=${time}s&width=320&height=180`;
};

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
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Start loading 100px before visible
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Determine the best thumbnail URL
  const effectiveThumbnailUrl = thumbnailUrl || 
    (videoUrl ? getCloudflareStreamThumbnail(videoUrl) : null);

  if (!videoUrl || (!effectiveThumbnailUrl && !isLoading)) {
    return (
      <div 
        className={cn(
          "bg-muted rounded flex items-center justify-center text-muted-foreground",
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
      className={cn("relative rounded overflow-hidden cursor-pointer group bg-muted", className)}
      onClick={onClick}
    >
      {/* Skeleton while loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Only load image when visible (lazy loading) */}
      {isVisible && effectiveThumbnailUrl && (
        <>
          <img
            src={effectiveThumbnailUrl}
            alt="Video thumbnail"
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            loading="lazy"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setError(true);
              setIsLoading(false);
            }}
          />
          
          {showPlayButton && !isLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/90 rounded-full p-3">
                <Play className="h-6 w-6 text-black fill-current" />
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
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
