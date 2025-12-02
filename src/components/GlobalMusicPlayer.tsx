import { useEffect, useState } from "react";
import { useMusic } from "@/contexts/MusicContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
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
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Minimize2,
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
    isShuffle,
    repeatMode,
    toggleShuffle,
    toggleRepeat,
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

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  if (!isVisible || playlist.length === 0) return null;

  // Minimal Mode - Stylish floating button
  if (isMinimal) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
        <div className="relative group">
          {/* Glow effect */}
          {isPlaying && (
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
          )}
          
          <button
            className="relative h-16 w-16 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 overflow-hidden ring-2 ring-primary/20 hover:ring-primary/50"
            onClick={togglePlay}
          >
            {currentTrack?.thumbnail_url ? (
              <img
                src={currentTrack.thumbnail_url}
                alt={currentTrack.title}
                className={`w-full h-full object-cover ${isPlaying ? "animate-spin-slow" : ""}`}
                style={{ animationDuration: "8s" }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center">
                <Music className="h-7 w-7 text-primary-foreground" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              {isPlaying ? (
                <Pause className="h-7 w-7 text-white drop-shadow-lg" />
              ) : (
                <Play className="h-7 w-7 text-white ml-1 drop-shadow-lg" />
              )}
            </div>
            
            {/* Progress ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary/20"
              />
              <circle
                cx="32"
                cy="32"
                r="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-primary"
                strokeDasharray={`${progressPercent * 1.885} 188.5`}
              />
            </svg>
          </button>
          
          {/* Expand button */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute -top-1 -left-1 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsMinimal(false)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          
          {/* Playing indicator */}
          {isPlaying && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
              <span className="w-1 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        isExpanded ? "h-72" : "h-20"
      }`}
    >
      {/* Gradient background with blur */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/98 to-background/95 backdrop-blur-xl border-t border-border/50" />
      
      {/* Progress bar at top */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 bg-muted cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          seek(percent * duration);
        }}
      >
        <div 
          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progressPercent}% - 6px)` }}
        />
      </div>

      {/* Main player content */}
      <div className="relative flex items-center justify-between h-20 px-4 md:px-6">
        {/* Track info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative group">
            {currentTrack?.thumbnail_url ? (
              <img
                src={currentTrack.thumbnail_url}
                alt={currentTrack.title}
                className={`w-14 h-14 rounded-lg object-cover shadow-lg ring-1 ring-border/50 transition-transform group-hover:scale-105 ${
                  isPlaying ? "ring-primary/50" : ""
                }`}
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-lg">
                <Music className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex gap-0.5 items-end h-4">
                  <span className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: "60%", animationDelay: "0ms" }} />
                  <span className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: "100%", animationDelay: "150ms" }} />
                  <span className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: "40%", animationDelay: "300ms" }} />
                  <span className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: "80%", animationDelay: "450ms" }} />
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate text-foreground">
              {currentTrack?.title || "音楽を選択"}
            </p>
            {currentTrack?.artist && (
              <p className="text-sm text-muted-foreground truncate">
                {currentTrack.artist}
              </p>
            )}
            <div className="flex items-center gap-2 mt-0.5 sm:hidden">
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatTime(currentTime)}
              </span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 hidden sm:flex transition-colors ${isShuffle ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            onClick={toggleShuffle}
            title="シャッフル"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
            onClick={previous}
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          
          <Button
            size="icon"
            className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors"
            onClick={next}
          >
            <SkipForward className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 hidden sm:flex transition-colors ${repeatMode !== "off" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            onClick={toggleRepeat}
            title={repeatMode === "off" ? "リピートオフ" : repeatMode === "all" ? "全曲リピート" : "1曲リピート"}
          >
            {repeatMode === "one" ? (
              <Repeat1 className="h-4 w-4" />
            ) : (
              <Repeat className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Time display - desktop */}
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
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
              className="w-20"
              onValueChange={([value]) => {
                setVolume(value);
                setIsMuted(false);
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
              title="プレイリスト"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ListMusic className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setIsMinimal(true)}
              title="ミニマルモード"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:text-destructive"
              onClick={() => setIsVisible(false)}
              title="閉じる"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded View - Playlist */}
      {isExpanded && (
        <div className="relative px-4 md:px-6 pb-4 overflow-y-auto h-52 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ListMusic className="h-4 w-4" />
              プレイリスト
              <span className="text-xs text-muted-foreground font-normal">({playlist.length}曲)</span>
            </h3>
          </div>
          <div className="space-y-1">
            {playlist.map((track, index) => (
              <button
                key={track.id}
                onClick={() => play(track)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-muted/80 group ${
                  currentTrack?.id === track.id 
                    ? "bg-primary/10 ring-1 ring-primary/20" 
                    : "hover:translate-x-1"
                }`}
              >
                <span className="w-6 text-xs text-muted-foreground tabular-nums">
                  {currentTrack?.id === track.id && isPlaying ? (
                    <div className="flex gap-0.5 items-end h-4 justify-center">
                      <span className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: "60%" }} />
                      <span className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: "100%", animationDelay: "150ms" }} />
                      <span className="w-0.5 bg-primary rounded-full animate-pulse" style={{ height: "40%", animationDelay: "300ms" }} />
                    </div>
                  ) : (
                    index + 1
                  )}
                </span>
                {track.thumbnail_url ? (
                  <img
                    src={track.thumbnail_url}
                    alt={track.title}
                    className="w-10 h-10 rounded-lg object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Music className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className={`text-sm font-medium truncate ${currentTrack?.id === track.id ? "text-primary" : ""}`}>
                    {track.title}
                  </p>
                  {track.artist && (
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artist}
                    </p>
                  )}
                </div>
                <Play className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalMusicPlayer;