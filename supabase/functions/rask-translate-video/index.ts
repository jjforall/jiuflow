import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCloudflareStreamDownloadUrl } from "../_shared/cloudflare-download.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Get Rask.ai OAuth token
async function getRaskAccessToken(): Promise<string> {
  const clientId = Deno.env.get("RASK_AI_CLIENT_ID");
  const clientSecret = Deno.env.get("RASK_AI_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Rask.ai credentials not configured");
  }

  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(
    "https://rask-prod.auth.us-east-2.amazoncognito.com/oauth2/token",
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "api/source api/input api/output api/limit",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Rask auth error:", response.status, errorText);
    throw new Error(`Rask.ai authentication failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Extract Cloudflare Stream video ID from URL
function extractCloudflareVideoId(url: string): string | null {
  // Match both cloudflarestream.com and videodelivery.net URLs
  const patterns = [
    /cloudflarestream\.com\/([a-zA-Z0-9]+)\//,
    /videodelivery\.net\/([a-zA-Z0-9]+)\//,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Get Cloudflare download URL for video
async function getCloudflareDownloadUrl(videoId: string): Promise<string | null> {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

  if (!accountId || !apiToken) {
    console.error("Cloudflare credentials not configured");
    return null;
  }

  try {
    const url = await getCloudflareStreamDownloadUrl({
      videoId,
      accountId,
      apiToken,
    });
    console.log("Got Cloudflare download URL:", url);
    return url;
  } catch (error) {
    console.error("Cloudflare download URL error:", error);
    return null;
  }
}

// Get downloadable URL for video
async function getDownloadableUrl(url: string): Promise<{ url: string; error?: string }> {
  if (url.toLowerCase().endsWith(".mp4")) {
    return { url };
  }

  const cfVideoId = extractCloudflareVideoId(url);
  if (cfVideoId) {
    console.log("Detected Cloudflare Stream video:", cfVideoId);
    const downloadUrl = await getCloudflareDownloadUrl(cfVideoId);
    if (downloadUrl) {
      return { url: downloadUrl };
    }
    return { 
      url, 
      error: "Failed to get Cloudflare download URL" 
    };
  }

  if (url.includes(".m3u8")) {
    const converted = url
      .replace(/\/manifest\/video\.m3u8$/, "/downloads/default.mp4")
      .replace(/\.m3u8$/, ".mp4");
    return { url: converted };
  }

  return { url };
}

// Language code mapping for Rask.ai
const RASK_LANGUAGE_MAP: Record<string, string> = {
  ja: "ja-JP",
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  zh: "zh-CN",
  ko: "ko-KR",
  it: "it-IT",
  ru: "ru-RU",
  ar: "ar-SA",
  hi: "hi-IN",
  nl: "nl-NL",
  pl: "pl-PL",
  tr: "tr-TR",
  sv: "sv-SE",
  id: "id-ID",
  ms: "ms-MY",
  ro: "ro-RO",
  uk: "uk-UA",
  el: "el-GR",
  cs: "cs-CZ",
  da: "da-DK",
  fi: "fi-FI",
  bg: "bg-BG",
  hr: "hr-HR",
  sk: "sk-SK",
  ta: "ta-IN",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, sourceLanguage, targetLanguage, techniqueId } = await req.json();

    if (!videoUrl || !targetLanguage || !techniqueId) {
      return new Response(
        JSON.stringify({ error: "videoUrl, targetLanguage, and techniqueId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get downloadable URL
    const downloadResult = await getDownloadableUrl(videoUrl);
    if (downloadResult.error) {
      console.error("Failed to get downloadable URL:", downloadResult.error);
      return new Response(
        JSON.stringify({
          error: "Video source is not downloadable",
          details: downloadResult.error,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const mp4Url = downloadResult.url;
    console.log("Video URL:", { original: videoUrl, converted: mp4Url });

    // Get Rask.ai access token
    const accessToken = await getRaskAccessToken();
    console.log("Got Rask.ai access token");

    // Map language codes
    const srcLang = RASK_LANGUAGE_MAP[(sourceLanguage || "ja").toLowerCase()] || "ja-JP";
    const dstLang = RASK_LANGUAGE_MAP[targetLanguage.toLowerCase()];

    if (!dstLang) {
      return new Response(
        JSON.stringify({
          error: "Unsupported translation language",
          details: `Rask.ai does not support language code: ${targetLanguage}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting Rask.ai translation:", { mp4Url, srcLang, dstLang, techniqueId });

    // Step 1: Download video and upload to Rask.ai as file
    // Rask.ai v2 API requires video_id from their media library
    // Direct URL upload doesn't work reliably, so we fetch and upload the file
    console.log("Fetching video for Rask.ai upload:", mp4Url);
    
    // Cloudflare Stream downloads can briefly 404 while being prepared.
    // Retry a few times, refreshing the signed download URL each time.
    let videoResponse: Response | null = null;
    let lastStatus: number | null = null;
    let fetchUrl = mp4Url;

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Fetching video attempt ${attempt}:`, fetchUrl);
      videoResponse = await fetch(fetchUrl);
      if (videoResponse.ok) break;
      lastStatus = videoResponse.status;
      console.error("Failed to fetch video:", videoResponse.status);

      if (videoResponse.status === 404 && attempt < 3) {
        // Recompute download URL (may return a new signed URL) and wait a bit.
        const refreshed = await getDownloadableUrl(videoUrl);
        fetchUrl = refreshed.url;
        await sleep(2000);
        continue;
      }
    }

    if (!videoResponse || !videoResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch video for upload",
          details: `Video fetch failed: ${lastStatus ?? "unknown"}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    
    const videoArrayBuffer = await videoResponse.arrayBuffer();
    const videoBlob = new Blob([videoArrayBuffer], { type: "video/mp4" });
    console.log("Video fetched, size:", videoBlob.size, "bytes");
    
    // Step 2: Upload to Rask.ai media library
    const formData = new FormData();
    formData.append("file", videoBlob, `technique_${techniqueId}.mp4`);
    
    console.log("Uploading to Rask.ai media library...");
    const uploadResponse = await fetch("https://api.rask.ai/api/library/v1/media/file", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
      body: formData,
    });
    
    if (!uploadResponse.ok) {
      const uploadErrorText = await uploadResponse.text();
      console.error("Rask media upload error:", uploadResponse.status, uploadErrorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to upload media to Rask.ai library", 
          details: uploadErrorText,
          status: uploadResponse.status,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const uploadData = await uploadResponse.json();
    const videoId = uploadData.id;
    console.log("Media uploaded to Rask library:", { videoId });
    
    // Step 3: Create project with video_id
    console.log("Creating Rask.ai project with video_id:", videoId);
    const projectResponse = await fetch("https://api.rask.ai/v2/projects", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_id: videoId,
        src_lang: srcLang,
        dst_lang: dstLang,
        name: `Technique ${techniqueId} - ${targetLanguage}`,
        speaker_detection: "auto",
      }),
    });

    if (!projectResponse.ok) {
      const errorText = await projectResponse.text();
      console.error("Rask project creation error:", {
        status: projectResponse.status,
        statusText: projectResponse.statusText,
        body: errorText,
      });
      return new Response(
        JSON.stringify({ 
          error: "Failed to create Rask.ai project", 
          details: errorText,
          status: projectResponse.status,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectData = await projectResponse.json();
    const projectId = projectData.id;
    console.log("Rask project created:", { projectId, videoId });

    return new Response(
      JSON.stringify({
        success: true,
        projectId,
        videoId,
        message: "Translation started successfully with Rask.ai",
        targetLanguage,
        provider: "rask",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rask translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
