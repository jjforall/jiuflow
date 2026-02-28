import { useState, useRef, useEffect, useCallback } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { extractPoses, preloadLandmarker, initLandmarker } from "@/utils/pose/extractor";
import { judge } from "@/utils/pose/dtw";
import { drawSkeleton } from "@/utils/pose/skeleton";
import SkeletonCompare from "@/components/kata/SkeletonCompare";
import CoachingAdvice from "@/components/kata/CoachingAdvice";
import PoseOverlayVideo from "@/components/kata/PoseOverlayVideo";
import type { JudgeResult, Landmark } from "@/utils/pose/types";

type Step = "upload" | "record" | "analyze" | "result";
type RecordMode = "camera" | "file";

function scoreColor(s: number) {
  if (s >= 80) return "text-green-400";
  if (s >= 60) return "text-yellow-400";
  return "text-red-400";
}

function getGrade(score: number) {
  if (score >= 90) return { label: "S", color: "text-amber-400", msg: "完璧！お手本通りの型です" };
  if (score >= 80) return { label: "A", color: "text-green-400", msg: "素晴らしい！細部の精度を上げましょう" };
  if (score >= 70) return { label: "B", color: "text-blue-400", msg: "良い動きです。赤い箇所を重点的に練習" };
  if (score >= 60) return { label: "C", color: "text-violet-400", msg: "基本はできています。タイミングと角度を意識して" };
  return { label: "D", color: "text-red-400", msg: "お手本をよく観察し、各関節の角度を意識しましょう" };
}

const STEPS = [
  { key: "upload" as Step, label: "① お手本" },
  { key: "record" as Step, label: "② 自分の技" },
  { key: "analyze" as Step, label: "③ 解析" },
  { key: "result" as Step, label: "④ 結果" },
];

export default function KataJudge() {
  const [step, setStep] = useState<Step>("upload");
  const [refUrl, setRefUrl] = useState<string | null>(null);
  const [userUrl, setUserUrl] = useState<string | null>(null);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recordMode, setRecordMode] = useState<RecordMode>("camera");
  const [recording, setRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recSecs, setRecSecs] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [displayScore, setDisplayScore] = useState(0);

  const previewRef = useRef<HTMLVideoElement>(null);
  const skelCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveSkelRef = useRef<Landmark[] | null>(null);
  const liveDetectRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveRafRef = useRef<number>(0);
  const animRef = useRef<number>(0);

  useEffect(() => { preloadLandmarker(); }, []);

  // Score animation
  useEffect(() => {
    if (!result) return;
    setDisplayScore(0);
    let cur = 0;
    const tick = () => {
      cur = Math.min(cur + 2, result.totalScore);
      setDisplayScore(cur);
      if (cur < result.totalScore) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [result]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (previewRef.current) { previewRef.current.srcObject = stream; previewRef.current.play(); }
      setCameraReady(true);
    } catch { setErrorMsg("カメラへのアクセスを許可してください"); }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (step === "record" && recordMode === "camera") startCamera();
    return () => { if (step === "record") stopCamera(); };
  }, [step, recordMode, startCamera, stopCamera]);

  // Live skeleton detection
  useEffect(() => {
    if (step !== "record" || !cameraReady || hasRecording) {
      clearInterval(liveDetectRef.current!); cancelAnimationFrame(liveRafRef.current); return;
    }
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d")!;
    liveDetectRef.current = setInterval(async () => {
      const video = previewRef.current;
      if (!video || !video.videoWidth) return;
      offscreen.width = video.videoWidth; offscreen.height = video.videoHeight;
      offCtx.drawImage(video, 0, 0);
      try {
        const lm = await initLandmarker();
        const res = lm.detect(offscreen);
        liveSkelRef.current = res.landmarks[0]?.map(l => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility ?? 1 })) ?? null;
      } catch { /* skip */ }
    }, 160);
    const drawLoop = () => {
      const v = previewRef.current; const c = skelCanvasRef.current;
      if (v && c) {
        if (c.width !== v.videoWidth && v.videoWidth > 0) { c.width = v.videoWidth; c.height = v.videoHeight; }
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, c.width, c.height);
        if (liveSkelRef.current) drawSkeleton(ctx, liveSkelRef.current, "#4ade80", { lineWidth: 2.5, dotRadius: 4, alpha: 0.9 });
      }
      liveRafRef.current = requestAnimationFrame(drawLoop);
    };
    liveRafRef.current = requestAnimationFrame(drawLoop);
    return () => { clearInterval(liveDetectRef.current!); cancelAnimationFrame(liveRafRef.current); };
  }, [step, cameraReady, hasRecording]);

  const startRecordingWithCountdown = () => {
    setCountdown(3);
    let count = 3;
    const tick = setInterval(() => {
      count--;
      if (count === 0) { clearInterval(tick); setCountdown(null); doStartRecording(); }
      else setCountdown(count);
    }, 1000);
  };

  const doStartRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setUserUrl(URL.createObjectURL(blob)); setHasRecording(true);
      clearInterval(recTimerRef.current!);
    };
    recorder.start(100); setRecording(true); setRecSecs(0);
    recTimerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    setTimeout(() => { if (recorderRef.current?.state === "recording") stopRecording(); }, 180_000);
  };

  const stopRecording = () => {
    recorderRef.current?.stop(); clearInterval(recTimerRef.current!); stopCamera(); setRecording(false);
  };

  const runAnalysis = async () => {
    if (!refUrl || !userUrl) return;
    setErrorMsg(null); setStep("analyze"); setProgress(0);
    try {
      setProgressMsg("お手本のポーズを解析中...");
      const refResult = await extractPoses(refUrl, 5, p => setProgress(p * 45));
      setProgressMsg("あなたのポーズを解析中...");
      const userResult = await extractPoses(userUrl, 5, p => setProgress(45 + p * 45));
      if (refResult.frames.length < 3 || userResult.frames.length < 3) {
        throw new Error(`ポーズが十分に検出できませんでした。\nお手本: ${refResult.frames.length}フレーム\nあなた: ${userResult.frames.length}フレーム\n\n明るい場所で全身が映るようにしてください。`);
      }
      setProgressMsg("DTW採点中..."); setProgress(95);
      const r = judge(refResult.frames, userResult.frames);
      r.detectionQuality = { ref: refResult.quality, user: userResult.quality };
      setProgress(100); setResult(r); setStep("result");
    } catch (err) { setErrorMsg(String(err)); setStep("record"); }
  };

  const reset = () => {
    setStep("upload"); setRefUrl(null); setUserUrl(null); setResult(null);
    setProgress(0); setHasRecording(false); setRecording(false);
    setRecSecs(0); setErrorMsg(null); setCountdown(null); setDisplayScore(0);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const currentIdx = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🥋</div>
          <h1 className="text-3xl font-black tracking-tight">型判定</h1>
          <p className="text-muted-foreground mt-1 text-sm">お手本と自分の技をAIが関節角度で比較・採点</p>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center items-center gap-0 mb-8 flex-wrap">
          {STEPS.map((s, i) => {
            const done = i < currentIdx; const active = i === currentIdx;
            return (
              <div key={s.key} className="flex items-center">
                {i > 0 && <div className={`w-8 h-0.5 ${done ? "bg-primary" : "bg-muted"}`} />}
                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
                  ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {done ? "✓ " : ""}{s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="mb-6 rounded-xl border border-red-800 bg-red-950/50 p-4 text-red-300 text-sm whitespace-pre-line">
            ⚠️ {errorMsg}
            <button onClick={() => setErrorMsg(null)} className="float-right text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <Card>
            <CardHeader><CardTitle>お手本動画をアップロード</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">判定したい技のお手本動画を選択してください。全身が映っているものが最適です。</p>
              <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <div className="text-3xl mb-2">📁</div>
                <div className="text-sm font-medium">クリックして動画を選択</div>
                <div className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM など</div>
                <input type="file" accept="video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setRefUrl(URL.createObjectURL(f)); }} />
              </label>
              {refUrl && (
                <div className="space-y-3">
                  <video src={refUrl} controls className="w-full rounded-xl bg-black" />
                  <Button onClick={() => setStep("record")} className="w-full">
                    次へ → 自分の技を用意する →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Record ── */}
        {step === "record" && (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              {(["camera", "file"] as RecordMode[]).map(m => (
                <Button key={m} variant={recordMode === m ? "default" : "outline"} size="sm"
                  onClick={() => { setRecordMode(m); setHasRecording(false); setUserUrl(null); setRecording(false); setCountdown(null); }}>
                  {m === "camera" ? "📹 ウェブカメラで録画" : "📂 動画をアップロード"}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">お手本</CardTitle></CardHeader>
                <CardContent><video src={refUrl!} controls loop className="w-full rounded-lg bg-black" /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    {recording ? <span className="text-red-400">● 録画中 {fmt(recSecs)}</span>
                      : hasRecording ? "録画済み"
                      : cameraReady ? "カメラ準備完了" : "カメラ起動中..."}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recordMode === "camera" ? (
                    !hasRecording ? (
                      <div className="relative">
                        <video ref={previewRef} autoPlay muted playsInline className="w-full rounded-lg bg-black block" />
                        <canvas ref={skelCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none rounded-lg" />
                        {cameraReady && !recording && countdown === null && (
                          <div className="absolute bottom-2 left-2 text-xs rounded-full px-2 py-0.5 bg-black/60"
                            style={{ color: liveSkelRef.current ? "#4ade80" : "#f87171" }}>
                            {liveSkelRef.current ? "✓ ポーズ検出中" : "⚠ 全身を映してください"}
                          </div>
                        )}
                        {countdown !== null && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                            <span className="text-9xl font-black text-white">{countdown}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <video src={userUrl!} controls className="w-full rounded-lg bg-black" />
                    )
                  ) : (
                    !hasRecording ? (
                      <label className="block border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors">
                        <div className="text-2xl mb-2">📂</div>
                        <div className="text-sm">クリックして動画を選択</div>
                        <input type="file" accept="video/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) { setUserUrl(URL.createObjectURL(f)); setHasRecording(true); } }} />
                      </label>
                    ) : (
                      <video src={userUrl!} controls className="w-full rounded-lg bg-black" />
                    )
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6 text-center space-y-3">
                {recordMode === "camera" && !recording && !hasRecording && countdown === null && (
                  <Button onClick={startRecordingWithCountdown} disabled={!cameraReady} variant="destructive" size="lg">
                    🔴 録画開始（3秒カウントダウン）
                  </Button>
                )}
                {recording && (
                  <Button onClick={stopRecording} variant="secondary" size="lg">⏹ 録画停止</Button>
                )}
                {hasRecording && !recording && (
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button variant="outline" onClick={() => { setHasRecording(false); setUserUrl(null); if (recordMode === "camera") startCamera(); }}>
                      撮り直す
                    </Button>
                    <Button onClick={runAnalysis} size="lg" className="bg-violet-600 hover:bg-violet-700">
                      🎯 判定スタート！
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Step 3: Analyze ── */}
        {step === "analyze" && (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <div className="text-5xl">🤖</div>
              <h2 className="text-xl font-bold">AI解析中...</h2>
              <p className="text-muted-foreground text-sm">{progressMsg}</p>
              <Progress value={progress} className="max-w-sm mx-auto" />
              <p className="text-muted-foreground text-xs">{Math.round(progress)}%</p>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: Result ── */}
        {step === "result" && result && (() => {
          const grade = getGrade(result.totalScore);
          const sortedJoints = Object.entries(result.jointScores).sort((a, b) => a[1] - b[1]);
          const worstTime = (() => {
            if (!result.frameScores.length) return 0;
            const wi = result.frameScores.reduce((w, s, i) => s < result.frameScores[w] ? i : w, 0);
            const [ri] = result.path[wi] ?? [0];
            return result.refFrames[ri]?.timeMs ?? 0;
          })();

          return (
            <div className="space-y-6 pb-8">
              {/* Score hero */}
              <Card>
                <CardContent className="py-10 text-center">
                  <div className="text-xs text-muted-foreground tracking-widest mb-3">RESULT</div>
                  <div className="flex items-center justify-center gap-6">
                    <span className="text-8xl font-black bg-gradient-to-br from-blue-400 to-violet-400 bg-clip-text text-transparent">
                      {displayScore}
                    </span>
                    <div>
                      <div className="text-xl text-muted-foreground">/ 100</div>
                      <div className={`text-5xl font-black ${grade.color}`}>{grade.label}</div>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-3">{grade.msg}</p>
                  <div className="flex gap-3 justify-center mt-3 flex-wrap">
                    {[
                      { label: "お手本検出精度", val: result.detectionQuality.ref },
                      { label: "あなたの検出精度", val: result.detectionQuality.user },
                    ].map(({ label, val }) => (
                      <span key={label} className={`text-xs rounded-full px-3 py-1 bg-muted ${val >= 70 ? "text-green-400" : val >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                        {label}: {val}%
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Skeleton compare */}
              {result.path.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      骨格比較
                      <span className="text-xs text-muted-foreground ml-2 font-normal">青=お手本 / 緑〜赤=あなた（色は精度）</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent><SkeletonCompare result={result} /></CardContent>
                </Card>
              )}

              {/* Coaching advice */}
              <CoachingAdvice result={result} />

              {/* Timeline */}
              <Card>
                <CardHeader><CardTitle className="text-sm">フレームタイムライン</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex h-7 rounded-lg overflow-hidden gap-px">
                    {result.frameScores.map((s, i) => (
                      <div key={i} title={`${Math.round(s * 100)}点`} className="flex-1 min-w-[2px]"
                        style={{ background: s >= 0.75 ? "#4ade80" : s >= 0.45 ? "#fbbf24" : "#f87171" }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0s</span>
                    <div className="flex gap-3">
                      <span className="text-green-400">■ 良い</span>
                      <span className="text-yellow-400">■ まあまあ</span>
                      <span className="text-red-400">■ 要改善</span>
                    </div>
                    <span>{((result.refFrames[result.refFrames.length - 1]?.timeMs ?? 0) / 1000).toFixed(1)}s</span>
                  </div>
                  {worstTime > 0 && <p className="text-xs text-red-400">⚠ 最も改善が必要: {(worstTime / 1000).toFixed(1)}秒付近</p>}
                </CardContent>
              </Card>

              {/* Videos with skeleton */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    動画比較
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-normal text-muted-foreground">
                      <input type="checkbox" checked={showSkeleton} onChange={e => setShowSkeleton(e.target.checked)} className="cursor-pointer" />
                      スケルトン表示
                    </label>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PoseOverlayVideo src={refUrl!} frames={showSkeleton ? result.refFrames : []} color="#60a5fa" controls label="🔵 お手本（青）" />
                    <PoseOverlayVideo src={userUrl!} frames={showSkeleton ? result.userFrames : []} color="#f87171" controls label="🔴 あなたの技（赤）" />
                  </div>
                </CardContent>
              </Card>

              {/* Joint angle scores */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    関節角度スコア
                    <span className="text-xs text-muted-foreground ml-2 font-normal">角度ベース比較</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sortedJoints.map(([name, score]) => {
                      const refDeg = result.jointAngles?.ref[name];
                      const userDeg = result.jointAngles?.user[name];
                      const diff = refDeg !== undefined && userDeg !== undefined ? Math.abs(userDeg - refDeg) : null;
                      const clr = score >= 80 ? "#4ade80" : score >= 50 ? "#fbbf24" : "#f87171";
                      return (
                        <div key={name}>
                          <div className="flex justify-between items-center text-xs mb-1 flex-wrap gap-1">
                            <span className="text-muted-foreground">{name}</span>
                            <div className="flex gap-2 items-center">
                              {refDeg !== undefined && userDeg !== undefined && (
                                <span className="text-muted-foreground/60">
                                  {refDeg}° → {userDeg}°
                                  {diff !== null && diff > 0 && (
                                    <span style={{ color: clr }} className="ml-1">(+{userDeg - (refDeg ?? 0)}°)</span>
                                  )}
                                </span>
                              )}
                              <span className="font-bold" style={{ color: clr }}>{score}点</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: clr }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Button onClick={reset} variant="outline" className="w-full">もう一度挑戦する</Button>
            </div>
          );
        })()}
      </main>
      <Footer />
    </div>
  );
}
