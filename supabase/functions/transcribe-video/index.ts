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

    const cloudflareAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const cloudflareApiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

    console.log("Starting transcription with AssemblyAI for:", videoUrl);
    
    // Get a downloadable URL - for Cloudflare Stream, we need to use the API
    let downloadUrl = videoUrl;

    // Check if this is a Cloudflare Stream URL and get proper download URL
    // Support both cloudflarestream.com and videodelivery.net domains
    const cfMatch = videoUrl.match(/(?:cloudflarestream\.com|videodelivery\.net)\/([a-f0-9-]+)/);
    const isCloudflare = Boolean(cfMatch && cloudflareAccountId && cloudflareApiToken);

    if (isCloudflare) {
      const videoId = cfMatch![1];
      console.log("Detected Cloudflare Stream video, preparing download URL for:", videoId);
      downloadUrl = await getCloudflareDownloadUrl(videoId, cloudflareAccountId!, cloudflareApiToken!);
    } else {
      // For non-Cloudflare URLs, try to resolve download URL
      downloadUrl = resolveDownloadUrl(videoUrl);
    }

    console.log("Final download URL:", downloadUrl);

    // For Cloudflare Stream, upload to AssemblyAI first so AssemblyAI doesn't need direct access
    const assemblyAudioUrl = isCloudflare
      ? await uploadToAssemblyAiFromUrl(assemblyAiApiKey, downloadUrl)
      : downloadUrl;

    // Step 1: Submit transcription job to AssemblyAI
    console.log("Submitting transcription job to AssemblyAI...");

    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": assemblyAiApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: assemblyAudioUrl,
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

// Collapse repeated punctuation (e.g., "。。。" -> "。")
function collapseRepeatedPunctuation(s: string): string {
  return s.replace(/([。、！？…])\1+/g, "$1");
}

// Remove inline repeated phrases like "それでそれで" or "という風にという風に"
function removeInlineRepeats(s: string): string {
  let result = s;
  let changed = true;
  let iterations = 0;
  const maxIterations = 10;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;
    
    for (let len = Math.min(20, Math.floor(result.length / 2)); len >= 3; len--) {
      for (let i = 0; i <= result.length - len * 2; i++) {
        const phrase = result.slice(i, i + len);
        const nextPhrase = result.slice(i + len, i + len * 2);
        
        if (phrase === nextPhrase && phrase.trim().length >= 2) {
          result = result.slice(0, i) + result.slice(i + len);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  
  return result;
}

// Remove duplicated tail phrases like "やっていきます。やっていきます。"
function removeTailRepeat(s: string): string {
  if (s.length < 8) return s;

  const maxTailLen = Math.min(30, Math.floor(s.length / 2) + 5);
  
  for (let tailLen = maxTailLen; tailLen >= 4; tailLen--) {
    const tail = s.slice(-tailLen);
    if (tail.trim().length < 3) continue;
    
    const searchArea = s.slice(0, s.length - tailLen + 2);
    const earlierPos = searchArea.lastIndexOf(tail);
    
    if (earlierPos >= 0) {
      const beforeFirst = s.slice(0, earlierPos);
      const afterFirst = s.slice(earlierPos + tail.length);
      return beforeFirst + afterFirst;
    }
    
    for (let overlap = 1; overlap <= Math.min(3, tailLen - 3); overlap++) {
      if (s.length < tailLen * 2 - overlap) continue;
      
      const checkStart = s.length - tailLen * 2 + overlap - overlap;
      if (checkStart < 0) continue;
      
      const firstOccurrence = s.slice(checkStart, checkStart + tailLen);
      if (firstOccurrence === tail) {
        return s.slice(0, checkStart) + s.slice(checkStart + tailLen);
      }
    }
  }

  return s;
}

// Normalize subtitle text: remove whitespace, repeated punctuation, inline/tail repeats
function normalizeSubtitleText(raw: string): string {
  let t = raw.trim().replace(/\s+/g, '');
  t = collapseRepeatedPunctuation(t);
  t = removeInlineRepeats(t);
  
  for (let i = 0; i < 3; i++) {
    const next = removeTailRepeat(t);
    if (next === t) break;
    t = next;
  }
  
  return t;
}

// Split long text into lines of max ~30 characters for readability
function splitTextForSubtitle(text: string, maxCharsPerLine: number = 30): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxCharsPerLine) return trimmed;
  
  const words = trimmed.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  
  for (const word of words) {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // Limit to 2 lines max for readability
  if (lines.length > 2) {
    return lines.slice(0, 2).join("\n");
  }
  
  return lines.join("\n");
}

function generateVTT(segments: any[]): string {
  let vtt = "WEBVTT\n\n";
  let cueIndex = 1;
  
  // Split long segments into smaller chunks for subtitle display
  const maxSegmentDuration = 5; // Max 5 seconds per subtitle
  const maxChars = 60; // Max chars per subtitle (before line breaking)

  for (const segment of segments) {
    const text = normalizeSubtitleText(segment.text); // Apply normalization
    const duration = segment.end - segment.start;
    
    // If segment is short enough, output as single cue
    if (duration <= maxSegmentDuration && text.length <= maxChars) {
      const startTime = formatVTTTime(segment.start);
      const endTime = formatVTTTime(segment.end);
      vtt += `${cueIndex}\n`;
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${splitTextForSubtitle(text)}\n\n`;
      cueIndex++;
      continue;
    }
    
    // Split long segment by character count and duration
    const words = text.split(/\s+/);
    const avgTimePerWord = duration / words.length;
    
    let currentStart = segment.start;
    let currentWords: string[] = [];
    let currentCharCount = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      if (currentWords.length > 0 && 
          (currentCharCount + word.length + 1 > maxChars || 
           currentWords.length * avgTimePerWord > maxSegmentDuration)) {
        // Output current chunk
        const chunkEnd = Math.min(currentStart + currentWords.length * avgTimePerWord, segment.end);
        const startTime = formatVTTTime(currentStart);
        const endTime = formatVTTTime(chunkEnd);
        vtt += `${cueIndex}\n`;
        vtt += `${startTime} --> ${endTime}\n`;
        vtt += `${splitTextForSubtitle(currentWords.join(" "))}\n\n`;
        cueIndex++;
        
        currentStart = chunkEnd;
        currentWords = [];
        currentCharCount = 0;
      }
      
      currentWords.push(word);
      currentCharCount += word.length + 1;
    }
    
    // Output remaining words
    if (currentWords.length > 0) {
      const startTime = formatVTTTime(currentStart);
      const endTime = formatVTTTime(segment.end);
      vtt += `${cueIndex}\n`;
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${splitTextForSubtitle(currentWords.join(" "))}\n\n`;
      cueIndex++;
    }
  }

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

async function getCloudflareDownloadUrl(
  videoId: string,
  accountId: string,
  apiToken: string,
): Promise<string> {
  console.log("getCloudflareDownloadUrl called with videoId:", videoId);
  
  // First, try to enable downloads (this is idempotent)
  try {
    console.log("Attempting to enable downloads for video...");
    const enableRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const enableJson = await enableRes.json().catch(() => null);
    console.log("Enable downloads response:", JSON.stringify(enableJson));
    
    if (enableJson?.success && enableJson?.result?.default?.url) {
      const downloadInfo = enableJson.result.default;
      
      // Check if download is ready or still processing
      if (downloadInfo.status === "ready") {
        console.log("Download is ready");
        return downloadInfo.url;
      } else if (downloadInfo.status === "inprogress") {
        console.log("Download is in progress, waiting for completion...");
        // Wait for download to be ready
        return await waitForDownloadReady(videoId, accountId, apiToken, downloadInfo.url);
      } else {
        console.log("Got download URL from enable response, status:", downloadInfo.status);
        return downloadInfo.url;
      }
    }
  } catch (e) {
    console.log("Enable downloads request failed:", e);
  }

  // Try GET to check if downloads are already enabled
  try {
    console.log("Checking existing downloads status...");
    const downloadStatusRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
        },
      },
    );

    const downloadStatusJson = await downloadStatusRes.json().catch(() => null);
    console.log("Download status response:", JSON.stringify(downloadStatusJson));
    
    if (downloadStatusJson?.success && downloadStatusJson?.result?.default?.url) {
      const downloadInfo = downloadStatusJson.result.default;
      
      if (downloadInfo.status === "ready") {
        console.log("Download is ready from status check");
        return downloadInfo.url;
      } else if (downloadInfo.status === "inprogress") {
        console.log("Download is in progress from status check, waiting...");
        return await waitForDownloadReady(videoId, accountId, apiToken, downloadInfo.url);
      }
      
      return downloadInfo.url;
    }
  } catch (e) {
    console.log("Download status check failed:", e);
  }

  // Fetch video details as fallback
  console.log("Fetching video details...");
  const detailsRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
    {
      headers: {
        "Authorization": `Bearer ${apiToken}`,
      },
    },
  );

  const detailsJson = await detailsRes.json();
  console.log("Video details response:", JSON.stringify(detailsJson));
  
  if (detailsJson?.success && detailsJson?.result) {
    const video = detailsJson.result;
    
    // Check for download URL
    if (video?.downloads?.default?.url) {
      console.log("Got download URL from video details");
      return video.downloads.default.url;
    }

    // Use preview URL as fallback (this is a direct video URL)
    if (video?.preview) {
      console.log("Using preview URL as fallback");
      return video.preview;
    }
    
    // Use playback HLS and try to convert
    if (video?.playback?.hls) {
      // HLS URL format: https://customer-xxx.cloudflarestream.com/videoId/manifest/video.m3u8
      // Try the MP4 download path
      const hlsUrl = video.playback.hls;
      const mp4Url = hlsUrl.replace(/\/manifest\/video\.m3u8$/, "/downloads/default.mp4");
      console.log("Trying MP4 URL derived from HLS:", mp4Url);
      return mp4Url;
    }
  }

  // Final fallback: construct URL based on known pattern
  // Note: This requires downloads to be enabled for the video
  const fallbackUrl = `https://videodelivery.net/${videoId}/downloads/default.mp4`;
  console.log("Using fallback URL pattern:", fallbackUrl);
  return fallbackUrl;
}

// Poll Cloudflare until the download file is ready
async function waitForDownloadReady(
  videoId: string,
  accountId: string,
  apiToken: string,
  downloadUrl: string,
): Promise<string> {
  const maxWaitMs = 5 * 60 * 1000; // Wait up to 5 minutes
  const pollIntervalMs = 5000; // Poll every 5 seconds
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    
    try {
      const statusRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
          },
        },
      );
      
      const statusJson = await statusRes.json().catch(() => null);
      
      if (statusJson?.success && statusJson?.result?.default) {
        const downloadInfo = statusJson.result.default;
        const percent = downloadInfo.percentComplete ?? 0;
        console.log(`Download progress: ${percent}%, status: ${downloadInfo.status}`);
        
        if (downloadInfo.status === "ready") {
          console.log("Download is now ready!");
          return downloadInfo.url || downloadUrl;
        }
        
        // If progress is 100%, consider it ready even if status hasn't updated
        if (percent >= 100) {
          console.log("Download at 100%, proceeding with URL");
          // Give it a bit more time for the file to be fully available
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return downloadInfo.url || downloadUrl;
        }
      }
    } catch (e) {
      console.log("Error checking download status:", e);
    }
  }
  
  // If we timeout, try the URL anyway - it might work
  console.log("Timeout waiting for download, proceeding with URL anyway");
  return downloadUrl;
}

async function uploadToAssemblyAiFromUrl(apiKey: string, fileUrl: string): Promise<string> {
  console.log("Uploading audio to AssemblyAI (server-side) ...");

  const audioRes = await fetch(fileUrl, {
    redirect: "follow",
  });

  if (!audioRes.ok || !audioRes.body) {
    const text = await audioRes.text().catch(() => "");
    throw new Error(`Failed to download media for upload: ${audioRes.status} ${text}`);
  }

  const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      "Authorization": apiKey,
      "Content-Type": "application/octet-stream",
    },
    body: audioRes.body,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => "");
    throw new Error(`AssemblyAI upload error: ${uploadRes.status} - ${errText}`);
  }

  const uploadJson = await uploadRes.json();
  if (!uploadJson?.upload_url) {
    throw new Error("AssemblyAI upload did not return upload_url");
  }

  console.log("AssemblyAI upload complete.");
  return uploadJson.upload_url;
}

