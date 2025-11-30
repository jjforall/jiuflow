import { createContext, useContext, useState, ReactNode } from "react";

interface FloatingVideoState {
  videoUrl: string;
  thumbnailUrl?: string | null;
  title: string;
  currentTime: number;
}

interface FloatingVideoContextType {
  floatingVideo: FloatingVideoState | null;
  setFloatingVideo: (video: FloatingVideoState | null) => void;
  clearFloatingVideo: () => void;
}

const FloatingVideoContext = createContext<FloatingVideoContextType | undefined>(undefined);

export const FloatingVideoProvider = ({ children }: { children: ReactNode }) => {
  const [floatingVideo, setFloatingVideo] = useState<FloatingVideoState | null>(null);

  const clearFloatingVideo = () => {
    setFloatingVideo(null);
  };

  return (
    <FloatingVideoContext.Provider value={{ floatingVideo, setFloatingVideo, clearFloatingVideo }}>
      {children}
    </FloatingVideoContext.Provider>
  );
};

export const useFloatingVideo = () => {
  const context = useContext(FloatingVideoContext);
  if (context === undefined) {
    throw new Error("useFloatingVideo must be used within a FloatingVideoProvider");
  }
  return context;
};
