import { createContext, useContext, useState, useRef, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MusicTrack {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
}

type RepeatMode = "off" | "all" | "one";

interface MusicContextType {
  currentTrack: MusicTrack | null;
  playlist: MusicTrack[];
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  play: (track?: MusicTrack) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
  loadPlaylist: () => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    const audio = audioRef.current;

    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("ended", handleTrackEnd);

    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const loadPlaylist = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("music_tracks")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setPlaylist(data || []);
    } catch (error) {
      console.error("Failed to load playlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const play = (track?: MusicTrack) => {
    if (!audioRef.current) return;

    if (track) {
      if (currentTrack?.id !== track.id) {
        audioRef.current.src = track.audio_url;
        setCurrentTrack(track);
      }
    } else if (!currentTrack && playlist.length > 0) {
      audioRef.current.src = playlist[0].audio_url;
      setCurrentTrack(playlist[0]);
    }

    audioRef.current.play();
  };

  const pause = () => {
    audioRef.current?.pause();
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleTrackEnd = () => {
    if (repeatMode === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      next();
    }
  };

  const getNextTrack = (): MusicTrack | null => {
    if (playlist.length === 0) return null;
    if (!currentTrack) return playlist[0];

    if (isShuffle) {
      const otherTracks = playlist.filter((t) => t.id !== currentTrack.id);
      if (otherTracks.length === 0) return currentTrack;
      return otherTracks[Math.floor(Math.random() * otherTracks.length)];
    }

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    
    // If we've looped and repeat is off, stop
    if (nextIndex === 0 && repeatMode === "off") {
      return null;
    }
    
    return playlist[nextIndex];
  };

  const getPreviousTrack = (): MusicTrack | null => {
    if (playlist.length === 0) return null;
    if (!currentTrack) return playlist[0];

    if (isShuffle) {
      const otherTracks = playlist.filter((t) => t.id !== currentTrack.id);
      if (otherTracks.length === 0) return currentTrack;
      return otherTracks[Math.floor(Math.random() * otherTracks.length)];
    }

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    return playlist[prevIndex];
  };

  const next = () => {
    const nextTrack = getNextTrack();
    if (nextTrack) {
      play(nextTrack);
    } else {
      pause();
    }
  };

  const previous = () => {
    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      seek(0);
      return;
    }
    const prevTrack = getPreviousTrack();
    if (prevTrack) {
      play(prevTrack);
    }
  };

  const toggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return (
    <MusicContext.Provider
      value={{
        currentTrack,
        playlist,
        isPlaying,
        volume,
        currentTime,
        duration,
        isLoading,
        isShuffle,
        repeatMode,
        play,
        pause,
        togglePlay,
        next,
        previous,
        setVolume,
        seek,
        loadPlaylist,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
};
