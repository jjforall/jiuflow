import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, SkipForward, SkipBack } from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string;
  autoPlay?: boolean;
  thumbnailUrl?: string | null;
  onPlay?: () => void;
}

export const VideoPlayer = ({ videoUrl, autoPlay = true, thumbnailUrl, onPlay }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const { language } = useLanguage();
  const [quality, setQuality] = useState<string>("auto");
  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [showSkipIndicator, setShowSkipIndicator] = useState<'forward' | 'backward' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const progressKey = `video-progress:${videoUrl}`;

    // Setup event listeners for loading states
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handlePlaying = () => {
      setIsLoading(false);
      setHasStarted(true);
      onPlay?.();
    };

    // Debounced time update to reduce sessionStorage writes
    const handleTimeUpdate = () => {
      try {
        if (!video.duration || video.duration < 5) return;
        
        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // Save after 1 second of no updates (reduces writes significantly)
        saveTimeoutRef.current = setTimeout(() => {
          sessionStorage.setItem(progressKey, video.currentTime.toString());
        }, 1000);
      } catch (e) {
        console.log('Unable to save video progress:', e);
      }
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Check if the video URL is an HLS stream (.m3u8)
    const isHLS = videoUrl.includes('.m3u8');

    if (isHLS && Hls.isSupported()) {
      // Initialize HLS.js with mobile-optimized settings
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30, // Reduced for mobile memory optimization
        maxBufferLength: 30, // Limit buffer size for mobile
        maxBufferSize: 60 * 1000 * 1000, // 60MB max buffer
        // Adaptive bitrate streaming settings optimized for mobile
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        // Additional mobile optimizations
        maxMaxBufferLength: 60,
        startLevel: -1, // Auto start quality
        autoStartLoad: true,
        // Reduce overhead on mobile
        capLevelToPlayerSize: true, // Don't load higher quality than needed
      });

      hlsRef.current = hls;

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed, qualities available:', hls.levels);
        if (autoPlay) {
          video.play().catch(e => console.log('Autoplay prevented:', e));
        }
      });

      // Quality level switching
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hls.levels[data.level];
        const qualityLabel = level ? `${level.height}p` : 'auto';
        console.log(`Quality changed to: ${qualityLabel}`);
        setQuality(qualityLabel);
      });

      // Error handling
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, attempting recovery...');
              hls.startLoad();
              toast.error(
                language === "ja" 
                  ? "ネットワークエラー" 
                  : language === "pt" 
                  ? "Erro de rede" 
                  : "Network Error",
                {
                  description: language === "ja" 
                    ? "動画の読み込みを再試行しています" 
                    : language === "pt" 
                    ? "Tentando recarregar o vídeo" 
                    : "Attempting to reload video"
                }
              );
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, destroying HLS instance');
              hls.destroy();
              toast.error(
                language === "ja" 
                  ? "動画エラー" 
                  : language === "pt" 
                  ? "Erro de vídeo" 
                  : "Video Error",
                {
                  description: language === "ja" 
                    ? "動画の再生に失敗しました" 
                    : language === "pt" 
                    ? "Falha ao reproduzir vídeo" 
                    : "Failed to play video"
                }
              );
              break;
          }
        }
      });

      // Reduced logging for performance
      hls.on(Hls.Events.LEVEL_LOADED, () => {
        // Removed console.log for performance
      });

      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = videoUrl;
      if (autoPlay) {
        video.play().catch(e => console.log('Autoplay prevented:', e));
      }
    } else {
      // Regular video file
      video.src = videoUrl;
      if (autoPlay) {
        video.play().catch(e => console.log('Autoplay prevented:', e));
      }
    }

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [videoUrl, autoPlay, language, onPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const progressKey = `video-progress:${videoUrl}`;

    const restoreProgress = () => {
      try {
        const saved = sessionStorage.getItem(progressKey);
        if (!saved) return;
        const time = parseFloat(saved);
        if (Number.isNaN(time) || time <= 0) return;
        if (video.duration && time >= video.duration - 1) return;
        video.currentTime = time;
      } catch (e) {
        console.log('Unable to restore video progress:', e);
      }
    };

    if (video.readyState >= 1) {
      restoreProgress();
    } else {
      video.addEventListener('loadedmetadata', restoreProgress);
    }

    return () => {
      video.removeEventListener('loadedmetadata', restoreProgress);
    };
  }, [videoUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          showSkipFeedback('forward');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 10, 0);
          showSkipFeedback('backward');
          break;
        case ' ':
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Double tap handling
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const side = x < rect.width / 2 ? 'left' : 'right';
      const now = Date.now();

      if (lastTapRef.current && 
          now - lastTapRef.current.time < 300 && 
          lastTapRef.current.side === side) {
        // Double tap detected
        if (side === 'left') {
          video.currentTime = Math.max(video.currentTime - 10, 0);
          showSkipFeedback('backward');
        } else {
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          showSkipFeedback('forward');
        }
        lastTapRef.current = null;
      } else {
        lastTapRef.current = { time: now, side };
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  const showSkipFeedback = useCallback((direction: 'forward' | 'backward') => {
    setShowSkipIndicator(direction);
    setTimeout(() => setShowSkipIndicator(null), 600);
  }, []);

  const changeQuality = useCallback((levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setQuality(levelIndex === -1 ? 'auto' : `${hlsRef.current.levels[levelIndex].height}p`);
    }
  }, []);

  return (
    <div ref={containerRef} className="relative bg-black">
      {/* Loading indicator */}
      {isLoading && !hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              {language === "ja" ? "読み込み中..." : language === "pt" ? "Carregando..." : "Loading..."}
            </p>
          </div>
        </div>
      )}
      
      {/* Skip indicators */}
      {showSkipIndicator === 'backward' && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 z-20 pointer-events-none animate-scale-in">
          <div className="flex flex-col items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full p-6 border-2 border-primary shadow-lg">
            <SkipBack className="w-12 h-12 text-primary" />
            <span className="text-sm font-medium">10秒</span>
          </div>
        </div>
      )}
      
      {showSkipIndicator === 'forward' && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 pointer-events-none animate-scale-in">
          <div className="flex flex-col items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full p-6 border-2 border-primary shadow-lg">
            <SkipForward className="w-12 h-12 text-primary" />
            <span className="text-sm font-medium">10秒</span>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        controls
        controlsList="nodownload"
        className="w-full h-full"
        playsInline
        preload="auto"
        poster={thumbnailUrl || undefined}
        onContextMenu={(e) => e.preventDefault()}
        disablePictureInPicture
        webkit-playsinline="true"
      >
        Your browser does not support the video tag.
      </video>
      
      {/* Quality indicator */}
      {quality && (
        <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded text-xs border border-border">
          {quality === 'auto' ? (
            language === "ja" ? "自動" : language === "pt" ? "Auto" : "Auto"
          ) : (
            quality
          )}
        </div>
      )}

      {/* Quality selector (optional, for manual control) */}
      {hlsRef.current && hlsRef.current.levels.length > 1 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          <button
            onClick={() => changeQuality(-1)}
            className={`px-3 py-1 text-xs border rounded ${
              quality === 'auto' ? 'bg-primary text-primary-foreground' : 'bg-background'
            }`}
          >
            {language === "ja" ? "自動" : language === "pt" ? "Auto" : "Auto"}
          </button>
          {hlsRef.current.levels.map((level, index) => (
            <button
              key={index}
              onClick={() => changeQuality(index)}
              className={`px-3 py-1 text-xs border rounded ${
                quality === `${level.height}p` ? 'bg-primary text-primary-foreground' : 'bg-background'
              }`}
            >
              {level.height}p
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
