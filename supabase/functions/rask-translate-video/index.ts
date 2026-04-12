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

// Create Rask.ai media from a public URL and return its id (video_id)
async function createRaskMediaByLink(opts: {
  accessToken: string;
  mp4Url: string;
  name: string;
}): Promise<string> {
  const resp = await fetch("https://api.rask.ai/api/library/v1/media/link", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      link: opts.mp4Url,
      kind: "video",
      name: opts.name,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error("Rask media(link) error:", resp.status, t);
    throw new Error(`Rask media(link) failed: ${resp.status} ${t}`);
  }

  const data = await resp.json();
  if (!data?.id) {
    console.error("Rask media(link) unexpected response:", data);
    throw new Error("Rask media(link) returned no id");
  }
  return data.id as string;
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
// Note: Rask.ai uses ISO 639-1 codes for some languages, not locale codes
// Japanese is NOT supported as a source language for transcription by Rask.ai
const RASK_LANGUAGE_MAP: Record<string, string> = {
  // Source languages that Rask.ai supports for transcription
  en: "en",
  es: "es",
  pt: "pt",
  fr: "fr",
  de: "de",
  it: "it",
  ru: "ru",
  nl: "nl",
  pl: "pl",
  tr: "tr",
  sv: "sv",
  id: "id",
  ro: "ro",
  uk: "uk",
  el: "el",
  cs: "cs",
  da: "da",
  fi: "fi",
  bg: "bg",
  hr: "hr",
  sk: "sk",
  // These might need locale format for target languages
  zh: "zh-CN",
  ko: "ko",
  ar: "ar",
  hi: "hi",
  ja: "ja",  // Note: Japanese may not be supported as source language
  ms: "ms",
  ta: "ta",
};

// Languages NOT supported as source (transcription) by Rask.ai
const RASK_UNSUPPORTED_SOURCE_LANGUAGES = ["ja", "zh", "ko", "ar", "hi", "ta"];

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
    const srcLangCode = (sourceLanguage || "ja").toLowerCase();
    const srcLang = RASK_LANGUAGE_MAP[srcLangCode] || srcLangCode;
    const dstLang = RASK_LANGUAGE_MAP[targetLanguage.toLowerCase()];

    // Check if source language is supported for transcription
    if (RASK_UNSUPPORTED_SOURCE_LANGUAGES.includes(srcLangCode)) {
      return new Response(
        JSON.stringify({
          error: "Rask.ai doesn't support Japanese as source language",
          details: "Rask.aiは日本語の文字起こしをサポートしていません。ElevenLabsをお試しください。",
          unsupported_source: true,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Rask.ai v2/projects requires video_id (from media library).
    // Use "Upload media by link" to avoid re-uploading large files.
    const videoId = await createRaskMediaByLink({
      accessToken,
      mp4Url,
      name: `Technique ${techniqueId} - ${targetLanguage}`,
    });
    console.log("Rask media created from link:", { videoId });

    console.log("[rask-translate-video] Creating Rask.ai project with video_id:", videoId);
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
        // Note: speaker_detection は無効なパラメータ、自動検出はデフォルト動作
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
      JSON.stringify({ error: "An error occurred during translation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
