import { useState, useEffect, useRef, useMemo, memo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

// ---------- Types ----------
interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
}

interface VideoSubtitleOverlayProps {
  vttContent: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean;
}

// ---------- VTT Parser ----------
function parseVTT(vtt: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  // Split by blank lines
  const blocks = vtt.replace(/\r\n/g, "\n").split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    // Find the timestamp line
    const tsIdx = lines.findIndex((l) => l.includes("-->"));
    if (tsIdx === -1) continue;

    const tsLine = lines[tsIdx];
    const match = tsLine.match(
      /(\d{2}):(\d{2}):(\d{2})[\.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[\.,](\d{3})/
    );
    if (!match) continue;

    const startTime =
      +match[1] * 3600 + +match[2] * 60 + +match[3] + +match[4] / 1000;
    const endTime =
      +match[5] * 3600 + +match[6] * 60 + +match[7] + +match[8] / 1000;

    const text = lines
      .slice(tsIdx + 1)
      .join("\n")
      .trim();
    if (text) {
      cues.push({ startTime, endTime, text });
    }
  }

  return cues;
}

// ---------- Japanese-aware line breaking ----------

// Particles / endings that should NOT start a new line (禁則処理)
const NO_START_CHARS = new Set([
  "。", "、", ".", ",", "！", "？", "!", "?",
  "）", ")", "」", "』", "】", "〕", "》", "〉",
  "ー", "っ", "ッ", "ゃ", "ゅ", "ょ", "ャ", "ュ", "ョ",
  "を", "は", "が", "の", "に", "で", "と", "も", "へ", "や",
  "ね", "よ", "な", "か",
]);

// Characters that are natural break points (after these chars)
const BREAK_AFTER = new Set([
  "。", "、", ".", ",", "！", "？", "!", "?",
  "）", ")", "」", "』", "】",
]);

// Conjunction patterns that serve as natural break points
const CONJUNCTION_PATTERNS = [
  "ので", "から", "けど", "けれど", "のに", "ため", "ながら",
  "として", "について", "にとって", "に対して",
];

/**
 * Split text into display lines respecting Japanese typography rules.
 * Uses BudouX for word boundary detection when available, with fallback.
 */
let budouxParser: { parse: (text: string) => string[] } | null = null;
let budouxLoading = false;

// Load BudouX asynchronously
(async () => {
  if (budouxLoading) return;
  budouxLoading = true;
  try {
    const budoux = await import("budoux");
    budouxParser = budoux.loadDefaultJapaneseParser();
  } catch {
    budouxParser = null;
  }
})();

function segmentText(text: string): string[] {
  if (budouxParser) {
    return budouxParser.parse(text);
  }
  // Fallback: split on known break points
  return fallbackSegment(text);
}

function fallbackSegment(text: string): string[] {
  const segments: string[] = [];
  let current = "";

  for (let i = 0; i < text.length; i++) {
    current += text[i];
    if (BREAK_AFTER.has(text[i]) && i < text.length - 1) {
      segments.push(current);
      current = "";
    }
  }
  if (current) segments.push(current);

  // Also split on conjunction patterns
  const result: string[] = [];
  for (const seg of segments) {
    let s = seg;
    for (const conj of CONJUNCTION_PATTERNS) {
      const idx = s.indexOf(conj);
      if (idx > 0 && idx + conj.length < s.length) {
        result.push(s.slice(0, idx + conj.length));
        s = s.slice(idx + conj.length);
      }
    }
    if (s) result.push(s);
  }

  return result;
}

/**
 * Wrap segmented text into lines respecting max character width.
 * Returns an array of lines, each line being a string.
 */
function wrapLines(text: string, maxChars: number, maxLines: number): string[][] {
  // Clean text: remove VTT tags
  const cleanText = text.replace(/<[^>]+>/g, "").replace(/\n/g, " ");

  const words = segmentText(cleanText);
  const allLines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length > maxChars && currentLine.length > 0) {
      allLines.push(currentLine);
      currentLine = word;
    } else {
      currentLine += word;
    }
  }
  if (currentLine) allLines.push(currentLine);

  // Split into pages of maxLines each
  const pages: string[][] = [];
  for (let i = 0; i < allLines.length; i += maxLines) {
    pages.push(allLines.slice(i, i + maxLines));
  }

  return pages.length > 0 ? pages : [[""]];
}

// ---------- Component ----------
const VideoSubtitleOverlayInner = ({
  vttContent,
  videoRef,
  enabled,
}: VideoSubtitleOverlayProps) => {
  const isMobile = useIsMobile();
  const [currentTime, setCurrentTime] = useState(0);
  const [prevCueText, setPrevCueText] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cues = useMemo(() => parseVTT(vttContent), [vttContent]);

  // Track video currentTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;

    const update = () => setCurrentTime(video.currentTime);
    video.addEventListener("timeupdate", update);
    return () => video.removeEventListener("timeupdate", update);
  }, [videoRef, enabled]);

  // Find active cue
  const activeCue = useMemo(() => {
    if (!enabled || cues.length === 0) return null;
    return cues.find((c) => currentTime >= c.startTime && currentTime < c.endTime) ?? null;
  }, [cues, currentTime, enabled]);

  // Handle fade transitions
  useEffect(() => {
    if (activeCue?.text !== prevCueText) {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);

      if (activeCue) {
        // Brief fade out then in
        setVisible(false);
        fadeTimeoutRef.current = setTimeout(() => {
          setPrevCueText(activeCue.text);
          setVisible(true);
        }, 100);
      } else {
        setVisible(false);
        fadeTimeoutRef.current = setTimeout(() => {
          setPrevCueText(null);
        }, 100);
      }
    }
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [activeCue, prevCueText]);

  // Line wrapping config
  const maxChars = isMobile ? 17 : 32;
  const maxLines = 2;

  const displayPages = useMemo(() => {
    if (!activeCue) return null;
    return wrapLines(activeCue.text, maxChars, maxLines);
  }, [activeCue, maxChars, maxLines]);

  // For long text (>2 lines), paginate based on time within the cue
  const activePage = useMemo(() => {
    if (!displayPages || !activeCue) return null;
    if (displayPages.length === 1) return displayPages[0];

    const cueDuration = activeCue.endTime - activeCue.startTime;
    const elapsed = currentTime - activeCue.startTime;
    const pageIndex = Math.min(
      Math.floor((elapsed / cueDuration) * displayPages.length),
      displayPages.length - 1
    );
    return displayPages[pageIndex];
  }, [displayPages, activeCue, currentTime]);

  if (!enabled || !activePage || !visible) return null;

  return (
    <div
      className={`
        absolute z-20 left-1/2 -translate-x-1/2 pointer-events-none
        flex flex-col items-center gap-0
        transition-opacity duration-100
        ${visible ? "opacity-100" : "opacity-0"}
      `}
      style={{
        bottom: isMobile ? "20%" : "12%",
        maxWidth: isMobile ? "92%" : "80%",
      }}
    >
      <div
        className="px-4 py-2 rounded-md"
        style={{
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(2px)",
        }}
      >
        {activePage.map((line, i) => (
          <p
            key={i}
            className="text-center leading-relaxed"
            style={{
              color: "#fff",
              fontFamily:
                "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif",
              fontSize: isMobile ? "14px" : "18px",
              fontWeight: 600,
              textShadow:
                "1px 1px 2px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.7)",
              letterSpacing: "0.02em",
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
};

export const VideoSubtitleOverlay = memo(VideoSubtitleOverlayInner);
