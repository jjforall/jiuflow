import { useEffect, useState } from "react";
import { useMusic } from "@/contexts/MusicContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Music,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const GlobalMusicPlayer = () => {
  const {
    currentTrack,
    playlist,
    isPlaying,
    volume,
    currentTime,
    duration,
    togglePlay,
    next,
    previous,
    setVolume,
    seek,
    play,
    loadPlaylist,
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.5);
  const [isMinimal, setIsMinimal] = useState(false);

  useEffect(() => {
    loadPlaylist();
  }, []);

  useEffect(() => {
    if (playlist.length > 0) {
      setIsVisible(true);
    }
  }, [playlist]);

  const toggleMute = () => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  if (!isVisible || playlist.length === 0) return null;

  // Minimal Mode - Small floating button
  if (isMinimal) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="relative">
          <Button
            variant="default"
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
            onClick={togglePlay}
          >
            {currentTrack?.thumbnail_url ? (
              <img
                src={currentTrack.thumbnail_url}
                alt={currentTrack.title}
                className="w-full h-full rounded-full object-cover absolute inset-0"
              />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
              {isPlaying ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white ml-0.5" />
              )}
            </div>
            {isPlaying && (
              <div className="absolute -top-1 -right-1 flex gap-0.5">
                <span className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                <span className="w-1 h-3 bg-primary rounded-full animate-pulse delay-75" />
                <span className="w-1 h-3 bg-primary rounded-full animate-pulse delay-150" />
              </div>
            )}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute -top-2 -left-2 h-6 w-6 rounded-full shadow"
            onClick={() => setIsMinimal(false)}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-lg transition-all duration-300 ${
        isExpanded ? "h-48" : "h-16"
      }`}
    >
      {/* Collapsed View */}
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {currentTrack?.thumbnail_url ? (
            <img
              src={currentTrack.thumbnail_url}
              alt={currentTrack.title}
              className="w-10 h-10 rounded object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
              <Music className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {currentTrack?.title || "音楽を選択"}
            </p>
            {currentTrack?.artist && (
              <p className="text-xs text-muted-foreground truncate">
                {currentTrack.artist}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={previous}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={next}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              className="w-24"
              onValueChange={([value]) => seek(value)}
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            className="w-16 hidden sm:flex"
            onValueChange={([value]) => {
              setVolume(value);
              setIsMuted(false);
            }}
          />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimal(true)}
            title="ミニマルモード"
          >
            <Music className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded View - Playlist */}
      {isExpanded && (
        <div className="px-4 pb-4 overflow-y-auto h-32">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            プレイリスト
          </p>
          <div className="space-y-1">
            {playlist.map((track) => (
              <button
                key={track.id}
                onClick={() => play(track)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors ${
                  currentTrack?.id === track.id ? "bg-muted" : ""
                }`}
              >
                {track.thumbnail_url ? (
                  <img
                    src={track.thumbnail_url}
                    alt={track.title}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                    <Music className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{track.title}</p>
                  {track.artist && (
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artist}
                    </p>
                  )}
                </div>
                {currentTrack?.id === track.id && isPlaying && (
                  <div className="flex gap-0.5">
                    <span className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                    <span className="w-1 h-3 bg-primary rounded-full animate-pulse delay-75" />
                    <span className="w-1 h-3 bg-primary rounded-full animate-pulse delay-150" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalMusicPlayer;
