import { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoThumbnailProps {
  videoUrl: string | null;
  className?: string;
  onClick?: () => void;
  showPlayButton?: boolean;
  fallbackText?: string;
}

export const VideoThumbnail = ({
  videoUrl,
  className = '',
  onClick,
  showPlayButton = false,
  fallbackText = 'No video',
}: VideoThumbnailProps) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoUrl) {
      setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      // Seek to 1 second to get a better thumbnail
      video.currentTime = 1;
    };

    const handleSeeked = () => {
      try {
        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setThumbnail(dataUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error creating thumbnail:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    const handleError = () => {
      setError(true);
      setIsLoading(false);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    // Start loading the video
    video.load();

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };
  }, [videoUrl]);

  if (!videoUrl || error) {
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
      className={cn("relative rounded overflow-hidden cursor-pointer group", className)}
      onClick={onClick}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Hidden video element for thumbnail extraction */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        preload="metadata"
        crossOrigin="anonymous"
      />
      
      {thumbnail && (
        <>
          <img
            src={thumbnail}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {showPlayButton && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white/90 rounded-full p-3">
                <Play className="h-6 w-6 text-black fill-current" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Optimized component for displaying videos in a list/grid
export const VideoGrid = ({ 
  videos, 
  onVideoClick 
}: { 
  videos: Array<{ id: string; url: string | null; title?: string }>;
  onVideoClick?: (video: any) => void;
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {videos.map((video) => (
        <div key={video.id} className="space-y-2">
          <VideoThumbnail
            videoUrl={video.url}
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