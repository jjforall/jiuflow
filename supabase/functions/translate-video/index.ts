import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCloudflareStreamDownloadUrl } from "../_shared/cloudflare-download.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Get downloadable URL for video using shared module
async function getDownloadableUrl(url: string): Promise<{ url: string; error?: string }> {
  console.log("[translate-video] getDownloadableUrl:", url);

  // Direct MP4 URLs - return as is
  if (url.toLowerCase().endsWith(".mp4") && !url.includes("videodelivery") && !url.includes("cloudflarestream")) {
    return { url };
  }

  // Cloudflare Stream の場合は共有モジュールで署名付きURLを取得
  const cfVideoId = extractCloudflareVideoId(url);
  if (cfVideoId) {
    console.log("[translate-video] Detected Cloudflare Stream video:", cfVideoId);
    
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

    if (!accountId || !apiToken) {
      return { 
        url, 
        error: "Cloudflare credentials not configured" 
      };
    }

    try {
      const downloadUrl = await getCloudflareStreamDownloadUrl({
        videoId: cfVideoId,
        accountId,
        apiToken,
      });
      console.log("[translate-video] Got Cloudflare download URL:", downloadUrl);
      return { url: downloadUrl };
    } catch (error) {
      console.error("[translate-video] Cloudflare download URL error:", error);
      return { 
        url, 
        error: `Failed to get Cloudflare download URL: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  // その他の m3u8 は変換を試みる
  if (url.includes(".m3u8")) {
    const converted = url
      .replace(/\/manifest\/video\.m3u8$/, "/downloads/default.mp4")
      .replace(/\.m3u8$/, ".mp4");
    console.log("[translate-video] Converted m3u8 to mp4:", converted);
    return { url: converted };
  }

  return { url };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, sourceLanguage, targetLanguage, techniqueId, techniqueName } = await req.json();

    console.log("[translate-video] Request received:", {
      videoUrl: videoUrl?.substring(0, 100),
      sourceLanguage,
      targetLanguage,
      techniqueId,
      techniqueName,
    });

    if (!videoUrl || !targetLanguage || !techniqueId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "videoUrl, targetLanguage, and techniqueId are required",
          provider: "elevenlabs",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // HLS URLをダウンロード可能なURLに変換
    const downloadResult = await getDownloadableUrl(videoUrl);
    if (downloadResult.error) {
      console.error("[translate-video] Failed to get downloadable URL:", downloadResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Video source is not downloadable",
          details: downloadResult.error,
          provider: "elevenlabs",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const mp4Url = downloadResult.url;
    console.log("[translate-video] Video URL conversion:", { original: videoUrl?.substring(0, 80), converted: mp4Url?.substring(0, 80) });

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "ELEVENLABS_API_KEY not configured",
          provider: "elevenlabs",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ElevenLabs言語コードマッピング（ISO 639-1）
    const LANGUAGE_MAP: Record<string, string> = {
      ja: "ja",
      en: "en",
      pt: "pt",
      es: "es",
      fr: "fr",
      de: "de",
      zh: "zh",
      ko: "ko",
      it: "it",
      ru: "ru",
      ar: "ar",
      hi: "hi",
      nl: "nl",
      pl: "pl",
      tr: "tr",
      sv: "sv",
      id: "id",
      ms: "ms",
      ro: "ro",
      uk: "uk",
      el: "el",
      cs: "cs",
      da: "da",
      fi: "fi",
      bg: "bg",
      hr: "hr",
      sk: "sk",
      ta: "ta",
    };

    const srcLang = LANGUAGE_MAP[(sourceLanguage || "ja").toLowerCase()] || "ja";
    const tgtLang = LANGUAGE_MAP[targetLanguage.toLowerCase()];

    if (!tgtLang) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unsupported translation language",
          details: `ElevenLabs Dubbing API does not support language code: ${targetLanguage}`,
          provider: "elevenlabs",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[translate-video] Starting ElevenLabs dubbing:", { srcLang, tgtLang, techniqueId });

    // ElevenLabs Dubbing API を呼び出し（source_url を使用）
    const formData = new FormData();
    formData.append("source_url", mp4Url);
    formData.append("target_lang", tgtLang);
    formData.append("source_lang", srcLang);
    formData.append("name", techniqueName ? `${techniqueName} - ${targetLanguage}` : `Technique ${techniqueId} - ${targetLanguage}`);
    formData.append("num_speakers", "0"); // 自動検出
    formData.append("watermark", "false");
    formData.append("highest_resolution", "true");

    console.log("[translate-video] Calling ElevenLabs Dubbing API...");
    const dubbingResponse = await fetch("https://api.elevenlabs.io/v1/dubbing", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    const responseText = await dubbingResponse.text();
    console.log("[translate-video] ElevenLabs response:", dubbingResponse.status, responseText?.substring(0, 500));

    if (!dubbingResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Failed to start dubbing with ElevenLabs", 
          details: responseText,
          status: dubbingResponse.status,
          provider: "elevenlabs",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let dubbingData;
    try {
      dubbingData = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Invalid JSON response from ElevenLabs", 
          details: responseText,
          provider: "elevenlabs",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dubbingId = dubbingData.dubbing_id;
    const expectedDuration = dubbingData.expected_duration_sec;
    
    if (!dubbingId) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "No dubbing_id in ElevenLabs response", 
          details: JSON.stringify(dubbingData),
          provider: "elevenlabs",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("[translate-video] Dubbing started successfully:", { dubbingId, expectedDuration });

    return new Response(
      JSON.stringify({
        success: true,
        projectId: dubbingId,
        expectedDuration,
        message: "Translation started successfully with ElevenLabs",
        targetLanguage,
        provider: "elevenlabs",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[translate-video] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : String(error),
        provider: "elevenlabs",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
