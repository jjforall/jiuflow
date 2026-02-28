import {
  PoseLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import type { PoseFrame } from "./types";

let landmarker: PoseLandmarker | null = null;
let loadingPromise: Promise<PoseLandmarker> | null = null;

export async function initLandmarker(): Promise<PoseLandmarker> {
  if (landmarker) return landmarker;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        // full model: ~9MB, much better accuracy than lite for BJJ poses
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numPoses: 1,
      minPoseDetectionConfidence: 0.4,
      minPosePresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });
    return landmarker;
  })();

  return loadingPromise;
}

/** Pre-warm the model in the background. Call early to avoid cold-start delay. */
export function preloadLandmarker(): void {
  initLandmarker().catch(() => {});
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener("seeked", handler);
      resolve();
    };
    video.addEventListener("seeked", handler);
    video.currentTime = time;
  });
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;
    video.src = url;
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error("動画の読み込みに失敗しました"));
    video.load();
  });
}

/** Average visibility of a frame's landmarks (0-1). */
function frameQuality(landmarks: PoseFrame["landmarks"]): number {
  if (landmarks.length === 0) return 0;
  return landmarks.reduce((s, l) => s + (l.visibility ?? 1), 0) / landmarks.length;
}

export interface ExtractionResult {
  frames: PoseFrame[];
  quality: number; // 0-100 average detection quality
}

export async function extractPoses(
  videoUrl: string,
  fps = 5,
  onProgress?: (ratio: number) => void
): Promise<ExtractionResult> {
  const lm = await initLandmarker();
  const video = await loadVideo(videoUrl);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  const duration = video.duration;
  // Adaptive fps: higher for short videos
  const effectiveFps = duration < 15 ? Math.min(8, fps * 1.5) : fps;
  const step = 1 / effectiveFps;

  const frames: PoseFrame[] = [];
  let totalQuality = 0;
  let qualityCount = 0;

  for (let t = 0; t <= duration; t += step) {
    await seekTo(video, Math.min(t, duration - 0.01));
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const result = lm.detect(canvas);
      if (result.landmarks.length > 0) {
        const lms = result.landmarks[0].map((l) => ({
          x: l.x,
          y: l.y,
          z: l.z,
          visibility: l.visibility ?? 1,
        }));
        // Filter out low-confidence frames
        const q = frameQuality(lms);
        if (q > 0.3) {
          frames.push({ timeMs: Math.round(t * 1000), landmarks: lms });
          totalQuality += q;
          qualityCount++;
        }
      }
    } catch {
      // Skip undetectable frame
    }

    onProgress?.(Math.min(t / duration, 1));
  }

  const quality = qualityCount > 0 ? Math.round((totalQuality / qualityCount) * 100) : 0;
  return { frames, quality };
}
