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
        {/* Outer glow effect */}
        {isPlaying && (
          <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/40 via-cyan-500/40 to-emerald-500/40 rounded-2xl blur-xl animate-pulse" />
        )}

        {/* Main container - pill shape */}
        <div className="relative flex items-center gap-2 bg-gradient-to-br from-zinc-900/95 via-zinc-800/95 to-zinc-900/95 backdrop-blur-xl rounded-2xl p-1.5 shadow-2xl border border-white/10">
          {/* Album art / Music icon */}
          <div className="relative h-12 w-12 rounded-xl overflow-hidden flex-shrink-0">
            {currentTrack?.thumbnail_url ? (
              <img
                src={currentTrack.thumbnail_url}
                alt={currentTrack.title}
                className={`w-full h-full object-cover ${isPlaying ? "animate-spin-slow" : ""}`}
                style={{ animationDuration: "8s" }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-500 via-cyan-500 to-emerald-600 flex items-center justify-center">
                <Music className="h-6 w-6 text-white" />
              </div>
            )}
            
            {/* Progress overlay */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1 bg-black/30"
            >
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 pr-1">
            {/* Previous */}
            <button
              className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              onClick={previous}
            >
              <SkipBack className="h-4 w-4" />
            </button>

            {/* Play/Pause */}
            <button
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg hover:shadow-emerald-500/25 hover:scale-105 transition-all"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              onClick={next}
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Sound wave visualization when playing */}
          {isPlaying && (
            <div className="absolute -top-1 -right-1 flex items-end gap-[2px] h-3 px-1 py-0.5 bg-emerald-500/20 rounded-full">
              <span className="w-[3px] bg-emerald-400 rounded-full animate-bounce" style={{ height: '6px', animationDelay: '0ms', animationDuration: '0.6s' }} />
              <span className="w-[3px] bg-cyan-400 rounded-full animate-bounce" style={{ height: '10px', animationDelay: '150ms', animationDuration: '0.6s' }} />
              <span className="w-[3px] bg-emerald-400 rounded-full animate-bounce" style={{ height: '4px', animationDelay: '300ms', animationDuration: '0.6s' }} />
              <span className="w-[3px] bg-cyan-400 rounded-full animate-bounce" style={{ height: '8px', animationDelay: '450ms', animationDuration: '0.6s' }} />
            </div>
          )}

          {/* Music label - always visible */}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] text-zinc-400 whitespace-nowrap">
            <Music className="h-2.5 w-2.5" />
            <span>{isPlaying ? 'Playing' : 'Music'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalMusicPlayer;
