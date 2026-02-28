import type { JudgeResult } from "@/utils/pose/types";

const ACTION: Record<string, { pos: string; neg: string }> = {
  "左肘":     { pos: "もう少し曲げましょう",     neg: "もう少し伸ばしましょう" },
  "右肘":     { pos: "もう少し曲げましょう",     neg: "もう少し伸ばしましょう" },
  "左肩":     { pos: "腕を体に近づけましょう",   neg: "腕をもっと上げましょう" },
  "右肩":     { pos: "腕を体に近づけましょう",   neg: "腕をもっと上げましょう" },
  "左膝":     { pos: "膝をもっと曲げましょう",   neg: "膝をもう少し伸ばしましょう" },
  "右膝":     { pos: "膝をもっと曲げましょう",   neg: "膝をもう少し伸ばしましょう" },
  "左股関節": { pos: "腰をもっと落としましょう", neg: "もう少し腰を開きましょう" },
  "右股関節": { pos: "腰をもっと落としましょう", neg: "もう少し腰を開きましょう" },
};

export default function CoachingAdvice({ result }: { result: JudgeResult }) {
  const tips = Object.entries(result.jointScores)
    .filter(([, s]) => s < 85)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 4)
    .map(([joint, score]) => {
      const refDeg = result.jointAngles?.ref[joint] ?? 0;
      const userDeg = result.jointAngles?.user[joint] ?? 0;
      const diff = userDeg - refDeg;
      const a = ACTION[joint];
      return { joint, score, refDeg, userDeg, diffDeg: Math.abs(diff),
        msg: a ? (diff > 0 ? a.pos : a.neg) : `角度を${Math.abs(diff)}°調整してください` };
    });

  if (tips.length === 0) return (
    <div className="rounded-xl border border-green-800 bg-green-950/50 p-4">
      <p className="font-semibold text-green-400">✨ 全関節が高スコアです！</p>
      <p className="text-sm text-muted-foreground mt-1">お手本に非常に近い動きができています。</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        AIコーチングアドバイス
        <span className="ml-2 text-xs text-muted-foreground/60">スコアの低い関節から優先度順</span>
      </h3>
      {tips.map((tip, i) => {
        const isHigh = tip.score < 60;
        const borderColor = isHigh ? "border-red-500" : tip.score < 75 ? "border-yellow-500" : "border-green-500";
        const badgeColor = isHigh ? "bg-red-950 text-red-400" : tip.score < 75 ? "bg-yellow-950 text-yellow-400" : "bg-green-950 text-green-400";
        const label = isHigh ? "重要" : tip.score < 75 ? "改善" : "微調整";
        return (
          <div key={tip.joint} className={`rounded-xl border-l-4 ${borderColor} bg-card p-4 flex gap-3`}>
            <span className="text-2xl font-black text-muted-foreground/30 leading-none min-w-[24px]">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-foreground">{tip.joint}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>{label}</span>
                <span className="text-xs text-muted-foreground">{tip.score}点</span>
              </div>
              <p className="text-sm text-foreground/80 mb-2">👉 {tip.msg}</p>
              <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mb-2">
                <span>お手本: <strong className="text-blue-400">{tip.refDeg}°</strong></span>
                <span>→</span>
                <span>あなた: <strong className={isHigh ? "text-red-400" : "text-yellow-400"}>{tip.userDeg}°</strong></span>
                <span className={isHigh ? "text-red-400" : "text-yellow-400"}>(差 {tip.diffDeg}°)</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${tip.score}%`, background: isHigh ? "#f87171" : tip.score < 75 ? "#fbbf24" : "#4ade80" }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
