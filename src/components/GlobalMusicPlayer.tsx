import { useEffect, useState, useRef } from "react";
import { useMusic } from "@/contexts/MusicContext";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
} from "lucide-react";

const GlobalMusicPlayer = () => {
  const {
    currentTrack,
    playlist,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    next,
    previous,
    loadPlaylist,
  } = useMusic();

  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  useEffect(() => {
    loadPlaylist();
  }, []);

  useEffect(() => {
    if (playlist.length > 0) {
      setIsVisible(true);
    }
  }, [playlist]);

  // Initialize position to bottom-right
  useEffect(() => {
    const updatePosition = () => {
      setPosition({
        x: window.innerWidth - 80,
        y: window.innerHeight - 100,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const newX = Math.max(40, Math.min(window.innerWidth - 40, dragStartRef.current.posX + deltaX));
      const newY = Math.max(40, Math.min(window.innerHeight - 40, dragStartRef.current.posY + deltaY));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;
      const newX = Math.max(40, Math.min(window.innerWidth - 40, dragStartRef.current.posX + deltaX));
      const newY = Math.max(40, Math.min(window.innerHeight - 40, dragStartRef.current.posY + deltaY));
      setPosition({ x: newX, y: newY });
    };

    const handleEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging]);

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  if (!isVisible || playlist.length === 0) return null;

  return (
    <div
      ref={dragRef}
      className="fixed z-50 animate-scale-in touch-none"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="relative group">
        {/* Glow effect */}
        {isPlaying && (
          <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
        )}

        {/* Main button */}
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

        {/* Skip buttons on hover */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute -left-10 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={previous}
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          className="absolute -right-10 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={next}
        >
          <SkipForward className="h-4 w-4" />
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
};

export default GlobalMusicPlayer;
