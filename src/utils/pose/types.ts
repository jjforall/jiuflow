export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseFrame {
  timeMs: number;
  landmarks: Landmark[];
}

export interface JudgeResult {
  totalScore: number;
  frameScores: number[];
  jointScores: Record<string, number>;
  /** Average angle (degrees) per joint across aligned frames. */
  jointAngles: {
    ref: Record<string, number>;
    user: Record<string, number>;
  };
  refFrames: PoseFrame[];
  userFrames: PoseFrame[];
  path: [number, number][];
  detectionQuality: { ref: number; user: number };
}
