export const BODY_CONNECTIONS: [number, number][] = [
  // torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // left arm
  [11, 13], [13, 15],
  // right arm
  [12, 14], [14, 16],
  // left leg
  [23, 25], [25, 27],
  // right leg
  [24, 26], [26, 28],
  // feet
  [27, 29], [27, 31], [29, 31],
  [28, 30], [28, 32], [30, 32],
];

export interface SkeletonLandmark {
  x: number;
  y: number;
  visibility?: number;
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: SkeletonLandmark[],
  color: string,
  options: { alpha?: number; lineWidth?: number; dotRadius?: number } = {}
) {
  const { alpha = 0.88, lineWidth = 2.5, dotRadius = 4 } = options;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  for (const [a, b] of BODY_CONNECTIONS) {
    const lmA = landmarks[a];
    const lmB = landmarks[b];
    if (!lmA || !lmB) continue;
    if ((lmA.visibility ?? 1) < 0.3 || (lmB.visibility ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(lmA.x * w, lmA.y * h);
    ctx.lineTo(lmB.x * w, lmB.y * h);
    ctx.stroke();
  }

  ctx.fillStyle = color;
  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
