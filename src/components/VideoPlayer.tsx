import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface VideoPlayerProps {
  videoUrl: string;
  autoPlay?: boolean;
}

export const VideoPlayer = ({ videoUrl, autoPlay = true }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { language } = useLanguage();
  const [quality, setQuality] = useState<string>("auto");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if the video URL is an HLS stream (.m3u8)
    const isHLS = videoUrl.includes('.m3u8');

    if (isHLS && Hls.isSupported()) {
      // Initialize HLS.js
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        // Adaptive bitrate streaming settings
        abrEwmaDefaultEstimate: 500000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
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

      // Bandwidth monitoring (removed due to type issues)
      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        console.log(`Quality level loaded: ${data.level}`);
      });

      return () => {
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
  }, [videoUrl, autoPlay, language]);

  const changeQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setQuality(levelIndex === -1 ? 'auto' : `${hlsRef.current.levels[levelIndex].height}p`);
    }
  };

  return (
    <div className="relative">
      <video
        ref={videoRef}
        controls
        className="w-full"
        playsInline
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
