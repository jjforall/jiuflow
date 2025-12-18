import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Resolving downloadable media URL for:", videoUrl);
    const downloadUrl = resolveDownloadUrl(videoUrl);
    console.log("Downloading media from:", downloadUrl);

    // Download media file (must be an actual media file, not an HLS manifest)
    const mediaResponse = await fetch(downloadUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Lovable; Transcription Bot)",
        Accept: "*/*",
      },
    });

    if (!mediaResponse.ok) {
      throw new Error(`Failed to download media: ${mediaResponse.status}`);
    }

    const contentType = mediaResponse.headers.get("content-type") || "video/mp4";
    const contentLength = mediaResponse.headers.get("content-length");
    console.log("Media content-type:", contentType);
    if (contentLength) console.log("Media content-length:", contentLength);

    if (!mediaResponse.body) {
      throw new Error("Media response body is empty");
    }

    console.log("Streaming media to Whisper API...");

    const fileName = contentType.startsWith("audio/") ? "audio" : "video.mp4";
    const { body: whisperBody, contentTypeHeader } = createMultipartBody({
      fileStream: mediaResponse.body,
      fileName,
      fileContentType: contentType,
      fields: [
        ["model", "whisper-1"],
        ["language", "ja"],
        ["response_format", "verbose_json"],
        ["timestamp_granularities[]", "segment"],
      ],
    });

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": contentTypeHeader,
        },
        body: whisperBody,
      },
    );

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error("Whisper API error:", errorText);
      throw new Error(
        `Whisper API error: ${whisperResponse.status} - ${errorText}`,
      );
    }

    const transcriptionResult = await whisperResponse.json();
    console.log(
      "Transcription completed:",
      transcriptionResult.text?.substring(0, 100),
    );

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
        segments: transcriptionResult.segments || [],
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
    const vttContent = generateVTT(transcriptionResult.segments || []);

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
          segments: transcriptionResult.segments,
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
  // Whisper requires an actual media file (mp3/mp4/wav/etc). If we receive an HLS manifest URL,
  // convert to a downloadable MP4 URL when possible.
  const u = new URL(videoUrl);

  // If already a file URL (not a manifest), keep as-is
  const lowerPath = u.pathname.toLowerCase();
  const looksLikeManifest = lowerPath.endsWith(".m3u8") || lowerPath.includes("/manifest/");
  if (!looksLikeManifest) return videoUrl;

  // Try Cloudflare Stream-style download URL patterns
  // e.g. https://.../<uid>/manifest/video.m3u8 -> https://.../<uid>/downloads/default.mp4
  const downloadPath = u.pathname
    .replace(/\/manifest\/video\.m3u8$/i, "/downloads/default.mp4")
    .replace(/\.m3u8$/i, ".mp4");

  const candidates: string[] = [];
  // same origin
  candidates.push(`${u.origin}${downloadPath}${u.search}`);

  // If it's a cloudflare stream custom domain, also try videodelivery.net
  const parts = u.pathname.split("/").filter(Boolean);
  const uid = parts[0];
  if (uid && (u.hostname.includes("cloudflarestream.com") || u.hostname.includes("videodelivery.net"))) {
    candidates.push(`https://videodelivery.net/${uid}/downloads/default.mp4${u.search}`);
  }

  // Fallback to original (will likely fail, but keeps behavior explicit)
  candidates.push(videoUrl);

  // Pick first candidate; the caller will fetch and validate status.
  return candidates[0];
}

function createMultipartBody(params: {
  fileStream: ReadableStream<Uint8Array>;
  fileName: string;
  fileContentType: string;
  fields: Array<[string, string]>;
}): { body: ReadableStream<Uint8Array>; contentTypeHeader: string } {
  const boundary = `----lovable-${crypto.randomUUID()}`;
  const encoder = new TextEncoder();

  const encode = (s: string) => encoder.encode(s);

  const fieldParts = params.fields.map(([name, value]) =>
    encode(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
        `${value}\r\n`,
    ),
  );

  const fileHeader = encode(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${params.fileName}"\r\n` +
      `Content-Type: ${params.fileContentType}\r\n\r\n`,
  );

  const fileFooterAndClose = encode(`\r\n--${boundary}--\r\n`);

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const part of fieldParts) controller.enqueue(part);
      controller.enqueue(fileHeader);

      const reader = params.fileStream.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) controller.enqueue(value);
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // ignore
        }
      }

      controller.enqueue(fileFooterAndClose);
      controller.close();
    },
    cancel() {
      // no-op
    },
  });

  return {
    body,
    contentTypeHeader: `multipart/form-data; boundary=${boundary}`,
  };
}
