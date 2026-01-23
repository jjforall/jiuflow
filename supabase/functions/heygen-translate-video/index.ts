import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCloudflareStreamDownloadUrl } from "../_shared/cloudflare-download.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HeyGen language mapping (uses full language names)
const HEYGEN_LANGUAGE_MAP: Record<string, string> = {
  ja: "Japanese",
  en: "English",
  pt: "Portuguese",
  es: "Spanish",
  fr: "French",
  de: "German",
  zh: "Chinese",
  ko: "Korean",
  it: "Italian",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  ms: "Malay",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  cs: "Czech",
  el: "Greek",
  he: "Hebrew",
  hu: "Hungarian",
  ro: "Romanian",
  uk: "Ukrainian",
};

function extractCloudflareVideoId(url: string): string | null {
  // Pattern 1: https://customer-xxxxx.cloudflarestream.com/VIDEO_ID/...
  const customerMatch = url.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)/);
  if (customerMatch) return customerMatch[1];

  // Pattern 2: https://videodelivery.net/VIDEO_ID/...
  const deliveryMatch = url.match(/videodelivery\.net\/([a-zA-Z0-9]+)/);
  if (deliveryMatch) return deliveryMatch[1];

  return null;
}

async function getDownloadableUrl(url: string): Promise<{ url: string; error?: string }> {
  console.log("[getDownloadableUrl] Processing URL:", url);

  // Already an MP4 direct link
  if (url.endsWith(".mp4") && !url.includes("cloudflarestream") && !url.includes("videodelivery")) {
    console.log("[getDownloadableUrl] Already MP4 URL");
    return { url };
  }

  // Cloudflare Stream URL
  const cfVideoId = extractCloudflareVideoId(url);
  if (cfVideoId) {
    console.log("[getDownloadableUrl] Cloudflare video ID:", cfVideoId);

    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

    if (!accountId || !apiToken) {
      return { url: "", error: "Cloudflare credentials not configured" };
    }

    try {
      const downloadUrl = await getCloudflareStreamDownloadUrl({
        videoId: cfVideoId,
        accountId,
        apiToken,
      });
      console.log("[getDownloadableUrl] Got Cloudflare download URL:", downloadUrl);
      return { url: downloadUrl };
    } catch (err) {
      console.error("[getDownloadableUrl] Cloudflare download error:", err);
      return { url: "", error: `Cloudflare download failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // HLS URL - try to convert to MP4
  if (url.includes(".m3u8")) {
    const mp4Url = url.replace(/\/manifest\/video\.m3u8.*$/, "/downloads/default.mp4");
    console.log("[getDownloadableUrl] Converted HLS to MP4:", mp4Url);
    return { url: mp4Url };
  }

  return { url };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const heygenApiKey = Deno.env.get("HEYGEN_API_KEY");
    if (!heygenApiKey) {
      throw new Error("HEYGEN_API_KEY not configured");
    }

    const { videoUrl, sourceLanguage, targetLanguage, techniqueId, techniqueName } = await req.json();

    console.log("[heygen-translate-video] Request:", {
      videoUrl: videoUrl?.substring(0, 100),
      sourceLanguage,
      targetLanguage,
      techniqueId,
      techniqueName,
    });

    if (!videoUrl) {
      throw new Error("videoUrl is required");
    }
    if (!targetLanguage) {
      throw new Error("targetLanguage is required");
    }

    // Map language codes to HeyGen format
    const outputLanguage = HEYGEN_LANGUAGE_MAP[targetLanguage];
    if (!outputLanguage) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    // Get downloadable URL
    const { url: downloadUrl, error: downloadError } = await getDownloadableUrl(videoUrl);
    if (downloadError || !downloadUrl) {
      throw new Error(downloadError || "Failed to get downloadable URL");
    }

    console.log("[heygen-translate-video] Using download URL:", downloadUrl);

    // Call HeyGen Video Translate API
    const translateResponse = await fetch("https://api.heygen.com/v2/video_translate", {
      method: "POST",
      headers: {
        "x-api-key": heygenApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_url: downloadUrl,
        output_language: outputLanguage,
        title: techniqueName ? `${techniqueName} - ${outputLanguage}` : `Translation - ${outputLanguage}`,
      }),
    });

    const translateData = await translateResponse.json();
    console.log("[heygen-translate-video] HeyGen response:", translateData);

    if (!translateResponse.ok || translateData.error) {
      throw new Error(translateData.error?.message || translateData.message || "HeyGen API error");
    }

    const videoTranslateId = translateData.data?.video_translate_id;
    if (!videoTranslateId) {
      throw new Error("No video_translate_id returned from HeyGen");
    }

    return new Response(
      JSON.stringify({
        success: true,
        projectId: videoTranslateId,
        targetLanguage,
        provider: "heygen",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[heygen-translate-video] Error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
