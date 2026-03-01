import type { PoseFrame } from "./types";

export interface AngleDef {
  name: string;
  a: number;   // first point index
  b: number;   // vertex (the joint being measured)
  c: number;   // third point index
  weight: number;
}

/**
 * Core joint angles for BJJ comparison.
 * Using 3D coordinates (x, y, z) for better camera-angle tolerance.
 * Each angle is defined by 3 landmark indices: a-b-c, measured at b.
 */
export const ANGLE_DEFS: AngleDef[] = [
  // Arms
  { name: "左肘",     a: 11, b: 13, c: 15, weight: 1.2 },
  { name: "右肘",     a: 12, b: 14, c: 16, weight: 1.2 },
  { name: "左肩",     a: 23, b: 11, c: 13, weight: 1.0 },
  { name: "右肩",     a: 24, b: 12, c: 14, weight: 1.0 },
  // Legs
  { name: "左膝",     a: 23, b: 25, c: 27, weight: 1.2 },
  { name: "右膝",     a: 24, b: 26, c: 28, weight: 1.2 },
  { name: "左股関節", a: 11, b: 23, c: 25, weight: 1.0 },
  { name: "右股関節", a: 12, b: 24, c: 26, weight: 1.0 },
];

export const ANGLE_WEIGHTS = ANGLE_DEFS.map((d) => d.weight);

/** 3D angle at vertex b (radians, 0..π). */
function angle3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  c: { x: number; y: number; z: number }
): number {
  // z weight reduced to 0.5 because MediaPipe depth is estimated, not measured
  const baX = a.x - b.x, baY = a.y - b.y, baZ = (a.z - b.z) * 0.5;
  const bcX = c.x - b.x, bcY = c.y - b.y, bcZ = (c.z - b.z) * 0.5;
  const dot = baX * bcX + baY * bcY + baZ * bcZ;
  const magBA = Math.sqrt(baX ** 2 + baY ** 2 + baZ ** 2);
  const magBC = Math.sqrt(bcX ** 2 + bcY ** 2 + bcZ ** 2);
  if (magBA < 1e-6 || magBC < 1e-6) return Math.PI / 2; // fallback 90°
  return Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC))));
}

/**
 * Convert pose landmarks to an angle vector [0..π] × ANGLE_DEFS.length.
 * Low-visibility joints fall back to 90° neutral.
 */
export function poseToAngles(landmarks: PoseFrame["landmarks"]): number[] {
  return ANGLE_DEFS.map((def) => {
    const a = landmarks[def.a];
    const b = landmarks[def.b];
    const c = landmarks[def.c];
    const vis = Math.min(a.visibility ?? 1, b.visibility ?? 1, c.visibility ?? 1);
    if (vis < 0.3) return Math.PI / 2;
    return angle3D(a, b, c);
  });
}

/**
 * Weighted RMSE between two angle vectors.
 * Returns [0..1] where 0 = identical, 1 = completely wrong (all joints at π apart).
 */
export function angleDist(a: number[], b: number[]): number {
  let sum = 0, totalW = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = Math.abs(a[i] - b[i]);
    sum += (diff / Math.PI) ** 2 * ANGLE_WEIGHTS[i];
    totalW += ANGLE_WEIGHTS[i];
  }
  return Math.sqrt(sum / totalW);
}

/**
 * Per-angle frame similarity (0..1).
 * Sigmoid centered at 45°: 0° diff → ~0.98, 45° diff → 0.5, 90° diff → ~0.02
 */
export function angleFrameScore(refAngle: number, userAngle: number): number {
  const diff = Math.abs(refAngle - userAngle);
  return 1 / (1 + Math.exp((diff - Math.PI / 4) * 5));
}

export function toDeg(rad: number): number {
  return Math.round((rad * 180) / Math.PI);
}
