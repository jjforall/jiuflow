import { useEffect, useRef } from "react";
import { X, Maximize2 } from "lucide-react";
import { useFloatingVideo } from "@/contexts/FloatingVideoContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Hls from "hls.js";

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

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // Minimal buffer for floating player
        backBufferLength: 10,
        maxBufferLength: 10,
        maxBufferSize: 15 * 1000 * 1000, // 15MB max
        maxMaxBufferLength: 15,
        // Start at lowest quality for small player
        startLevel: 0,
        capLevelToPlayerSize: true,
        capLevelOnFPSDrop: true,
        // Conservative bandwidth for background playback
        abrEwmaDefaultEstimate: 200000,
        abrBandWidthFactor: 0.7,
        // Reduce overhead
        enableCEA708Captions: false,
        progressive: true,
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
      video.currentTime = floatingVideo.currentTime;
      video.play().catch(e => console.log('Play prevented:', e));
    } else {
      video.src = floatingVideo.videoUrl;
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
          preload="auto"
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
