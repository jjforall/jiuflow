import type { PoseFrame, JudgeResult } from "./types";
import { poseToAngles, angleDist, ANGLE_DEFS, angleFrameScore, toDeg } from "./angles";

/** Sigmoid overall frame similarity from angleDist [0..1]. */
function similarity(d: number): number {
  // d=0 → ~0.95, d=0.2 → 0.5, d=0.5 → ~0.01
  return 1 / (1 + Math.exp((d - 0.2) * 15));
}

/**
 * Sakoe-Chiba band: proportional-position difference ≤ 30%.
 * Works correctly even when n ≠ m.
 */
function inBand(i: number, j: number, n: number, m: number): boolean {
  return Math.abs(i / Math.max(n - 1, 1) - j / Math.max(m - 1, 1)) <= 0.3;
}

export function judge(refFrames: PoseFrame[], userFrames: PoseFrame[]): JudgeResult {
  if (refFrames.length === 0 || userFrames.length === 0) {
    return {
      totalScore: 0,
      frameScores: [],
      jointScores: {},
      jointAngles: { ref: {}, user: {} },
      refFrames,
      userFrames,
      path: [],
      detectionQuality: { ref: 0, user: 0 },
    };
  }

  // Convert each frame to an angle vector
  const refVecs = refFrames.map((f) => poseToAngles(f.landmarks));
  const userVecs = userFrames.map((f) => poseToAngles(f.landmarks));
  const n = refVecs.length;
  const m = userVecs.length;

  // DTW cost matrix with Sakoe-Chiba band
  const INF = 1e9;
  const dp: number[][] = Array.from({ length: n }, () => new Array(m).fill(INF));
  dp[0][0] = angleDist(refVecs[0], userVecs[0]);

  for (let i = 1; i < n; i++) {
    if (inBand(i, 0, n, m)) dp[i][0] = dp[i - 1][0] + angleDist(refVecs[i], userVecs[0]);
  }
  for (let j = 1; j < m; j++) {
    if (inBand(0, j, n, m)) dp[0][j] = dp[0][j - 1] + angleDist(refVecs[0], userVecs[j]);
  }

  for (let i = 1; i < n; i++) {
    for (let j = 1; j < m; j++) {
      if (!inBand(i, j, n, m)) continue;
      const prev = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      if (prev >= INF) continue;
      dp[i][j] = angleDist(refVecs[i], userVecs[j]) + prev;
    }
  }

  // Backtrack to find optimal path
  const path: [number, number][] = [];
  let i = n - 1, j = m - 1;
  path.push([i, j]);
  while (i > 0 || j > 0) {
    if (i === 0) j--;
    else if (j === 0) i--;
    else {
      const best = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      if (dp[i - 1][j - 1] === best) { i--; j--; }
      else if (dp[i - 1][j] === best) i--;
      else j--;
    }
    path.unshift([i, j]);
  }

  // Per-frame scores
  const frameScores = path.map(([ri, ui]) =>
    similarity(angleDist(refVecs[ri], userVecs[ui]))
  );

  const totalScore = Math.round(
    (frameScores.reduce((a, b) => a + b, 0) / frameScores.length) * 100
  );

  // Per-joint angle scores and average angles across all aligned frames
  const jointSimAccum: number[][] = ANGLE_DEFS.map(() => []);
  const refAngleAccum: number[][] = ANGLE_DEFS.map(() => []);
  const userAngleAccum: number[][] = ANGLE_DEFS.map(() => []);

  for (const [ri, ui] of path) {
    ANGLE_DEFS.forEach((_, idx) => {
      const ra = refVecs[ri][idx];
      const ua = userVecs[ui][idx];
      jointSimAccum[idx].push(angleFrameScore(ra, ua));
      refAngleAccum[idx].push(ra);
      userAngleAccum[idx].push(ua);
    });
  }

  const jointScores: Record<string, number> = {};
  const refAvgAngles: Record<string, number> = {};
  const userAvgAngles: Record<string, number> = {};

  ANGLE_DEFS.forEach((def, idx) => {
    const sims = jointSimAccum[idx];
    jointScores[def.name] = Math.round(
      (sims.reduce((a, b) => a + b, 0) / sims.length) * 100
    );
    refAvgAngles[def.name] = toDeg(
      refAngleAccum[idx].reduce((a, b) => a + b, 0) / refAngleAccum[idx].length
    );
    userAvgAngles[def.name] = toDeg(
      userAngleAccum[idx].reduce((a, b) => a + b, 0) / userAngleAccum[idx].length
    );
  });

  return {
    totalScore,
    frameScores,
    jointScores,
    jointAngles: { ref: refAvgAngles, user: userAvgAngles },
    refFrames,
    userFrames,
    path,
    detectionQuality: { ref: 0, user: 0 },
  };
}
