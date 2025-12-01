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
        backBufferLength: 20, // Smaller buffer for floating player
        maxBufferLength: 20,
        maxBufferSize: 40 * 1000 * 1000, // 40MB max
        capLevelToPlayerSize: true, // Match quality to small player size
        startLevel: -1,
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
