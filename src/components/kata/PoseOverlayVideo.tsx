import { useRef, useEffect } from "react";
import type { PoseFrame } from "@/utils/pose/types";
import { drawSkeleton } from "@/utils/pose/skeleton";

interface Props {
  src: string;
  frames: PoseFrame[];
  color: string;
  controls?: boolean;
  label?: string;
}

function findClosest(frames: PoseFrame[], timeMs: number): PoseFrame | null {
  if (frames.length === 0) return null;
  let closest = frames[0];
  let minDiff = Math.abs(frames[0].timeMs - timeMs);
  for (const f of frames) {
    const d = Math.abs(f.timeMs - timeMs);
    if (d < minDiff) { minDiff = d; closest = f; }
  }
  return closest;
}

export default function PoseOverlayVideo({ src, frames, color, controls, label }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    const draw = () => {
      const frame = findClosest(frames, video.currentTime * 1000);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (frame && !video.paused && !video.ended) drawSkeleton(ctx, frame.landmarks, color);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frames, color]);

  return (
    <div>
      {label && <p className="text-xs text-muted-foreground mb-1.5">{label}</p>}
      <div className="relative">
        <video
          ref={videoRef}
          src={src}
          controls={controls}
          onLoadedMetadata={() => {
            const v = videoRef.current; const c = canvasRef.current;
            if (v && c) { c.width = v.videoWidth || 640; c.height = v.videoHeight || 480; }
          }}
          className="w-full block rounded-lg bg-black"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none rounded-lg"
        />
      </div>
    </div>
  );
}
