import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cloudflare Stream から video_id を抽出
function extractCloudflareVideoId(url: string): string | null {
  // Pattern: https://customer-xxx.cloudflarestream.com/{video_id}/manifest/video.m3u8
  const match = url.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)\//);
  return match ? match[1] : null;
}

// Cloudflare Stream API で署名付きダウンロードURLを取得
async function getCloudflareDownloadUrl(videoId: string): Promise<string | null> {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");

  if (!accountId || !apiToken) {
    console.error("Cloudflare credentials not configured");
    return null;
  }

  try {
    // Cloudflare Stream API でダウンロードを有効化
    const enableResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!enableResponse.ok) {
      const errorText = await enableResponse.text();
      console.log("Enable downloads response:", enableResponse.status, errorText);
      // 既にダウンロードが有効な場合は 409 が返ることがある
    }

    // ダウンロードURLを取得
    const getResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}/downloads`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
        },
      }
    );

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error("Get downloads error:", getResponse.status, errorText);
      return null;
    }

    const data = await getResponse.json();
    console.log("Cloudflare downloads response:", JSON.stringify(data));

    // default download URL を返す
    if (data.result?.default?.url) {
      return data.result.default.url;
    }

    return null;
  } catch (error) {
    console.error("Cloudflare API error:", error);
    return null;
  }
}

// HLS URL (.m3u8) を MP4 ダウンロードURLに変換
async function getDownloadableUrl(url: string): Promise<{ url: string; error?: string }> {
  // Bunny CDN or other direct MP4 URLs - return as is
  if (url.toLowerCase().endsWith(".mp4")) {
    return { url };
  }

  // Cloudflare Stream の場合は API で署名付きURLを取得
  const cfVideoId = extractCloudflareVideoId(url);
  if (cfVideoId) {
    console.log("Detected Cloudflare Stream video:", cfVideoId);
    const downloadUrl = await getCloudflareDownloadUrl(cfVideoId);
    if (downloadUrl) {
      console.log("Got Cloudflare download URL:", downloadUrl);
      return { url: downloadUrl };
    }
    return { 
      url: url, 
      error: "Failed to get Cloudflare download URL. Please ensure MP4 downloads are enabled for this video." 
    };
  }

  // その他の m3u8 は変換を試みる
  if (url.includes(".m3u8")) {
    const converted = url
      .replace(/\/manifest\/video\.m3u8$/, "/downloads/default.mp4")
      .replace(/\.m3u8$/, ".mp4");
    return { url: converted };
  }

  return { url };
}

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

    // HLS URLをダウンロード可能なURLに変換
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
    console.log("Converting video URL:", { original: videoUrl, converted: mp4Url });

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
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
          error: "Unsupported translation language",
          details: `ElevenLabs Dubbing API does not support language code: ${targetLanguage}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting video translation with ElevenLabs:", { originalUrl: videoUrl, mp4Url, srcLang, tgtLang, techniqueId });

    // ElevenLabs Dubbing API を呼び出し（source_url を使用）
    const formData = new FormData();
    formData.append("source_url", mp4Url);
    formData.append("target_lang", tgtLang);
    formData.append("source_lang", srcLang);
    formData.append("name", `Technique ${techniqueId} - ${targetLanguage}`);
    formData.append("num_speakers", "0"); // 自動検出
    formData.append("watermark", "false");
    formData.append("highest_resolution", "true");

    console.log("Calling ElevenLabs Dubbing API...");
    const dubbingResponse = await fetch("https://api.elevenlabs.io/v1/dubbing", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!dubbingResponse.ok) {
      const errorText = await dubbingResponse.text();
      console.error("ElevenLabs dubbing error:", dubbingResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to start dubbing with ElevenLabs", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dubbingData = await dubbingResponse.json();
    const dubbingId = dubbingData.dubbing_id;
    const expectedDuration = dubbingData.expected_duration_sec;
    
    console.log("Dubbing started successfully:", { dubbingId, expectedDuration });

    return new Response(
      JSON.stringify({
        success: true,
        projectId: dubbingId,
        expectedDuration,
        message: "Translation started successfully with ElevenLabs",
        targetLanguage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
