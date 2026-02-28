import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { JudgeResult } from "@/utils/pose/types";
import { BODY_CONNECTIONS } from "@/utils/pose/skeleton";
import { poseToAngles, ANGLE_DEFS, angleFrameScore } from "@/utils/pose/angles";
import type { Landmark } from "@/utils/pose/types";

interface Props { result: JudgeResult }

function scoreColor(s: number) {
  if (s >= 0.75) return "#4ade80";
  if (s >= 0.45) return "#fbbf24";
  return "#f87171";
}

function lmColor(scores: Map<number, number[]>, idx: number): string {
  const vals = scores.get(idx);
  if (!vals || vals.length === 0) return "#94a3b8";
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return scoreColor(avg);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  refLms: Landmark[],
  userLms: Landmark[],
  lmScores: Map<number, number[]>,
  frameScore: number,
  refTimeMs: number,
  userTimeMs: number,
  isWorst: boolean
) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Reference (blue, faded)
  ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2; ctx.lineCap = "round";
  for (const [a, b] of BODY_CONNECTIONS) {
    const la = refLms[a], lb = refLms[b];
    if (!la || !lb || (la.visibility ?? 1) < 0.3 || (lb.visibility ?? 1) < 0.3) continue;
    ctx.beginPath(); ctx.moveTo(la.x * W, la.y * H); ctx.lineTo(lb.x * W, lb.y * H); ctx.stroke();
  }
  ctx.fillStyle = "#60a5fa";
  for (const lm of refLms) {
    if ((lm.visibility ?? 1) < 0.3) continue;
    ctx.beginPath(); ctx.arc(lm.x * W, lm.y * H, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // User (per-joint colored)
  ctx.save(); ctx.lineWidth = 3; ctx.lineCap = "round";
  for (const [a, b] of BODY_CONNECTIONS) {
    const la = userLms[a], lb = userLms[b];
    if (!la || !lb || (la.visibility ?? 1) < 0.3 || (lb.visibility ?? 1) < 0.3) continue;
    const grad = ctx.createLinearGradient(la.x * W, la.y * H, lb.x * W, lb.y * H);
    grad.addColorStop(0, lmColor(lmScores, a)); grad.addColorStop(1, lmColor(lmScores, b));
    ctx.strokeStyle = grad; ctx.beginPath(); ctx.moveTo(la.x * W, la.y * H); ctx.lineTo(lb.x * W, lb.y * H); ctx.stroke();
  }
  for (let i = 0; i < userLms.length; i++) {
    const lm = userLms[i];
    if ((lm.visibility ?? 1) < 0.3) continue;
    ctx.fillStyle = lmColor(lmScores, i); ctx.beginPath(); ctx.arc(lm.x * W, lm.y * H, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // Overlay text
  const score = Math.round(frameScore * 100);
  ctx.font = "bold 22px sans-serif"; ctx.fillStyle = scoreColor(frameScore); ctx.fillText(`${score}点`, 14, 30);
  ctx.font = "11px sans-serif"; ctx.fillStyle = "#475569";
  ctx.fillText(`お手本 ${(refTimeMs / 1000).toFixed(1)}s`, 14, H - 26);
  ctx.fillText(`あなた ${(userTimeMs / 1000).toFixed(1)}s`, 14, H - 12);
  if (isWorst) { ctx.fillStyle = "#f87171"; ctx.fillText("⚠ 最も改善が必要なフレーム", W - 196, 18); }
}

export default function SkeletonCompare({ result }: Props) {
  const { refFrames, userFrames, path, frameScores } = result;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const worstIdx = frameScores.length > 0
    ? frameScores.reduce((wi, s, i) => s < frameScores[wi] ? i : wi, 0) : 0;
  const [idx, setIdx] = useState(worstIdx);
  const [playing, setPlaying] = useState(false);

  const render = useCallback((frameIdx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const [ri, ui] = path[frameIdx] ?? [0, 0];
    const refFrame = refFrames[ri], userFrame = userFrames[ui];
    if (!refFrame || !userFrame) return;

    const refAngles = poseToAngles(refFrame.landmarks);
    const userAngles = poseToAngles(userFrame.landmarks);
    const lmScores = new Map<number, number[]>();
    ANGLE_DEFS.forEach((def, i) => {
      const s = angleFrameScore(refAngles[i], userAngles[i]);
      for (const lmIdx of [def.a, def.b, def.c]) {
        if (!lmScores.has(lmIdx)) lmScores.set(lmIdx, []);
        lmScores.get(lmIdx)!.push(s);
      }
    });
    drawFrame(ctx, refFrame.landmarks, userFrame.landmarks, lmScores,
      frameScores[frameIdx] ?? 0, refFrame.timeMs, userFrame.timeMs, frameIdx === worstIdx);
  }, [path, refFrames, userFrames, frameScores, worstIdx]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => render(idx));
    return () => cancelAnimationFrame(rafRef.current);
  }, [idx, render]);

  useEffect(() => {
    if (playing) {
      playRef.current = setInterval(() => {
        setIdx(i => { if (i >= path.length - 1) { setPlaying(false); return i; } return i + 1; });
      }, 80);
    } else { if (playRef.current) clearInterval(playRef.current); }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playing, path.length]);

  const fs = frameScores[idx] ?? 0;
  const sc = Math.round(fs * 100);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} width={640} height={480} className="w-full rounded-xl block" />

      {/* Scrubber + heatmap */}
      <div>
        <input type="range" min={0} max={Math.max(0, path.length - 1)} value={idx}
          onChange={e => { setPlaying(false); setIdx(Number(e.target.value)); }}
          className="w-full cursor-pointer accent-blue-500" />
        <div className="flex h-1.5 rounded overflow-hidden mt-1 mb-2">
          {frameScores.map((s, i) => (
            <div key={i} onClick={() => { setPlaying(false); setIdx(i); }}
              className="flex-1 cursor-pointer min-w-[1px]"
              style={{ background: s >= 0.75 ? "#4ade80" : s >= 0.45 ? "#fbbf24" : "#f87171" }} />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant={playing ? "secondary" : "default"} onClick={() => setPlaying(p => !p)}>
            {playing ? "⏸ 停止" : "▶ 再生"}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => { setPlaying(false); setIdx(worstIdx); }}>
            ⚠ 最悪フレームへ
          </Button>
        </div>
        <span className="text-sm font-bold" style={{ color: scoreColor(fs) }}>
          {sc}点 ({idx + 1}/{path.length})
        </span>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        <span><span className="text-blue-400">━</span> お手本</span>
        <span><span className="text-green-400">━</span> 良い</span>
        <span><span className="text-yellow-400">━</span> まあまあ</span>
        <span><span className="text-red-400">━</span> 要改善</span>
      </div>
    </div>
  );
}
