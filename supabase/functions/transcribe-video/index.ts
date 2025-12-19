import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, techniqueId, userVideoId } = await req.json();

    if (!videoUrl) {
      throw new Error("Video URL is required");
    }

    if (!techniqueId && !userVideoId) {
      throw new Error("Either techniqueId or userVideoId is required");
    }

    const assemblyAiApiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
    if (!assemblyAiApiKey) {
      throw new Error("ASSEMBLYAI_API_KEY is not configured");
    }

    console.log("Starting transcription with AssemblyAI for:", videoUrl);
    
    // Resolve downloadable URL (convert HLS manifest to direct download if needed)
    const downloadUrl = resolveDownloadUrl(videoUrl);
    console.log("Using download URL:", downloadUrl);

    // Step 1: Submit transcription job to AssemblyAI
    // AssemblyAI will download the file from the URL - no need to download locally
    console.log("Submitting transcription job to AssemblyAI...");
    
    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": assemblyAiApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: downloadUrl,
        language_code: "ja",
        punctuate: true,
        format_text: true,
      }),
    });

    if (!transcriptResponse.ok) {
      const errorText = await transcriptResponse.text();
      console.error("AssemblyAI submit error:", errorText);
      throw new Error(`AssemblyAI submit error: ${transcriptResponse.status} - ${errorText}`);
    }

    const transcriptData = await transcriptResponse.json();
    const transcriptId = transcriptData.id;
    console.log("Transcription job submitted, ID:", transcriptId);

    // Step 2: Poll for completion (AssemblyAI processes asynchronously)
    let transcriptionResult: any = null;
    const maxWaitMs = 30 * 60 * 1000; // 30 minutes max wait for large files
    const pollIntervalMs = 5000; // Poll every 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const statusResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            "Authorization": assemblyAiApiKey,
          },
        }
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error("AssemblyAI status check error:", errorText);
        throw new Error(`AssemblyAI status error: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      console.log("Transcription status:", statusData.status);

      if (statusData.status === "completed") {
        transcriptionResult = statusData;
        break;
      } else if (statusData.status === "error") {
        throw new Error(`AssemblyAI transcription failed: ${statusData.error}`);
      }
      // Continue polling if status is "queued" or "processing"
    }

    if (!transcriptionResult) {
      throw new Error("Transcription timed out after 30 minutes");
    }

    console.log("Transcription completed:", transcriptionResult.text?.substring(0, 100));

    // Convert AssemblyAI words to segments (group by sentences/pauses)
    const segments = convertToSegments(transcriptionResult.words || []);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store transcription in database
    const { data: transcription, error: insertError } = await supabase
      .from("video_transcriptions")
      .insert({
        technique_id: techniqueId || null,
        user_video_id: userVideoId || null,
        language_code: "ja",
        original_text: transcriptionResult.text,
        segments: segments,
        status: "completed",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error(`Failed to save transcription: ${insertError.message}`);
    }

    console.log("Transcription saved with ID:", transcription.id);

    // Generate VTT subtitle content
    const vttContent = generateVTT(segments);

    // Store Japanese subtitle
    const { error: subtitleError } = await supabase
      .from("video_subtitles")
      .insert({
        transcription_id: transcription.id,
        language_code: "ja",
        vtt_content: vttContent,
        status: "completed",
      });

    if (subtitleError) {
      console.error("Subtitle insert error:", subtitleError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription: {
          id: transcription.id,
          text: transcriptionResult.text,
          segments: segments,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("Transcription error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Convert AssemblyAI word-level timestamps to segment format
function convertToSegments(words: any[]): any[] {
  if (!words || words.length === 0) return [];

  const segments: any[] = [];
  let currentSegment: any = null;
  let lastEndTime = 0;

  for (const word of words) {
    const wordStart = word.start / 1000; // Convert ms to seconds
    const wordEnd = word.end / 1000;
    const pauseThreshold = 1.5; // 1.5 second pause = new segment

    // Start new segment if:
    // - No current segment
    // - Long pause between words
    // - Current segment is getting long (>30 seconds)
    if (
      !currentSegment ||
      wordStart - lastEndTime > pauseThreshold ||
      (currentSegment && wordEnd - currentSegment.start > 30)
    ) {
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = {
        start: wordStart,
        end: wordEnd,
        text: word.text,
      };
    } else {
      currentSegment.end = wordEnd;
      currentSegment.text += " " + word.text;
    }

    lastEndTime = wordEnd;
  }

  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}

function generateVTT(segments: any[]): string {
  let vtt = "WEBVTT\n\n";

  segments.forEach((segment, index) => {
    const startTime = formatVTTTime(segment.start);
    const endTime = formatVTTTime(segment.end);
    vtt += `${index + 1}\n`;
    vtt += `${startTime} --> ${endTime}\n`;
    vtt += `${segment.text.trim()}\n\n`;
  });

  return vtt;
}

function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function resolveDownloadUrl(videoUrl: string): string {
  // AssemblyAI can handle most URLs directly, but convert HLS manifests to MP4 when possible
  const u = new URL(videoUrl);

  const lowerPath = u.pathname.toLowerCase();
  const looksLikeManifest = lowerPath.endsWith(".m3u8") || lowerPath.includes("/manifest/");
  if (!looksLikeManifest) return videoUrl;

  // Try Cloudflare Stream-style download URL patterns
  const downloadPath = u.pathname
    .replace(/\/manifest\/video\.m3u8$/i, "/downloads/default.mp4")
    .replace(/\.m3u8$/i, ".mp4");

  const candidates: string[] = [];
  candidates.push(`${u.origin}${downloadPath}${u.search}`);

  const parts = u.pathname.split("/").filter(Boolean);
  const uid = parts[0];
  if (uid && (u.hostname.includes("cloudflarestream.com") || u.hostname.includes("videodelivery.net"))) {
    candidates.push(`https://videodelivery.net/${uid}/downloads/default.mp4${u.search}`);
  }

  candidates.push(videoUrl);
  return candidates[0];
}
