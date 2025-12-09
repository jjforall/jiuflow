import { useEffect, useRef } from "react";
import { X, Maximize2 } from "lucide-react";
import { useFloatingVideo } from "@/contexts/FloatingVideoContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Hls from "hls.js";

// Get connection quality for adaptive settings
const getConnectionQuality = (): 'slow' | 'medium' | 'fast' => {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number } };
  if (nav.connection) {
    const { effectiveType, downlink } = nav.connection;
    if (effectiveType === '2g' || effectiveType === 'slow-2g' || (downlink && downlink < 0.5)) return 'slow';
    if (effectiveType === '3g' || (downlink && downlink < 2)) return 'medium';
  }
  return 'fast';
};

export const FloatingVideoPlayer = () => {
  const { floatingVideo, clearFloatingVideo } = useFloatingVideo();
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !floatingVideo) return;

    const isHLS = floatingVideo.videoUrl.includes('.m3u8');
    const quality = getConnectionQuality();

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // Ultra-minimal buffer for floating player
        backBufferLength: 5,
        maxBufferLength: quality === 'slow' ? 3 : 8,
        maxBufferSize: 10 * 1000 * 1000, // 10MB max
        maxMaxBufferLength: 10,
        // Always start at lowest quality for small player
        startLevel: 0,
        capLevelToPlayerSize: true,
        capLevelOnFPSDrop: true,
        // Very conservative for floating player
        abrEwmaDefaultEstimate: quality === 'slow' ? 100000 : 300000,
        abrBandWidthFactor: 0.6,
        abrBandWidthUpFactor: 0.3,
        // Fast timeouts
        fragLoadingTimeOut: 5000,
        manifestLoadingTimeOut: 4000,
        // Reduce overhead
        enableCEA708Captions: false,
        enableWebVTT: false,
        progressive: true,
        startFragPrefetch: true,
      });
      hlsRef.current = hls;
      hls.loadSource(floatingVideo.videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.currentTime = floatingVideo.currentTime;
        video.play().catch(e => console.log('Play prevented:', e));
      });

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = floatingVideo.videoUrl;
      video.preload = 'metadata';
      video.currentTime = floatingVideo.currentTime;
      video.play().catch(e => console.log('Play prevented:', e));
    } else {
      video.src = floatingVideo.videoUrl;
      video.preload = 'metadata';
      video.currentTime = floatingVideo.currentTime;
      video.play().catch(e => console.log('Play prevented:', e));
    }
  }, [floatingVideo]);

  // Clear floating video if we navigate back to a video page
  useEffect(() => {
    if (location.pathname.startsWith('/video/')) {
      clearFloatingVideo();
    }
  }, [location.pathname, clearFloatingVideo]);

  if (!floatingVideo) return null;

  const handleExpand = () => {
    // Store current time before navigating
    if (videoRef.current) {
      sessionStorage.setItem(`video-progress:${floatingVideo.videoUrl}`, videoRef.current.currentTime.toString());
    }
    clearFloatingVideo();
    // Navigate back would require storing the video ID, for now just close
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-background border border-border rounded-lg shadow-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-muted px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-medium truncate flex-1">{floatingVideo.title}</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleExpand}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearFloatingVideo}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Video */}
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          controls
          controlsList="nodownload"
          className="w-full h-full"
          playsInline
          preload="metadata"
          poster={floatingVideo.thumbnailUrl || undefined}
          onContextMenu={(e) => e.preventDefault()}
          disablePictureInPicture
          webkit-playsinline="true"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};
