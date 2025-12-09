import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, SkipForward, SkipBack, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showSkipIndicator, setShowSkipIndicator] = useState<'forward' | 'backward' | null>(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bufferingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const progressKey = `video-progress:${videoUrl}`;

    // Setup event listeners for loading states
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsBuffering(false);
      setHasStarted(true);
      onPlay?.();
    };
    
    // Buffering detection - show spinner when video stalls
    const handleWaiting = () => {
      // Debounce to avoid flickering on quick buffers
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
      }
      bufferingTimeoutRef.current = setTimeout(() => {
        if (!video.paused && video.readyState < 3) {
          setIsBuffering(true);
        }
      }, 200);
    };
    
    const handleCanPlayThrough = () => {
      setIsBuffering(false);
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
      }
    };
    
    const handleStalled = () => {
      // Video data transfer has stalled
      console.log('Video stalled, attempting recovery...');
      setIsBuffering(true);
    };
    
    const handleSeeked = () => {
      // After seeking, reset buffering state
      setIsBuffering(false);
    };

    // Debounced time update to reduce sessionStorage writes
    const handleTimeUpdate = () => {
      try {
        if (!video.duration || video.duration < 5) return;
        
        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // Save after 2 seconds of no updates (reduces writes significantly)
        saveTimeoutRef.current = setTimeout(() => {
          sessionStorage.setItem(progressKey, video.currentTime.toString());
        }, 2000);
      } catch (e) {
        console.log('Unable to save video progress:', e);
      }
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Check if the video URL is an HLS stream (.m3u8)
    const isHLS = videoUrl.includes('.m3u8');

    if (isHLS && Hls.isSupported()) {
      // Detect connection type for adaptive settings
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType || '4g';
      const downlink = connection?.downlink || 10; // Mbps estimate
      
      // Adaptive settings based on connection
      const is5GOrFast = effectiveType === '5g' || downlink >= 20;
      const isSlow = effectiveType === '3g' || effectiveType === '2g' || downlink < 3;
      
      console.log(`Network: ${effectiveType}, Downlink: ${downlink}Mbps, Mode: ${is5GOrFast ? '5G/Fast' : isSlow ? 'Slow' : '4G'}`);
      
      // Initialize HLS.js optimized for 4G/5G mobile networks
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: is5GOrFast, // Enable for 5G
        // Buffer settings - more aggressive for 5G
        backBufferLength: is5GOrFast ? 60 : 30,
        maxBufferLength: is5GOrFast ? 30 : 15,
        maxBufferSize: is5GOrFast ? 120 * 1000 * 1000 : 60 * 1000 * 1000,
        maxMaxBufferLength: is5GOrFast ? 120 : 60,
        // Prefetch for faster start
        startFragPrefetch: true,
        // Timeouts - shorter for 5G, longer for slow connections
        fragLoadingTimeOut: isSlow ? 30000 : is5GOrFast ? 10000 : 20000,
        fragLoadingMaxRetry: isSlow ? 6 : 4,
        fragLoadingRetryDelay: isSlow ? 1000 : 500,
        fragLoadingMaxRetryTimeout: 30000,
        manifestLoadingTimeOut: isSlow ? 20000 : is5GOrFast ? 8000 : 15000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: isSlow ? 20000 : is5GOrFast ? 8000 : 15000,
        levelLoadingMaxRetry: 3,
        // Start level: auto for fast, low for slow
        startLevel: isSlow ? 0 : -1,
        autoStartLoad: true,
        // Stall recovery
        nudgeMaxRetry: 10,
        nudgeOffset: 0.1,
        highBufferWatchdogPeriod: 2,
        progressive: true,
        // ABR - adaptive based on connection
        abrEwmaDefaultEstimate: isSlow ? 1000000 : is5GOrFast ? 20000000 : 5000000, // 1/20/5 Mbps
        abrEwmaFastLive: is5GOrFast ? 2.0 : 3.0,
        abrEwmaSlowLive: is5GOrFast ? 6.0 : 9.0,
        abrEwmaFastVoD: is5GOrFast ? 2.0 : 3.0,
        abrEwmaSlowVoD: is5GOrFast ? 6.0 : 9.0,
        abrBandWidthFactor: is5GOrFast ? 0.9 : 0.8,
        abrBandWidthUpFactor: is5GOrFast ? 0.85 : 0.7,
        abrMaxWithRealBitrate: true,
        // Disable unused features
        enableCEA708Captions: false,
        enableWebVTT: false,
        enableIMSC1: false,
        // XHR timeout
        xhrSetup: (xhr) => {
          xhr.timeout = isSlow ? 30000 : is5GOrFast ? 10000 : 20000;
        },
        debug: false,
      });

      hlsRef.current = hls;

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed, qualities available:', hls.levels);
        if (autoPlay) {
          // Start muted for guaranteed autoplay, unmute after start
          video.muted = true;
          video.play().then(() => {
            // Unmute after successful play
            setTimeout(() => {
              video.muted = false;
            }, 100);
          }).catch(e => console.log('Autoplay prevented:', e));
        }
      });

      // Quality level switching
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hls.levels[data.level];
        const qualityLabel = level ? `${level.height}p` : 'auto';
        console.log(`Quality changed to: ${qualityLabel}`);
        setQuality(qualityLabel);
      });
      
      // Buffer state logging for debugging
      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        // Buffer was successfully appended
        setIsBuffering(false);
      });
      
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        // Fragment buffered successfully
        setIsBuffering(false);
      });

      // Error handling with aggressive recovery
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data.type, data.details);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, attempting recovery...');
              // Try to recover by restarting load
              setTimeout(() => {
                hls.startLoad();
              }, 1000);
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
                    ? "動画の再生に失敗しました。ページを更新してください。" 
                    : language === "pt" 
                    ? "Falha ao reproduzir vídeo. Atualize a página." 
                    : "Failed to play video. Please refresh the page."
                }
              );
              break;
          }
        } else {
          // Non-fatal error - try to recover silently
          if (data.details === 'bufferStalledError') {
            console.log('Buffer stalled, nudging...');
            // HLS.js will auto-recover, just log it
          }
        }
      });

      return () => {
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('canplaythrough', handleCanPlayThrough);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('stalled', handleStalled);
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        if (bufferingTimeoutRef.current) {
          clearTimeout(bufferingTimeoutRef.current);
        }
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari) - use auto preload
      video.src = videoUrl;
      video.preload = 'auto';
      if (autoPlay) {
        video.muted = true;
        video.play().then(() => {
          setTimeout(() => { video.muted = false; }, 100);
        }).catch(e => console.log('Autoplay prevented:', e));
      }
    } else {
      // Regular video file
      video.src = videoUrl;
      video.preload = 'auto';
      if (autoPlay) {
        video.muted = true;
        video.play().then(() => {
          setTimeout(() => { video.muted = false; }, 100);
        }).catch(e => console.log('Autoplay prevented:', e));
      }
    }

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (bufferingTimeoutRef.current) {
        clearTimeout(bufferingTimeoutRef.current);
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
      setShowQualityMenu(false);
    }
  }, []);

  const getQualityLevels = useCallback(() => {
    if (!hlsRef.current) return [];
    return hlsRef.current.levels;
  }, []);

  return (
    <div ref={containerRef} className="relative bg-black">
      {/* Initial loading indicator */}
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
      
      {/* Buffering indicator during playback */}
      {isBuffering && hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm rounded-full p-4">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
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
        loop
        muted={autoPlay}
        autoPlay={autoPlay}
        poster={thumbnailUrl || undefined}
        onContextMenu={(e) => e.preventDefault()}
        disablePictureInPicture
        webkit-playsinline="true"
      >
        Your browser does not support the video tag.
      </video>
      
      {/* Quality selector button */}
      {hlsRef.current && hlsRef.current.levels.length > 1 && (
        <div className="absolute top-4 right-4 z-30">
          <DropdownMenu open={showQualityMenu} onOpenChange={setShowQualityMenu}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-9 px-3 bg-background/90 backdrop-blur-sm border border-border hover:bg-background/95 gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {quality === 'auto' 
                    ? (language === "ja" ? "自動" : language === "pt" ? "Auto" : "Auto")
                    : quality
                  }
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px]">
              <DropdownMenuItem
                onClick={() => changeQuality(-1)}
                className={quality === 'auto' ? 'bg-primary/10 font-semibold' : ''}
              >
                <span className="flex items-center justify-between w-full">
                  {language === "ja" ? "自動" : language === "pt" ? "Auto" : "Auto"}
                  {quality === 'auto' && <span className="ml-2">✓</span>}
                </span>
              </DropdownMenuItem>
              {getQualityLevels().map((level, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => changeQuality(index)}
                  className={quality === `${level.height}p` ? 'bg-primary/10 font-semibold' : ''}
                >
                  <span className="flex items-center justify-between w-full">
                    {level.height}p
                    {quality === `${level.height}p` && <span className="ml-2">✓</span>}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};
